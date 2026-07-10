const express = require('express');
const router = express.Router();
const { authenticate, requireHR } = require('../middleware/auth');
const ctrl = require('../controllers/payslipController');

// ── HR / admin routes ───────────────────────────────────────────
router.post('/employees-salary', authenticate, requireHR, ctrl.getEmployeesSalary);
router.post('/generate-single', authenticate, requireHR, ctrl.generateSingle);
router.post('/generate-all', authenticate, requireHR, ctrl.generateAll);
router.post('/save', authenticate, requireHR, ctrl.savePayslip);
router.post('/approval-status', authenticate, requireHR, ctrl.getApprovalStatus);
router.get('/history', authenticate, requireHR, ctrl.getPayslipHistory);
router.get('/:id', authenticate, requireHR, ctrl.getPayslipById);
router.patch('/:id/status', authenticate, requireHR, ctrl.updateStatus);
router.delete('/:id', authenticate, requireHR, ctrl.deletePayslip);

// ── Employee self-service routes ────────────────────────────────
router.get('/my/list', authenticate, ctrl.getEmployeePayslips);
router.get('/my/:id', authenticate, ctrl.getEmployeePayslipDetail);

module.exports = router;