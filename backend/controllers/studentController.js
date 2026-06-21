const axios = require('axios');
const User = require('../models/User');
const Student = require('../models/Student');
const { FaceEmbedding, Department } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ─── Create student ───────────────────────────────────────────
exports.createStudent = async (req, res) => {
  const {
    name, email, password, phone, rollNumber, departmentId,
    semester, section, batch, guardianName, guardianPhone, guardianEmail, address,
  } = req.body;

  // Check if roll number or email already exists
  const [existingUser, existingStudent] = await Promise.all([
    User.findOne({ email }),
    Student.findOne({ rollNumber }),
  ]);

  if (existingUser) return res.status(409).json({ success: false, message: 'Email already registered' });
  if (existingStudent) return res.status(409).json({ success: false, message: 'Roll number already exists' });

  const department = await Department.findById(departmentId);
  if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

  // Create user account
  const user = await User.create({
    name,
    email,
    password: password || `${rollNumber}@${new Date().getFullYear()}`,
    role: 'student',
    phone,
    profileImage: req.file?.path || null,
  });

  // Create student profile
  const student = await Student.create({
    user: user._id,
    rollNumber,
    department: departmentId,
    semester,
    section,
    batch,
    guardianName,
    guardianPhone,
    guardianEmail,
    address,
  });

  await student.populate([
    { path: 'user', select: '-password -refreshTokens' },
    { path: 'department', select: 'name code' },
  ]);

  res.status(201).json({ success: true, message: 'Student created successfully', student });
};

// ─── Get all students ─────────────────────────────────────────
exports.getStudents = async (req, res) => {
  const {
    search, departmentId, semester, section, isActive = true,
    isFaceRegistered, page = 1, limit = 20, sortBy = 'rollNumber', sortOrder = 'asc',
  } = req.query;

  const studentFilter = { isActive: isActive === 'false' ? false : true };
  if (departmentId) studentFilter.department = departmentId;
  if (semester) studentFilter.semester = parseInt(semester);
  if (section) studentFilter.section = section.toUpperCase();
  if (isFaceRegistered !== undefined) studentFilter.isFaceRegistered = isFaceRegistered === 'true';

  // Text search on user fields
  let userIds;
  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
      role: 'student',
    }).select('_id');
    const rollSearch = { rollNumber: { $regex: search, $options: 'i' } };
    studentFilter.$or = [{ user: { $in: users.map(u => u._id) } }, rollSearch];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [students, total] = await Promise.all([
    Student.find(studentFilter)
      .populate('user', 'name email phone profileImage isActive lastLogin')
      .populate('department', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Student.countDocuments(studentFilter),
  ]);

  res.json({
    success: true,
    count: students.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: students,
  });
};

// ─── Get single student ───────────────────────────────────────
exports.getStudent = async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('user', '-password -refreshTokens -resetPasswordToken')
    .populate('department', 'name code geofence attendanceWindows')
    .populate('faceEmbedding');

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  res.json({ success: true, student });
};

// ─── Update student ───────────────────────────────────────────
exports.updateStudent = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const { name, email, phone, semester, section, batch, guardianName, guardianPhone, guardianEmail, address } = req.body;

  // Update user info
  const userUpdates = {};
  if (name) userUpdates.name = name;
  if (email) userUpdates.email = email;
  if (phone) userUpdates.phone = phone;
  if (req.file) {
    userUpdates.profileImage = req.file.path;
    // Delete old profile image from Cloudinary
    const oldUser = await User.findById(student.user);
    if (oldUser?.profileImage) await deleteFromCloudinary(oldUser.profileImage);
  }

  await User.findByIdAndUpdate(student.user, userUpdates, { runValidators: true });

  // Update student info
  const studentUpdates = {};
  if (semester) studentUpdates.semester = semester;
  if (section) studentUpdates.section = section;
  if (batch) studentUpdates.batch = batch;
  if (guardianName) studentUpdates.guardianName = guardianName;
  if (guardianPhone) studentUpdates.guardianPhone = guardianPhone;
  if (guardianEmail) studentUpdates.guardianEmail = guardianEmail;
  if (address) studentUpdates.address = address;
  if (req.body.departmentId) studentUpdates.department = req.body.departmentId;

  const updatedStudent = await Student.findByIdAndUpdate(req.params.id, studentUpdates, {
    new: true, runValidators: true,
  }).populate('user', '-password -refreshTokens').populate('department', 'name code');

  res.json({ success: true, message: 'Student updated successfully', student: updatedStudent });
};

