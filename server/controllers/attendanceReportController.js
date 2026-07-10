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

function bucketFor(status) {
  if (status === "P") return "present";
  if (status === "AB") return "absent";
  if (status === "S") return "half_day";
  if (status === "H") return "holiday";
  if (status === "WO") return "week_off";
  if (["CL", "SL", "EL", "OD", "ML", "PL", "L"].includes(status)) return "leave";
  return "absent";
}

// Aggregates raw per-day rows into one summary row per employee.
// NOTE: this intentionally ignores any `status` filter — the summary table
// is meant to show all buckets side-by-side. Status filtering only applies
// to the per-employee detail drill-down (getEmployeeDetail below).
function buildSummary(rows, fromDate, toDate) {
  const byEmployee = {};

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
        leave: 0,
        holiday: 0,
        week_off: 0,
      };
    }
    byEmployee[key][bucketFor(r.status)] += 1;
  });

  const totalDays = daysBetweenInclusive(fromDate, toDate).length;

  return Object.values(byEmployee).map((e) => {
    const workingDays = totalDays - e.holiday - e.week_off;
    // LOP = unapproved absence. Everything bucketed "absent" here has no
    // matching Present/Leave/Holiday/WeekOff record, so it's treated as
    // Loss of Pay. Adjust if you track partial/paid absences separately.
    const lop = e.absent;
    const effectivePresent = e.present + e.half_day * 0.5;
    const attendancePercent = workingDays > 0
      ? Number(((effectivePresent / workingDays) * 100).toFixed(2))
      : 0;

    return { ...e, lop, working_days: workingDays, attendance_percent: attendancePercent };
  });
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

    const data = buildSummary(scoped, from_date, to_date);

    // Holiday/week-off counts are the same company-wide calendar for every
    // employee in range, so take them from the first row rather than summing.
    const sample = data[0];
    const summary = {
      working_days: sample ? sample.working_days : daysBetweenInclusive(from_date, to_date).length,
      present: data.reduce((s, e) => s + e.present, 0),
      absent: data.reduce((s, e) => s + e.absent, 0),
      half_day: data.reduce((s, e) => s + e.half_day, 0),
      leave: data.reduce((s, e) => s + e.leave, 0),
      holiday: sample ? sample.holiday : 0,
      week_off: sample ? sample.week_off : 0,
      attendance_percent: data.length
        ? Number((data.reduce((s, e) => s + e.attendance_percent, 0) / data.length).toFixed(2))
        : 0,
    };

    res.json({ success: true, data, summary });
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
    const data = buildSummary(scoped, from_date, to_date);

    const sheetData = data.map((e) => ({
      "Employee Code": e.employee_code,
      Name: `${e.first_name} ${e.last_name}`,
      Department: e.department,
      Present: e.present,
      Absent: e.absent,
      "Half Day": e.half_day,
      Leave: e.leave,
      Holiday: e.holiday,
      "Week Off": e.week_off,
      LOP: e.lop,
      "Working Days": e.working_days,
      "Attendance %": e.attendance_percent,
    }));

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