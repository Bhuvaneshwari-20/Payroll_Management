const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salaryController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-report', protect, ctrl.generateReport);
router.post('/other-earning/list', protect, ctrl.getEmployeesForOE);
router.post('/other-earning/save', protect, ctrl.saveOtherEarning);
router.post('/hold-status/save', protect, ctrl.saveHoldStatus);
router.post('/freeze', protect, ctrl.freezeReport);
router.post('/history/list', protect, ctrl.getHistoryList);
router.post('/history/report', protect, ctrl.getHistoryReport);
router.post('/history/delete', protect, ctrl.deleteHistory);

module.exports = router;