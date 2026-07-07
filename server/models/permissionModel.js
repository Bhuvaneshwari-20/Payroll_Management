const db = require('../config/db');

exports.applyPermission = async ({ employeeId, requestDate, fromTime, toTime, reason }) => {
  const [rows] = await db.query(
    `SELECT me.id AS manager_employee_id
     FROM employees e
     JOIN managers m ON e.manager_id = m.id AND m.status = 'active'
     JOIN employees me ON me.employee_code = m.employee_code
     WHERE e.id = ? LIMIT 1`,
    [employeeId]
  );
  const managerEmployeeId = rows[0]?.manager_employee_id || null;
  if (!managerEmployeeId) throw new Error('You do not have a manager assigned. Contact HR.');

  const [result] = await db.query(
    `INSERT INTO permission_requests
      (employee_id, request_date, from_time, to_time, reason, status, manager_id)
     VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
    [employeeId, requestDate, fromTime, toTime, reason, managerEmployeeId]
  );
  return result.insertId;
};

exports.getMyHistory = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT * FROM permission_requests WHERE employee_id = ? ORDER BY id DESC`,
    [employeeId]
  );
  return rows;
};

exports.cancelPermission = async (employeeId, id) => {
  const [rows] = await db.query(
    'SELECT * FROM permission_requests WHERE id = ? AND employee_id = ?',
    [id, employeeId]
  );
  const perm = rows[0];
  if (!perm) throw new Error('Permission request not found');
  if (perm.status !== 'Pending') throw new Error('Only pending permission requests can be cancelled');

  await db.query("UPDATE permission_requests SET status = 'Cancelled' WHERE id = ?", [id]);
};

// Full history for this manager (any status) — Pending shows action
// buttons in the UI, everything else shows its status.
exports.getAllForManager = async (managerEmployeeId, statusFilter) => {
  let query = `
    SELECT pr.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
    FROM permission_requests pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE pr.manager_id = ?`;
  const params = [managerEmployeeId];
  if (statusFilter) {
    query += ' AND pr.status = ?';
    params.push(statusFilter);
  }
  query += ' ORDER BY pr.id DESC';
  const [rows] = await db.query(query, params);
  return rows;
};

// FIX: this is the core of the bug — Manager used to be able to set
// status straight to 'Approved'/'Rejected' (final), so HR's queue then
// queried Pending rows directly and let HR approve them itself, skipping
// the Manager stage entirely. Now the Manager can ONLY forward or reject
// outright (never approve) — same 2-stage rule as Leave.
exports.managerRespond = async (id, action, comments, managerEmployeeId) => {
  const [rows] = await db.query('SELECT * FROM permission_requests WHERE id = ?', [id]);
  const perm = rows[0];
  if (!perm) throw new Error('Permission request not found');
  if (perm.manager_id !== managerEmployeeId) throw new Error('This request is not assigned to you');
  if (perm.status !== 'Pending') throw new Error('This request has already been actioned');

  if (action === 'forward') {
    await db.query(
      `UPDATE permission_requests
       SET status = 'Forwarded', manager_comments = ?, manager_action_at = NOW()
       WHERE id = ?`,
      [comments, id]
    );
  } else if (action === 'reject') {
    // Manager rejection is final — never reaches HR.
    await db.query(
      `UPDATE permission_requests
       SET status = 'Rejected', manager_comments = ?, manager_action_at = NOW()
       WHERE id = ?`,
      [comments, id]
    );
  } else {
    throw new Error('Invalid action');
  }
};

// NEW: HR-stage action — only ever actionable on a Forwarded request.
exports.hrRespond = async (id, action, comments, hrEmployeeId) => {
  const [rows] = await db.query('SELECT * FROM permission_requests WHERE id = ?', [id]);
  const perm = rows[0];
  if (!perm) throw new Error('Permission request not found');
  if (perm.status !== 'Forwarded') throw new Error('Only forwarded requests can be actioned by HR');

  const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : null;
  if (!newStatus) throw new Error('Invalid action');

  await db.query(
    `UPDATE permission_requests
     SET status = ?, hr_comments = ?, hr_id = ?, hr_action_at = NOW()
     WHERE id = ?`,
    [newStatus, comments, hrEmployeeId, id]
  );
};

// HR must never see/action a 'Pending' request — only Forwarded/Approved/Rejected.
const HR_VISIBLE_STATUSES = ['Forwarded', 'Approved', 'Rejected'];

exports.getAllForAdmin = async (statusFilter) => {
  let query = `
    SELECT pr.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
    FROM permission_requests pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE 1=1`;
  const params = [];

  if (statusFilter && HR_VISIBLE_STATUSES.includes(statusFilter)) {
    query += ' AND pr.status = ?';
    params.push(statusFilter);
  } else {
    query += ` AND pr.status IN (${HR_VISIBLE_STATUSES.map(() => '?').join(',')})`;
    params.push(...HR_VISIBLE_STATUSES);
  }

  query += ' ORDER BY pr.applied_at DESC';
  const [rows] = await db.query(query, params);
  return rows;
};

exports.getOrgRequestStats = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const [[stats]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'Pending') AS pending,
       SUM(status = 'Rejected') AS rejected,
       SUM(status = 'Approved' AND DATE(hr_action_at) = ?) AS approved_today
     FROM permission_requests`,
    [today]
  );
  return stats;
};

exports.getHRStats = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const [[stats]] = await db.query(
    `SELECT
       SUM(CASE WHEN status = 'Forwarded' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'Rejected' AND rejected_by_stage = 'hr' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'Approved' AND DATE(hr_action_at) = ? THEN 1 ELSE 0 END) AS approved_today
     FROM permission_requests`,
    [today]
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