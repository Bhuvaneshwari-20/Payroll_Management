const db = require('../config/db');

// ============================================================
// Helpers
// ============================================================

// Same day-counting rule as the legacy calculateLeaveDays() in PHP.
function calculateLeaveDays(startDate, endDate, startShift, endShift) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const sameDay = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  if (sameDay) {
    return startShift === 'Half day' ? 0.5 : 1.0;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  let days = Math.round((end - start) / msPerDay) + 1; // inclusive of both ends

  if (startShift === 'Half day') days -= 0.5;
  if (endShift === 'Half day') days -= 0.5;

  return days;
}

// Types whose approval consumes the employee's leave_balance quota.
// On Duty / other types don't touch the balance — matches legacy rule.
const BALANCE_AFFECTING_TYPES = ['Casual Leave', 'Sick Leave'];

function dateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ============================================================
// Leave types (shared dropdown source)
// ============================================================
exports.getLeaveTypes = async () => {
  const [rows] = await db.query('SELECT id, name FROM leave_types ORDER BY name ASC');
  return rows;
};

exports.getLeaveTypeById = async (id) => {
  const [rows] = await db.query('SELECT id, name FROM leave_types WHERE id = ?', [id]);
  return rows[0] || null;
};

// ============================================================
// Manager resolution
// employees.manager_id -> managers.id -> managers.employee_code -> employees.id
// (mirrors the join used in the legacy getEmployeeData() query)
// ============================================================
exports.resolveManagerEmployeeId = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT me.id AS manager_employee_id
     FROM employees e
     JOIN managers m ON e.manager_id = m.id AND m.status = 'active'
     JOIN employees me ON me.employee_code = m.employee_code
     WHERE e.id = ?
     LIMIT 1`,
    [employeeId]
  );
  return rows[0]?.manager_employee_id || null;
};

// ============================================================
// Apply
// ============================================================
exports.applyLeave = async ({ employeeId, category, leaveTypeId, startDate, endDate, startShift, endShift, reason }) => {
  const leaveType = await exports.getLeaveTypeById(leaveTypeId);
  if (!leaveType) throw new Error('Invalid leave type');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) throw new Error('End date cannot be before start date');
  if (start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10) && startShift !== endShift) {
    throw new Error('For same-day leave, start and end shifts must match');
  }

  const days = calculateLeaveDays(startDate, endDate, startShift, endShift);
  const affectsBalance = BALANCE_AFFECTING_TYPES.includes(leaveType.name);

  const managerEmployeeId = await exports.resolveManagerEmployeeId(employeeId);
  if (!managerEmployeeId) {
    throw new Error('You do not have a manager assigned. Contact HR.');
  }

  // Monthly quota: max 1 Casual/Sick leave per month (inherited business
  // rule from the legacy system — adjust here if that's not the real policy).
  if (affectsBalance) {
    const monthStart = `${startDate.slice(0, 7)}-01`;
    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.employee_id = ? AND lt.name = ?
         AND lr.start_date BETWEEN ? AND LAST_DAY(?)
         AND lr.status IN ('Pending','Forwarded','Approved')`,
      [employeeId, leaveType.name, monthStart, monthStart]
    );
    if (cnt >= 1) {
      throw new Error(`You have already used your 1 ${leaveType.name} for this month.`);
    }

    const [[{ leave_balance: balance }]] = await db.query(
      'SELECT leave_balance FROM employees WHERE id = ?',
      [employeeId]
    );
    if ((balance || 0) < days) {
      throw new Error(`Insufficient leave balance. Available: ${balance}, Required: ${days}`);
    }
  }

  // Overlap check against any active (non-final-rejected/cancelled) request
  const [overlap] = await db.query(
    `SELECT id FROM leave_requests
     WHERE employee_id = ?
       AND status IN ('Pending','Forwarded','Approved')
       AND (start_date <= ? AND end_date >= ?)`,
    [employeeId, endDate, startDate]
  );
  if (overlap.length > 0) {
    throw new Error('You already have an active leave request overlapping these dates');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO leave_requests
        (employee_id, category, leave_type_id, start_date, end_date, start_shift, end_shift,
         days, reason, status, manager_id, balance_deducted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [employeeId, category, leaveTypeId, startDate, endDate, startShift, endShift, days, reason, managerEmployeeId, affectsBalance ? 1 : 0]
    );

    if (affectsBalance) {
      await conn.query('UPDATE employees SET leave_balance = leave_balance - ? WHERE id = ?', [days, employeeId]);
    }

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ============================================================
// Employee: history & cancel
// ============================================================
exports.getMyHistory = async (employeeId, category) => {
  const [rows] = await db.query(
    `SELECT lr.*, lt.name AS leave_type_name
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.employee_id = ? AND lr.category = ?
     ORDER BY lr.id DESC`,
    [employeeId, category]
  );
  return rows;
};

exports.cancelLeave = async (employeeId, id) => {
  const [rows] = await db.query(
    'SELECT * FROM leave_requests WHERE id = ? AND employee_id = ?',
    [id, employeeId]
  );
  const leave = rows[0];
  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'Pending') throw new Error('Only pending leave requests can be cancelled');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE leave_requests SET status = 'Cancelled' WHERE id = ?", [id]);
    if (leave.balance_deducted) {
      await conn.query('UPDATE employees SET leave_balance = leave_balance + ? WHERE id = ?', [leave.days, employeeId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ============================================================
// Manager stage
// ============================================================
exports.getPendingForManager = async (managerEmployeeId, category) => {
  const [rows] = await db.query(
    `SELECT lr.*, lt.name AS leave_type_name,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     JOIN employees e ON lr.employee_id = e.id
     WHERE lr.manager_id = ? AND lr.category = ? AND lr.status = 'Pending'
     ORDER BY lr.applied_at ASC`,
    [managerEmployeeId, category]
  );
  return rows;
};

exports.managerRespond = async (id, action, comments, managerEmployeeId) => {
  const [rows] = await db.query('SELECT * FROM leave_requests WHERE id = ?', [id]);
  const leave = rows[0];
  if (!leave) throw new Error('Leave request not found');
  if (leave.manager_id !== managerEmployeeId) throw new Error('This request is not assigned to you');
  if (leave.status !== 'Pending') throw new Error('This request has already been actioned');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (action === 'forward') {
      await conn.query(
        `UPDATE leave_requests
         SET status = 'Forwarded', manager_comments = ?, manager_action_at = NOW()
         WHERE id = ?`,
        [comments, id]
      );
    } else if (action === 'reject') {
      // Manager rejection is FINAL — never reaches HR, no LOP, balance restored.
      await conn.query(
        `UPDATE leave_requests
         SET status = 'Rejected', rejected_by_stage = 'manager', is_lop = 0,
             manager_comments = ?, manager_action_at = NOW()
         WHERE id = ?`,
        [comments, id]
      );
      if (leave.balance_deducted) {
        await conn.query('UPDATE employees SET leave_balance = leave_balance + ? WHERE id = ?', [leave.days, leave.employee_id]);
      }
    } else {
      throw new Error('Invalid action');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ============================================================
// HR stage
// ============================================================
exports.getForwardedForHR = async (category) => {
  const [rows] = await db.query(
    `SELECT lr.*, lt.name AS leave_type_name,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     JOIN employees e ON lr.employee_id = e.id
     LEFT JOIN employees m ON lr.manager_id = m.id
     WHERE lr.category = ? AND lr.status = 'Forwarded'
     ORDER BY lr.manager_action_at ASC`,
    [category]
  );
  return rows;
};

exports.getAllForHR = async (category, statusFilter) => {
  let query = `
    SELECT lr.*, lt.name AS leave_type_name,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code,
           CONCAT(m.first_name, ' ', m.last_name) AS manager_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN employees m ON lr.manager_id = m.id
    WHERE lr.category = ?`;
  const params = [category];
  if (statusFilter) {
    query += ' AND lr.status = ?';
    params.push(statusFilter);
  }
  query += ' ORDER BY lr.applied_at DESC';
  const [rows] = await db.query(query, params);
  return rows;
};

// Maps a leave type NAME to the code your attendance table's `status`
// enum expects. ADJUST to match your actual leave_types rows.
const LEAVE_TYPE_ATTENDANCE_MAP = {
  'Casual Leave': 'CL',
  'Sick Leave': 'SL',
  'On Duty': 'OD',
};
function mapLeaveTypeToAttendanceStatus(leaveTypeName) {
  return LEAVE_TYPE_ATTENDANCE_MAP[leaveTypeName] || 'CL';
}

exports.hrRespond = async (id, action, comments, hrEmployeeId) => {
  const [rows] = await db.query(
    `SELECT lr.*, lt.name AS leave_type_name FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id WHERE lr.id = ?`,
    [id]
  );
  const leave = rows[0];
  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'Forwarded') throw new Error('Only forwarded requests can be actioned by HR');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const dates = dateRange(leave.start_date, leave.end_date);

    if (action === 'approve') {
      await conn.query(
        `UPDATE leave_requests
         SET status = 'Approved', hr_comments = ?, hr_id = ?, hr_action_at = NOW()
         WHERE id = ?`,
        [comments, hrEmployeeId, id]
      );

      const attStatus = mapLeaveTypeToAttendanceStatus(leave.leave_type_name);
      for (const d of dates) {
        const isHalf = (d === leave.start_date && leave.start_shift === 'Half day')
          || (d === leave.end_date && leave.end_shift === 'Half day');
        await conn.query(
          `INSERT INTO attendance (employee_id, date, status, is_half_day, remarks, marked_by, source)
           VALUES (?, ?, ?, ?, ?, ?, 'manual')
           ON DUPLICATE KEY UPDATE status = VALUES(status), is_half_day = VALUES(is_half_day),
             remarks = VALUES(remarks), marked_by = VALUES(marked_by), updated_at = CURRENT_TIMESTAMP`,
          [leave.employee_id, d, attStatus, isHalf ? 1 : 0, `Leave request #${id} approved`, hrEmployeeId]
        );
      }
      // balance_deducted stays deducted — leave is now finalized as taken.
    } else if (action === 'reject') {
      // HR-stage rejection = Loss of Pay: balance restored, attendance
      // marked Absent (unpaid) with a remark tagging it as LOP.
      await conn.query(
        `UPDATE leave_requests
         SET status = 'Rejected', rejected_by_stage = 'hr', is_lop = 1,
             hr_comments = ?, hr_id = ?, hr_action_at = NOW()
         WHERE id = ?`,
        [comments, hrEmployeeId, id]
      );
      if (leave.balance_deducted) {
        await conn.query('UPDATE employees SET leave_balance = leave_balance + ? WHERE id = ?', [leave.days, leave.employee_id]);
      }
      for (const d of dates) {
        await conn.query(
          `INSERT INTO attendance (employee_id, date, status, is_half_day, remarks, marked_by, source)
           VALUES (?, ?, 'Absent', 0, ?, ?, 'manual')
           ON DUPLICATE KEY UPDATE status = 'Absent', remarks = VALUES(remarks),
             marked_by = VALUES(marked_by), updated_at = CURRENT_TIMESTAMP`,
          [leave.employee_id, d, `Loss of Pay - leave request #${id} rejected by HR`, hrEmployeeId]
        );
      }
    } else {
      throw new Error('Invalid action');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ============================================================
// Stats card for the manager's "Request Management" dashboard
// ============================================================
exports.getRequestStats = async (managerEmployeeId) => {
  const today = new Date().toISOString().slice(0, 10);

  const [[leaveStats]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'Pending') AS pending,
       SUM(status = 'Rejected' AND rejected_by_stage = 'manager') AS rejected,
       SUM(status = 'Forwarded' AND DATE(manager_action_at) = ?) AS approved_today
     FROM leave_requests WHERE manager_id = ?`,
    [today, managerEmployeeId]
  );
const [[permStats]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'Pending') AS pending,
       SUM(status = 'Rejected') AS rejected,
       SUM(status = 'Approved' AND DATE(manager_action_at) = ?) AS approved_today
     FROM permission_requests WHERE manager_id = ?`,
    [today, managerEmployeeId]
  );

  return {
    total: (leaveStats.total || 0) + (permStats.total || 0),
    pending: (leaveStats.pending || 0) + (permStats.pending || 0),
    rejected: (leaveStats.rejected || 0) + (permStats.rejected || 0),
    approved_today: (leaveStats.approved_today || 0) + (permStats.approved_today || 0),
  };
};


// Org-wide stats for HR/Admin dashboard (all leave requests, not manager-scoped)
exports.getOrgRequestStats = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const [[leaveStats]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status IN ('Pending','Forwarded')) AS pending,
       SUM(status = 'Rejected') AS rejected,
       SUM((status = 'Approved' AND DATE(hr_action_at) = ?) OR (status = 'Forwarded' AND DATE(manager_action_at) = ?)) AS approved_today
     FROM leave_requests`,
    [today, today]
  );
  return leaveStats;
};

exports.getAllForManager = async (managerEmployeeId, category, statusFilter) => {
  let query = `
    SELECT lr.*, lt.name AS leave_type_name,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    WHERE lr.manager_id = ? AND lr.category = ?`;
  const params = [managerEmployeeId, category];
  if (statusFilter) { query += ' AND lr.status = ?'; params.push(statusFilter); }
  query += ' ORDER BY lr.applied_at DESC';
  const [rows] = await db.query(query, params);
  return rows;
};

exports.calculateLeaveDays = calculateLeaveDays;


exports.getHRStats = async (category) => {
  const today = new Date().toISOString().slice(0, 10);
  const [[stats]] = await db.query(
    `SELECT
       SUM(CASE WHEN status = 'Forwarded' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'Rejected' AND rejected_by_stage = 'hr' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'Approved' AND DATE(hr_action_at) = ? THEN 1 ELSE 0 END) AS approved_today
     FROM leave_requests
     WHERE category = ?`,
    [today, category]
  );
  const pending = Number(stats.pending) || 0;
  const approved = Number(stats.approved) || 0;
  const rejected = Number(stats.rejected) || 0;
  return {
    total: pending + approved + rejected,
    pending,
    rejected,
    approved_today: Number(stats.approved_today) || 0,
  };
};