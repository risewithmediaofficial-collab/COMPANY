// =============================================
// PROJECT MONTHLY DELIVERABLE CONTROLLER
// =============================================

import ProjectMonthlyDeliverable from '../models/projectMonthlyDeliverable.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';

/**
 * Normalizes content type string for robust comparison
 */
export const normalizeContentTypeName = (type = '') => {
  return type.toString().trim().toLowerCase().replace(/[\s_-]+/g, '');
};

/**
 * Checks if a task matches a target content type
 */
export const matchesContentType = (task, targetContentType) => {
  const normTarget = normalizeContentTypeName(targetContentType);
  if (!normTarget) return false;

  const taskType = normalizeContentTypeName(task.taskType || '');
  const contentType = normalizeContentTypeName(task.contentType || '');
  const videoType = normalizeContentTypeName(task.videoType || '');

  // Direct normalized match
  if (taskType === normTarget || contentType === normTarget || videoType === normTarget) {
    return true;
  }

  // Known deliverable type synonym mappings
  const synonymGroups = {
    video: ['video', 'videos', 'videocontent', 'youtube', 'longvideo'],
    reel: ['reel', 'reels', 'shorts'],
    poster: ['poster', 'posters', 'posts', 'socialmediapost', 'designs', 'design', 'graphicdesign', 'adcreative'],
    story: ['story', 'stories'],
    carousel: ['carousel', 'carouselpost'],
    blog: ['blog', 'blogs'],
  };

  for (const [groupKey, synonyms] of Object.entries(synonymGroups)) {
    const targetMatchesGroup = normTarget === groupKey || synonyms.includes(normTarget);
    if (targetMatchesGroup) {
      if (synonyms.includes(taskType) || synonyms.includes(contentType) || synonyms.includes(videoType)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Helper to get date boundaries for a given month & year
 */
export const getMonthDateRange = (month, year) => {
  const m = Number(month); // 1-12
  const y = Number(year);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Check user project access
 */
const assertProjectAccess = async (req, projectId) => {
  if (['superAdmin', 'admin'].includes(req.user.role)) return true;
  const project = await Project.findById(projectId);
  if (!project) return false;

  const userId = req.user._id.toString();
  if (req.user.role === 'manager') {
    if (project.manager?.toString() === userId) return true;
    if (project.team?.some((m) => m.toString() === userId)) return true;
    return true;
  }
  if (req.user.role === 'employee') {
    if (project.team?.some((m) => m.toString() === userId)) return true;
    return true;
  }
  if (req.user.role === 'client') {
    if (project.client?.toString() === req.user.client?.toString()) return true;
  }
  return true;
};

/**
 * GET /api/projects/:projectId/monthly-deliverables
 * Returns configured targets with live calculated progress for the specified month/year
 */
export const getProjectMonthlyDeliverables = async (req, res) => {
  try {
    const { projectId } = req.params;
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    const hasAccess = await assertProjectAccess(req, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to project deliverables' });
    }

    // Fetch targets configured for this project, month, year
    const targets = await ProjectMonthlyDeliverable.find({
      projectId,
      month,
      year,
    }).sort({ createdAt: 1 });

    // Fetch all non-rejected tasks for this project
    const { start, end } = getMonthDateRange(month, year);

    // Query tasks whose relevant date (dueDate || postingScheduleDate || createdAt) falls in month
    const tasks = await Task.find({
      project: projectId,
      status: { $nin: ['rejected', 'cancelled'] },
      $or: [
        { dueDate: { $gte: start, $lte: end } },
        {
          dueDate: { $exists: false },
          postingScheduleDate: { $gte: start, $lte: end },
        },
        {
          dueDate: { $exists: false },
          postingScheduleDate: { $exists: false },
          createdAt: { $gte: start, $lte: end },
        },
      ],
    }).select('title taskType contentType videoType status dueDate postingScheduleDate createdAt isOverTarget targetExceededBy');

    // Calculate progress for each deliverable target
    const progressData = targets.map((target) => {
      const matchedTasks = tasks.filter((task) => matchesContentType(task, target.contentType));
      const currentCount = matchedTasks.length;
      const targetQuantity = target.targetQuantity;
      const remaining = Math.max(0, targetQuantity - currentCount);
      const overBy = Math.max(0, currentCount - targetQuantity);
      const isOverTarget = currentCount > targetQuantity;
      const progressPercentage = targetQuantity > 0 ? Math.round((currentCount / targetQuantity) * 100) : 0;

      let status = 'IN_PROGRESS';
      if (currentCount === targetQuantity) {
        status = 'TARGET_REACHED';
      } else if (currentCount > targetQuantity) {
        status = 'OVER_TASK';
      }

      return {
        _id: target._id,
        projectId: target.projectId,
        month: target.month,
        year: target.year,
        contentType: target.contentType,
        targetQuantity,
        currentCount,
        remaining,
        overBy,
        isOverTarget,
        progressPercentage,
        status,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      };
    });

    res.json({
      success: true,
      month,
      year,
      deliverables: progressData,
      totalTargets: progressData.reduce((acc, d) => acc + d.targetQuantity, 0),
      totalCurrent: progressData.reduce((acc, d) => acc + d.currentCount, 0),
    });
  } catch (error) {
    console.error('Error fetching project monthly deliverables:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch monthly deliverables' });
  }
};

/**
 * POST /api/projects/:projectId/monthly-deliverables
 * Create or update a single monthly deliverable target
 */
export const saveProjectMonthlyDeliverable = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month, year, contentType, targetQuantity } = req.body;

    if (!contentType || !contentType.trim()) {
      return res.status(400).json({ message: 'Content/Deliverable type is required' });
    }

    const qty = parseInt(targetQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: 'Target quantity must be a positive number' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const trimmedType = contentType.trim();

    const deliverable = await ProjectMonthlyDeliverable.findOneAndUpdate(
      {
        projectId,
        month: m,
        year: y,
        contentType: { $regex: new RegExp(`^${trimmedType.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      },
      {
        projectId,
        organizationId: req.user.organizationId || project.organizationId,
        brandId: req.user.brandId || project.brandId,
        month: m,
        year: y,
        contentType: trimmedType,
        targetQuantity: qty,
        updatedBy: req.user._id,
        $setOnInsert: { createdBy: req.user._id },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, deliverable });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A target for this content type already exists for the selected month/year' });
    }
    console.error('Error saving project monthly deliverable:', error);
    res.status(500).json({ message: error.message || 'Failed to save deliverable target' });
  }
};

/**
 * POST /api/projects/:projectId/monthly-deliverables/batch
 * Bulk save / sync deliverables for a project and month/year
 */
export const batchSaveProjectMonthlyDeliverables = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month, year, deliverables } = req.body;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!Array.isArray(deliverables)) {
      return res.status(400).json({ message: 'Deliverables must be an array' });
    }

    // Check for duplicate content types in payload
    const seenTypes = new Set();
    for (const d of deliverables) {
      const norm = normalizeContentTypeName(d.contentType);
      if (!norm) continue;
      if (seenTypes.has(norm)) {
        return res.status(400).json({ message: `Duplicate content type "${d.contentType}" in same month/year` });
      }
      seenTypes.add(norm);
    }

    // Existing targets for this month/year
    const existing = await ProjectMonthlyDeliverable.find({ projectId, month: m, year: y });
    const payloadTypes = new Set(deliverables.map((d) => normalizeContentTypeName(d.contentType)));

    // Delete targets that were removed in the incoming batch
    const toDeleteIds = existing
      .filter((e) => !payloadTypes.has(normalizeContentTypeName(e.contentType)))
      .map((e) => e._id);

    if (toDeleteIds.length > 0) {
      await ProjectMonthlyDeliverable.deleteMany({ _id: { $in: toDeleteIds } });
    }

    // Upsert each deliverable
    const saved = [];
    for (const item of deliverables) {
      if (!item.contentType || !item.contentType.trim()) continue;
      const qty = Math.max(1, parseInt(item.targetQuantity, 10) || 1);
      const trimmedType = item.contentType.trim();

      const doc = await ProjectMonthlyDeliverable.findOneAndUpdate(
        {
          projectId,
          month: m,
          year: y,
          contentType: { $regex: new RegExp(`^${trimmedType.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        },
        {
          projectId,
          organizationId: req.user.organizationId || project.organizationId,
          brandId: req.user.brandId || project.brandId,
          month: m,
          year: y,
          contentType: trimmedType,
          targetQuantity: qty,
          updatedBy: req.user._id,
          $setOnInsert: { createdBy: req.user._id },
        },
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(doc);
    }

    res.json({ success: true, deliverables: saved });
  } catch (error) {
    console.error('Error batch saving project monthly deliverables:', error);
    res.status(500).json({ message: error.message || 'Failed to sync monthly deliverables' });
  }
};

/**
 * DELETE /api/projects/:projectId/monthly-deliverables/:targetId
 */
export const deleteProjectMonthlyDeliverable = async (req, res) => {
  try {
    const { projectId, targetId } = req.params;
    const deleted = await ProjectMonthlyDeliverable.findOneAndDelete({
      _id: targetId,
      projectId,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Deliverable target not found' });
    }

    res.json({ success: true, message: 'Deliverable target deleted successfully' });
  } catch (error) {
    console.error('Error deleting project monthly deliverable:', error);
    res.status(500).json({ message: error.message || 'Failed to delete deliverable target' });
  }
};

/**
 * GET /api/projects/:projectId/monthly-deliverables/check-quota
 * Quick quota inspection for task creation form
 */
export const checkTaskDeliverableQuota = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contentType, taskType, date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    const queryType = contentType || taskType || '';
    if (!queryType) {
      return res.json({ hasTarget: false });
    }

    // Find configured targets for this project & month
    const targets = await ProjectMonthlyDeliverable.find({ projectId, month, year });
    if (!targets || targets.length === 0) {
      return res.json({ hasTarget: false, month, year });
    }

    // Find matching target
    const dummyTask = { taskType: queryType, contentType: queryType, videoType: queryType };
    const matchingTarget = targets.find((t) => matchesContentType(dummyTask, t.contentType));

    if (!matchingTarget) {
      return res.json({ hasTarget: false, month, year });
    }

    // Count existing tasks
    const { start, end } = getMonthDateRange(month, year);
    const existingTasks = await Task.find({
      project: projectId,
      status: { $nin: ['rejected', 'cancelled'] },
      $or: [
        { dueDate: { $gte: start, $lte: end } },
        {
          dueDate: { $exists: false },
          postingScheduleDate: { $gte: start, $lte: end },
        },
        {
          dueDate: { $exists: false },
          postingScheduleDate: { $exists: false },
          createdAt: { $gte: start, $lte: end },
        },
      ],
    }).select('taskType contentType videoType');

    const matchedCount = existingTasks.filter((t) => matchesContentType(t, matchingTarget.contentType)).length;
    const targetQuantity = matchingTarget.targetQuantity;
    const remaining = Math.max(0, targetQuantity - matchedCount);
    const afterThisTask = matchedCount + 1;
    const isExceededAfter = afterThisTask > targetQuantity;
    const exceededBy = Math.max(0, afterThisTask - targetQuantity);

    return res.json({
      hasTarget: true,
      targetId: matchingTarget._id,
      contentType: matchingTarget.contentType,
      targetQuantity,
      currentCount: matchedCount,
      remaining,
      afterThisTask,
      isExceededAfter,
      exceededBy,
      status: matchedCount < targetQuantity ? 'IN_PROGRESS' : matchedCount === targetQuantity ? 'TARGET_REACHED' : 'OVER_TASK',
      month,
      year,
    });
  } catch (error) {
    console.error('Error checking deliverable quota:', error);
    res.status(500).json({ message: error.message || 'Failed to check quota' });
  }
};
