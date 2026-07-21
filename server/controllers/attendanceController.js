// ADJUST: point this at your actual mysql2 pool (same one employees.js / departments.js use)
const pool = require('../config/db');
const XLSX = require('xlsx');

// Fixed statuses that aren't leave types (Present/Absent/Holiday always exist).
// Everything else (CL, SL, OD, PAL, MAL, ...) now comes from leave_types,
// so HR adding a new leave type shows up here automatically — no code change.
const FIXED_STATUS_CODES = { Present: 'P', Absent: 'AB', Holiday: 'H' };

// Builds { STATUS_VALUES, STATUS_CODES, CODE_TO_STATUS } fresh from the DB.
// Cheap query (small table), called once per request — not cached, so a
// leave type added/disabled mid-session takes effect immediately.
async function getStatusMaps() {
  const [types] = await pool.query(`SELECT code FROM leave_types WHERE status = 'active'`);
  const STATUS_CODES = { ...FIXED_STATUS_CODES };
  types.forEach((t) => { STATUS_CODES[t.code] = t.code; });
  const STATUS_VALUES = Object.keys(STATUS_CODES);
  const CODE_TO_STATUS = Object.fromEntries(Object.entries(STATUS_CODES).map(([k, v]) => [v, k]));
  return { STATUS_VALUES, STATUS_CODES, CODE_TO_STATUS };
}

function parseCode(raw, maps) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim().toUpperCase();
  if (!str) return null;
  const half = str.endsWith('/S');
  const base = half ? str.slice(0, -2) : str;
  const status = maps.CODE_TO_STATUS[base];
  if (!status) return null;
  return { status, half };
}

function formatCode(status, half, maps) {
  const code = maps.STATUS_CODES[status] || status;
  return half ? `${code}/S` : code;
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

// ---------------------------------------------------------------------------
// LOP / leave-balance helpers
//
// The paid-vs-LOP decision is made ONCE, here, at the moment attendance is
// saved — never recomputed later by the report or salary queries. This is
// what keeps a report run for June and a report run for June+July from
// disagreeing about the same leave day: whichever query runs first doesn't
// matter, because the answer was already decided and stored on the row.
//
// Uses the REAL schema from models/EmployeeLeaveBalance.js:
//   table: employee_leave_balance (singular)
//   columns: employee_id, leave_type_id, allocated, used, carry_forward
//   balance = allocated + carry_forward - used  (not a stored column)
// ---------------------------------------------------------------------------
const EmployeeLeaveBalance = require('../models/EmployeeLeaveBalance');

// Call once per leave-type day (in date order), inside the same transaction
// that writes the attendance row. Increments employee_leave_balance.used and
// returns whether this specific day is paid (0) or LOP (1). Returns null for
// non-leave statuses (Present/Absent/Holiday) — is_lop doesn't apply to them.
async function resolveLopFlag(conn, employeeId, leaveTypeId, isHalfDay) {
  if (!leaveTypeId) return null;

  // Unlimited types (e.g. OD) never get an employee_leave_balance row by
  // design (see EmployeeLeaveBalance.assignPolicyToEmployee) — "no row"
  // means "not tracked", not "zero balance". Without this check, every
  // Unlimited-type leave day was being misread as LOP.
  const unlimited = await EmployeeLeaveBalance.isUnlimitedType(employeeId, leaveTypeId, conn);
  if (unlimited) return 0; // always paid, never balance-checked

  const consumed = isHalfDay ? 0.5 : 1;
  const [[row]] = await conn.query(
    `SELECT allocated, used, carry_forward FROM employee_leave_balance
     WHERE employee_id = ? AND leave_type_id = ? FOR UPDATE`,
    [employeeId, leaveTypeId]
  );

  // No row = leave type never assigned via a policy for this employee.
  // Treated as zero balance available -> LOP. Confirm this is the behavior
  // you want; the alternative is to reject the mark entirely and ask HR to
  // assign a policy first.
  const available = row ? Number(row.allocated) + Number(row.carry_forward) - Number(row.used) : 0;

  if (available >= consumed) {
    await EmployeeLeaveBalance.incrementUsed(employeeId, leaveTypeId, consumed, conn);
    return 0; // paid
  }
  return 1; // LOP — no balance left, don't go negative
}

// Refunds `used` if the row being overwritten was previously a paid leave
// day. Must run BEFORE resolveLopFlag for the new value, or an edit
// (e.g. PAL -> Present, or PAL -> CL) will silently leak/duplicate balance.
async function reverseIfPaidLeave(conn, existing) {
  if (!existing || !existing.leave_type_id || existing.is_lop !== 0) return;
  const consumed = existing.is_half_day ? 0.5 : 1;
  await EmployeeLeaveBalance.decrementUsed(existing.employee_id, existing.leave_type_id, consumed, conn);
}

// Fetches whatever is currently stored for these (employee, date) pairs, so
// markAttendance can reverse any previously-consumed balance before applying
// the new status.
async function getExistingRows(conn, date, employeeIds) {
  if (employeeIds.length === 0) return new Map();
  const [rows] = await conn.query(
    `SELECT employee_id, status, leave_type_id, is_half_day, is_lop
     FROM attendance WHERE date = ? AND employee_id IN (?)`,
    [date, employeeIds]
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.employee_id, r));
  return map;
}

