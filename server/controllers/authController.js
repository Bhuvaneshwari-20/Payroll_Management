const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");

// Employee passwords may be plain text (old PHP style) or bcrypt-hashed.
// This checks both so nothing breaks either way.
async function passwordMatches(plain, stored) {
  if (!stored) return false;
  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

exports.login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // ---------- Check Admin (HR) ----------
    const admin = await Admin.findAdmin(employeeId);
    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        return res.json({ success: false, message: "Invalid Password" });
      }

      const token = generateToken({ id: admin.id, role: "HR", employee_code: null });

      return res.json({
        success: true,
        token,
        role: "HR",
        user: { id: admin.id, role: "HR", isManager: false },
      });
    }

    // ---------- Check Employee ----------
    const employee = await Employee.findActiveEmployee(employeeId);
    if (!employee) {
      return res.json({ success: false, message: "Invalid Username" });
    }

    const match = await passwordMatches(password, employee.pass);
    if (!match) {
      return res.json({ success: false, message: "Invalid Password" });
    }

    const isManager = await Employee.isManager(employee.employee_code);

    const token = generateToken({
      id: employee.id,
      employee_code: employee.employee_code,
      role: employee.role_id,
    });

    return res.json({
      success: true,
      token,
      role: employee.role_id,
      user: {
        id: employee.id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role_id,
        isManager,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/auth/me — this was MISSING, which is why the route registration
// `router.get("/me", protect, auth.me)` crashed the whole server at
// startup ("argument handler must be a function": auth.me was undefined).
exports.me = async (req, res) => {
  try {
    const { id, role, employee_code } = req.user;

    if (role === "HR") {
      return res.json({
        success: true,
        user: { id, role: "HR", isManager: false },
      });
    }

    const profile = await Employee.getProfile(employee_code);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const manager = await Employee.getManagerName(profile.manager_id);
    const isManager = await Employee.isManager(employee_code);

    return res.json({
      success: true,
      user: {
        id,
        employee_code: profile.employee_code,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        role: profile.role_id,
        role_name: profile.role_name,
        department_name: profile.department_name,
        manager_name: manager?.name || null,
        status: profile.status,
        joining_date: profile.joining_date,
        isManager,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};