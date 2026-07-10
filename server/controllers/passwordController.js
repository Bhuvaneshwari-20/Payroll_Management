const passwordModel = require("../models/passwordModel");

// ─────────────────────────────────────────────────────────────────
// HR/ADMIN: GET /api/passwords  (was: get_employee_passwords)
// ─────────────────────────────────────────────────────────────────
async function getEmployeePasswords(req, res) {
  try {
    const employees = await passwordModel.getAllWithPasswords();
    res.json({ success: true, data: employees });
  } catch (err) {
    res.json({ success: false, message: "Failed to fetch employee passwords: " + err.message });
  }
}

// ─────────────────────────────────────────────────────────────────
// HR/ADMIN: POST /api/passwords/:id/reset  (was: reset_employee_password)
// ─────────────────────────────────────────────────────────────────
async function resetEmployeePassword(req, res) {
  try {
    const employeeId = parseInt(req.params.id || req.body.employee_id || 0);
    if (!employeeId) {
      return res.json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await passwordModel.getByIdWithCode(employeeId);
    if (!employee) {
      return res.json({ success: false, message: "Employee not found" });
    }

    const ok = await passwordModel.resetPasswordToCode(employee.id, employee.employee_code);
    ok
      ? res.json({ success: true, message: "Password reset to employee code: " + employee.employee_code })
      : res.json({ success: false, message: "Reset failed. Employee record may not exist." });
  } catch (err) {
    res.json({ success: false, message: "Failed to reset password: " + err.message });
  }
}

// ─────────────────────────────────────────────────────────────────
// EMPLOYEE: GET /api/passwords/check-security  (was: check_password_security)
// ─────────────────────────────────────────────────────────────────
async function checkPasswordSecurity(req, res) {
  try {
    // HR/admin accounts aren't rows in `employees` and have no employee_code —
    // that's not an auth failure, it just means this check doesn't apply to them.
    if (req.user?.role === "HR") {
      return res.json({ status: "success", same_password: false });
    }

    const employeeCode = req.user?.employee_code;
    if (!employeeCode) {
      return res.status(401).json({ status: "error", message: "Not authenticated" });
    }

    const employee = await passwordModel.getPassByCode(employeeCode);
    if (!employee) {
      return res.json({ status: "error", message: "Employee not found" });
    }

    // Explicit flag, set at creation and by HR resets — no more guessing
    // from comparing password hashes.
    if (employee.force_password_change) {
      return res.json({
        status: "warning",
        same_password: true,
        message: "You must set a new password before continuing.",
        employee_code: employee.employee_code,
      });
    }

    res.json({ status: "success", same_password: false, message: "Password security check passed" });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────
// EMPLOYEE: POST /api/passwords/change  (was: change_password)
// ─────────────────────────────────────────────────────────────────
async function changePassword(req, res) {
  try {
    const employeeCode = req.user?.employee_code;
    if (!employeeCode) {
      return res.status(401).json({ status: "error", message: "Not authenticated" });
    }

    const newPassword = (req.body.new_password || "").trim();
    if (!newPassword) {
      return res.json({ status: "error", message: "New password is required" });
    }
    if (newPassword.length < 6) {
      return res.json({ status: "error", message: "Password must be at least 6 characters" });
    }

    const ok = await passwordModel.setPassword(employeeCode, newPassword);
    ok
      ? res.json({ status: "success", message: "Password changed successfully" })
      : res.json({ status: "error", message: "Employee not found: " + employeeCode });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
}

module.exports = {
  getEmployeePasswords,
  resetEmployeePassword,
  checkPasswordSecurity,
  changePassword,
};