// GET /api/attendance/leave-statuses  — lets the frontend build the dropdown
// dynamically instead of hardcoding ['Present','Absent','CL','SL','OD','Holiday']
exports.getStatusOptions = async (req, res) => {
  try {
    const maps = await getStatusMaps();
    res.json({ success: true, data: maps.STATUS_VALUES.map((s) => ({ status: s, code: maps.STATUS_CODES[s] })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch status options' });
  }
};

// GET /api/attendance/employees
exports.getActiveEmployees = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, employee_code, CONCAT(first_name, ' ', last_name) AS name, department_id
       FROM employees
       WHERE status = 'active'
       ORDER BY first_name ASC, last_name ASC`
    );
    res.json({ success: true, message: 'ok', data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

// GET /api/attendance?date=YYYY-MM-DD  (used by Daily / Date-wise tabs)
exports.getAttendanceByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'date is required' });
  try {
    const [rows] = await pool.query(
      `SELECT employee_id, status, leave_type_id, is_half_day, is_lop, remarks FROM attendance WHERE date = ?`,
      [date]
    );
    res.json({ success: true, message: 'ok', data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
};

// POST /api/attendance/mark  { date, records: [{employee_id, status, is_half_day, remarks}] }
exports.markAttendance = async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'date and records[] are required' });
  }

  const maps = await getStatusMaps();
  // Accept either form: the canonical key ('Present', 'CL', ...) or the
  // short display code ('P', 'AB', 'H' — for leave types these are already
  // identical to the key, e.g. 'CL' === 'CL'). Whatever the frontend sends,
  // normalize it to the canonical key here, since that's the form every
  // other function in this file (formatCode, getMonthlyReport, buildSummary
  // upstream, existing DB rows) already expects in the `status` column.
  const normalizedRecords = [];
  for (const r of records) {
    const canonical = maps.STATUS_VALUES.includes(r.status)
      ? r.status
      : maps.CODE_TO_STATUS[r.status];
    if (!canonical) {
      return res.status(400).json({ success: false, message: `Invalid status: ${r.status}` });
    }
    normalizedRecords.push({ ...r, status: canonical });
  }

  // Look up leave_type_id for any status that is a leave type (not Present/Absent/Holiday)
  const [leaveTypeRows] = await pool.query(`SELECT id, code FROM leave_types WHERE status = 'active'`);
  const codeToLeaveTypeId = new Map(leaveTypeRows.map((t) => [t.code, t.id]));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Reverse any previously-consumed balance for these slots first (handles
    // edits — e.g. HR changes yesterday's PAL mark to Present), THEN resolve
    // the new status against the (now-restored) balance.
    const employeeIds = normalizedRecords.map((r) => r.employee_id);
    const existingMap = await getExistingRows(conn, date, employeeIds);

    const values = [];
    for (const r of normalizedRecords) {
      const existing = existingMap.get(r.employee_id);
      if (existing) await reverseIfPaidLeave(conn, { ...existing, employee_id: r.employee_id });

      const leaveTypeId = codeToLeaveTypeId.get(r.status) || null;
      const isLop = await resolveLopFlag(conn, r.employee_id, leaveTypeId, !!r.is_half_day);

      values.push([
        r.employee_id,
        date,
        r.status,
        leaveTypeId,
        r.is_half_day ? 1 : 0,
        r.remarks || null,
        req.user?.id || null,
        'manual',
        isLop,
      ]);
    }

    const sql = `
      INSERT INTO attendance (employee_id, date, status, leave_type_id, is_half_day, remarks, marked_by, source, is_lop)
      VALUES ?
      ON DUPLICATE KEY UPDATE status = VALUES(status), leave_type_id = VALUES(leave_type_id),
        is_half_day = VALUES(is_half_day), remarks = VALUES(remarks), marked_by = VALUES(marked_by),
        source = VALUES(source), is_lop = VALUES(is_lop), updated_at = CURRENT_TIMESTAMP
    `;
    await conn.query(sql, [values]);
    await conn.commit();
    res.json({ success: true, message: `Attendance saved for ${date}` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save attendance' });
  } finally {
    conn.release();
  }
};

// Shared by both the downloadable template and the on-screen monthly report,
// so the two never drift apart.
async function buildTemplateWorkbook(month, year) {
  const maps = await getStatusMaps();
  const leaveStatuses = maps.STATUS_VALUES.filter((s) => !['Present', 'Absent'].includes(s));

  const [employees] = await pool.query(
    `SELECT e.id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS name, e.joining_date, d.name AS department
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.status = 'active'
     ORDER BY e.first_name ASC, e.last_name ASC`
  );

  const numDays = daysInMonth(month, year);
  const fixedCols = ['Employee Code', 'Name', 'Joining Date', 'Department'];
  const dayCols = Array.from({ length: numDays }, (_, i) => String(i + 1));
  const summaryCols = ['Days', ...leaveStatuses, 'Payable Days'];
  const header = [...fixedCols, ...dayCols, ...summaryCols];

  const firstDayColIdx = fixedCols.length;
  const lastDayColIdx = firstDayColIdx + numDays - 1;
  const firstDayColLetter = XLSX.utils.encode_col(firstDayColIdx);
  const lastDayColLetter = XLSX.utils.encode_col(lastDayColIdx);

  const aoa = [header];
  employees.forEach((emp) => {
    const row = [
      emp.employee_code,
      emp.name,
      emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB') : '',
      emp.department || '',
    ];
    for (let d = 0; d < numDays; d++) row.push('P'); // pre-filled default: Present
    row.push(numDays, ...leaveStatuses.map(() => null), null); // Days + one formula cell per status + Payable Days
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Live formulas so the summary columns recalculate automatically in Excel
  // as HR edits day codes. Half-day suffix "/S" credits half a Present day
  // plus half of its own leave category — same convention as before, just
  // generated per-status instead of hardcoded to CL/OD/SL/Holiday.
  employees.forEach((_, i) => {
    const rowNum = i + 2; // header is row 1
    const range = `${firstDayColLetter}${rowNum}:${lastDayColLetter}${rowNum}`;

    const statusColLetters = leaveStatuses.map((_, idx) => XLSX.utils.encode_col(lastDayColIdx + 2 + idx));
    const payCol = XLSX.utils.encode_col(lastDayColIdx + 2 + leaveStatuses.length);

    let presentFormula = `COUNTIF(${range},"P")+COUNTIF(${range},"P/S")*0.5`;
    leaveStatuses.forEach((status, idx) => {
      const code = maps.STATUS_CODES[status];
      const col = statusColLetters[idx];
      presentFormula += `+COUNTIF(${range},"${code}/S")*0.5`;
      ws[`${col}${rowNum}`] = { f: `COUNTIF(${range},"${code}")+COUNTIF(${range},"${code}/S")*0.5` };
    });

    const presentColLetter = XLSX.utils.encode_col(lastDayColIdx + 1);
    ws[`${presentColLetter}${rowNum}`] = { f: presentFormula };

    const sumRefs = statusColLetters.map((c) => `${c}${rowNum}`).join('+');
    ws[`${payCol}${rowNum}`] = { f: `${presentColLetter}${rowNum}${sumRefs ? '+' + sumRefs : ''}` };
  });

  ws['!cols'] = header.map((h) => ({ wch: fixedCols.includes(h) ? 16 : 6 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  return { wb, maps };
}

// GET /api/attendance/template?month=7&year=2026
exports.downloadTemplate = async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }
  try {
    const { wb } = await buildTemplateWorkbook(month, year);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${year}_${month}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

// POST /api/attendance/upload  (multipart: excel_file, month, year)
exports.uploadAttendance = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const month = parseInt(req.body.month, 10);
  const year = parseInt(req.body.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }

  try {
    const maps = await getStatusMaps();
    const [leaveTypeRows] = await pool.query(`SELECT id, code FROM leave_types WHERE status = 'active'`);
    const codeToLeaveTypeId = new Map(leaveTypeRows.map((t) => [t.code, t.id]));

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
    }

    const [employees] = await pool.query(`SELECT id, employee_code FROM employees`);
    const codeToId = new Map(employees.map((e) => [String(e.employee_code).trim(), e.id]));

    const numDays = daysInMonth(month, year);
    const errors = [];
    const parsedEntries = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const empCode = String(row['Employee Code'] || '').trim();
      const empId = codeToId.get(empCode);
      if (!empId) {
        errors.push(`Row ${rowNum}: unknown Employee Code "${empCode}"`);
        return;
      }

      for (let d = 1; d <= numDays; d++) {
        const raw = row[String(d)];
        const parsed = parseCode(raw, maps);
        if (!parsed) {
          if (raw && String(raw).trim()) {
            errors.push(`Row ${rowNum}, day ${d}: invalid code "${raw}"`);
          }
          continue;
        }
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        parsedEntries.push({
          employeeId: empId,
          date: dateStr,
          status: parsed.status,
          isHalfDay: parsed.half,
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    if (parsedEntries.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid attendance codes found in the file' });
    }

    // Process in date order so leave balance is consumed chronologically —
    // this is what makes "took 17 PAL days, allocated 15" correctly resolve
    // to 15 paid + 2 LOP regardless of row order in the spreadsheet.
    parsedEntries.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const values = [];
      for (const entry of parsedEntries) {
        // Per-row lookup (not batched) so FOR UPDATE locking + balance
        // decrement stays correct even when the same employee appears many
        // times across the sorted list. For very large uploads (thousands
        // of rows) this is the throughput trade-off for correctness.
        const [[existing]] = await conn.query(
          `SELECT status, leave_type_id, is_half_day, is_lop FROM attendance
           WHERE employee_id = ? AND date = ?`,
          [entry.employeeId, entry.date]
        );
        if (existing) await reverseIfPaidLeave(conn, { ...existing, employee_id: entry.employeeId });

        const leaveTypeId = codeToLeaveTypeId.get(entry.status) || null;
        const isLop = await resolveLopFlag(conn, entry.employeeId, leaveTypeId, entry.isHalfDay);

        values.push([
          entry.employeeId,
          entry.date,
          entry.status,
          leaveTypeId,
          entry.isHalfDay ? 1 : 0,
          null,
          req.user?.id || null,
          'bulk_upload',
          isLop,
        ]);
      }

      const sql = `
        INSERT INTO attendance (employee_id, date, status, leave_type_id, is_half_day, remarks, marked_by, source, is_lop)
        VALUES ?
        ON DUPLICATE KEY UPDATE status = VALUES(status), leave_type_id = VALUES(leave_type_id),
          is_half_day = VALUES(is_half_day), marked_by = VALUES(marked_by), source = VALUES(source),
          is_lop = VALUES(is_lop), updated_at = CURRENT_TIMESTAMP
      `;
      await conn.query(sql, [values]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ success: true, message: `${parsedEntries.length} attendance entries saved for ${month}/${year}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process upload' });
  }
};

// GET /api/attendance/report?month=7&year=2026
exports.getMonthlyReport = async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }
  try {
    const maps = await getStatusMaps();
    const leaveStatuses = maps.STATUS_VALUES.filter((s) => s !== 'Present');

    const [employees] = await pool.query(
      `SELECT e.id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS name, e.joining_date, d.name AS department
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.status = 'active'
       ORDER BY e.first_name ASC, e.last_name ASC`
    );
    const numDays = daysInMonth(month, year);
    const [attRows] = await pool.query(
      `SELECT employee_id, DAY(date) AS d, status, is_half_day, is_lop
       FROM attendance
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [year, month]
    );

    const byEmployee = new Map();
    // Separate accumulator, keyed by employee — NOT part of the `days` map,
    // which only ever holds the display code string (e.g. "PAL/S") per day.
    // resolveLopFlag() already decided, at save time, whether each leave
    // day was paid or LOP; this report needs to read that decision back
    // out via is_lop rather than re-deriving it from scratch.
    const lopByEmployee = new Map();
    attRows.forEach((r) => {
      if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, {});
      byEmployee.get(r.employee_id)[r.d] = formatCode(r.status, !!r.is_half_day, maps);

      if (r.is_lop) {
        const consumed = r.is_half_day ? 0.5 : 1;
        lopByEmployee.set(r.employee_id, (lopByEmployee.get(r.employee_id) || 0) + consumed);
      }
    });

    const data = employees.map((emp) => {
      const days = byEmployee.get(emp.id) || {};
      const summary = { Present: 0 };
      leaveStatuses.forEach((s) => { summary[s] = 0; });

      for (let d = 1; d <= numDays; d++) {
        const code = days[d];
        if (!code) continue;
        const parsed = parseCode(code, maps);
        if (!parsed) continue;
        const { status, half } = parsed;

        if (status === 'Present') {
          summary.Present += half ? 0.5 : 1;
        } else {
          if (summary[status] !== undefined) {
            summary[status] += half ? 0.5 : 1;
          }
          if (half) {
            summary.Present += 0.5;
          }
        }
      }

      // A LOP day still shows under its own leave-type column above (e.g.
      // a LOP PAL day still counts toward PAL=17 — that's correct, it's
      // still useful to know 17 PAL days were taken even though only 11
      // were paid). What was missing was subtracting the unpaid portion
      // back out of payableDays, and surfacing it as its own column.
      const lopDays = lopByEmployee.get(emp.id) || 0;

      const payableDays = Object.entries(summary)
        .filter(([k]) => k !== 'Absent')
        .reduce((sum, [, v]) => sum + v, 0) - lopDays;

      return {
        employee_code: emp.employee_code,
        name: emp.name,
        joining_date: emp.joining_date,
        department: emp.department,
        days,
        numDays,
        ...summary,
        LOP: lopDays,
        payableDays,
      };
    });

    res.json({ success: true, message: 'ok', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to build report' });
  }
};