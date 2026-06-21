const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/recognize', attendanceController.markByFaceRecognition);
router.post('/manual', authorize('admin', 'teacher'), attendanceController.markManual);
router.post('/bulk', authorize('admin', 'teacher'), attendanceController.bulkMarkAttendance);

router.get('/', attendanceController.getAttendance);
router.get('/summary/daily', attendanceController.getDailySummary);
router.get('/student/:studentId', attendanceController.getStudentAttendance);

module.exports = router;
