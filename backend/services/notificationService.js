const { Notification } = require('../models/index');
const Student = require('../models/Student');
const User = require('../models/User');
const emailService = require('./emailService');
const logger = require('../utils/logger');

// Create in-app notification
const createNotification = async ({ recipientId, senderId = null, title, message, type, metadata = {} }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      title,
      message,
      type,
      metadata,
    });
    return notification;
  } catch (err) {
    logger.error(`Create notification error: ${err.message}`);
    return null;
  }
};

// Send attendance notification
const sendAttendanceNotification = async (student, attendance) => {
  const user = await User.findById(student.user);
  if (!user) return;

  // In-app notification
  await createNotification({
    recipientId: user._id,
    title: 'Attendance Marked',
    message: `Your attendance has been marked as ${attendance.status} at ${attendance.time}`,
    type: 'attendance_marked',
    metadata: { attendanceId: attendance._id },
  });

  // Email notification (if enabled)
  if (user.notificationPreferences?.email) {
    await emailService.sendAttendanceEmail(
      user.email, user.name,
      attendance.date?.toDateString(),
      attendance.status,
      attendance.faceData?.confidenceScore || 0
    );
  }

  // WhatsApp (if enabled)
  if (user.notificationPreferences?.whatsapp && user.whatsappNumber) {
    await sendWhatsAppMessage(user.whatsappNumber, `✅ Attendance marked: ${attendance.status} at ${attendance.time} on ${attendance.date?.toDateString()}`);
  }
};

// Send leave notification
const sendLeaveNotification = async (leave, action) => {
  const student = await Student.findById(leave.student).populate('user');
  if (!student?.user) return;

  const titleMap = {
    applied: 'Leave Application Submitted',
    approved: '✅ Leave Approved',
    rejected: '❌ Leave Rejected',
    cancelled: 'Leave Cancelled',
  };

  await createNotification({
    recipientId: student.user._id,
    title: titleMap[action] || 'Leave Update',
    message: `Your leave application from ${leave.fromDate?.toDateString()} to ${leave.toDate?.toDateString()} has been ${action}`,
    type: action === 'approved' ? 'leave_approved' : action === 'rejected' ? 'leave_rejected' : 'leave_applied',
    metadata: { leaveId: leave._id },
  });

  if (student.user.notificationPreferences?.email && ['approved', 'rejected'].includes(action)) {
    await emailService.sendLeaveStatusEmail(student.user.email, student.user.name, leave, action);
  }
};

// Send low attendance warning
const sendLowAttendanceWarning = async (student) => {
  const user = await User.findById(student.user);
  if (!user) return;

  const pct = parseFloat(student.attendanceStats.percentage) || 0;
  const classesNeeded = Math.max(0,
    Math.ceil((75 * student.attendanceStats.totalClasses - student.attendanceStats.presentCount * 100) / 25)
  );

  await createNotification({
    recipientId: user._id,
    title: '⚠️ Low Attendance Warning',
    message: `Your attendance is ${pct}%. You need ${classesNeeded} more classes to reach 75%.`,
    type: 'low_attendance_warning',
    metadata: { percentage: pct, classesNeeded },
  });

  if (user.notificationPreferences?.email) {
    await emailService.sendLowAttendanceEmail(user.email, user.name, student.rollNumber, pct, classesNeeded);
  }
};

// WhatsApp via Twilio
const sendWhatsAppMessage = async (to, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return;
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    logger.info(`WhatsApp sent to ${to}`);
  } catch (err) {
    logger.error(`WhatsApp error: ${err.message}`);
  }
};

module.exports = {
  createNotification,
  sendAttendanceNotification,
  sendLeaveNotification,
  sendLowAttendanceWarning,
  sendWhatsAppMessage,
};
