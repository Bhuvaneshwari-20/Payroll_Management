const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.get('/types', protect, leaveController.getLeaveTypes);
router.post('/apply', protect, leaveController.applyLeave);
router.get('/my', protect, leaveController.getMyHistory);
router.put('/cancel/:id', protect, leaveController.cancelLeave);

router.get('/manager-queue', protect, leaveController.getManagerQueue);
router.put('/manager-action/:id', protect, leaveController.managerAction);

router.get('/hr-queue', protect, leaveController.getHRQueue);
router.get('/hr-all', protect, leaveController.getAllForHR);
router.put('/hr-action/:id', protect, leaveController.hrAction);

router.get('/stats', protect, leaveController.getRequestStats);
router.get('/org-stats', protect, leaveController.getOrgStats);
router.get('/manager/all', protect, leaveController.getManagerAllRequests);
router.get('/hr-stats', protect, leaveController.getHRStats);

module.exports = router;