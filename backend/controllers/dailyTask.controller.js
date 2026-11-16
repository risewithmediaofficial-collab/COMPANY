// =============================================
// DAILY TASK CONTROLLER
// Manages day-by-day task planning, live timers,
// status updates, and manager/admin assignment.
// =============================================

import DailyTask from '../models/dailyTask.model.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { emitLiveEvent } from '../utils/socketEmitter.js';
import { createActivityLog } from '../utils/activity.js';

/**
 * Normalizes input date to start-of-day UTC
 */
export const normalizeDate = (inputDate) => {
  const d = inputDate ? new Date(inputDate) : new Date();
  if (isNaN(d.getTime())) return normalizeDate(new Date());
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Formats a clean date string for display
 */
const formatShortDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Computes role-specific From and To dates and readable labels for a task
 */
export const extractTaskDateRange = (task, targetUserId) => {
  const uidStr = targetUserId ? targetUserId.toString() : '';

  const isEditor = task.editorAssigned && (task.editorAssigned._id || task.editorAssigned).toString() === uidStr;
  const isVideographer = task.videographerAssigned && (task.videographerAssigned._id || task.videographerAssigned).toString() === uidStr;
  const isPublisher = task.publisherAssigned && (task.publisherAssigned._id || task.publisherAssigned).toString() === uidStr;
  const isScriptWriter = task.scriptWriterAssigned && (task.scriptWriterAssigned._id || task.scriptWriterAssigned).toString() === uidStr;

  let fromDate = null;
  let toDate = null;
  let roleLabel = 'Assignee';
  let dateLabel = '';

  if (isEditor && (task.editDate || task.editDueDate)) {
    fromDate = task.editDate || null;
    toDate = task.editDueDate || task.dueDate || null;
    roleLabel = 'Video Editor';
    if (fromDate && toDate) {
      dateLabel = `Edit: ${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`;
    } else if (toDate) {
      dateLabel = `Edit Due: ${formatShortDate(toDate)}`;
    } else {
      dateLabel = `Edit Start: ${formatShortDate(fromDate)}`;
    }
  } else if (isVideographer && (task.shootDate || task.shootEndDate)) {
    fromDate = task.shootDate || null;
    toDate = task.shootEndDate || task.shootDate || null;
    roleLabel = 'Videographer (Shoot)';
    if (fromDate && toDate && fromDate.getTime() !== toDate.getTime()) {
      dateLabel = `Shoot: ${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`;
    } else if (fromDate) {
      dateLabel = `Shoot Date: ${formatShortDate(fromDate)}`;
    }
  } else if (isPublisher && (task.publishingDate || task.postingScheduleDate)) {
    const pDate = task.publishingDate || task.postingScheduleDate;
    fromDate = pDate;
    toDate = pDate;
    roleLabel = 'SMM (Posting)';
    dateLabel = `Posting Date: ${formatShortDate(pDate)}`;
  } else if (isScriptWriter) {
    fromDate = task.startDate || task.createdAt || null;
    toDate = task.dueDate || null;
    roleLabel = 'Scriptwriter';
    dateLabel = toDate ? `Script Due: ${formatShortDate(toDate)}` : 'Scripting';
  } else {
    fromDate = task.startDate || task.createdAt || null;
    toDate = task.dueDate || null;
    roleLabel = 'Assignee';
    if (fromDate && toDate) {
      dateLabel = `From: ${formatShortDate(fromDate)} – To: ${formatShortDate(toDate)}`;
    } else if (toDate) {
      dateLabel = `Due: ${formatShortDate(toDate)}`;
    } else {
      dateLabel = 'Ongoing';
    }
  }

  return { fromDate, toDate, roleLabel, dateLabel };
};

/**
 * GET /api/daily-tasks
 * Returns daily tasks for a user on a given date (defaults to today)
 */
export const getDailyTasks = async (req, res) => {
  try {
    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    const targetUserId = (isManagerOrAdmin && req.query.userId) ? req.query.userId : req.user._id;

    const normalizedDate = normalizeDate(req.query.date);
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
      user: targetUserId,
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    if (req.user.organizationId) {
      query.organizationId = req.user.organizationId;
    }

    const dailyTasks = await DailyTask.find(query)
      .populate('task', 'title status priority client project editDate editDueDate shootDate shootEndDate publishingDate dueDate startDate allocatedHours allocatedMinutes')
      .populate('client', 'name company logo')
      .populate('project', 'name')
      .populate('assignedBy', 'name role avatar')
      .sort({ order: 1, createdAt: -1 });

    // Compute live stats
    let completedCount = 0;
    let inProgressCount = 0;
    let totalTimeSpentSeconds = 0;
    let activeTimerTaskId = null;

    const now = Date.now();

    const tasksWithLiveTime = dailyTasks.map((item) => {
      const obj = item.toObject();
      let liveTime = obj.timeSpentSeconds || 0;

      if (obj.timerRunning && obj.timerStartedAt) {
        const runningElapsed = Math.max(0, Math.floor((now - new Date(obj.timerStartedAt).getTime()) / 1000));
        liveTime += runningElapsed;
        activeTimerTaskId = obj._id;
      }

      totalTimeSpentSeconds += liveTime;

      if (obj.status === 'completed' || obj.status === 'done') {
        completedCount++;
      } else if (obj.status === 'in_progress') {
        inProgressCount++;
      }

      obj.liveTimeSpentSeconds = liveTime;
      return obj;
    });

    res.json({
      success: true,
      date: normalizedDate,
      userId: targetUserId,
      tasks: tasksWithLiveTime,
      stats: {
        total: dailyTasks.length,
        completed: completedCount,
        inProgress: inProgressCount,
        pending: dailyTasks.length - completedCount,
        totalTimeSpentSeconds,
        activeTimerTaskId,
      },
    });
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch daily tasks' });
  }
};

/**
 * GET /api/daily-tasks/assignable-tasks
 * Returns active tasks assigned to the target user with their From–To dates
 */
export const getAssignableTasks = async (req, res) => {
  try {
    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    const targetUserId = (isManagerOrAdmin && req.query.userId) ? req.query.userId : req.user._id;

    const normalizedDate = normalizeDate(req.query.date);
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const userTaskOr = [
      { assignedTo: targetUserId },
      { editorAssigned: targetUserId },
      { videographerAssigned: targetUserId },
      { scriptWriterAssigned: targetUserId },
      { publisherAssigned: targetUserId },
      { designerAssigned: targetUserId },
    ];

    const taskQuery = {
      $or: userTaskOr,
      status: { $nin: ['completed', 'done', 'approved', 'rejected'] },
    };

    if (req.user.organizationId) {
      taskQuery.organizationId = req.user.organizationId;
    }

    const [assignedTasks, existingDailyTasks] = await Promise.all([
      Task.find(taskQuery)
        .populate('project', 'name')
        .populate('client', 'name company logo')
        .sort({ priority: 1, dueDate: 1, createdAt: -1 })
        .limit(50)
        .lean(),
      DailyTask.find({
        user: targetUserId,
        date: { $gte: startOfDay, $lte: endOfDay },
      }).select('task _id status timerRunning').lean(),
    ]);

    const dailyTaskMap = new Map();
    existingDailyTasks.forEach((d) => {
      if (d.task) {
        dailyTaskMap.set(d.task.toString(), d);
      }
    });

    const formattedTasks = assignedTasks.map((t) => {
      const { fromDate, toDate, roleLabel, dateLabel } = extractTaskDateRange(t, targetUserId);
      const dailyEntry = dailyTaskMap.get(t._id.toString());

      return {
        _id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        project: t.project,
        client: t.client,
        clientName: t.client?.company || t.client?.name || t.clientName || '',
        projectName: t.project?.name || t.projectName || '',
        roleLabel,
        fromDate,
        toDate,
        dateLabel,
        allocatedHours: t.allocatedHours || 0,
        allocatedMinutes: t.allocatedMinutes || 0,
        isAlreadyDaily: Boolean(dailyEntry),
        dailyTaskId: dailyEntry?._id || null,
        dailyStatus: dailyEntry?.status || null,
        isTimerRunning: Boolean(dailyEntry?.timerRunning),
      };
    });

    res.json({
      success: true,
      userId: targetUserId,
      date: normalizedDate,
      tasks: formattedTasks,
    });
  } catch (error) {
    console.error('Error fetching assignable tasks:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch assignable tasks' });
  }
};