// ─── Delete student ───────────────────────────────────────────
exports.deleteStudent = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  // Soft delete
  student.isActive = false;
  await student.save();
  await User.findByIdAndUpdate(student.user, { isActive: false });

  res.json({ success: true, message: 'Student deactivated successfully' });
};

// ─── Upload/Register face images ──────────────────────────────
exports.registerFace = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: 'At least one face image is required' });
  }

  // Store uploaded images
  const faceImages = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
  }));

  student.faceImages.push(...faceImages);
  await student.save();

  // Generate face embeddings via AI service
  try {
    const embeddingResponse = await axios.post(`${AI_SERVICE_URL}/api/register-face`, {
      student_id: student._id.toString(),
      roll_number: student.rollNumber,
      image_urls: faceImages.map(f => f.url),
    }, { timeout: 60000 });

    if (embeddingResponse.data.success) {
      // Save embeddings
      let faceEmbedding = await FaceEmbedding.findOne({ student: student._id });
      if (!faceEmbedding) {
        faceEmbedding = new FaceEmbedding({ student: student._id, embeddings: [], totalImages: 0 });
      }

      faceEmbedding.embeddings.push(...embeddingResponse.data.embeddings.map((e, i) => ({
        vector: e.vector,
        imageUrl: faceImages[i]?.url,
        quality: e.quality,
      })));
      faceEmbedding.averageEmbedding = embeddingResponse.data.average_embedding;
      faceEmbedding.totalImages = faceEmbedding.embeddings.length;
      faceEmbedding.lastUpdated = new Date();
      await faceEmbedding.save();

      student.faceEmbedding = faceEmbedding._id;
      student.isFaceRegistered = true;
      await student.save();

      res.json({
        success: true,
        message: `Face registered successfully. ${embeddingResponse.data.embeddings.length} embeddings generated.`,
        totalImages: faceEmbedding.totalImages,
      });
    } else {
      res.status(422).json({
        success: false,
        message: 'Face registration failed: ' + embeddingResponse.data.message,
      });
    }
  } catch (err) {
    logger.error(`Face embedding error: ${err.message}`);
    res.status(503).json({ success: false, message: 'AI service unavailable. Images saved, embeddings will be generated later.' });
  }
};

// ─── Delete face data ─────────────────────────────────────────
exports.deleteFaceData = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  // Remove face images from Cloudinary
  for (const img of student.faceImages) {
    await deleteFromCloudinary(img.url);
  }

  student.faceImages = [];
  student.isFaceRegistered = false;
  student.faceEmbedding = null;
  await student.save();

  // Remove embedding from DB and AI service
  await FaceEmbedding.findOneAndDelete({ student: student._id });
  await axios.delete(`${AI_SERVICE_URL}/api/face/${student.rollNumber}`).catch(() => {});

  res.json({ success: true, message: 'Face data deleted successfully' });
};

// ─── Bulk CSV import ──────────────────────────────────────────
exports.bulkImport = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required' });

  const Papa = require('papaparse');
  const fs = require('fs');

  const fileContent = fs.readFileSync(req.file.path, 'utf-8');
  const { data, errors } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/ /g, '_'),
  });

  if (errors.length) {
    return res.status(400).json({ success: false, message: 'CSV parse errors', errors });
  }

  const results = { created: [], failed: [], skipped: [] };

  for (const row of data) {
    try {
      const [existingUser, existingStudent] = await Promise.all([
        User.findOne({ email: row.email }),
        Student.findOne({ rollNumber: row.roll_number?.toUpperCase() }),
      ]);

      if (existingUser || existingStudent) {
        results.skipped.push({ rollNumber: row.roll_number, reason: 'Already exists' });
        continue;
      }

      const department = await Department.findOne({ code: row.department_code?.toUpperCase() });
      if (!department) {
        results.failed.push({ rollNumber: row.roll_number, reason: 'Invalid department code' });
        continue;
      }

      const user = await User.create({
        name: row.name,
        email: row.email,
        password: row.roll_number + '@2024',
        role: 'student',
        phone: row.phone,
      });

      await Student.create({
        user: user._id,
        rollNumber: row.roll_number?.toUpperCase(),
        department: department._id,
        semester: parseInt(row.semester) || 1,
        section: row.section?.toUpperCase(),
        batch: row.batch,
        guardianName: row.guardian_name,
        guardianPhone: row.guardian_phone,
      });

      results.created.push(row.roll_number);
    } catch (err) {
      results.failed.push({ rollNumber: row.roll_number, reason: err.message });
    }
  }

  // Cleanup temp file
  require('fs').unlinkSync(req.file.path);

  res.json({
    success: true,
    message: `Import complete: ${results.created.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed`,
    results,
  });
};
