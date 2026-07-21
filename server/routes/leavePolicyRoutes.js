const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leavePolicyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, ctrl.getLeavePolicies);
router.get('/:id', protect, ctrl.getLeavePolicy);
router.post('/', protect, ctrl.addLeavePolicy);
router.put('/:id', protect, ctrl.updateLeavePolicy);
router.patch('/:id/status', protect, ctrl.setLeavePolicyStatus);
router.delete('/:id', protect, ctrl.deleteLeavePolicy);

module.exports = router;