/**
 * POST /api/daily-tasks/from-assigned
 * Adds an assigned task to today's daily tasks
 */
export const addDailyTaskFromAssigned = async (req, res) => {
  try {
    const { taskId, userId, date, notes } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId is required' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    const targetUserId = (isManagerOrAdmin && userId) ? userId : req.user._id;

    const task = await Task.findById(taskId)
      .populate('project', 'name')
      .populate('client', 'name company');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const normalizedDate = normalizeDate(date);
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Check if already exists for this day
    let dailyTask = await DailyTask.findOne({
      user: targetUserId,
      task: taskId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const { fromDate, toDate, roleLabel, dateLabel } = extractTaskDateRange(task, targetUserId);

    if (dailyTask) {
      if (notes) dailyTask.notes = notes;
      await dailyTask.save();
      return res.json({ success: true, dailyTask, message: 'Task is already in your daily tasks' });
    }

    dailyTask = new DailyTask({
      organizationId: req.user.organizationId || task.organizationId,
      brandId: req.user.brandId || task.brandId,
      user: targetUserId,
      task: task._id,
      date: normalizedDate,
      title: task.title,
      description: task.description || '',
      client: task.client?._id || task.client || null,
      clientName: task.client?.company || task.client?.name || task.clientName || '',
      project: task.project?._id || task.project || null,
      projectName: task.project?.name || task.projectName || '',
      taskType: task.taskType || 'task',
      roleLabel,
      priority: task.priority || 'medium',
      status: task.status === 'completed' || task.status === 'done' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'todo',
      fromDate,
      toDate,
      dateLabel,
      allocatedHours: task.allocatedHours || 0,
      allocatedMinutes: task.allocatedMinutes || 0,
      assignedBy: req.user._id,
      assignedByName: req.user.name || '',
      notes: notes || '',
    });

    await dailyTask.save();

    // If assigned by another user (e.g. manager), notify the employee
    if (targetUserId.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipient: targetUserId,
          sender: req.user._id,
          title: 'New Daily Task Assigned',
          message: `${req.user.name} added "${task.title}" to your Daily Tasks for today.`,
          type: 'task',
          link: '/#daily-tasks',
        });
      } catch (e) {
        // notification non-blocking
      }
    }

    emitLiveEvent('dailyTaskUpdated', { userId: targetUserId, date: normalizedDate });

    res.status(201).json({
      success: true,
      dailyTask,
      message: 'Task added to Daily Tasks successfully',
    });
  } catch (error) {
    console.error('Error adding daily task from assigned:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add daily task' });
  }
};

