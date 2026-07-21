const model = require("../models/attendanceReportModel");
const XLSX = (() => {
  try {
    return require("xlsx");
  } catch {
    return null; // route will report a clear error instead of crashing the server
  }
})();

function daysBetweenInclusive(fromDate, toDate) {
  const out = [];
  const d = new Date(fromDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function isLate(inTime) {
  if (!inTime) return false;
  return inTime > model.SHIFT_START_TIME;
}

// Any status that isn't one of the fixed non-leave codes is a leave-type
// code straight from leave_types (PAL, MAL, CL, SL, OD, ...). No more
// hardcoded whitelist here — that whitelist is exactly what silently
// dropped PAL/MAL into "absent" before.
function bucketFor(status) {
  if (status === "P") return "present";
  if (status === "AB") return "absent";
  if (status === "S") return "half_day";
  if (status === "H") return "holiday";
  if (status === "WO") return "week_off";
  return "leave";
}

// Aggregates raw per-day rows into one summary row per employee.
//
// Paid vs LOP is NOT decided here. `r.is_lop` was already decided once, at
// attendance-marking time (attendanceController.js: resolveLopFlag), by
// checking the employee's remaining leave balance in date order. This
// function just sums up that stamp — so a report for June and a report for
// June+July always agree on the same underlying leave days.
//
// NOTE: this intentionally ignores any `status` filter — the summary table
// is meant to show all buckets side-by-side. Status filtering only applies
// to the per-employee detail drill-down (getEmployeeDetail below).
function buildSummary(rows, fromDate, toDate) {
  const byEmployee = {};
  const leaveCodesSeen = new Set();

  rows.forEach((r) => {
    const key = r.employee_code;
    if (!byEmployee[key]) {
      byEmployee[key] = {
        employee_code: r.employee_code,
        first_name: r.first_name,
        last_name: r.last_name,
        department: r.department || "-",
        present: 0,
        absent: 0,
        half_day: 0,
        leaveByType: {}, // { CL: 1, SL: 2, ... } — PAID days only, per leave-type code
        lop_leave: 0,    // leave days taken beyond that type's allocation
        holiday: 0,
        week_off: 0,
      };
    }
    const e = byEmployee[key];
    const bucket = bucketFor(r.status);

    if (bucket === "leave") {
      leaveCodesSeen.add(r.status);
      // r.is_lop: 0 = paid (covered by allocation), 1 = LOP (beyond allocation).
      // NULL only happens for rows created before the is_lop migration/backfill —
      // treated as paid so historical reports don't retroactively break; run
      // the backfill script to replace NULLs with real values.
      if (r.is_lop === 1) {
        e.lop_leave += 1;
      } else {
        // FIX: previously every leave-type code was lumped into one 'leave'
        // total, so "2 CL taken, 1 allocated" showed as "2 Leave" with no
        // way to see it was specifically CL, or that 1 of those 2 was over
        // allocation. Now tallied per actual leave-type code.
        e.leaveByType[r.status] = (e.leaveByType[r.status] || 0) + 1;
      }
    } else {
      e[bucket] += 1;
    }
  });

  const totalDays = daysBetweenInclusive(fromDate, toDate).length;
  // Leave-type codes actually present in this date range, so the frontend
  // can render one column per code dynamically (CL, SL, OD, PAL, MAL, ...)
  // — same pattern as the Attendance Matrix page, instead of one lumped
  // 'leave' number that hides which type it was.
  const leaveCodes = Array.from(leaveCodesSeen).sort();

  const data = Object.values(byEmployee).map((e) => {
    const workingDays = totalDays - e.holiday - e.week_off;
    const paidLeaveTotal = Object.values(e.leaveByType).reduce((s, v) => s + v, 0);
    // LOP = unapproved absence + leave taken beyond the employee's allocated
    // balance for that leave type. Only the excess counts as LOP, because
    // e.lop_leave already reflects the per-day balance check done at mark time
    // (resolveLopFlag in attendanceController.js) — not a re-derived guess.
    const lop = e.absent + e.lop_leave;
    const effectivePresent = e.present + e.half_day * 0.5;
    const attendancePercent = workingDays > 0
      ? Number(((effectivePresent / workingDays) * 100).toFixed(2))
      : 0;

    const row = {
      employee_code: e.employee_code,
      first_name: e.first_name,
      last_name: e.last_name,
      department: e.department,
      present: e.present,
      absent: e.absent,
      half_day: e.half_day,
      holiday: e.holiday,
      week_off: e.week_off,
      leave: paidLeaveTotal, // total PAID leave across all types (unchanged meaning, for callers that just sum it)
      lop,
      working_days: workingDays,
      attendance_percent: attendancePercent,
    };
    // one field per leave-type code, e.g. row.CL, row.SL, row.PAL — paid days only
    leaveCodes.forEach((code) => { row[code] = e.leaveByType[code] || 0; });
    return row;
  });

  return { data, leaveCodes };
}

// Determines which employee_codes the caller may see, and whether the
// request is pinned to a single employee (self, or an HR-chosen one).
async function resolveScope(req, requestedEmployeeCode) {
  const role = req.user?.role;

  if (role === "HR") {
    return { restrictedCodes: null, forcedCode: requestedEmployeeCode || null };
  }
  if (req.user?.isManager) {
    const team = await model.getTeamEmployeeCodes(req.user.id);
    return { restrictedCodes: team, forcedCode: requestedEmployeeCode || null };
  }
  // Plain employee — always locked to their own record, regardless of
  // whatever employee_id/department_id the client sent.
  return { restrictedCodes: [req.user.employee_code], forcedCode: req.user.employee_code };
}

// POST /api/attendance/report
exports.generateReport = async (req, res) => {
  try {
    const { from_date, to_date, department_id, employee_id } = req.body;
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, message: "from_date and to_date are required" });
    }

    const scope = await resolveScope(req, employee_id);

    const rows = await model.getRawRows({
      fromDate: from_date,
      toDate: to_date,
      departmentId: department_id || null,
      employeeCode: scope.forcedCode || null,
    });

    const scoped = scope.restrictedCodes
      ? rows.filter((r) => scope.restrictedCodes.includes(r.employee_code))
      : rows;

    const { data, leaveCodes } = buildSummary(scoped, from_date, to_date);

    // Holiday/week-off counts are the same company-wide calendar for every
    // employee in range, so take them from the first row rather than summing.
    const sample = data[0];
    const summary = {
      working_days: sample ? sample.working_days : daysBetweenInclusive(from_date, to_date).length,
      present: data.reduce((s, e) => s + e.present, 0),
      absent: data.reduce((s, e) => s + e.absent, 0),
      half_day: data.reduce((s, e) => s + e.half_day, 0),
      leave: data.reduce((s, e) => s + e.leave, 0),
      lop: data.reduce((s, e) => s + e.lop, 0),
      holiday: sample ? sample.holiday : 0,
      week_off: sample ? sample.week_off : 0,
      attendance_percent: data.length
        ? Number((data.reduce((s, e) => s + e.attendance_percent, 0) / data.length).toFixed(2))
        : 0,
    };
    // leaveCodes: e.g. ['CL','MAL','OD','PAL','SL'] — active leave-type codes
    // seen in this date range. Frontend renders one summary column per code,
    // reading row[code] on each employee row in `data` (same pattern as the
    // Attendance Matrix page's leaveTypeCodes.map(...) columns).
    res.json({ success: true, data, leaveCodes, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/report/:employeeCode?from_date=&to_date=&status=
exports.getEmployeeDetail = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const { from_date, to_date, status } = req.query;
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, message: "from_date and to_date are required" });
    }

    const role = req.user?.role;
    if (role !== "HR") {
      if (req.user?.isManager) {
        const team = await model.getTeamEmployeeCodes(req.user.id);
        if (!team.includes(employeeCode)) {
          return res.status(403).json({ success: false, message: "Not authorized for this employee" });
        }
      } else if (req.user?.employee_code !== employeeCode) {
        return res.status(403).json({ success: false, message: "Not authorized for this employee" });
      }
    }

    const rows = await model.getRawRows({ fromDate: from_date, toDate: to_date, employeeCode });
    const filtered = status && status !== "All" ? rows.filter((r) => r.status === status) : rows;

    const attendance = filtered.map((r) => ({
      date: r.date,
      status: r.status,
      check_in: r.in_time || "-",
      check_out: r.out_time || "-",
      working_hours: r.working_hours || "-",
      late: isLate(r.in_time) ? "Yes" : "No",
      // "-" for non-leave days (Present/Absent/Holiday/WeekOff), otherwise
      // shows whether that specific leave day was paid or LOP — useful for
      // employees/HR to see exactly which days pushed them over allocation.
      pay_status: r.is_lop === null || r.is_lop === undefined ? "-" : (r.is_lop === 1 ? "LOP" : "Paid"),
      remarks: r.remarks || "-",
    }));

    const employee = rows[0]
      ? {
          employee_code: rows[0].employee_code,
          name: `${rows[0].first_name} ${rows[0].last_name}`,
          department: rows[0].department || "-",
          joining_date: rows[0].joining_date || "-",
        }
      : { employee_code: employeeCode };

    res.json({ success: true, employee, attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/export/excel?from_date=&to_date=&department_id=&employee_id=
exports.exportExcel = async (req, res) => {
  try {
    if (!XLSX) {
      return res.status(500).json({
        success: false,
        message: "Server is missing the 'xlsx' package. Run: npm install xlsx",
      });
    }
    const { from_date, to_date, department_id, employee_id } = req.query;
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, message: "from_date and to_date are required" });
    }

    const scope = await resolveScope(req, employee_id);
    const rows = await model.getRawRows({
      fromDate: from_date,
      toDate: to_date,
      departmentId: department_id || null,
      employeeCode: scope.forcedCode || null,
    });
    const scoped = scope.restrictedCodes
      ? rows.filter((r) => scope.restrictedCodes.includes(r.employee_code))
      : rows;
    const { data, leaveCodes } = buildSummary(scoped, from_date, to_date);

    const sheetData = data.map((e) => {
      const row = {
        "Employee Code": e.employee_code,
        Name: `${e.first_name} ${e.last_name}`,
        Department: e.department,
        Present: e.present,
        Absent: e.absent,
        "Half Day": e.half_day,
      };
      // one Excel column per leave-type code (CL, SL, PAL, MAL, OD, ...)
      leaveCodes.forEach((code) => { row[code] = e[code] ?? 0; });
      row.Holiday = e.holiday;
      row["Week Off"] = e.week_off;
      row.LOP = e.lop;
      row["Working Days"] = e.working_days;
      row["Attendance %"] = e.attendance_percent;
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_report_${from_date}_to_${to_date}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/meta/departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await model.getDepartments();
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/meta/employees?department_id=
exports.getEmployeesLite = async (req, res) => {
  try {
    const { department_id } = req.query;
    const employees = await model.getActiveEmployeesLite(department_id || null);
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};