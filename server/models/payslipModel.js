const db = require("../config/db");

// ==================== SALARY HISTORY LOOKUP (read-only from HR side) ====================
// The payslip flow never computes salary itself — it reads whatever
// salaryModel.freezeReport() already froze into salary_history for that
// exact from/to range (same as the original PHP's behavior).

exports.getSalaryHistoryByRange = async (fromDate, toDate) => {
  const [rows] = await db.query(
    "SELECT report_data FROM salary_history WHERE from_date = ? AND to_date = ? LIMIT 1",
    [fromDate, toDate]
  );
  return rows[0] || null;
};

// ==================== PAYSLIPS ====================

exports.getPayslip = async (employeeCode, fromDate, toDate) => {
  const [rows] = await db.query(
    "SELECT * FROM payslips WHERE employee_code = ? AND from_date = ? AND to_date = ? LIMIT 1",
    [employeeCode, fromDate, toDate]
  );
  return rows[0] || null;
};

// Insert-or-update, mirroring the dupe-check-then-write pattern used
// elsewhere in this codebase (see addManager in employeeModel.js).
exports.upsertPayslip = async ({ employee_code, emp_name, from_date, to_date, net_salary, payslip_data, status, payslip_month }) => {
  const existing = await exports.getPayslip(employee_code, from_date, to_date);

  if (existing) {
    await db.query(
      `UPDATE payslips
       SET payslip_data = ?, net_salary = ?, status = ?, emp_name = ?, payslip_month = ?, updated_at = NOW()
       WHERE id = ?`,
      [payslip_data, net_salary, status, emp_name, payslip_month, existing.id]
    );
    return existing.id;
  }

  const [result] = await db.query(
    `INSERT INTO payslips
       (employee_code, emp_name, from_date, to_date, net_salary, payslip_data, status, payslip_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [employee_code, emp_name, from_date, to_date, net_salary, payslip_data, status, payslip_month]
  );
  return result.insertId;
};

exports.getApprovalStatus = async (fromDate, toDate) => {
  const [rows] = await db.query(
    "SELECT employee_code, status FROM payslips WHERE from_date = ? AND to_date = ?",
    [fromDate, toDate]
  );
  return rows;
};

exports.getPayslipHistory = async () => {
  const [rows] = await db.query(
    `SELECT id, employee_code, emp_name, from_date, to_date, payslip_month, net_salary, status, created_at
     FROM payslips ORDER BY created_at DESC`
  );
  return rows;
};

exports.getPayslipById = async (id) => {
  const [rows] = await db.query("SELECT * FROM payslips WHERE id = ?", [id]);
  return rows[0] || null;
};

exports.updateStatus = async (id, status) => {
  const [result] = await db.query("UPDATE payslips SET status = ? WHERE id = ?", [status, id]);
  return result.affectedRows > 0;
};

exports.deletePayslip = async (id) => {
  const [result] = await db.query("DELETE FROM payslips WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

// ==================== EMPLOYEE PORTAL ====================

exports.getEmployeePayslips = async (employeeCode) => {
  const [rows] = await db.query(
    `SELECT id, from_date, to_date, payslip_month, net_salary, status, created_at
     FROM payslips
     WHERE employee_code = ? AND status = 'approved'
     ORDER BY from_date DESC`,
    [employeeCode]
  );
  return rows;
};

exports.getEmployeePayslipDetail = async (id, employeeCode) => {
  const [rows] = await db.query(
    `SELECT id, employee_code, emp_name, from_date, to_date, payslip_month, net_salary, payslip_data, status
     FROM payslips WHERE id = ? AND employee_code = ?`,
    [id, employeeCode]
  );
  return rows[0] || null;
};