/**
 * POST /api/daily-tasks/quick
 * Creates a quick custom daily task for today
 */
export const createQuickDailyTask = async (req, res) => {
  try {
    const { title, userId, date, priority, allocatedHours, allocatedMinutes, notes, projectId, clientId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    const targetUserId = (isManagerOrAdmin && userId) ? userId : req.user._id;
    const normalizedDate = normalizeDate(date);

    const dailyTask = new DailyTask({
      organizationId: req.user.organizationId,
      brandId: req.user.brandId,
      user: targetUserId,
      date: normalizedDate,
      title: title.trim(),
      priority: priority || 'medium',
      status: 'todo',
      allocatedHours: Number(allocatedHours) || 0,
      allocatedMinutes: Number(allocatedMinutes) || 0,
      isQuickTask: true,
      assignedBy: req.user._id,
      assignedByName: req.user.name || '',
      project: projectId || null,
      client: clientId || null,
      notes: notes || '',
      dateLabel: 'Daily Quick Task',
    });

    await dailyTask.save();

    emitLiveEvent('dailyTaskUpdated', { userId: targetUserId, date: normalizedDate });

    res.status(201).json({
      success: true,
      dailyTask,
      message: 'Quick daily task created',
    });
  } catch (error) {
    console.error('Error creating quick daily task:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create quick daily task' });
  }
};

/**
 * POST /api/daily-tasks/:id/start-timer
 * Starts the live timer for a daily task.
 * Automatically pauses any other active timer the user has running.
 */
export const startDailyTaskTimer = async (req, res) => {
  try {
    const dailyTask = await DailyTask.findById(req.params.id);
    if (!dailyTask) {
      return res.status(404).json({ success: false, message: 'Daily task not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    if (!isManagerOrAdmin && dailyTask.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const now = new Date();

    // Pause any other running timers for this user
    const runningTasks = await DailyTask.find({
      user: dailyTask.user,
      timerRunning: true,
      _id: { $ne: dailyTask._id },
    });

    for (const r of runningTasks) {
      if (r.timerStartedAt) {
        const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(r.timerStartedAt).getTime()) / 1000));
        r.timeSpentSeconds = (r.timeSpentSeconds || 0) + elapsed;
      }
      r.timerRunning = false;
      r.timerStartedAt = null;
      await r.save();
    }

    dailyTask.timerRunning = true;
    dailyTask.timerStartedAt = now;
    if (dailyTask.status === 'todo') {
      dailyTask.status = 'in_progress';
    }

    await dailyTask.save();

    // Sync with underlying task if present
    if (dailyTask.task) {
      try {
        const underTask = await Task.findById(dailyTask.task);
        if (underTask) {
          underTask.isAccepted = true;
          underTask.acceptedBy = underTask.acceptedBy || req.user._id;
          underTask.acceptedAt = underTask.acceptedAt || now;
          underTask.timerStartedAt = underTask.timerStartedAt || now;
          if (['todo', 'on_process'].includes(underTask.status) || !underTask.status) {
            underTask.status = 'in_progress';
          }
          await underTask.save();
        }
      } catch (err) {
        // sync error non-blocking
      }
    }

    emitLiveEvent('dailyTaskUpdated', { userId: dailyTask.user, taskId: dailyTask._id });
    emitLiveEvent('taskUpdated', { id: dailyTask.task });

    res.json({
      success: true,
      dailyTask,
      message: 'Timer started',
    });
  } catch (error) {
    console.error('Error starting daily task timer:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to start timer' });
  }
};

