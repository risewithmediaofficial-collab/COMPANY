// =============================================
// SOP ROUTES
// =============================================

import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import SOP from '../models/sop.model.js';
import User from '../models/user.model.js';

const router = express.Router();

const isAdmin = (user) => user.role === 'superAdmin';
const canManageSop = (user) => ['superAdmin', 'manager'].includes(user.role);

const mapUserRoleToSopRole = (role) => {
  if (role === 'superAdmin') return 'admin';
  return role;
};

router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    const { status, sopType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (sopType) query.sopType = sopType;

    const orgFilter = user.organizationId
      ? { $or: [{ organizationId: user.organizationId }, { organizationId: null }, { organizationId: { $exists: false } }] }
      : null;

    if (!isAdmin(user)) {
      const sopRole = mapUserRoleToSopRole(user.role);
      const userPos = user.position ? user.position.toLowerCase() : null;

      query.$or = [
        { sopType: 'company' },
        { sopType: 'department' },
        { sopType: 'role_based', role: { $in: [sopRole, userPos, 'employee', 'all'].filter(Boolean) } },
        { createdBy: user._id },
      ];
    }

    if (orgFilter) {
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          orgFilter,
        ];
        delete query.$or;
      } else {
        query.$or = orgFilter.$or;
      }
    }

    const sopList = await SOP.find(query)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, sops: sopList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const sop = await SOP.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!sop) {
      return res.status(404).json({ success: false, message: 'SOP not found' });
    }

    res.json({ success: true, sop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const user = req.user;

    if (!['superAdmin', 'manager', 'employee'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create SOP' });
    }

    const { title, description, sopType, role, department, project, content, steps, links, status, tags } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'SOP title is required' });
    }

    const sop = await SOP.create({
      organizationId: user.organizationId,
      brandId: user.brandId,
      title: title.trim(),
      description: description || '',
      sopType: sopType || 'company',
      role: sopType === 'role_based' ? (role || mapUserRoleToSopRole(user.role)) : null,
      department: sopType === 'department' ? department : null,
      project: sopType === 'project' ? project : null,
      content: content || '',
      steps: steps || '',
      links: links || [],
      status: status || 'active',
      createdBy: user._id,
      tags: tags || [],
    });

    await sop.populate('createdBy', 'name email role');

    res.status(201).json({ success: true, message: 'SOP created successfully', sop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const sop = await SOP.findById(req.params.id);

    if (!sop) {
      return res.status(404).json({ success: false, message: 'SOP not found' });
    }

    const author = await User.findById(sop.createdBy).select('role');
    const isAuthorAdminOrManager = author && ['superAdmin', 'manager'].includes(author.role);

    if (isAuthorAdminOrManager) {
      if (!['superAdmin', 'manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'SOPs posted by Admin or Manager cannot be edited by employees' });
      }
    } else {
      if (!isAdmin(user) && user.role !== 'manager' && sop.createdBy?.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this SOP' });
      }
    }

    const { title, description, sopType, role, department, project, content, steps, links, status, tags } = req.body;

    Object.assign(sop, {
      title: title ?? sop.title,
      description: description ?? sop.description,
      sopType: sopType ?? sop.sopType,
      role: (sopType || sop.sopType) === 'role_based' ? role : null,
      department: (sopType || sop.sopType) === 'department' ? department : null,
      project: (sopType || sop.sopType) === 'project' ? project : null,
      content: content ?? sop.content,
      steps: steps ?? sop.steps,
      links: links ?? sop.links,
      status: status ?? sop.status,
      updatedBy: user._id,
      tags: tags ?? sop.tags,
    });

    await sop.save();
    await sop.populate(['createdBy', 'updatedBy'], 'name email role');

    res.json({ success: true, message: 'SOP updated successfully', sop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const sop = await SOP.findById(req.params.id);

    if (!sop) {
      return res.status(404).json({ success: false, message: 'SOP not found' });
    }

    const author = await User.findById(sop.createdBy).select('role');
    const isAuthorAdminOrManager = author && ['superAdmin', 'manager'].includes(author.role);

    if (isAuthorAdminOrManager) {
      if (!['superAdmin', 'manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'SOPs posted by Admin or Manager cannot be deleted by employees' });
      }
    } else {
      if (!isAdmin(user) && user.role !== 'manager' && sop.createdBy?.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this SOP' });
      }
    }

    await SOP.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'SOP deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
