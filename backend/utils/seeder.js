require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Department, Teacher } = require('../models/index');
const Student = require('../models/Student');
const logger = require('./logger');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data (development only)
    if (process.env.NODE_ENV !== 'production') {
      await Promise.all([
        User.deleteMany({}),
        Department.deleteMany({}),
        Student.deleteMany({}),
        Teacher.deleteMany({}),
      ]);
      logger.info('Cleared existing data');
    }

    // Create departments
    const departments = await Department.insertMany([
      { name: 'Computer Science', code: 'CS', totalSemesters: 8, geofence: { latitude: 28.6139, longitude: 77.2090, radius: 300, address: 'Main Campus' } },
      { name: 'Electronics & Communication', code: 'EC', totalSemesters: 8, geofence: { latitude: 28.6140, longitude: 77.2091, radius: 300, address: 'Main Campus' } },
      { name: 'Mechanical Engineering', code: 'ME', totalSemesters: 8, geofence: { latitude: 28.6141, longitude: 77.2092, radius: 300, address: 'Main Campus' } },
      { name: 'Civil Engineering', code: 'CE', totalSemesters: 8, geofence: { latitude: 28.6142, longitude: 77.2093, radius: 300, address: 'Main Campus' } },
    ]);
    logger.info(`Created ${departments.length} departments`);

    // Create admin
    const adminUser = await User.create({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@school.edu',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`Created admin: ${adminUser.email}`);

    // Create teachers
    const teacherData = [
      { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@school.edu', password: 'Teacher@123', role: 'teacher', isEmailVerified: true },
      { name: 'Prof. Priya Sharma', email: 'priya.sharma@school.edu', password: 'Teacher@123', role: 'teacher', isEmailVerified: true },
      { name: 'Dr. Amit Singh', email: 'amit.singh@school.edu', password: 'Teacher@123', role: 'teacher', isEmailVerified: true },
    ];
    const teacherUsers = [];
    for (const t of teacherData) {
      teacherUsers.push(await User.create(t));
    }

    await Teacher.insertMany(teacherUsers.map((u, i) => ({
      user: u._id,
      employeeId: `EMP00${i + 1}`,
      department: departments[i % departments.length]._id,
      designation: 'Assistant Professor',
    })));
    logger.info(`Created ${teacherUsers.length} teachers`);

    // Create students
    const studentData = [
      { name: 'Arjun Patel', email: 'arjun.patel@student.edu', rollNumber: 'CS2021001', deptIdx: 0, semester: 6 },
      { name: 'Ananya Gupta', email: 'ananya.gupta@student.edu', rollNumber: 'CS2021002', deptIdx: 0, semester: 6 },
      { name: 'Rohit Verma', email: 'rohit.verma@student.edu', rollNumber: 'EC2021001', deptIdx: 1, semester: 5 },
      { name: 'Sneha Reddy', email: 'sneha.reddy@student.edu', rollNumber: 'CS2021003', deptIdx: 0, semester: 6 },
      { name: 'Vikram Yadav', email: 'vikram.yadav@student.edu', rollNumber: 'ME2021001', deptIdx: 2, semester: 4 },
      { name: 'Pooja Iyer', email: 'pooja.iyer@student.edu', rollNumber: 'CS2022001', deptIdx: 0, semester: 4 },
      { name: 'Karan Malhotra', email: 'karan.malhotra@student.edu', rollNumber: 'EC2022001', deptIdx: 1, semester: 3 },
      { name: 'Meera Nair', email: 'meera.nair@student.edu', rollNumber: 'CE2021001', deptIdx: 3, semester: 6 },
    ];

    for (const s of studentData) {
      const user = await User.create({
        name: s.name,
        email: s.email,
        password: `${s.rollNumber}@2024`,
        role: 'student',
        isEmailVerified: true,
      });
      await Student.create({
        user: user._id,
        rollNumber: s.rollNumber,
        department: departments[s.deptIdx]._id,
        semester: s.semester,
        section: 'A',
        batch: '2021-2025',
        attendanceStats: {
          totalClasses: Math.floor(Math.random() * 50) + 30,
          presentCount: Math.floor(Math.random() * 40) + 20,
          percentage: (Math.random() * 30 + 65).toFixed(2),
        },
      });
    }
    logger.info(`Created ${studentData.length} students`);

    logger.info('✅ Database seeded successfully!');
    logger.info('\nDefault Login Credentials:');
    logger.info(`Admin: ${process.env.ADMIN_EMAIL || 'admin@school.edu'} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    logger.info('Teachers: rajesh.kumar@school.edu / Teacher@123');
    logger.info('Student: arjun.patel@student.edu / CS2021001@2024');
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

seedData();