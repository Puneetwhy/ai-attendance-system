const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

router.use(protect);

router.get('/dashboard', async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const [totalStudents, presentToday, absentToday, lateToday, attendanceTrend, atRisk, departmentStats] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'present' }),
    Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'absent' }),
    Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'late' }),
    Attendance.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }, total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Student.find({ isActive: true, 'attendanceStats.percentage': { $lt: 75 } }).populate('user', 'name email').populate('department', 'name').select('rollNumber attendanceStats department').sort({ 'attendanceStats.percentage': 1 }).limit(10),
    Attendance.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' } },
      { $unwind: '$studentData' },
      { $lookup: { from: 'departments', localField: 'studentData.department', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $group: { _id: { dept: '$dept._id', name: '$dept.name' }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, total: { $sum: 1 } } },
      { $addFields: { percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    ]),
  ]);

  const emotionStats = await Attendance.aggregate([
    { $match: { date: { $gte: today, $lt: tomorrow }, 'emotion.detected': { $exists: true } } },
    { $group: { _id: '$emotion.detected', count: { $sum: 1 } } },
  ]);

  res.json({ success: true, stats: { totalStudents, presentToday, absentToday, lateToday, attendanceRate: totalStudents ? ((presentToday / totalStudents) * 100).toFixed(1) : 0 }, attendanceTrend, emotionStats, atRisk, departmentStats });
});

router.get('/predictions', authorize('admin', 'teacher'), async (req, res) => {
  const atRisk = await Student.find({ isActive: true, 'attendanceStats.percentage': { $lt: 80 } })
    .populate('user', 'name email').populate('department', 'name')
    .select('rollNumber attendanceStats department').sort({ 'attendanceStats.percentage': 1 }).limit(20);

  const predictions = atRisk.map(s => {
    const pct = parseFloat(s.attendanceStats.percentage) || 0;
    return {
      student: { id: s._id, name: s.user?.name, rollNumber: s.rollNumber, department: s.department?.name },
      currentPercentage: pct,
      riskLevel: pct < 60 ? 'critical' : pct < 70 ? 'high' : pct < 75 ? 'medium' : 'low',
      recommendation: pct < 60 ? 'Immediate intervention required' : pct < 75 ? 'At risk of detention' : 'Monitor closely',
    };
  });

  res.json({ success: true, predictions, total: predictions.length });
});

router.get('/department/:id', async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { department: req.params.id };
  if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
  const analytics = await Attendance.aggregate([
    { $match: filter },
    { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, status: '$status' }, count: { $sum: 1 } } },
    { $sort: { '_id.date': 1 } },
  ]);
  res.json({ success: true, analytics });
});

module.exports = router;
