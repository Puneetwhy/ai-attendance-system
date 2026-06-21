// services/schedulerService.js
const Student = require('../models/Student');
const { sendLowAttendanceWarning } = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Send low attendance alerts to all students below 75%
 * Runs daily at 6 PM via cron
 */
const sendLowAttendanceAlerts = async () => {
  try {
    const atRiskStudents = await Student.find({
      isActive: true,
      'attendanceStats.totalClasses': { $gte: 10 }, // only after enough data
      'attendanceStats.percentage': { $lt: 75 },
    }).populate('user', 'name email notificationPreferences whatsappNumber');

    logger.info(`Sending low attendance alerts to ${atRiskStudents.length} students`);

    for (const student of atRiskStudents) {
      await sendLowAttendanceWarning(student).catch(e =>
        logger.error(`Alert failed for ${student.rollNumber}: ${e.message}`)
      );
    }

    logger.info('Low attendance alerts sent successfully');
  } catch (err) {
    logger.error(`Scheduler error (sendLowAttendanceAlerts): ${err.message}`);
  }
};

/**
 * Remove stale/expired tokens from users
 */
const cleanupOldSessions = async () => {
  try {
    const User = require('../models/User');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await User.updateMany(
      {},
      { $pull: { refreshTokens: { createdAt: { $lt: thirtyDaysAgo } } } }
    );
    logger.info('Old session tokens cleaned up');
  } catch (err) {
    logger.error(`Scheduler error (cleanupOldSessions): ${err.message}`);
  }
};

module.exports = { sendLowAttendanceAlerts, cleanupOldSessions };
