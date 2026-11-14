import bcrypt from 'bcryptjs';
import FinanceSecurity from '../models/financeSecurity.model.js';
import { recordFinanceAudit } from '../services/financeCalculation.service.js';

const DEFAULT_PASSWORDS = ['RiseFinance@2026', 'RiseWithMedia@2026', 'admin123', '2026'];

/**
 * Verify Finance Portal Login Password
 */
export const verifyFinancePassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Finance password is required' });
    }

    const orgId = req.user?.organizationId || null;
    const secDoc = await FinanceSecurity.findOne({
      $or: [{ organizationId: orgId }, { organizationId: null }],
    }).sort({ updatedAt: -1 });

    let isValid = false;

    if (secDoc && secDoc.passwordHash) {
      isValid = await bcrypt.compare(password, secDoc.passwordHash);
      // Fallback: also accept DEFAULT_PASSWORDS if not changed or recovery
      if (!isValid && DEFAULT_PASSWORDS.includes(password)) {
        isValid = true;
      }
    } else {
      // No custom password set yet, check default passwords
      isValid = DEFAULT_PASSWORDS.includes(password);
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Finance password. Please verify your credentials.',
      });
    }

    // Record audit
    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'LOGIN',
      entityType: 'FinancePortal',
      metadata: { ip: req.ip },
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Finance Portal unlocked successfully',
      authenticated: true,
      user: {
        id: req.user?._id,
        name: req.user?.name,
        role: req.user?.role,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('verifyFinancePassword error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Finance Security Status
 */
export const getFinanceSecurityStatus = async (req, res) => {
  try {
    const orgId = req.user?.organizationId || null;
    const secDoc = await FinanceSecurity.findOne({
      $or: [{ organizationId: orgId }, { organizationId: null }],
    }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      isProtectionEnabled: secDoc?.isProtectionEnabled ?? true,
      hasCustomPassword: Boolean(secDoc?.passwordHash),
      lastChangedAt: secDoc?.updatedAt || null,
      autoLockMinutes: secDoc?.autoLockMinutes || 60,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Change Finance Password
 */
export const changeFinancePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long',
      });
    }

    const orgId = req.user?.organizationId || null;
    let secDoc = await FinanceSecurity.findOne({
      $or: [{ organizationId: orgId }, { organizationId: null }],
    }).sort({ updatedAt: -1 });

    // Validate current password if custom password was set
    if (secDoc && secDoc.passwordHash) {
      const match = await bcrypt.compare(currentPassword, secDoc.passwordHash);
      if (!match && !DEFAULT_PASSWORDS.includes(currentPassword)) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
    } else {
      if (!DEFAULT_PASSWORDS.includes(currentPassword)) {
        return res.status(401).json({
          success: false,
          message: 'Current default password is incorrect',
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (secDoc) {
      secDoc.passwordHash = passwordHash;
      secDoc.lastChangedBy = req.user?._id;
      secDoc.isProtectionEnabled = true;
      await secDoc.save();
    } else {
      secDoc = await FinanceSecurity.create({
        organizationId: orgId,
        passwordHash,
        lastChangedBy: req.user?._id,
        isProtectionEnabled: true,
      });
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'UPDATE',
      entityType: 'FinanceSecurity',
      metadata: { changedBy: req.user?.name },
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Finance password updated successfully',
    });
  } catch (error) {
    console.error('changeFinancePassword error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
