const db = require('../config/db');

exports.getAll = async (includeInactive = false) => {
  const where = includeInactive ? '' : "WHERE status = 'active'";
  const [rows] = await db.query(`SELECT * FROM leave_types ${where} ORDER BY name`);
  return rows;
};

exports.getById = async (id) => {
  const [rows] = await db.query('SELECT * FROM leave_types WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.getByCode = async (code) => {
  const [rows] = await db.query('SELECT * FROM leave_types WHERE code = ?', [code]);
  return rows[0] || null;
};

exports.create = async ({ name, code, description = '', max_days_per_year = null }) => {
  const [result] = await db.query(
    'INSERT INTO leave_types (name, code, description, max_days_per_year) VALUES (?, ?, ?, ?)',
    [name, code.trim().toUpperCase(), description, max_days_per_year]
  );
  return result.insertId;
};

exports.update = async (id, { name, code, description = '', max_days_per_year = null, status = 'active' }) => {
  const [result] = await db.query(
    `UPDATE leave_types
     SET name = ?, code = ?, description = ?, max_days_per_year = ?, status = ?
     WHERE id = ?`,
    [name, code.trim().toUpperCase(), description, max_days_per_year, status, id]
  );
  return result.affectedRows;
};

exports.setStatus = async (id, status) => {
  const [result] = await db.query('UPDATE leave_types SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows;
};

// Guard used before delete — a leave type with a policy configured, or any
// leave request history against it, should be disabled instead of removed.
exports.isReferenced = async (id) => {
  const [[policyCount]] = await db.query(
    'SELECT COUNT(*) AS count FROM leave_policy_details WHERE leave_type_id = ?',
    [id]
  );
  if (policyCount.count > 0) return true;

  const [[requestCount]] = await db.query(
    'SELECT COUNT(*) AS count FROM leave_requests WHERE leave_type_id = ?',
    [id]
  );
  return requestCount.count > 0;
};

exports.remove = async (id) => {
  const [result] = await db.query('DELETE FROM leave_types WHERE id = ?', [id]);
  return result.affectedRows;
};