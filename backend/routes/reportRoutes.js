const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
router.use(protect);

router.get('/generate', authorize('admin', 'teacher'), async (req, res) => {
  const { format = 'csv', startDate, endDate, departmentId, studentId } = req.query;
  const filter = {};
  if (departmentId) filter.department = departmentId;
  if (studentId) filter.student = studentId;
  if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
  const records = await Attendance.find(filter).populate({ path: 'student', populate: { path: 'user', select: 'name' } }).populate('department', 'name').sort({ date: -1 }).limit(5000);
  const data = records.map(r => ({ Date: r.date?.toISOString().split('T')[0], Name: r.student?.user?.name || 'N/A', RollNumber: r.student?.rollNumber || 'N/A', Department: r.department?.name || 'N/A', Status: r.status, Time: r.time, Session: r.session, Confidence: r.faceData?.confidenceScore?.toFixed(2) || 'N/A', Emotion: r.emotion?.detected || 'N/A', Method: r.method }));
  if (format === 'csv') {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.csv`);
    return res.send([headers, ...rows].join('\n'));
  }
  if (format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.xlsx`);
    return res.send(buffer);
  }
  res.json({ success: true, data });
});
module.exports = router;
