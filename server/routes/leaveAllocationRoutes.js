const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveAllocationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/balances', protect, ctrl.getBalances);
router.post('/assign-all', protect, ctrl.assignAll);
router.post('/assign-specific', protect, ctrl.assignSpecific);
router.post('/reset', protect, ctrl.resetAll);

module.exports = router;