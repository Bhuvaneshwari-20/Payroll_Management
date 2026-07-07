const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/apply', protect, permissionController.applyPermission);
router.get('/my', protect, permissionController.getMyHistory);
router.delete('/:id', protect, permissionController.cancelPermission);
router.get('/manager-queue', protect, permissionController.getManagerQueue);
router.put('/action/:id', protect, permissionController.managerAction); // Manager: forward | reject
router.put('/hr-action/:id', protect, permissionController.hrAction);   // NEW — HR: approve | reject
router.get('/all', protect, permissionController.getAllForAdmin);
router.get('/org-stats', protect, permissionController.getOrgStats);  
router.get('/hr-stats', protect, permissionController.getHRStats);  // NEW

module.exports = router;