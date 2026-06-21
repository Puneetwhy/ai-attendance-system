// ═══════════════════════════════════════════════
// models/Department.js
// ═══════════════════════════════════════════════
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  description: String,
  totalSemesters: {
    type: Number,
    default: 8,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Geo-fencing for the department/campus
  geofence: {
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    radius: { type: Number, default: 200 }, // meters
    address: String,
  },
  // Attendance time windows
  attendanceWindows: [{
    name: String, // "Morning Session"
    startTime: String, // "09:00"
    endTime: String,   // "09:30"
    lateThreshold: String, // "09:10" — after this = late
    session: { type: String, enum: ['morning', 'afternoon', 'evening'] },
    days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

departmentSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'department',
  count: true,
});

const Department = mongoose.model('Department', departmentSchema);


// ═══════════════════════════════════════════════
// models/Teacher.js
// ═══════════════════════════════════════════════
const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Instructor'],
    default: 'Lecturer',
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  }],
  classes: [{
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    semester: Number,
    section: String,
  }],
  qualification: String,
  experience: Number, // in years
  joiningDate: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);


// ═══════════════════════════════════════════════
// models/Leave.js
// ═══════════════════════════════════════════════
const leaveSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  type: {
    type: String,
    enum: ['medical', 'personal', 'family', 'official', 'other'],
    required: true,
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required'],
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required'],
  },
  numberOfDays: {
    type: Number,
    required: true,
  },
  documents: [{
    url: String,
    publicId: String,
    name: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: Date,
  reviewComments: String,
  isUrgent: { type: Boolean, default: false },
  notificationSent: { type: Boolean, default: false },
}, {
  timestamps: true,
});

leaveSchema.index({ student: 1, status: 1 });
leaveSchema.index({ fromDate: 1, toDate: 1 });

const Leave = mongoose.model('Leave', leaveSchema);


// ═══════════════════════════════════════════════
// models/FaceEmbedding.js
// ═══════════════════════════════════════════════
const faceEmbeddingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  // InsightFace 512-dim embeddings (one per registered face image)
  embeddings: [{
    vector: [Number], // 512-dimensional face embedding
    imageUrl: String,
    quality: Number,
    createdAt: { type: Date, default: Date.now },
  }],
  // Average embedding for fast comparison
  averageEmbedding: [Number],
  encodingVersion: {
    type: String,
    default: 'insightface_v1',
  },
  totalImages: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

const FaceEmbedding = mongoose.model('FaceEmbedding', faceEmbeddingSchema);


// ═══════════════════════════════════════════════
// models/Notification.js
// ═══════════════════════════════════════════════
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'attendance_marked',
      'leave_applied',
      'leave_approved',
      'leave_rejected',
      'low_attendance_warning',
      'attendance_report',
      'system',
    ],
    required: true,
  },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  channels: {
    email: { sent: Boolean, sentAt: Date },
    whatsapp: { sent: Boolean, sentAt: Date },
    push: { sent: Boolean, sentAt: Date },
  },
  metadata: mongoose.Schema.Types.Mixed, // extra data (attendanceId, leaveId, etc.)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
}, {
  timestamps: true,
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);


// ═══════════════════════════════════════════════
// models/Settings.js (system-wide settings)
// ═══════════════════════════════════════════════
const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true,
  },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);


// ═══════════════════════════════════════════════
// models/Subject.js
// ═══════════════════════════════════════════════
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  semester: { type: Number, required: true },
  credits: { type: Number, default: 3 },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);


module.exports = { Department, Teacher, Leave, FaceEmbedding, Notification, Settings, Subject };
