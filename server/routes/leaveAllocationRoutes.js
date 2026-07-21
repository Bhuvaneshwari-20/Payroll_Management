const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveAllocationController');
const { protect } = require('../middleware/authMiddleware');

// Leave balance
router.get('/balances', protect, ctrl.getBalances);
router.post('/assign-all', protect, ctrl.assignAll);
router.post('/assign-specific', protect, ctrl.assignSpecific);
router.post('/reset', protect, ctrl.resetAll);

// Holiday assignment
router.get('/holidays', protect, ctrl.getHolidays);
router.post('/holidays/assign-sundays', protect, ctrl.assignSundays);
router.post('/holidays/assign-long', protect, ctrl.assignLongLeave);
router.post('/holidays/assign-date', protect, ctrl.assignDateLeave);
router.delete('/holidays/:id', protect, ctrl.deleteHoliday);

router.get('/employee-balances', protect, ctrl.getEmployeeBalances);
router.post('/assign-policy', protect, ctrl.assignPolicy);
router.post('/reset-used', protect, ctrl.resetUsed);

router.post('/assign-policy-all', protect, ctrl.assignPolicyToAll);
router.post('/run-monthly-accrual', protect, ctrl.runMonthlyAccrual);
module.exports = router;