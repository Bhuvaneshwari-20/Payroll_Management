const DashboardModel = require("../models/Dashboard");
const Employee = require("../models/Employee");

// GET /api/dashboard/stats  (HR only) — replaces the 'dashboard' case in payroll_api.php
exports.getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const totalDepartments = await DashboardModel.getDepartmentCount();
    const genderCounts = await DashboardModel.getEmployeeGenderCounts();
    const attendance = await DashboardModel.getTodayAttendance();

    return res.json({
      status: "success",
      totalDepartments,
      totalEmployees: genderCounts.total || 0,
      maleEmployees: genderCounts.male_count || 0,
      femaleEmployees: genderCounts.female_count || 0,
      presentToday: attendance.presentToday,
      absentToday: attendance.absentToday,
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({ status: "error", message: "Error fetching dashboard data" });
  }
};

// GET /api/dashboard/profile  (Employee/Manager) — replaces getEmployeeData() in payroll_api.php
exports.getMyProfile = async (req, res) => {
  try {
    const { employee_code } = req.user;
    if (!employee_code) {
      return res.status(400).json({ success: false, message: "No employee code on this account" });
    }

    const profile = await Employee.getProfile(employee_code);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const manager = await Employee.getManagerName(profile.manager_id);
    const isManager = await Employee.isManager(employee_code);

    return res.json({
      success: true,
      data: {
        ...profile,
        manager_name: manager?.name || null,
        isManager,
      },
    });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ success: false, message: "Error fetching profile" });
  }
};
