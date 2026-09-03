import express from 'express';
import User from '../models/user.model.js';
import { authorize, protect } from '../middleware/auth.middleware.js';
import { createActivityLog } from '../utils/activity.js';

const router = express.Router();
router.use(protect);

const safeUserProjection = '-password -refreshToken -resetPasswordToken -resetPasswordExpire';
const mapEmploymentStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return {
    active: 'active',
    inactive: 'inactive',
    'on leave': 'on_leave',
    on_leave: 'on_leave',
    terminated: 'terminated',
  }[normalized] || undefined;
};

router.get('/', authorize('superAdmin', 'manager'), async (req, res) => {
  try {
    const users = await User.find()
      .select(safeUserProjection)
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authorize('superAdmin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(safeUserProjection);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('superAdmin'), async (req, res) => {
  try {
    const employmentStatus = mapEmploymentStatus(req.body.employmentStatus || req.body.status) || 'active';
    const user = await User.create({
      ...req.body,
      employmentStatus,
      approvalStatus: req.body.approvalStatus || 'approved',
      isActive: req.body.isActive ?? employmentStatus === 'active',
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });

    await createActivityLog({
      actor: req.user,
      action: 'user.created',
      entityType: 'user',
      entityId: user._id,
      title: 'User created',
      description: `${user.name} was created as ${user.role}.`,
      relatedUser: user._id,
    });

    const sanitized = await User.findById(user._id).select(safeUserProjection);
    res.status(201).json({ success: true, user: sanitized });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('superAdmin'), async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'email',
      'role',
      'phone',
      'department',
      'position',
      'salary',
      'joinDate',
      'notes',
      'manager',
      'isActive',
      'permissions',
      'assignedBrands',
      'approvalStatus',
      'employmentStatus',
    ];

    const updates = allowedFields.reduce((payload, field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) payload[field] = req.body[field];
      return payload;
    }, {});

    const derivedEmploymentStatus = mapEmploymentStatus(req.body.status || req.body.employmentStatus);
    if (derivedEmploymentStatus) {
      updates.employmentStatus = derivedEmploymentStatus;
      updates.isActive = derivedEmploymentStatus === 'active';
    }

    const unset = {};

    if (updates.approvalStatus === 'approved') {
      updates.isActive = true;
      updates.approvedBy = req.user._id;
      updates.approvedAt = new Date();
      unset.rejectedAt = '';
    }

    if (updates.approvalStatus === 'rejected') {
      updates.isActive = false;
      updates.rejectedAt = new Date();
    }

    if (updates.approvalStatus === 'pending') {
      updates.isActive = false;
      unset.approvedBy = '';
      unset.approvedAt = '';
      unset.rejectedAt = '';
    }

    const updateDoc = Object.keys(unset).length ? { $set: updates, $unset: unset } : { $set: updates };
    const user = await User.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true }).select(safeUserProjection);

    // Invalidate session & force logout target user alone if permissions, role, or account deactivation occurred
    const shouldInvalidateSession =
      updates.permissions !== undefined ||
      updates.role !== undefined ||
      updates.isActive === false ||
      updates.approvalStatus === 'rejected' ||
      updates.employmentStatus === 'terminated';

    if (shouldInvalidateSession && user) {
      await User.findByIdAndUpdate(req.params.id, {
        passwordChangedAt: new Date(),
        refreshToken: null,
      });

      const io = req.app?.get('io') || global.io;
      if (io) {
        const isSelf = String(req.user._id) === String(user._id);
        const reason = updates.isActive === false || updates.approvalStatus === 'rejected' || updates.employmentStatus === 'terminated'
          ? 'account_deactivated'
          : 'permissions_updated';
        const msg = reason === 'account_deactivated'
          ? 'Your account has been deactivated. Please contact an administrator.'
          : (isSelf
              ? 'Your permissions or role were updated. Please log in again.'
              : 'Your permissions or role were updated by an administrator. Please log in again.');

        if (typeof io.sendToUser === 'function') {
          io.sendToUser(user._id.toString(), 'forceLogout', { reason, message: msg });
        } else if (io.to) {
          io.to(`user:${user._id.toString()}`).emit('forceLogout', { reason, message: msg });
        }
      }
    }

    await createActivityLog({
      actor: req.user,
      action: 'user.updated',
      entityType: 'user',
      entityId: user._id,
      title: 'User updated',
      description: `${user.name} was updated.`,
      relatedUser: user._id,
      metadata: { fields: Object.keys(updates) },
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/password', authorize('superAdmin', 'admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id).select('+password +refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.refreshToken = null;
    await user.save();

    const io = req.app?.get('io') || global.io;
    if (io) {
      const isSelf = String(req.user._id) === String(user._id);
      const msg = isSelf
        ? 'Your password was changed. Please log in again with your new password.'
        : 'Your password was changed by an administrator. Please log in with your new password.';

      if (typeof io.sendToUser === 'function') {
        io.sendToUser(user._id.toString(), 'forceLogout', { reason: 'password_changed', message: msg });
      } else if (io.to) {
        io.to(`user:${user._id.toString()}`).emit('forceLogout', { reason: 'password_changed', message: msg });
      }
    }

    await createActivityLog({
      actor: req.user,
      action: 'user.password.updated',
      entityType: 'user',
      entityId: user._id,
      title: 'User password changed',
      description: `${user.name}'s password was changed by an admin.`,
      relatedUser: user._id,
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:id/approval', authorize('superAdmin'), async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status' });
    }

    const set = { approvalStatus };
    const unset = {};
    if (approvalStatus === 'approved') {
      set.isActive = true;
      set.approvedBy = req.user._id;
      set.approvedAt = new Date();
      unset.rejectedAt = '';
    }
    if (approvalStatus === 'rejected') {
      set.isActive = false;
      set.rejectedAt = new Date();
    }
    if (approvalStatus === 'pending') {
      set.isActive = false;
      unset.approvedBy = '';
      unset.approvedAt = '';
      unset.rejectedAt = '';
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true }).select(safeUserProjection);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (approvalStatus === 'rejected' || approvalStatus === 'pending') {
      await User.findByIdAndUpdate(req.params.id, {
        passwordChangedAt: new Date(),
        refreshToken: null,
      });

      const io = req.app?.get('io') || global.io;
      if (io) {
        const msg = 'Your account status was updated. Please contact an administrator.';
        if (typeof io.sendToUser === 'function') {
          io.sendToUser(user._id.toString(), 'forceLogout', { reason: 'approval_changed', message: msg });
        } else if (io.to) {
          io.to(`user:${user._id.toString()}`).emit('forceLogout', { reason: 'approval_changed', message: msg });
        }
      }
    }

    await createActivityLog({
      actor: req.user,
      action: 'user.approval.updated',
      entityType: 'user',
      entityId: user._id,
      title: 'User approval updated',
      description: `${user.name} approval status changed to ${approvalStatus}.`,
      relatedUser: user._id,
      metadata: { approvalStatus },
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authorize('superAdmin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await createActivityLog({
      actor: req.user,
      action: 'user.deleted',
      entityType: 'user',
      entityId: user._id,
      title: 'User deleted',
      description: `${user.name} was deleted.`,
      relatedUser: user._id,
    });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
