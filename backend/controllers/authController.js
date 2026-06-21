const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { Teacher, Student } = require('../models/index');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
  return { accessToken, refreshToken };
};

const sendTokenResponse = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store refresh token
  user.refreshTokens = user.refreshTokens || [];
  // Keep last 5 refresh tokens only
  if (user.refreshTokens.length >= 5) {
    user.refreshTokens.shift();
  }
  user.refreshTokens.push({ token: refreshToken });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  });
};

// ─── Register ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password, role: role || 'student', phone });

  // Send verification email
  const verifyToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await emailService.sendVerificationEmail(user.email, user.name, verifyToken);

  await sendTokenResponse(user, 201, res);
};

// ─── Login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  logger.info(`User login: ${email} (${user.role})`);
  await sendTokenResponse(user, 200, res);
};

// ─── Logout ───────────────────────────────────────────────────
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save({ validateBeforeSave: false });
    }
  }

  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── Refresh Token ────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.find(t => t.token === refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    await sendTokenResponse(user, 200, res);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─── Get Current User ─────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Attach role-specific profile
  let profile = null;
  if (user.role === 'student') {
    profile = await Student.findOne({ user: user._id }).populate('department', 'name code');
  } else if (user.role === 'teacher') {
    profile = await Teacher.findOne({ user: user._id }).populate('department', 'name code');
  }

  res.json({ success: true, user: user.toSafeObject(), profile });
};

// ─── Forgot Password ──────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists
    return res.json({ success: true, message: 'If the email is registered, you will receive a reset link.' });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);

  res.json({ success: true, message: 'Password reset email sent.' });
};

// ─── Reset Password ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  logger.info(`Password reset for: ${user.email}`);
  await sendTokenResponse(user, 200, res);
};

// ─── Change Password ──────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
};

// ─── Verify Email ─────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully' });
};
