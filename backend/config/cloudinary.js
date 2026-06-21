const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for profile images
const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendance/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

// Storage for face recognition dataset images
const faceDataStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendance/face-data',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

// Storage for leave documents
const leaveDocStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendance/leave-docs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
  },
});

// Storage for attendance snapshots
const attendanceSnapshotStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendance/snapshots',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

// Multer upload instances
const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

const uploadFaceData = multer({
  storage: faceDataStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

const uploadLeaveDoc = multer({
  storage: leaveDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadAttendanceSnapshot = multer({
  storage: attendanceSnapshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Utility: delete a Cloudinary resource by URL
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    const urlParts = imageUrl.split('/');
    const folderAndFile = urlParts.slice(-2).join('/');
    const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // remove extension
    await cloudinary.uploader.destroy(`attendance/${publicId}`);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = {
  cloudinary,
  uploadProfileImage,
  uploadFaceData,
  uploadLeaveDoc,
  uploadAttendanceSnapshot,
  deleteFromCloudinary,
};
