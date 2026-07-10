const db = require("../config/db");

// ==================== HR/ADMIN: password list + reset ====================

exports.getAllWithPasswords = async () => {
  const [rows] = await db.query(
    `SELECT id, employee_code, first_name, last_name, pass, status
     FROM employees
     ORDER BY first_name ASC`
  );
  return rows;
};

exports.getByIdWithCode = async (employeeId) => {
  const [rows] = await db.query(
    "SELECT id, employee_code FROM employees WHERE id = ? LIMIT 1",
    [employeeId]
  );
  return rows[0] || null;
};

// Resets pass to the employee's own employee_code (plain text — matches
// the original PHP exactly: "Store plain employee_code as password").
exports.resetPasswordToCode = async (employeeId, employeeCode) => {
  const [result] = await db.query(
    "UPDATE employees SET pass = ?, force_password_change = 1 WHERE id = ?",
    [employeeCode, employeeId]
  );
  return result.affectedRows > 0;
};

// ==================== EMPLOYEE SELF-SERVICE ====================

exports.getPassByCode = async (employeeCode) => {
  const [rows] = await db.query(
    "SELECT id, employee_code, pass, force_password_change FROM employees WHERE employee_code = ? LIMIT 1",
    [employeeCode]
  );
  return rows[0] || null;
};

// Plain-text write, matching the original change_password endpoint exactly.
// (Flagged in the controller docblock if you want to switch to bcrypt later.)
exports.setPassword = async (employeeCode, newPassword) => {
  const [result] = await db.query(
    "UPDATE employees SET pass = ?, force_password_change = 0, updated_at = NOW() WHERE employee_code = ?",
    [newPassword, employeeCode]
  );
  return result.affectedRows > 0;
};