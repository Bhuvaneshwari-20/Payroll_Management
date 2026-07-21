const db = require("../config/db");

exports.getDepartmentCount = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM departments WHERE status = 'active'"
  );
  return rows[0].total;
};

exports.getEmployeeGenderCounts = async () => {
  const [rows] = await db.query(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male_count,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female_count
     FROM employees
     WHERE status = 'active'`
  );
  return rows[0];
};


exports.getDepartmentWiseEmployeeCount = async () => {
  const [rows] = await db.query(
    `SELECT d.name AS name, COUNT(e.id) AS count
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
     WHERE d.status = 'active'
     GROUP BY d.id, d.name
     ORDER BY d.name`
  );
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
};

exports.getTodayAttendance = async () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [totalRows] = await db.query(
    "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'"
  );
  const totalActive = totalRows[0].total || 0;

  const [presentRows] = await db.query(
    `SELECT COUNT(DISTINCT a.employee_id) AS present_count
     FROM attendance a
     INNER JOIN employees e ON e.id = a.employee_id
     WHERE a.date = ? AND e.status = 'active' AND a.status = 'Present'`,
    [today]
  );
  const presentToday = presentRows[0].present_count || 0;
  const absentToday = Math.max(totalActive - presentToday, 0);

  return { presentToday, absentToday };
};