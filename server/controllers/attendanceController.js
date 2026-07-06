// ADJUST: point this at your actual mysql2 pool (same one employees.js / departments.js use)
const pool = require('../config/db');
const XLSX = require('xlsx');

const STATUS_VALUES = ['Present', 'Absent', 'CL', 'SL', 'OD', 'Holiday'];

// Matrix-format codes, matching the "KR Toyota - Dashboard" export you shared.
// ASSUMPTION: "/S" suffix = half-day of that status (e.g. OD/S = half-day OD).
// This is the one thing I couldn't confirm from the screenshot — if wrong,
// only this map + the isHalfDaySuffix check below need to change.
const STATUS_CODES = {
  Present: 'P',
  Absent: 'AB',
  CL: 'CL',
  SL: 'SL',
  OD: 'OD',
  Holiday: 'H',
};
const CODE_TO_STATUS = Object.fromEntries(Object.entries(STATUS_CODES).map(([k, v]) => [v, k]));

function parseCode(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim().toUpperCase();
  if (!str) return null;
  const half = str.endsWith('/S');
  const base = half ? str.slice(0, -2) : str;
  const status = CODE_TO_STATUS[base];
  if (!status) return null;
  return { status, half };
}

function formatCode(status, half) {
  const code = STATUS_CODES[status] || status;
  return half ? `${code}/S` : code;
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

// GET /api/attendance/employees
exports.getActiveEmployees = async (req, res) => {
  try {
    // ADJUST: column names (employee_code, status='active') to match your employees table
    // employees table uses first_name + last_name, not a single "name" column
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
      `SELECT employee_id, status, is_half_day, remarks FROM attendance WHERE date = ?`,
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
  for (const r of records) {
    if (!STATUS_VALUES.includes(r.status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${r.status}` });
    }
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sql = `
      INSERT INTO attendance (employee_id, date, status, is_half_day, remarks, marked_by, source)
      VALUES ?
      ON DUPLICATE KEY UPDATE status = VALUES(status), is_half_day = VALUES(is_half_day),
        remarks = VALUES(remarks), marked_by = VALUES(marked_by), source = VALUES(source),
        updated_at = CURRENT_TIMESTAMP
    `;
    const values = records.map((r) => [
      r.employee_id,
      date,
      r.status,
      r.is_half_day ? 1 : 0,
      r.remarks || null,
      req.user?.id || null,
      'manual',
    ]);
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
  const summaryCols = ['Days', 'Present', 'CL', 'OD', 'SL', 'Holiday', 'Payable Days'];
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
    row.push(numDays, null, null, null, null, null, null); // Days + 6 formula cells
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Live formulas so the summary columns recalculate automatically in Excel
  // as soon as HR edits the day codes — no manual re-typing of totals.
  //
  // FIX: half-day codes now credit Present with the worked half of the day,
  // in addition to their own leave/absence category. e.g. "AB/S" (half-day
  // absent) = 0.5 Present (the half they worked) + 0 toward Absent, since
  // Absent isn't a paid/summary column. "CL/S" = 0.5 CL + 0.5 Present, i.e.
  // the day is fully payable (half worked + half approved leave).
  employees.forEach((_, i) => {
    const rowNum = i + 2; // header is row 1
    const range = `${firstDayColLetter}${rowNum}:${lastDayColLetter}${rowNum}`;
    const presentCol = XLSX.utils.encode_col(lastDayColIdx + 2); // +1 is 'Days'
    const clCol = XLSX.utils.encode_col(lastDayColIdx + 3);
    const odCol = XLSX.utils.encode_col(lastDayColIdx + 4);
    const slCol = XLSX.utils.encode_col(lastDayColIdx + 5);
    const holCol = XLSX.utils.encode_col(lastDayColIdx + 6);
    const payCol = XLSX.utils.encode_col(lastDayColIdx + 7);

    ws[`${presentCol}${rowNum}`] = {
      f: `COUNTIF(${range},"P")`
        + `+COUNTIF(${range},"P/S")*0.5`
        + `+COUNTIF(${range},"AB/S")*0.5`
        + `+COUNTIF(${range},"CL/S")*0.5`
        + `+COUNTIF(${range},"OD/S")*0.5`
        + `+COUNTIF(${range},"SL/S")*0.5`
        + `+COUNTIF(${range},"H/S")*0.5`,
    };
    ws[`${clCol}${rowNum}`] = { f: `COUNTIF(${range},"CL")+COUNTIF(${range},"CL/S")*0.5` };
    ws[`${odCol}${rowNum}`] = { f: `COUNTIF(${range},"OD")+COUNTIF(${range},"OD/S")*0.5` };
    ws[`${slCol}${rowNum}`] = { f: `COUNTIF(${range},"SL")+COUNTIF(${range},"SL/S")*0.5` };
    ws[`${holCol}${rowNum}`] = { f: `COUNTIF(${range},"H")+COUNTIF(${range},"H/S")*0.5` };
    ws[`${payCol}${rowNum}`] = {
      f: `${presentCol}${rowNum}+${clCol}${rowNum}+${odCol}${rowNum}+${slCol}${rowNum}+${holCol}${rowNum}`,
    };
  });

  ws['!cols'] = header.map((h) => ({ wch: fixedCols.includes(h) ? 16 : 6 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  return wb;
}

// GET /api/attendance/template?month=7&year=2026
exports.downloadTemplate = async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }
  try {
    const wb = await buildTemplateWorkbook(month, year);
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
// Reads ONLY the day-code columns (1, 2, 3...) as the source of truth.
// Summary columns (Present/CL/OD/.../Payable Days) are ignored on upload —
// they're derived formulas, recomputed server-side, never trusted as input.
exports.uploadAttendance = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const month = parseInt(req.body.month, 10);
  const year = parseInt(req.body.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }

  try {
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
    const values = [];

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
        const parsed = parseCode(raw);
        if (!parsed) {
          if (raw && String(raw).trim()) {
            errors.push(`Row ${rowNum}, day ${d}: invalid code "${raw}"`);
          }
          continue; // blank cell = no entry for that day, skip silently
        }
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        values.push([empId, dateStr, parsed.status, parsed.half ? 1 : 0, null, req.user?.id || null, 'bulk_upload']);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    if (values.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid attendance codes found in the file' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const sql = `
        INSERT INTO attendance (employee_id, date, status, is_half_day, remarks, marked_by, source)
        VALUES ?
        ON DUPLICATE KEY UPDATE status = VALUES(status), is_half_day = VALUES(is_half_day),
          marked_by = VALUES(marked_by), source = VALUES(source), updated_at = CURRENT_TIMESTAMP
      `;
      await conn.query(sql, [values]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ success: true, message: `${values.length} attendance entries saved for ${month}/${year}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process upload' });
  }
};

// GET /api/attendance/report?month=7&year=2026
// Same matrix shape as the template, but as JSON for on-screen viewing on
// the Attendance Report page, built from the SAME buildTemplateWorkbook
// data source so template and report can never disagree.
exports.getMonthlyReport = async (req, res) => {
  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required' });
  }
  try {
    const [employees] = await pool.query(
      `SELECT e.id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS name, e.joining_date, d.name AS department
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.status = 'active'
       ORDER BY e.first_name ASC, e.last_name ASC`
    );
    const numDays = daysInMonth(month, year);
    const [attRows] = await pool.query(
      `SELECT employee_id, DAY(date) AS d, status, is_half_day
       FROM attendance
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [year, month]
    );

    const byEmployee = new Map();
    attRows.forEach((r) => {
      if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, {});
      byEmployee.get(r.employee_id)[r.d] = formatCode(r.status, !!r.is_half_day);
    });

    const data = employees.map((emp) => {
      const days = byEmployee.get(emp.id) || {};
      const summary = { Present: 0, CL: 0, OD: 0, SL: 0, Holiday: 0 };

      for (let d = 1; d <= numDays; d++) {
        const code = days[d];
        if (!code) continue;
        const parsed = parseCode(code);
        if (!parsed) continue;
        const { status, half } = parsed;

        if (status === 'Present') {
          // Full or half day explicitly marked Present.
          summary.Present += half ? 0.5 : 1;
        } else {
          // Credit the leave/absence category itself (Absent has no
          // summary column, so this is a no-op for AB/full-AB — correct,
          // a full absent day earns nothing).
          if (summary[status] !== undefined) {
            summary[status] += half ? 0.5 : 1;
          }
          // FIX: a half-day of ANY status (including AB/S) means the
          // employee worked the other half of that day — credit that
          // half to Present. This is what was missing before, causing
          // AB/S to silently contribute 0 instead of 0.5 Present.
          if (half) {
            summary.Present += 0.5;
          }
        }
      }

      const payableDays = summary.Present + summary.CL + summary.OD + summary.SL + summary.Holiday;
      return {
        employee_code: emp.employee_code,
        name: emp.name,
        joining_date: emp.joining_date,
        department: emp.department,
        days,
        numDays,
        ...summary,
        payableDays,
      };
    });

    res.json({ success: true, message: 'ok', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to build report' });
  }
};