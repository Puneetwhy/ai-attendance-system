// ════════════════════════════════════════════
// services/emailService.js
// ════════════════════════════════════════════
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"AI Attendance" <noreply@attendance.edu>',
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const emailTemplates = {
  attendanceMarked: (name, date, status, confidence) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="color: white; margin: 0;">AI Attendance System</h2>
      </div>
      <div style="padding: 20px;">
        <h3>Hello, ${name}! 👋</h3>
        <p>Your attendance has been marked successfully.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${date}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Status</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: ${status === 'present' ? '#22c55e' : '#ef4444'};">${status.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Confidence</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${(confidence * 100).toFixed(1)}%</td></tr>
        </table>
      </div>
      <div style="text-align: center; padding: 15px; color: #888; font-size: 12px;">
        AI Smart Attendance Management System
      </div>
    </div>
  `,

  passwordReset: (name, resetUrl) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the button below (valid for 30 minutes):</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you didn't request this, ignore this email.</p>
    </div>
  `,

  leaveStatus: (name, leaveType, fromDate, toDate, status, comments) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Leave Application Update</h2>
      <p>Hello ${name},</p>
      <p>Your leave application has been <strong style="color: ${status === 'approved' ? '#22c55e' : '#ef4444'};">${status}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${leaveType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>From</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${fromDate}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>To</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${toDate}</td></tr>
        ${comments ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Comments</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${comments}</td></tr>` : ''}
      </table>
    </div>
  `,

  lowAttendanceWarning: (name, rollNumber, percentage, classesNeeded) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
      <div style="background: #ef4444; padding: 15px; border-radius: 6px 6px 0 0;">
        <h2 style="color: white; margin: 0;">⚠️ Low Attendance Warning</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${name} (${rollNumber}),</p>
        <p>Your current attendance is <strong style="color: #ef4444;">${percentage}%</strong>, which is below the required 75%.</p>
        <p>You need to attend at least <strong>${classesNeeded} more classes</strong> to meet the requirement.</p>
        <p>Please ensure regular attendance to avoid being detained.</p>
      </div>
    </div>
  `,
};

module.exports = {
  sendEmail,
  sendVerificationEmail: (email, name, token) =>
    sendEmail({ to: email, subject: 'Verify your email', html: `<p>Hello ${name}, <a href="${process.env.CLIENT_URL}/verify-email/${token}">Click here to verify your email</a></p>` }),

  sendPasswordResetEmail: (email, name, resetUrl) =>
    sendEmail({ to: email, subject: 'Password Reset Request', html: emailTemplates.passwordReset(name, resetUrl) }),

  sendAttendanceEmail: (email, name, date, status, confidence) =>
    sendEmail({ to: email, subject: `Attendance Marked - ${date}`, html: emailTemplates.attendanceMarked(name, date, status, confidence) }),

  sendLeaveStatusEmail: (email, name, leave, status) =>
    sendEmail({ to: email, subject: `Leave Application ${status}`, html: emailTemplates.leaveStatus(name, leave.type, leave.fromDate?.toDateString(), leave.toDate?.toDateString(), status, leave.reviewComments) }),

  sendLowAttendanceEmail: (email, name, rollNumber, percentage, classesNeeded) =>
    sendEmail({ to: email, subject: '⚠️ Low Attendance Warning', html: emailTemplates.lowAttendanceWarning(name, rollNumber, percentage, classesNeeded) }),
};


// ════════════════════════════════════════════
// services/notificationService.js (appended via separate file)
// ════════════════════════════════════════════
