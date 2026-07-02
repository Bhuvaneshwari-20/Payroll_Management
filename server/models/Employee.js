const db = require("../config/db");

// Used for employee login
exports.findActiveEmployee = async (employeeCode) => {
  const [rows] = await db.query(
    "SELECT * FROM employees WHERE employee_code = ? AND status = 'active' LIMIT 1",
    [employeeCode]
  );
  return rows[0];
};

// Full profile with department + role name (same joins as getEmployeeData() in payroll_api.php)
exports.getProfile = async (employeeCode) => {
  const [rows] = await db.query(
    `SELECT
        e.*,
        r.name AS role_name,
        d.name AS department_name
     FROM employees e
     LEFT JOIN roles r ON e.role_id = r.id
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.employee_code = ?
     LIMIT 1`,
    [employeeCode]
  );
  return rows[0];
};

// Resolve manager_id -> managers table -> the manager's own name
exports.getManagerName = async (managerId) => {
  if (!managerId) return null;
  const [rows] = await db.query(
    `SELECT m.name, m.employee_code
     FROM managers m
     WHERE m.id = ? AND m.status = 'active'
     LIMIT 1`,
    [managerId]
  );
  return rows[0] || null;
};

// Mirrors session.php's "is this employee_code itself an active manager" check
exports.isManager = async (employeeCode) => {
  const [rows] = await db.query(
    "SELECT id FROM managers WHERE employee_code = ? AND status = 'active' LIMIT 1",
    [employeeCode]
  );
  return rows.length > 0;
};
