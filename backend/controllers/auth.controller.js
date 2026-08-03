// =============================================
// AUTH CONTROLLER
// =============================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';
import { sendEmail } from '../utils/email.js';
import { createNotification } from '../utils/notification.js';

// Generate access token (set to long lifetime: 30 days so users stay logged in)
const generateAccessToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'dev-super-secret-jwt-key';
  const expire = process.env.JWT_EXPIRE || '30d';
  return jwt.sign({ id, role }, secret, { expiresIn: expire });
};

// Generate refresh token (set to long lifetime: 365 days)
const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev-super-secret-refresh-key';
  const expire = process.env.JWT_REFRESH_EXPIRE || '365d';
  return jwt.sign({ id }, secret, { expiresIn: expire });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Only superAdmin can create superAdmin accounts
    const safeRole = ['employee', 'client', 'referral', 'manager'].includes(role) ? role : 'employee';

    const newUser = await User.create({
      name,
      email,
      password,
      role: safeRole,
      isActive: false,
      approvalStatus: 'pending',
    });

    // If it's a client, also create a Client profile
    if (safeRole === 'client') {
      const client = await Client.create({
        name,
        email,
        company: name, // Default company name to user's name
        status: 'onboarding',
        userId: newUser._id,
        portalEnabled: true,
      });

      // Update user with clientId
      newUser.clientId = client._id;
      await newUser.save();
    }

    // Emit event for real-time dashboard updates
    const io = req.app.get('io');
    if (io) {
      io.emit('userCreated', { role: safeRole });
    }

    res.status(201).json({
      success: true,
      message: 'Registration submitted. A super admin must approve your account before you can sign in.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is waiting for super admin approval' });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({ success: false, message: 'Your account request was rejected' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated' });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        position: user.position,
        referralCode: user.referralCode,
        permissions: user.permissions,
        clientId: user.clientId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('clientId');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with that email' });
    }

    // Get active superAdmin users
    const admins = await User.find({ role: 'superAdmin', isActive: true });
    const io = req.app.get('io');

    await Promise.all(
      admins.map((admin) =>
        createNotification(
          {
            recipient: admin._id,
            sender: user._id,
            type: 'system',
            title: 'Password Change Request',
            message: `${user.name} (${user.email}) has requested a password change.`,
            link: '/admin/users',
          },
          io
        )
      )
    );

    res.json({ success: true, message: 'Password reset request has been sent to the administrator' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, department, position, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, department, position, avatar },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetPasswordToken -resetPasswordExpire');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current password' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
