// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadLeaveDoc } = require('../config/cloudinary');

router.use(protect);

const {
  applyLeave, getLeaves, reviewLeave, cancelLeave,
} = (() => {
  const c = {};
  // Re-export the leave functions inline
  const Leave = require('../models/index').Leave;
  const Student = require('../models/Student');
  const notificationService = require('../services/notificationService');

  c.applyLeave = async (req, res) => {
    const { type, reason, fromDate, toDate, isUrgent } = req.body;
    const studentProfile = await Student.findOne({ user: req.user.id });
    if (!studentProfile) return res.status(404).json({ success: false, message: 'Student profile not found' });
    const from = new Date(fromDate), to = new Date(toDate);
    const numberOfDays = Math.ceil((to - from) / 86400000) + 1;
    if (studentProfile.leaveBalance.remaining < numberOfDays)
      return res.status(400).json({ success: false, message: `Insufficient leave balance. Remaining: ${studentProfile.leaveBalance.remaining}` });
    const documents = req.files?.map(f => ({ url: f.path, publicId: f.filename, name: f.originalname })) || [];
    const leave = await Leave.create({ student: studentProfile._id, type, reason, fromDate: from, toDate: to, numberOfDays, documents, isUrgent });
    await notificationService.sendLeaveNotification(leave, 'applied').catch(() => {});
    res.status(201).json({ success: true, message: 'Leave application submitted', leave });
  };

  c.getLeaves = async (req, res) => {
    const { studentId, status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'student') {
      const sp = await Student.findOne({ user: req.user.id });
      filter.student = sp?._id;
    } else if (studentId) filter.student = studentId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leaves, total] = await Promise.all([
      Leave.find(filter).populate({ path: 'student', populate: { path: 'user', select: 'name email' } }).populate('reviewedBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);
    res.json({ success: true, count: leaves.length, total, totalPages: Math.ceil(total / parseInt(limit)), data: leaves });
  };

  c.reviewLeave = async (req, res) => {
    const { status, comments } = req.body;
    const leave = await Leave.findById(req.params.id).populate('student');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Already reviewed' });
    leave.status = status; leave.reviewedBy = req.user.id; leave.reviewedAt = new Date(); leave.reviewComments = comments;
    await leave.save();
    if (status === 'approved') await Student.findByIdAndUpdate(leave.student._id, { $inc: { 'leaveBalance.used': leave.numberOfDays, 'leaveBalance.remaining': -leave.numberOfDays } });
    await notificationService.sendLeaveNotification(leave, status).catch(() => {});
    res.json({ success: true, message: `Leave ${status}`, leave });
  };

  c.cancelLeave = async (req, res) => {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot cancel reviewed leave' });
    leave.status = 'cancelled'; await leave.save();
    res.json({ success: true, message: 'Leave cancelled', leave });
  };

  return c;
})();

router.post('/', uploadLeaveDoc.array('documents', 3), applyLeave);
router.get('/', getLeaves);
router.put('/:id/review', authorize('admin', 'teacher'), reviewLeave);
router.put('/:id/cancel', cancelLeave);

module.exports = router;
