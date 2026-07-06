const db = require('../config/db');

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