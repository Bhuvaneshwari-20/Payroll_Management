const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/attendanceReportController");

// All roles hit the same endpoints — HR/Manager/Employee scoping happens
// inside the controller based on req.user, not via separate routes.
router.post("/report", authenticate, ctrl.generateReport);
router.get("/report/:employeeCode", authenticate, ctrl.getEmployeeDetail);
router.get("/export/excel", authenticate, ctrl.exportExcel);
router.get("/meta/departments", authenticate, ctrl.getDepartments);
router.get("/meta/employees", authenticate, ctrl.getEmployeesLite);

module.exports = router;