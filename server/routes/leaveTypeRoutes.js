const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveTypeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, ctrl.getLeaveTypes);
router.get('/:id', protect, ctrl.getLeaveType);
router.post('/', protect, ctrl.addLeaveType);
router.put('/:id', protect, ctrl.updateLeaveType);
router.patch('/:id/status', protect, ctrl.setLeaveTypeStatus);
router.delete('/:id', protect, ctrl.deleteLeaveType);

module.exports = router;