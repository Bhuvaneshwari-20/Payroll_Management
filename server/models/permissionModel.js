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

// FIX: cancel didn't exist at all before — employee had no way to
// withdraw a still-Pending permission request.
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

exports.getPendingForManager = async (managerEmployeeId) => {
  const [rows] = await db.query(
    `SELECT pr.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
     FROM permission_requests pr
     JOIN employees e ON pr.employee_id = e.id
     WHERE pr.manager_id = ? AND pr.status = 'Pending'
     ORDER BY pr.applied_at ASC`,
    [managerEmployeeId]
  );
  return rows;
};

// FIX: was missing entirely — the manager's queue previously only ever
// called getPendingForManager, so an approved/rejected request vanished
// from view the instant the manager acted on it (same bug we already
// fixed on the Leave side). This returns every request for this manager,
// any status, so the UI can keep showing history + status.
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

exports.managerRespond = async (id, action, comments, managerEmployeeId) => {
  const [rows] = await db.query('SELECT * FROM permission_requests WHERE id = ?', [id]);
  const perm = rows[0];
  if (!perm) throw new Error('Permission request not found');
  if (perm.manager_id !== managerEmployeeId) throw new Error('This request is not assigned to you');
  if (perm.status !== 'Pending') throw new Error('This request has already been actioned');

  const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : null;
  if (!newStatus) throw new Error('Invalid action');

  await db.query(
    `UPDATE permission_requests
     SET status = ?, manager_comments = ?, manager_action_at = NOW()
     WHERE id = ?`,
    [newStatus, comments, id]
  );
};

// All permission requests, any status — for Admin/HR view
exports.getAllForAdmin = async (statusFilter) => {
  let query = `
    SELECT pr.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
    FROM permission_requests pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE 1=1`;
  const params = [];
  if (statusFilter) {
    query += ' AND pr.status = ?';
    params.push(statusFilter);
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
       SUM(status = 'Approved' AND DATE(manager_action_at) = ?) AS approved_today
     FROM permission_requests`,
    [today]
  );
  return stats;
};