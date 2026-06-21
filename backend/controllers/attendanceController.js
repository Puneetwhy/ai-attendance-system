const axios = require('axios');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { Notification } = require('../models/index');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ─── Mark attendance via face recognition ─────────────────────
exports.markByFaceRecognition = async (req, res) => {
  const { imageBase64, departmentId, session, period, location } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Image is required' });
  }

  // Call AI service for face recognition
  let aiResult;
  try {
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/recognize`, {
      image: imageBase64,
      department_id: departmentId,
    }, { timeout: 30000 });
    aiResult = aiResponse.data;
  } catch (err) {
    logger.error(`AI service error: ${err.message}`);
    return res.status(503).json({ success: false, message: 'AI face recognition service unavailable' });
  }

  if (!aiResult.success || !aiResult.recognitions?.length) {
    return res.status(200).json({
      success: false,
      message: 'No faces recognized',
      unknownFaces: aiResult.unknown_faces || 0,
    });
  }

  const results = [];
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const recognition of aiResult.recognitions) {
    try {
      const student = await Student.findOne({ rollNumber: recognition.roll_number }).populate('department');
      if (!student) continue;

      // Check for duplicate attendance today
      const existing = await Attendance.findOne({
        student: student._id,
        date: { $gte: new Date(dateStr), $lt: new Date(new Date(dateStr).getTime() + 86400000) },
        session: session || 'morning',
      });

      if (existing) {
        results.push({
          rollNumber: recognition.roll_number,
          name: recognition.name,
          status: 'duplicate',
          message: 'Attendance already marked for this session',
        });
        continue;
      }

      // Geo-fence validation
      let isWithinGeofence = true;
      let distanceFromCenter = 0;
      if (location && student.department?.geofence?.latitude) {
        const gf = student.department.geofence;
        distanceFromCenter = getDistance(location.latitude, location.longitude, gf.latitude, gf.longitude);
        isWithinGeofence = distanceFromCenter <= gf.radius;
        if (!isWithinGeofence) {
          results.push({
            rollNumber: recognition.roll_number,
            name: recognition.name,
            status: 'rejected',
            message: `Outside geofence (${Math.round(distanceFromCenter)}m from campus)`,
          });
          continue;
        }
      }

      // Time window validation — determine status
      let attendanceStatus = 'present';
      let minutesLate = 0;
      // (In production, fetch the configured window for this department/session)

      // Anti-spoofing gate
      if (aiResult.liveness_required && !recognition.is_live) {
        results.push({
          rollNumber: recognition.roll_number,
          name: recognition.name,
          status: 'rejected',
          message: 'Liveness check failed — spoof detected',
        });
        continue;
      }

      // Create attendance record
      const attendance = await Attendance.create({
        student: student._id,
        department: student.department._id,
        markedBy: req.user.id,
        date: new Date(dateStr),
        time: timeStr,
        status: attendanceStatus,
        method: 'face_recognition',
        session: session || 'morning',
        period,
        faceData: {
          confidenceScore: recognition.confidence,
          faceDetected: true,
          isLive: recognition.is_live,
          livenessScore: recognition.liveness_score,
          snapshotUrl: recognition.snapshot_url,
        },
        emotion: {
          detected: recognition.emotion?.dominant,
          scores: recognition.emotion?.scores,
        },
        maskDetection: {
          hasMask: recognition.has_mask,
          confidence: recognition.mask_confidence,
        },
        faceQuality: {
          score: recognition.quality_score,
          issues: recognition.quality_issues || [],
        },
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          isWithinGeofence,
          distanceFromCenter,
        } : undefined,
        minutesLate,
      });

      // Update student attendance stats asynchronously
      student.updateAttendanceStats().catch(e => logger.error(`Stats update error: ${e.message}`));

      // Send notification
      notificationService.sendAttendanceNotification(student, attendance).catch(e =>
        logger.error(`Notification error: ${e.message}`)
      );

      results.push({
        rollNumber: recognition.roll_number,
        name: recognition.name,
        status: 'success',
        attendanceStatus,
        confidence: recognition.confidence,
        emotion: recognition.emotion?.dominant,
        hasMask: recognition.has_mask,
        attendanceId: attendance._id,
      });

    } catch (err) {
      logger.error(`Attendance marking error for ${recognition.roll_number}: ${err.message}`);
      results.push({
        rollNumber: recognition.roll_number,
        status: 'error',
        message: 'Internal error while marking attendance',
      });
    }
  }

  res.json({
    success: true,
    message: `Processed ${results.length} face(s)`,
    results,
    unknownFaces: aiResult.unknown_faces || 0,
    processingTime: aiResult.processing_time_ms,
  });
};

// ─── Manual mark/override ─────────────────────────────────────
exports.markManual = async (req, res) => {
  const { studentId, date, status, session, notes, reason } = req.body;

  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const dateObj = new Date(date);
  const timeStr = new Date().toTimeString().slice(0, 5);

  const existing = await Attendance.findOne({
    student: student._id,
    date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) },
    session: session || 'morning',
  });

  if (existing) {
    existing.status = status;
    existing.isManualOverride = true;
    existing.manualOverrideReason = reason;
    existing.notes = notes;
    existing.markedBy = req.user.id;
    await existing.save();
    return res.json({ success: true, message: 'Attendance updated', attendance: existing });
  }

  const attendance = await Attendance.create({
    student: student._id,
    department: student.department,
    markedBy: req.user.id,
    date: dateObj,
    time: timeStr,
    status,
    method: 'manual',
    session: session || 'morning',
    notes,
    isManualOverride: true,
    manualOverrideReason: reason,
  });

  await student.updateAttendanceStats();

  res.status(201).json({ success: true, message: 'Attendance marked manually', attendance });
};

// ─── Get attendance records ───────────────────────────────────
exports.getAttendance = async (req, res) => {
  const {
    studentId, departmentId, date, startDate, endDate,
    status, session, page = 1, limit = 50,
  } = req.query;

  const filter = {};
  if (studentId) filter.student = studentId;
  if (departmentId) filter.department = departmentId;
  if (status) filter.status = status;
  if (session) filter.session = session;

  if (date) {
    const d = new Date(date);
    filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  } else if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  // Role-based access: students can only see their own
  if (req.user.role === 'student') {
    const studentProfile = await Student.findOne({ user: req.user.id });
    if (!studentProfile) return res.status(404).json({ success: false, message: 'Student profile not found' });
    filter.student = studentProfile._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'rollNumber user')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('department', 'name code')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: records.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: records,
  });
};

// ─── Get daily summary ────────────────────────────────────────
exports.getDailySummary = async (req, res) => {
  const { date, departmentId } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  const filter = {
    date: { $gte: new Date(dateStr), $lt: new Date(new Date(dateStr).getTime() + 86400000) },
  };
  if (departmentId) filter.department = departmentId;

  const summary = await Attendance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$faceData.confidenceScore' },
      },
    },
  ]);

  const emotionDistribution = await Attendance.aggregate([
    { $match: { ...filter, 'emotion.detected': { $exists: true, $ne: null } } },
    { $group: { _id: '$emotion.detected', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    date: dateStr,
    summary: summary.reduce((acc, item) => {
      acc[item._id] = { count: item.count, avgConfidence: item.avgConfidence };
      return acc;
    }, {}),
    emotionDistribution,
  });
};

// ─── Get student attendance details ──────────────────────────
exports.getStudentAttendance = async (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate, groupBy } = req.query;

  const student = await Student.findById(studentId).populate('user', 'name email').populate('department');
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const records = await Attendance.find({
    student: studentId,
    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
  }).sort({ date: -1 });

  // Calculate stats
  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    leave: records.filter(r => r.status === 'leave').length,
  };
  stats.percentage = stats.total > 0
    ? (((stats.present + stats.late * 0.5) / stats.total) * 100).toFixed(2)
    : 0;

  res.json({ success: true, student, stats, records });
};

// ─── Bulk mark attendance ────────────────────────────────────
exports.bulkMarkAttendance = async (req, res) => {
  const { records, date, session, departmentId } = req.body;

  if (!records?.length) {
    return res.status(400).json({ success: false, message: 'No records provided' });
  }

  const dateObj = new Date(date);
  const timeStr = new Date().toTimeString().slice(0, 5);
  const results = { success: [], failed: [], skipped: [] };

  for (const record of records) {
    try {
      const student = await Student.findOne({ rollNumber: record.rollNumber });
      if (!student) {
        results.failed.push({ rollNumber: record.rollNumber, reason: 'Student not found' });
        continue;
      }

      const existing = await Attendance.findOne({
        student: student._id,
        date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) },
        session,
      });

      if (existing) {
        results.skipped.push({ rollNumber: record.rollNumber, reason: 'Already marked' });
        continue;
      }

      await Attendance.create({
        student: student._id,
        department: departmentId || student.department,
        markedBy: req.user.id,
        date: dateObj,
        time: timeStr,
        status: record.status || 'present',
        method: 'manual',
        session,
        notes: record.notes,
      });

      results.success.push(record.rollNumber);
    } catch (err) {
      results.failed.push({ rollNumber: record.rollNumber, reason: err.message });
    }
  }

  res.json({ success: true, message: 'Bulk attendance processed', results });
};

// ─── Geo-distance utility ─────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dphi = (lat2 - lat1) * Math.PI / 180;
  const dlam = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
