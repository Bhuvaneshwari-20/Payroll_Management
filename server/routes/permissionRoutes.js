const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/apply', protect, permissionController.applyPermission);
router.get('/my', protect, permissionController.getMyHistory);
router.delete('/:id', protect, permissionController.cancelPermission); // FIX: was missing
router.get('/manager-queue', protect, permissionController.getManagerQueue);
router.put('/action/:id', protect, permissionController.managerAction);
router.get('/all', protect, permissionController.getAllForAdmin);

module.exports = router;