/**
 * POST /api/daily-tasks/:id/stop-timer
 * Pauses or stops the live timer and accumulates elapsed seconds
 */
export const stopDailyTaskTimer = async (req, res) => {
  try {
    const dailyTask = await DailyTask.findById(req.params.id);
    if (!dailyTask) {
      return res.status(404).json({ success: false, message: 'Daily task not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    if (!isManagerOrAdmin && dailyTask.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (dailyTask.timerRunning && dailyTask.timerStartedAt) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(dailyTask.timerStartedAt).getTime()) / 1000));
      dailyTask.timeSpentSeconds = (dailyTask.timeSpentSeconds || 0) + elapsed;
    }

    dailyTask.timerRunning = false;
    dailyTask.timerStartedAt = null;
    await dailyTask.save();

    // Sync with underlying task
    if (dailyTask.task) {
      try {
        const underTask = await Task.findById(dailyTask.task);
        if (underTask) {
          underTask.actualTimeSpentMinutes = Math.round((dailyTask.timeSpentSeconds || 0) / 60);
          await underTask.save();
        }
      } catch (err) {
        // non-blocking
      }
    }

    emitLiveEvent('dailyTaskUpdated', { userId: dailyTask.user, taskId: dailyTask._id });

    res.json({
      success: true,
      dailyTask,
      message: 'Timer paused',
    });
  } catch (error) {
    console.error('Error stopping daily task timer:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to stop timer' });
  }
};

/**
 * PATCH /api/daily-tasks/:id/status
 * Updates the daily task status and syncs the underlying task status
 */
export const updateDailyTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['todo', 'in_progress', 'review', 'completed', 'done'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const dailyTask = await DailyTask.findById(req.params.id);
    if (!dailyTask) {
      return res.status(404).json({ success: false, message: 'Daily task not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    if (!isManagerOrAdmin && dailyTask.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // If marking completed/done while timer is running, stop and save elapsed time
    if ((status === 'completed' || status === 'done') && dailyTask.timerRunning && dailyTask.timerStartedAt) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(dailyTask.timerStartedAt).getTime()) / 1000));
      dailyTask.timeSpentSeconds = (dailyTask.timeSpentSeconds || 0) + elapsed;
      dailyTask.timerRunning = false;
      dailyTask.timerStartedAt = null;
      dailyTask.completedAt = new Date();
    } else if (status === 'completed' || status === 'done') {
      dailyTask.completedAt = new Date();
    } else {
      dailyTask.completedAt = null;
    }

    dailyTask.status = status;
    await dailyTask.save();

    // Sync underlying task status
    if (dailyTask.task) {
      try {
        const underTask = await Task.findById(dailyTask.task);
        if (underTask) {
          const mappedStatus = status === 'done' || status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : status === 'review' ? 'review' : 'todo';
          underTask.status = mappedStatus;
          if (mappedStatus === 'completed') {
            underTask.completedAt = new Date();
            underTask.actualTimeSpentMinutes = Math.round((dailyTask.timeSpentSeconds || 0) / 60);
          }
          await underTask.save();
          emitLiveEvent('taskStatusUpdated', { id: underTask._id, status: mappedStatus });
        }
      } catch (err) {
        // non-blocking
      }
    }

    emitLiveEvent('dailyTaskUpdated', { userId: dailyTask.user, taskId: dailyTask._id, status });

    res.json({
      success: true,
      dailyTask,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating daily task status:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update status' });
  }
};

/**
 * DELETE /api/daily-tasks/:id
 * Removes task from daily tasks
 */
export const deleteDailyTask = async (req, res) => {
  try {
    const dailyTask = await DailyTask.findById(req.params.id);
    if (!dailyTask) {
      return res.status(404).json({ success: false, message: 'Daily task not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(req.user.role);
    if (!isManagerOrAdmin && dailyTask.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const targetUserId = dailyTask.user;
    await DailyTask.findByIdAndDelete(req.params.id);

    emitLiveEvent('dailyTaskUpdated', { userId: targetUserId, removedId: req.params.id });

    res.json({
      success: true,
      message: 'Removed from daily tasks',
    });
  } catch (error) {
    console.error('Error deleting daily task:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to remove daily task' });
  }
};
