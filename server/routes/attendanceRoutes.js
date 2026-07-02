const express = require('express');
const multer = require('multer');
const router = express.Router();

// ADJUST if your authMiddleware export differs
const { protect } = require('../middleware/authMiddleware');

const ctrl = require('../controllers/attendanceController');

// Matches attendanceController.js's uploadAttendance, which reads req.file.buffer
// (memory storage) — NOT the old disk-based uploadAttendance.js middleware.
// Delete server/middleware/uploadAttendance.js, it is unused and stale.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.get('/employees', ctrl.getActiveEmployees);
router.get('/template', ctrl.downloadTemplate);
router.get('/report', ctrl.getMonthlyReport);
router.get('/', ctrl.getAttendanceByDate);
router.post('/mark', ctrl.markAttendance);
router.post('/upload', upload.single('excel_file'), ctrl.uploadAttendance);

module.exports = router;