const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: 1,
    max: 12,
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
  },
  batch: {
    type: String, // e.g., "2022-2026"
    trim: true,
  },
  guardianName: {
    type: String,
    trim: true,
  },
  guardianPhone: {
    type: String,
  },
  guardianEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  // Face recognition data
  faceImages: [{
    url: String,
    publicId: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  faceEmbedding: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaceEmbedding',
    default: null,
  },
  isFaceRegistered: {
    type: Boolean,
    default: false,
  },
  // Attendance statistics (cached for performance)
  attendanceStats: {
    totalClasses: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  // Leave statistics
  leaveBalance: {
    total: { type: Number, default: 15 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 15 },
  },
  // AI risk assessment
  attendanceRisk: {
    score: { type: Number, default: 0 }, // 0-100
    level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    predictedPercentage: Number,
    lastAssessed: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ─────────────────────────────────────────────────
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ department: 1, semester: 1 });
studentSchema.index({ 'attendanceStats.percentage': 1 });
studentSchema.index({ isActive: 1 });

// ─── Virtuals ─────────────────────────────────────────────────
studentSchema.virtual('attendancePercentage').get(function () {
  if (this.attendanceStats.totalClasses === 0) return 0;
  return ((this.attendanceStats.presentCount / this.attendanceStats.totalClasses) * 100).toFixed(2);
});

// ─── Methods ─────────────────────────────────────────────────
studentSchema.methods.updateAttendanceStats = async function () {
  const Attendance = mongoose.model('Attendance');
  const stats = await Attendance.aggregate([
    { $match: { student: this._id } },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
      },
    },
  ]);

  if (stats.length > 0) {
    const s = stats[0];
    const effectivePresent = s.presentCount + s.lateCount * 0.5;
    this.attendanceStats = {
      totalClasses: s.totalClasses,
      presentCount: s.presentCount,
      absentCount: s.absentCount,
      lateCount: s.lateCount,
      percentage: s.totalClasses > 0 ? ((effectivePresent / s.totalClasses) * 100).toFixed(2) : 0,
      lastUpdated: new Date(),
    };
    await this.save();
  }
};

module.exports = mongoose.model('Student', studentSchema);
