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

// Same dynamic-table trick as PHP: attendance_YYYYMM, only if it exists
exports.getTodayAttendance = async () => {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const table = `attendance_${yyyymm}`;
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const [tables] = await db.query("SHOW TABLES LIKE ?", [table]);
  if (tables.length === 0) {
    return { presentToday: 0, absentToday: 0 };
  }

  const [rows] = await db.query(
    `SELECT
        SUM(CASE WHEN in_time IS NOT NULL THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN in_time IS NULL THEN 1 ELSE 0 END) AS absent_count
     FROM \`${table}\`
     WHERE date = ?`,
    [today]
  );

  return {
    presentToday: rows[0].present_count || 0,
    absentToday: rows[0].absent_count || 0,
  };
};
