const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const { uploadProfileImage, uploadFaceData } = require('../config/cloudinary');
const multer = require('multer');
const csvUpload = multer({ dest: '/tmp/csv-uploads/' });

router.use(protect);

// ─── Internal: AI service fetches all face embeddings ────────
// Protected by a shared secret header instead of JWT (service-to-service)
router.get('/face-embeddings/all', async (req, res) => {
  const secret = req.headers['x-ai-service-key'];
  if (secret !== (process.env.AI_SERVICE_SECRET || 'ai-service-secret')) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const Student = require('../models/Student');
  const { FaceEmbedding } = require('../models/index');

  const students = await Student.find({ isFaceRegistered: true })
    .populate('user', 'name')
    .populate('faceEmbedding');

  const data = students
    .filter(s => s.faceEmbedding)
    .map(s => ({
      student_id: s._id.toString(),
      roll_number: s.rollNumber,
      name: s.user?.name || s.rollNumber,
      embeddings: s.faceEmbedding.embeddings.map(e => ({ vector: e.vector })),
    }));

  res.json({ success: true, data });
});

router.get('/', authorize('admin', 'teacher'), studentController.getStudents);
router.post('/', authorize('admin'), uploadProfileImage.single('profileImage'), studentController.createStudent);
router.post('/bulk-import', authorize('admin'), csvUpload.single('csvFile'), studentController.bulkImport);

router.get('/:id', authorize('admin', 'teacher', 'student'), studentController.getStudent);
router.put('/:id', authorize('admin'), uploadProfileImage.single('profileImage'), studentController.updateStudent);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);

// Face registration
router.post('/:id/register-face', authorize('admin', 'student'), uploadFaceData.array('faceImages', 10), studentController.registerFace);
router.delete('/:id/face-data', authorize('admin'), studentController.deleteFaceData);

module.exports = router;
