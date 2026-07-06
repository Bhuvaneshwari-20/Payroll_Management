const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { employeeUpload, bulkUpload } = require('../middleware/uploadEmployee');

// ---- Employees ----
router.get('/', employeeController.getEmployees);
router.get('/roles-by-department', employeeController.getRolesByDepartment);
router.get('/status-history', employeeController.getEmployeeStatusHistory);
router.get('/status-history/export', employeeController.exportStatusHistoryExcel);
router.get('/status-changes', employeeController.getStatusChangeHistory);
router.get('/export', employeeController.exportEmployeesExcel);

router.get('/:id', employeeController.getEmployee);
router.post('/', employeeUpload, employeeController.addEmployee);
router.put('/:id', employeeUpload, employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.patch('/:id/status', employeeController.toggleEmployeeStatus);

// ---- Managers ----
router.get('/managers/list', employeeController.getManagers);
router.post('/managers', employeeController.addManager);
router.delete('/managers/:id', employeeController.deleteManager);

// ---- Bulk Upload / Upload History ----
router.get('/bulk/template', employeeController.downloadTemplate);
router.post('/bulk/deductions', bulkUpload, employeeController.uploadBulkDeductions);
router.get('/bulk/history', employeeController.getUploadHistory);
router.delete('/bulk/history', employeeController.clearUploadHistory);

// ---- Bulk NEW EMPLOYEE Upload (full employees, not just deductions) ----
router.get('/bulk/employee-template', employeeController.downloadEmployeeTemplate);
router.post('/bulk/employees', bulkUpload, employeeController.uploadBulkEmployees);

module.exports = router;