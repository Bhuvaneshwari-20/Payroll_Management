const db = require('../config/db');
const EmployeeLeaveBalance = require('../models/EmployeeLeaveBalance');

// ==================== EMPLOYEE LEAVE ALLOCATION (new, policy-based) ====================

// GET /api/leave-allocation/employee-balances
// Long format — one row per (employee, leave type). Frontend pivots it.
exports.getEmployeeBalances = async (req, res) => {
  try {
    const rows = await EmployeeLeaveBalance.getAllBalances();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leave-allocation/assign-policy  { employee_id, policy_id, effective_from }
exports.assignPolicy = async (req, res) => {
  try {
    const { employee_id, policy_id, effective_from } = req.body;
    if (!employee_id || !policy_id || !effective_from) {
      return res.status(400).json({ success: false, message: 'Employee, policy, and effective date are required' });
    }
    await EmployeeLeaveBalance.assignPolicyToEmployee(employee_id, policy_id, effective_from);
    res.json({ success: true, message: 'Leave policy assigned successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/leave-allocation/reset-used
// Zeroes `used` for every active employee's balances (policy-cycle rollover),
// NOT the allocation itself — matches your "Reset All" button intent.
exports.resetUsed = async (req, res) => {
  try {
    const count = await EmployeeLeaveBalance.resetAllUsed();
    res.json({ success: true, message: `Reset usage for ${count} balance record(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== LEAVE BALANCE (existing) ====================

// GET all active employees with their leave balance (for the table)
exports.getBalances = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, employee_code, first_name, last_name, leave_balance, jtype
       FROM employees WHERE status = 'active' ORDER BY first_name`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Assign leave balance to ALL active employees of a given jtype (Permanent/Temporary)
exports.assignAll = async (req, res) => {
  try {
    const { etype, days } = req.body;
    if (!etype || days === undefined) {
      return res.status(400).json({ success: false, message: 'Employee type and days are required' });
    }
    const [result] = await db.query(
      `UPDATE employees SET leave_balance = ? WHERE status = 'active' AND jtype = ?`,
      [days, etype]
    );
    res.json({ success: true, message: `Assigned to ${result.affectedRows} employees` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Assign leave balance to ONE specific employee (by employee_code)
exports.assignSpecific = async (req, res) => {
  try {
    const { empid, days } = req.body; // empid = employee_code
    if (!empid || days === undefined) {
      return res.status(400).json({ success: false, message: 'Employee code and days are required' });
    }
    const [result] = await db.query(
      `UPDATE employees SET leave_balance = ? WHERE status = 'active' AND employee_code = ?`,
      [days, empid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found or inactive' });
    }
    res.json({ success: true, message: 'Assigned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reset ALL active employees' leave balance to 0
exports.resetAll = async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE employees SET leave_balance = 0 WHERE status = 'active'`
    );
    res.json({ success: true, message: `Reset ${result.affectedRows} employees successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== HOLIDAY ASSIGNMENT (new) ====================
// Mirrors your PHP: get_holiday_details, assign_sunday_leave, assign_longleave,
// assign_dateleave, delete_leave_details — but against a unified `holidays`
// table + a single `attendance` table, instead of per-month attendance_YYYYMM
// tables and a separate `holiday` table.

// GET /api/leave-allocation/holidays
exports.getHolidays = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, DATE_FORMAT(hdate, '%Y-%m-%d') as hdate, days, type
       FROM holidays ORDER BY hdate DESC`
    );
    res.json({ success: true, message: 'Holidays retrieved successfully', data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve holidays: ' + err.message });
  }
};

// Marks any already-existing attendance rows for a date as Holiday.
// (New attendance rows for future dates get created naturally when
// Daily/Date-wise/Bulk attendance runs and sees the holidays table —
// that's a read-side concern, not something we need to pre-populate here.)
async function syncAttendanceToHoliday(conn, dateStr, remarks) {
  await conn.query(
    `UPDATE attendance SET status = 'Holiday', is_half_day = 0, remarks = ? WHERE date = ?`,
    [remarks, dateStr]
  );
}

// POST /api/leave-allocation/holidays/assign-sundays  { dates: ['2026-07-05', '2026-07-12', ...] }
exports.assignSundays = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { dates } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'No dates provided' });
    }

    // Check for existing dates first — same guard as PHP
    const [existing] = await conn.query(
      `SELECT hdate FROM holidays WHERE hdate IN (?)`,
      [dates]
    );
    if (existing.length > 0) {
      const existingDates = existing.map((r) => new Date(r.hdate).toISOString().slice(0, 10)).join(', ');
      return res.status(409).json({ success: false, message: `Dates already assigned: ${existingDates}` });
    }

    await conn.beginTransaction();
    for (const dateStr of dates) {
      await conn.query(
        `INSERT INTO holidays (hdate, days, type) VALUES (?, 'Sunday', 'Week-Off')`,
        [dateStr]
      );
      await syncAttendanceToHoliday(conn, dateStr, 'Week-Off');
    }
    await conn.commit();

    res.json({ success: true, message: 'Sundays assigned successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error assigning Sunday leaves: ' + err.message });
  } finally {
    conn.release();
  }
};

// POST /api/leave-allocation/holidays/assign-long  { ltype, fromDate, toDate }
exports.assignLongLeave = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { ltype, fromDate, toDate } = req.body;
    if (!ltype || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    // Build the date range
    const dates = [];
    const cur = new Date(fromDate);
    const end = new Date(toDate);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const [existing] = await conn.query(`SELECT hdate FROM holidays WHERE hdate IN (?)`, [dates]);
    if (existing.length > 0) {
      const existingDates = existing.map((r) => new Date(r.hdate).toISOString().slice(0, 10)).join(', ');
      return res.status(409).json({ success: false, message: `Dates already assigned: ${existingDates}` });
    }

    await conn.beginTransaction();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const dateStr of dates) {
      const dayName = dayNames[new Date(dateStr).getDay()];
      await conn.query(`INSERT INTO holidays (hdate, days, type) VALUES (?, ?, ?)`, [dateStr, dayName, ltype]);
      await syncAttendanceToHoliday(conn, dateStr, ltype);
    }
    await conn.commit();

    res.json({ success: true, message: 'Long Leave Added Successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error assigning long leave: ' + err.message });
  } finally {
    conn.release();
  }
};

// POST /api/leave-allocation/holidays/assign-date  { date, leaveType, dayOfWeek }
// Single-day assignment from clicking a day on the calendar.
exports.assignDateLeave = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { date, leaveType, dayOfWeek } = req.body;
    if (!date || !leaveType || !dayOfWeek) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const [existing] = await conn.query(`SELECT id FROM holidays WHERE hdate = ?`, [date]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Date already assigned: ${date}` });
    }

    await conn.beginTransaction();
    await conn.query(`INSERT INTO holidays (hdate, days, type) VALUES (?, ?, ?)`, [date, dayOfWeek, leaveType]);
    await syncAttendanceToHoliday(conn, date, leaveType);
    await conn.commit();

    res.json({ success: true, message: 'Leave Marked Successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error marking leave: ' + err.message });
  } finally {
    conn.release();
  }
};

// DELETE /api/leave-allocation/holidays/:id  { hdate } in body
exports.deleteHoliday = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { hdate } = req.body;

    await conn.beginTransaction();
    const [result] = await conn.query(`DELETE FROM holidays WHERE id = ?`, [id]);

    if (result.affectedRows > 0 && hdate) {
      // Revert attendance rows on that date back to Absent, same as PHP does
      await conn.query(
        `UPDATE attendance SET status = 'Absent', remarks = 'Holiday Assigned Deleted' WHERE date = ?`,
        [hdate]
      );
    }
    await conn.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deletion Failed - Record Not Found' });
    }
    res.json({ success: true, message: 'Holiday Deleted Successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error occurred while processing your request: ' + err.message });
  } finally {
    conn.release();
  }
};

exports.assignPolicyToAll = async (req, res) => {
  try {
    const { policy_id, effective_from, jtype } = req.body;
    if (!policy_id || !effective_from) {
      return res.status(400).json({ success: false, message: 'Policy and effective date are required' });
    }
    const result = await EmployeeLeaveBalance.assignPolicyToAll(policy_id, effective_from, jtype || null);
    const failMsg = result.failures.length ? ` — ${result.failures.length} failed` : '';
    res.json({
      success: true,
      message: `Assigned to ${result.successCount} of ${result.total} employee(s)${failMsg}`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.runMonthlyAccrual = async (req, res) => {
  try {
    const affected = await EmployeeLeaveBalance.runMonthlyAccrual();
    res.json({
      success: true,
      message: `Monthly accrual completed. ${affected} balance(s) updated.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to run monthly accrual' });
  }
};