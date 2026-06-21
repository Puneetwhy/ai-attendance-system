const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String, // "HH:MM" format
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'leave', 'holiday'],
    required: true,
  },
  method: {
    type: String,
    enum: ['face_recognition', 'manual', 'bulk_import', 'qr_code'],
    default: 'face_recognition',
  },

  // ── Face Recognition Data ────────────────────────────────
  faceData: {
    confidenceScore: { type: Number, min: 0, max: 1 },
    faceDetected: { type: Boolean, default: false },
    isLive: { type: Boolean, default: null }, // anti-spoofing result
    livenessScore: { type: Number, min: 0, max: 1 },
    snapshotUrl: { type: String }, // Cloudinary URL of captured frame
  },

  // ── Emotion Detection ────────────────────────────────────
  emotion: {
    detected: { type: String, enum: ['happy', 'sad', 'angry', 'neutral', 'fear', 'surprise', 'disgust', 'unknown'] },
    scores: {
      happy: Number,
      sad: Number,
      angry: Number,
      neutral: Number,
      fear: Number,
      surprise: Number,
      disgust: Number,
    },
  },

  // ── Mask Detection ───────────────────────────────────────
  maskDetection: {
    hasMask: { type: Boolean, default: false },
    confidence: { type: Number },
  },

  // ── Face Quality ─────────────────────────────────────────
  faceQuality: {
    score: { type: Number }, // 0-100
    issues: [String], // ['blur', 'low_light', 'bad_angle', etc.]
  },

  // ── Geo-Fencing ──────────────────────────────────────────
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    isWithinGeofence: { type: Boolean, default: true },
    distanceFromCenter: Number, // meters
  },

  // ── Session Info ─────────────────────────────────────────
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    default: 'morning',
  },
  period: {
    type: Number, // class period number
  },

  // ── Time Tracking ────────────────────────────────────────
  attendanceWindow: {
    start: String, // "09:00"
    end: String,   // "09:30"
  },
  minutesLate: {
    type: Number,
    default: 0,
  },

  // ── Metadata ─────────────────────────────────────────────
  ipAddress: String,
  deviceInfo: String,
  notes: String,
  isManualOverride: { type: Boolean, default: false },
  manualOverrideReason: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Compound Indexes ─────────────────────────────────────────
attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ student: 1, date: 1, session: 1 }, { unique: true });
attendanceSchema.index({ department: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ markedBy: 1, date: 1 });

// ─── Static Methods ───────────────────────────────────────────
attendanceSchema.statics.getStudentStats = async function (studentId, startDate, endDate) {
  const match = { student: mongoose.Types.ObjectId(studentId) };
  if (startDate && endDate) {
    match.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

attendanceSchema.statics.getDepartmentReport = async function (departmentId, date) {
  return this.aggregate([
    {
      $match: {
        department: mongoose.Types.ObjectId(departmentId),
        date: new Date(date),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        students: { $push: '$student' },
      },
    },
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);
