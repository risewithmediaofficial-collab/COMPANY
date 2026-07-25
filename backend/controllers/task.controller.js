// =============================================
// TASK CONTROLLER
// =============================================

import Task from '../models/task.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import ActivityLog from '../models/activityLog.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';
import { runAutomation } from '../services/automation.service.js';
import { createActivityLog } from '../utils/activity.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';

const taskStatusMap = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'In Review': 'review',
  Approved: 'approved',
  Done: 'done',
  Blocked: 'rejected',
  Rejected: 'rejected',
  'On Process': 'on_process',
  'Waiting for Client': 'waiting_for_client',
  Completed: 'completed',
  Rework: 'rework',
  'Rework Completed': 'rework_completed',
  'Review Required': 'review_required',
  'Work in Progress': 'on_process',
  'Task Received': 'todo',
};

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  approved: 'Approved',
  rejected: 'Blocked',
  done: 'Done',
  on_process: 'On Process',
  waiting_for_client: 'Waiting for Client',
  completed: 'Completed',
  rework: 'Rework',
  rework_completed: 'Rework Completed',
  review_required: 'Review Required',
};

const priorityMap = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Urgent: 'urgent',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const taskCategoryMap = {
  'Content Task': 'content',
  content: 'content',
  'Non-Content Task': 'non_content',
  'Non Content Task': 'non_content',
  non_content: 'non_content',
};

const normalizeLink = (value) => (value ? value.toString().trim() : '');

const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => item.toString().trim()).filter(Boolean);
  return value.toString().split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeFiles = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Boolean)
    .map((file) => ({
      name: file.name || file.originalname || 'Attachment',
      url: file.url || '',
      type: file.type || '',
      size: Number(file.size) || 0,
      uploadedBy: file.uploadedBy || undefined,
      uploadedAt: file.uploadedAt || undefined,
    }))
    .filter((file) => file.url);
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const uniqueIds = (items = []) => [...new Set(items.filter(Boolean).map(toIdString))];

const isEmployeeLikeRole = (role) => ['employee', 'intern', 'editor', 'designer', 'adsManager'].includes(role);

const isTaskOverdue = (item) => {
  if (!item?.dueDate) return false;
  const completedStatuses = ['approved', 'done', 'completed'];
  if (completedStatuses.includes(item.status)) return false;
  return new Date(item.dueDate).getTime() < Date.now();
};

const serializeTask = (task) => {
  const item = task?.toObject ? task.toObject() : task;
  if (!item) return null;

  return {
    ...item,
    status: statusLabels[item.status] || item.status,
    priority: priorityLabels[item.priority] || item.priority,
    taskCategory: taskCategoryMap[item.taskCategory] || item.taskCategory,
    title: item.title || item.taskTitle || '',
    taskTitle: item.taskTitle || item.title || '',
    clientName: item.clientName || item.client?.name || item.client?.company || '',
    projectName: item.projectName || item.project?.name || '',
    assignedPersonName: item.assignedPersonName
      || (Array.isArray(item.assignedTo) ? item.assignedTo.map((user) => user?.name).filter(Boolean).join(', ') : ''),
    assignedManagerName: item.assignedManager?.name || '',
    isOverdue: isTaskOverdue(item),
  };
};

const normalizeTaskPayload = (body = {}) => {
  const payload = { ...body };

  if (payload.status) payload.status = taskStatusMap[payload.status] || payload.status;
  if (payload.priority) payload.priority = priorityMap[payload.priority] || payload.priority;
  if (payload.assignedTo !== undefined) payload.assignedTo = uniqueIds(toArray(payload.assignedTo));
  if (payload.assignedManager !== undefined) payload.assignedManager = toIdString(payload.assignedManager) || undefined;
  if (payload.tags !== undefined) payload.tags = Array.isArray(payload.tags)
    ? payload.tags.filter(Boolean)
    : payload.tags
      .toString()
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  if (payload.estimatedHours !== undefined) payload.estimatedHours = Number(payload.estimatedHours) || 0;
  if (payload.loggedHours !== undefined) payload.loggedHours = Number(payload.loggedHours) || 0;
  if (payload.orderIndex !== undefined) payload.orderIndex = Number(payload.orderIndex) || 0;
  if (payload.isClientVisible !== undefined) payload.isClientVisible = Boolean(payload.isClientVisible);
  if (payload.approvalRequired !== undefined) payload.approvalRequired = Boolean(payload.approvalRequired);
  if (payload.actualStartDate !== undefined) payload.actualStartDate = payload.actualStartDate ? new Date(payload.actualStartDate) : undefined;
  if (payload.taskTitle && !payload.title) payload.title = payload.taskTitle;
  if (payload.title && !payload.taskTitle) payload.taskTitle = payload.title;
  if (payload.taskCategory) payload.taskCategory = taskCategoryMap[payload.taskCategory] || payload.taskCategory;
  if (payload.deadline !== undefined) payload.deadline = payload.deadline ? new Date(payload.deadline) : undefined;
  if (payload.referenceLink !== undefined) payload.referenceLink = normalizeLink(payload.referenceLink);
  if (payload.scriptLink !== undefined) payload.scriptLink = normalizeLink(payload.scriptLink);
  if (payload.pagesNeeded !== undefined) payload.pagesNeeded = normalizeStringArray(payload.pagesNeeded);
  if (payload.attachments !== undefined) payload.attachments = normalizeFiles(payload.attachments);
  if (payload.videographerAssigned !== undefined) payload.videographerAssigned = toIdString(payload.videographerAssigned) || undefined;
  if (payload.editorAssigned !== undefined) payload.editorAssigned = toIdString(payload.editorAssigned) || undefined;
  if (payload.publisherAssigned !== undefined) payload.publisherAssigned = toIdString(payload.publisherAssigned) || undefined;
  if (payload.postingScheduleDate !== undefined) payload.postingScheduleDate = payload.postingScheduleDate ? new Date(payload.postingScheduleDate) : undefined;
  if (payload.postingPlatforms !== undefined) payload.postingPlatforms = normalizeStringArray(payload.postingPlatforms);
  if (payload.clientFeedback !== undefined) payload.clientFeedback = payload.clientFeedback?.toString?.().trim?.() || '';

  return payload;
};

const getClientRecordForUser = async (userId) => Client.findOne({ userId }).select('_id assignedManager assignedTeam');

const getManagedScope = async (userId) => {
  const [projects, clients] = await Promise.all([
    Project.find({ manager: userId }).select('_id'),
    Client.find({ assignedManager: userId }).select('_id'),
  ]);

  return {
    projectIds: projects.map((project) => project._id),
    clientIds: clients.map((client) => client._id),
  };
};

const getManagerAssignableUserIds = (project, client, managerId) => {
  const ids = [managerId];
  if (project?.team) ids.push(...toArray(project.team).map(toIdString));
  if (client?.assignedTeam) ids.push(...toArray(client.assignedTeam).map(toIdString));
  return uniqueIds(ids);
};

const buildScopedTaskFilter = async (req, baseFilter = {}) => {
  const filter = { ...baseFilter };
  const baseOr = filter.$or;
  if (baseOr) delete filter.$or;

  if (req.user.role === 'superAdmin') return baseOr ? { ...filter, $or: baseOr } : filter;

  if (req.user.role === 'manager') {
    const { projectIds, clientIds } = await getManagedScope(req.user._id);
    const scopedOr = [
      { project: { $in: projectIds.length ? projectIds : [null] } },
      { client: { $in: clientIds.length ? clientIds : [null] } },
      { createdBy: req.user._id },
      { assignedTo: req.user._id },
      { assignedManager: req.user._id },
    ];
    return baseOr ? { ...filter, $and: [{ $or: baseOr }, { $or: scopedOr }] } : { ...filter, $or: scopedOr };
  }

  if (isEmployeeLikeRole(req.user.role)) {
    const teamProjects = await Project.find({ team: req.user._id }).select('_id');
    const projectIds = teamProjects.map((project) => project._id);
    const scopedOr = [
      { assignedTo: req.user._id },
      { createdBy: req.user._id },
      ...(projectIds.length ? [{ project: { $in: projectIds } }] : []),
    ];
    return baseOr ? { ...filter, $and: [{ $or: baseOr }, { $or: scopedOr }] } : { ...filter, $or: scopedOr };
  }

  if (req.user.role === 'client') {
    const client = await getClientRecordForUser(req.user._id);
    if (!client) {
      filter._id = null;
      return filter;
    }

    filter.client = client._id;
    filter.isClientVisible = true;
    return baseOr ? { ...filter, $or: baseOr } : filter;
  }

  filter._id = null;
  return baseOr ? { ...filter, $or: baseOr } : filter;
};

const assertTaskAccess = async (req, task) => {
  if (!task) return { allowed: false, status: 404, message: 'Task not found' };
  if (req.user.role === 'superAdmin') return { allowed: true };

  const userId = req.user._id.toString();
  const assigneeIds = toArray(task.assignedTo).map(toIdString);
  const isAssigned = assigneeIds.includes(userId);
  const isCreator = toIdString(task.createdBy) === userId;

  if (isEmployeeLikeRole(req.user.role)) {
    if (isAssigned || isCreator) {
      return { allowed: true };
    }

    const projectId = toIdString(task.project);
    if (projectId) {
      const project = await Project.findById(projectId).select('team');
      const isTeamMember = toArray(project?.team).some((member) => toIdString(member) === userId);
      if (isTeamMember) {
        return { allowed: true };
      }
    }

    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user.role === 'client') {
    const client = await getClientRecordForUser(req.user._id);
    if (client && toIdString(task.client) === client._id.toString() && task.isClientVisible) {
      return { allowed: true };
    }

    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user.role === 'manager') {
    if (isCreator || isAssigned) {
      return { allowed: true };
    }

    const [project, client] = await Promise.all([
      task.project ? Project.findById(toIdString(task.project)).select('manager team') : null,
      task.client ? Client.findById(toIdString(task.client)).select('assignedManager') : null,
    ]);

    if (toIdString(project?.manager) === userId) return { allowed: true };
    if (toArray(project?.team).some((member) => toIdString(member) === userId)) return { allowed: true };
    if (toIdString(client?.assignedManager) === userId) return { allowed: true };
    if (toIdString(task.assignedManager) === userId) return { allowed: true };

    return { allowed: false, status: 403, message: 'Access denied' };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};

const hydrateTask = async (taskId) => Task.findById(taskId)
  .populate('assignedTo', 'name email avatar role')
  .populate('assignedManager', 'name email avatar role')
  .populate('createdBy', 'name email avatar role')
  .populate('videographerAssigned', 'name email avatar role')
  .populate('editorAssigned', 'name email avatar role')
  .populate('publisherAssigned', 'name email avatar role')
  .populate('project', 'name client manager')
  .populate('client', 'name company email')
  .populate('clientResponseBy', 'name email avatar role')
  .populate('comments.author', 'name avatar')
  .populate('approvedBy', 'name avatar')
  .populate('timeEntries.user', 'name avatar')
  .populate('progressUpdates.updatedBy', 'name avatar');

const syncTaskDerivedFields = async (task) => {
  if (task.client) {
    const client = await Client.findById(task.client).select('name company');
    if (client) {
      task.clientName = client.name || client.company || '';
    }
  }

  if (task.videographerAssigned) {
    const vUser = await User.findById(task.videographerAssigned).select('name');
    if (vUser) task.videographerName = vUser.name;
  }
  if (task.editorAssigned) {
    const eUser = await User.findById(task.editorAssigned).select('name');
    if (eUser) task.editorName = eUser.name;
  }
  if (task.publisherAssigned) {
    const pUser = await User.findById(task.publisherAssigned).select('name');
    if (pUser) task.publisherName = pUser.name;
  }

  const allSubAssignees = [
    ...toArray(task.assignedTo),
    task.videographerAssigned,
    task.editorAssigned,
    task.publisherAssigned,
  ].filter(Boolean);

  const assigneeIds = uniqueIds(allSubAssignees);
  if (assigneeIds.length) {
    const assignees = await User.find({ _id: { $in: assigneeIds } }).select('name');
    task.assignedPersonName = assignees.map((user) => user.name).filter(Boolean).join(', ');
    task.assignedTo = assigneeIds;
  } else {
    task.assignedPersonName = '';
    task.assignedTo = [];
  }

  task.taskTitle = task.title;
};

const notifyNewAssignees = async ({ task, previousAssignedTo = [], previousAssignedManager, actorId, io }) => {
  const previousIds = uniqueIds(previousAssignedTo);
  const nextIds = uniqueIds(task.assignedTo);
  const previousManagerId = toIdString(previousAssignedManager);
  const nextManagerId = toIdString(task.assignedManager);

  const newlyAssigned = nextIds.filter(
    (userId) => !previousIds.includes(userId) && userId !== actorId.toString(),
  );

  const notifications = [
    ...newlyAssigned.map((recipient) => ({
      recipient,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned: ${task.title}`,
    })),
  ];

  if (nextManagerId && nextManagerId !== previousManagerId && nextManagerId !== actorId.toString()) {
    notifications.push({
      recipient: nextManagerId,
      type: 'task_assigned_manager',
      title: 'Task Assigned to You',
      message: `A task has been assigned under your management: ${task.title}`,
    });
  }

  await Promise.all(notifications.map(({ recipient, type, title, message }) => createNotification({
    recipient,
    sender: actorId,
    type,
    title,
    message,
    link: '/tasks',
  }, io)));
};

const updateCompletionState = (task) => {
  if (['done', 'approved', 'completed', 'rework_completed'].includes(task.status)) {
    task.completedAt = task.completedAt || new Date();
    return;
  }

  task.completedAt = undefined;
  if (task.status !== 'approved') {
    task.approvedAt = undefined;
    task.approvedBy = undefined;
  }
};

const mapLegacyTaskType = (value = '') => value.toString().trim().toLowerCase();

const isWebsiteTaskType = (taskType) => ['website_development', 'website_update', 'landing_page'].includes(mapLegacyTaskType(taskType));

const isTaskResponseOpen = (status) => ['completed', 'waiting_for_client', 'rework_completed', 'review_required'].includes(status);

const notifyTaskStakeholders = async ({ task, sender, type, title, message, io, extraRecipients = [] }) => {
  const recipients = uniqueIds([
    task.createdBy,
    ...(task.assignedTo || []),
    ...extraRecipients,
  ]).filter((userId) => userId && userId !== sender.toString());

  await Promise.all(recipients.map((recipient) => createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    link: '/tasks',
    metadata: { taskId: task._id, clientId: task.client },
  }, io)));
};

const applyDateFilter = (filter, field, startValue, endValue) => {
  if (!startValue && !endValue) return;

  const range = {};

  if (startValue) {
    const start = new Date(startValue);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
  }

  if (endValue) {
    const end = new Date(endValue);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
  }

  if (Object.keys(range).length) {
    filter[field] = range;
  }
};

const normalizeReportDate = (value, endOfDay = false) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const getWeekRange = ({ startDate, endDate } = {}) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() + diffToMonday);
  defaultStart.setHours(0, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultStart.getDate() + 6);
  defaultEnd.setHours(23, 59, 59, 999);

  return {
    start: normalizeReportDate(startDate) || defaultStart,
    end: normalizeReportDate(endDate, true) || defaultEnd,
  };
};

const formatReportDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const getTasks = async (req, res) => {
  try {
    const {
      project,
      client,
      taskCategory,
      taskType,
      status,
      assignedTo,
      assignedManager,
      priority,
      dueDate,
      search,
      parent,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (project) filter.project = project;
    if (client) filter.client = client;
    if (taskCategory) filter.taskCategory = taskCategoryMap[taskCategory] || taskCategory;
    if (taskType) filter.taskType = taskType;
    if (parent === 'all') {
      // leave unfiltered
    } else if (parent) {
      filter.parent = parent;
    } else {
      filter.parent = null;
    }

    if (status) filter.status = taskStatusMap[status] || status;
    if (priority) filter.priority = priorityMap[priority] || priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (assignedManager) filter.assignedManager = assignedManager;
    if (dueDate) {
      const date = new Date(dueDate);
      if (!Number.isNaN(date.getTime())) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filter.dueDate = { $gte: start, $lte: end };
      }
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { taskType: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { assignedPersonName: { $regex: search, $options: 'i' } },
        { scriptText: { $regex: search, $options: 'i' } },
        { websiteRequirements: { $regex: search, $options: 'i' } },
      ];
    }

    const scopedFilter = withWorkspaceScope(req, await buildScopedTaskFilter(req, filter));

    const total = await Task.countDocuments(scopedFilter);
    const tasks = await Task.find(scopedFilter)
      .populate('assignedTo', 'name avatar')
      .populate('assignedManager', 'name avatar')
      .populate('createdBy', 'name avatar')
      .populate('project', 'name')
      .populate('client', 'name company')
      .sort({ dueDate: 1, orderIndex: 1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit || 1)),
      tasks: tasks.map(serializeTask),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = await hydrateTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (
      req.user.role !== 'superAdmin'
      && req.user.organizationId
      && task.organizationId
      && task.organizationId.toString() !== req.user.organizationId.toString()
    ) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const [subtasks, recentActivity] = await Promise.all([
      Task.find({ parent: task._id })
        .populate('assignedTo', 'name avatar')
        .populate('createdBy', 'name avatar')
        .sort({ orderIndex: 1, createdAt: -1 }),
      ActivityLog.find({ relatedTask: task._id })
        .populate('actor', 'name avatar role')
        .sort({ createdAt: -1 })
        .limit(15),
    ]);

    res.json({
      success: true,
      task: serializeTask(task),
      subtasks: subtasks.map(serializeTask),
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const tasksData = Array.isArray(req.body.tasks)
      ? req.body.tasks.map(taskItem => ({
          ...req.body,
          ...taskItem,
        }))
      : [req.body];

    const createdTasks = [];

    for (const taskData of tasksData) {
      const payload = normalizeTaskPayload(taskData);
      if (!payload.title?.trim()) {
        return res.status(400).json({ success: false, message: 'Task title is required' });
      }

      if (!payload.project && !payload.client) {
        return res.status(400).json({ success: false, message: 'Project or client is required to create a task' });
      }

      const project = payload.project
        ? await Project.findById(payload.project).select('name client manager team')
        : null;

      if (project && !payload.client) {
        payload.client = project.client;
      }

      const client = payload.client
        ? await Client.findById(payload.client).select('name assignedManager assignedTeam')
        : null;

      if (req.user.role === 'manager' && !payload.assignedManager) {
        payload.assignedManager = req.user._id;
      }

      if (!payload.taskCategory) {
        payload.taskCategory = isWebsiteTaskType(payload.taskType) || payload.taskType === 'non_content'
          ? 'non_content'
          : 'content';
      }

      if (!payload.isClientVisible && payload.clientVisibleNotes?.trim()) {
        payload.isClientVisible = true;
      }

      const duplicateCount = Math.max(1, Number(taskData.duplicateCount) || 1);

      for (let i = 0; i < duplicateCount; i++) {
        const taskTitle = duplicateCount > 1 ? `${payload.title} - ${i + 1}` : payload.title;
        const currentPayload = {
          ...payload,
          title: taskTitle,
          taskTitle: taskTitle,
        };

        const task = await Task.create({
          ...currentPayload,
          dueDate: currentPayload.dueDate || currentPayload.deadline || new Date(),
          organizationId: req.user.organizationId,
          brandId: req.user.brandId,
          createdBy: req.user._id,
          assignedManager: currentPayload.assignedManager || undefined,
        });
        await syncTaskDerivedFields(task);
        await task.save();

        const io = req.app.get('io');
        await notifyNewAssignees({
          task,
          previousAssignedTo: [],
          actorId: req.user._id,
          io,
        });

        if (task.project) {
          io?.broadcastToProject?.(task.project.toString(), 'taskCreated', task);
        }

        await Promise.all([
          client?._id ? Client.findByIdAndUpdate(client._id, { $set: { lastActivityDate: new Date() } }) : Promise.resolve(),
          createActivityLog({
            actor: req.user,
            action: 'task.created',
            entityType: 'task',
            entityId: task._id,
            title: 'Task created',
            description: `${task.title} was created.`,
            relatedClient: task.client,
            relatedProject: task.project,
            relatedTask: task._id,
          }),
        ]);

        createdTasks.push(task);
      }
    }

    if (createdTasks.length === 0) {
      return res.status(400).json({ success: false, message: 'No tasks were created' });
    }

    const populated = await hydrateTask(createdTasks[0]._id);
    res.status(201).json({ success: true, task: serializeTask(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const previousAssignedTo = [...(task.assignedTo || [])];
    const previousAssignedManager = task.assignedManager;
    const payload = normalizeTaskPayload(req.body);

    if (payload.project || payload.client) {
      const nextProjectId = payload.project || task.project;
      const nextClientId = payload.client || task.client;
      if (nextProjectId && nextClientId) {
        const project = await Project.findById(nextProjectId).select('client');
        if (!project) {
          return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (project.client?.toString() !== nextClientId.toString()) {
          return res.status(400).json({ success: false, message: 'Selected project does not belong to the selected client' });
        }
      }
    }

    if (req.user.role === 'manager') {
      if (!payload.assignedManager) {
        payload.assignedManager = task.assignedManager || req.user._id;
      } else if (toIdString(payload.assignedManager) !== toIdString(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Managers can only assign tasks under their own management' });
      }

      const nextProjectId = payload.project || task.project;
      const nextClientId = payload.client || task.client;
      const project = nextProjectId ? await Project.findById(toIdString(nextProjectId)).select('team') : null;
      const client = nextClientId ? await Client.findById(toIdString(nextClientId)).select('assignedTeam') : null;
      const allowedAssignees = getManagerAssignableUserIds(project, client, req.user._id);
      const invalidAssignees = (payload.assignedTo || []).filter((id) => !allowedAssignees.includes(toIdString(id)));
      if (invalidAssignees.length) {
        return res.status(403).json({ success: false, message: 'You can only assign tasks to team members you manage' });
      }
    }

    if (req.user.role === 'superAdmin' && payload.assignedManager) {
      const manager = await User.findById(payload.assignedManager).select('role');
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ success: false, message: 'Assigned manager must be a manager user' });
      }
    }

    Object.assign(task, payload);
    if (!task.taskCategory) {
      task.taskCategory = isWebsiteTaskType(task.taskType) || task.taskType === 'non_content'
        ? 'non_content'
        : 'content';
    }
    if (!task.isClientVisible && task.clientVisibleNotes?.trim()) {
      task.isClientVisible = true;
    }
    await syncTaskDerivedFields(task);
    updateCompletionState(task);
    await task.save();

    if (payload.status && ['done', 'approved'].includes(task.status)) {
      const project = task.project ? await Project.findById(task.project).select('manager name') : null;
      await runAutomation('task_completed', { task, project, user: req.user, io: req.app.get('io') });
    }

    const io = req.app.get('io');
    await notifyNewAssignees({
      task,
      previousAssignedTo,
      previousAssignedManager,
      actorId: req.user._id,
      io,
    });

    const updated = await hydrateTask(task._id);
    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'taskUpdated', serializeTask(updated));
    }

    await createActivityLog({
      actor: req.user,
      action: 'task.updated',
      entityType: 'task',
      entityId: task._id,
      title: 'Task updated',
      description: `${task.title} was updated.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status, orderIndex } = req.body;
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    task.status = taskStatusMap[status] || status;
    if (orderIndex !== undefined) task.orderIndex = Number(orderIndex) || 0;
    if (req.user.role !== 'client' && ['todo', 'on_process', 'waiting_for_client', 'completed', 'review_required', 'rework_completed'].includes(task.status)) {
      task.clientResponse = 'pending';
      task.approvalStatus = 'pending';
      task.clientFeedback = '';
      task.clientResponseDate = undefined;
      task.clientResponseBy = undefined;
    }
    updateCompletionState(task);
    await task.save();

    const updated = await hydrateTask(task._id);
    const io = req.app.get('io');
    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'taskStatusUpdated', {
        taskId: task._id,
        status: task.status,
        orderIndex: task.orderIndex,
      });
    }

    await createActivityLog({
      actor: req.user,
      action: 'task.status.updated',
      entityType: 'task',
      entityId: task._id,
      title: 'Task status updated',
      description: `${task.title} moved to ${statusLabels[task.status] || task.status}.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { status: task.status, orderIndex: task.orderIndex },
    });

    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (!req.body.content?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    task.comments.push({
      content: req.body.content.trim(),
      author: req.user._id,
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
    });
    await task.save();

    const updated = await hydrateTask(task._id);
    const comment = updated.comments[updated.comments.length - 1];
    const io = req.app.get('io');

    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'taskCommentAdded', {
        taskId: task._id,
        comment,
      });
    }

    const recipients = uniqueIds([
      ...(task.assignedTo || []),
      task.createdBy,
    ]).filter((userId) => userId !== req.user._id.toString());

    await Promise.all(recipients.map((recipient) => createNotification({
      recipient,
      sender: req.user._id,
      type: 'task_comment',
      title: 'Task comment added',
      message: `${req.user.name} commented on ${task.title}`,
      link: '/tasks',
      metadata: { taskId: task._id },
    }, io)));

    await createActivityLog({
      actor: req.user,
      action: 'task.comment.added',
      entityType: 'task',
      entityId: task._id,
      title: 'Task comment added',
      description: `A comment was added to ${task.title}.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
    });

    res.json({ success: true, task: serializeTask(updated), comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveTask = async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (req.user.role === 'client' && !task.isClientVisible) {
      return res.status(403).json({ success: false, message: 'This task is not visible to the client' });
    }

    task.status = action === 'approve' ? 'approved' : 'rejected';
    task.approvedBy = req.user._id;
    task.approvedAt = new Date();
    task.rejectionReason = action === 'reject' ? (reason || '') : '';
    updateCompletionState(task);
    await task.save();

    const io = req.app.get('io');
    const recipients = uniqueIds([
      ...(task.assignedTo || []),
      task.createdBy,
    ]).filter((userId) => userId !== req.user._id.toString());

    await Promise.all(recipients.map((recipient) => createNotification({
      recipient,
      sender: req.user._id,
      type: 'approval_done',
      title: `Task ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `"${task.title}" was ${action === 'approve' ? 'approved' : 'rejected'}${reason ? `: ${reason}` : ''}`,
      link: '/tasks',
    }, io)));

    await createActivityLog({
      actor: req.user,
      action: 'task.approval.updated',
      entityType: 'task',
      entityId: task._id,
      title: 'Task approval updated',
      description: `${task.title} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { reason },
    });

    const updated = await hydrateTask(task._id);
    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const logTime = async (req, res) => {
  try {
    const { hours, description } = req.body;
    const parsedHours = Number(hours);
    if (!parsedHours || parsedHours <= 0) {
      return res.status(400).json({ success: false, message: 'Hours must be greater than zero' });
    }

    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    task.timeEntries.push({
      user: req.user._id,
      hours: parsedHours,
      description: description || '',
    });
    task.loggedHours = (task.loggedHours || 0) + parsedHours;
    await task.save();

    await createActivityLog({
      actor: req.user,
      action: 'task.time.logged',
      entityType: 'task',
      entityId: task._id,
      title: 'Task time logged',
      description: `${parsedHours} hour(s) were logged for ${task.title}.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { hours: parsedHours, description },
    });

    const updated = await hydrateTask(task._id);
    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addProgressUpdate = async (req, res) => {
  try {
    const { description, hours, workNotes, attachments, workDate } = req.body;
    
    if (!description?.trim()) {
      return res.status(400).json({ success: false, message: 'Progress description is required' });
    }

    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const parsedWorkDate = normalizeReportDate(workDate || new Date());
    if (!parsedWorkDate) {
      return res.status(400).json({ success: false, message: 'A valid work date is required' });
    }

    // If work is just starting and actualStartDate is not set, set it now
    if (!task.actualStartDate && task.status === 'todo') {
      task.actualStartDate = new Date();
      task.status = 'in_progress';
    }

    const progressEntry = {
      description: description.trim(),
      hours: Number(hours) || 0,
      workDate: parsedWorkDate,
      completedAt: new Date(),
      updatedBy: req.user._id,
      workNotes: workNotes?.trim?.() || '',
      attachments: normalizeFiles(attachments),
    };

    task.progressUpdates.push(progressEntry);
    
    // Update loggedHours if hours were provided
    if (Number(hours) > 0) {
      task.loggedHours = (task.loggedHours || 0) + Number(hours);
    }

    await task.save();

    await createActivityLog({
      actor: req.user,
      action: 'task.progress.updated',
      entityType: 'task',
      entityId: task._id,
      title: 'Task progress updated',
      description: `Progress logged: ${description.trim()}`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { hours: Number(hours) || 0, description: description.trim(), workDate: parsedWorkDate },
    });

    const updated = await hydrateTask(task._id);
    const io = req.app.get('io');
    
    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'taskProgressUpdated', {
        taskId: task._id,
        progress: updated.progressUpdates[updated.progressUpdates.length - 1],
        loggedHours: updated.loggedHours,
      });
    }

    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createDailyTask = async (req, res) => {
  try {
    const {
      title,
      workDate,
      description = '',
      hours = 0,
      workNotes = '',
      status = 'Completed',
      priority = 'Medium',
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const parsedDate = normalizeReportDate(workDate || new Date());
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: 'A valid work date is required' });
    }

    const payload = normalizeTaskPayload({
      title: title.trim(),
      taskTitle: title.trim(),
      description: description?.trim?.() || '',
      taskCategory: 'non_content',
      taskType: 'custom_task',
      assignedTo: [req.user._id],
      status,
      priority,
      dueDate: parsedDate,
      deadline: parsedDate,
      startDate: parsedDate,
      actualStartDate: parsedDate,
      isPersonalTask: true,
      progressUpdates: [],
    });

    const task = await Task.create({
      ...payload,
      organizationId: req.user.organizationId,
      brandId: req.user.brandId,
      createdBy: req.user._id,
    });

    await syncTaskDerivedFields(task);
    updateCompletionState(task);

    task.progressUpdates.push({
      description: description?.trim?.() || `Completed work for ${title.trim()}`,
      hours: Number(hours) || 0,
      workDate: parsedDate,
      completedAt: new Date(),
      updatedBy: req.user._id,
      workNotes: workNotes?.trim?.() || '',
      attachments: [],
    });

    if (Number(hours) > 0) {
      task.loggedHours = Number(hours);
    }

    await task.save();

    const hydrated = await hydrateTask(task._id);
    res.status(201).json({ success: true, task: serializeTask(hydrated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getWeeklyTaskReport = async (req, res) => {
  try {
    const { startDate, endDate, assignedTo } = req.query;
    const { start, end } = getWeekRange({ startDate, endDate });
    const requestedUserId = assignedTo || (isEmployeeLikeRole(req.user.role) ? req.user._id.toString() : '');

    const filter = {
      $or: [
        { 'progressUpdates.workDate': { $gte: start, $lte: end } },
        { 'progressUpdates.completedAt': { $gte: start, $lte: end } },
      ],
    };

    const scopedFilter = withWorkspaceScope(req, await buildScopedTaskFilter(req, filter));

    const tasks = await Task.find(scopedFilter)
      .populate('assignedTo', 'name email role')
      .populate('project', 'name')
      .populate('client', 'name company')
      .populate('progressUpdates.updatedBy', 'name email role');

    const rows = tasks.flatMap((task) => (
      (task.progressUpdates || [])
        .filter((entry) => {
          const entryDate = normalizeReportDate(entry.workDate || entry.completedAt);
          if (!entryDate) return false;
          const isInRange = entryDate >= start && entryDate <= end;
          const matchesUser = requestedUserId ? toIdString(entry.updatedBy) === requestedUserId : true;
          return isInRange && matchesUser;
        })
        .map((entry) => ({
          taskId: task._id,
          taskTitle: task.title || task.taskTitle || '',
          taskType: task.taskType || '',
          clientId: task.client?._id || null,
          clientName: task.client?.name || task.client?.company || task.clientName || '',
          projectId: task.project?._id || null,
          projectName: task.project?.name || task.projectName || '',
          employeeId: entry.updatedBy?._id || entry.updatedBy || null,
          employeeName: entry.updatedBy?.name || 'Unknown',
          role: entry.updatedBy?.role || '',
          description: entry.description || '',
          workNotes: entry.workNotes || '',
          hours: Number(entry.hours) || 0,
          workDate: entry.workDate || entry.completedAt,
          loggedAt: entry.completedAt || null,
          attachmentCount: Array.isArray(entry.attachments) ? entry.attachments.length : 0,
        }))
    ));

    rows.sort((a, b) => {
      const dateDiff = new Date(a.workDate).getTime() - new Date(b.workDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.taskTitle.localeCompare(b.taskTitle);
    });

    const totalHours = rows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0);
    const dailyBreakdown = rows.reduce((accumulator, row) => {
      const key = formatReportDay(row.workDate);
      if (!accumulator[key]) {
        accumulator[key] = { date: key, hours: 0, updates: 0 };
      }
      accumulator[key].hours += Number(row.hours) || 0;
      accumulator[key].updates += 1;
      return accumulator;
    }, {});

    const employeeBreakdown = rows.reduce((accumulator, row) => {
      const key = toIdString(row.employeeId) || row.employeeName;
      if (!accumulator[key]) {
        accumulator[key] = { employeeId: row.employeeId, employeeName: row.employeeName, hours: 0, updates: 0 };
      }
      accumulator[key].hours += Number(row.hours) || 0;
      accumulator[key].updates += 1;
      return accumulator;
    }, {});

    res.json({
      success: true,
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalUpdates: rows.length,
        totalHours,
        uniqueTasks: new Set(rows.map((row) => row.taskId.toString())).size,
        uniqueEmployees: new Set(rows.map((row) => toIdString(row.employeeId) || row.employeeName)).size,
      },
      dailyBreakdown: Object.values(dailyBreakdown),
      employeeBreakdown: Object.values(employeeBreakdown),
      rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCalendarTasks = async (req, res) => {
  try {
    const {
      project,
      client,
      taskCategory,
      taskType,
      status,
      assignedTo,
      priority,
      search,
      parent = 'all',
      startDate,
      endDate,
      overdue,
      approvalStatus,
      clientResponse,
      limit = 500,
    } = req.query;

    const filter = {};

    if (project) filter.project = project;
    if (client) filter.client = client;
    if (taskCategory) filter.taskCategory = taskCategoryMap[taskCategory] || taskCategory;
    if (taskType) filter.taskType = taskType;
    if (status) filter.status = taskStatusMap[status] || status;
    if (priority) filter.priority = priorityMap[priority] || priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (approvalStatus) filter.approvalStatus = approvalStatus.toString().toLowerCase();
    if (clientResponse) filter.clientResponse = clientResponse.toString().toLowerCase();

    if (parent === 'all') {
      // leave unfiltered
    } else if (parent) {
      filter.parent = parent;
    } else {
      filter.parent = null;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const dateRange = {};
      if (start) dateRange.$gte = start;
      if (end) dateRange.$lte = end;

      if (Object.keys(dateRange).length) {
        filter.$or = [
          ...(filter.$or || []),
          { dueDate: dateRange },
          { createdAt: dateRange },
          { dueDate: null },
          { dueDate: { $exists: false } },
        ];
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskType: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { assignedPersonName: { $regex: search, $options: 'i' } },
        { scriptText: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
        { websiteRequirements: { $regex: search, $options: 'i' } },
        { requiredFeatures: { $regex: search, $options: 'i' } },
        { clientVisibleNotes: { $regex: search, $options: 'i' } },
      ];
    }

    if (overdue === 'true') {
      const now = new Date();
      filter.dueDate = {
        ...(filter.dueDate || {}),
        $lt: now,
      };
      filter.status = { $nin: ['approved', 'done', 'completed'] };
    }

    const scopedFilter = withWorkspaceScope(req, await buildScopedTaskFilter(req, filter));

    const tasks = await Task.find(scopedFilter)
      .populate('assignedTo', 'name avatar role')
      .populate('createdBy', 'name avatar role')
      .populate('project', 'name')
      .populate('client', 'name company')
      .sort({ dueDate: 1, priority: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 500, 1000));

    const serialized = tasks.map(serializeTask);

    const summary = {
      total: serialized.length,
      overdue: serialized.filter((task) => task.isOverdue).length,
      waitingForClient: serialized.filter((task) => task.status === 'Waiting for Client').length,
      completed: serialized.filter((task) => ['Completed', 'Approved'].includes(task.status)).length,
    };

    res.json({
      success: true,
      tasks: serialized,
      summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTaskAttachments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const attachments = normalizeFiles(req.body.attachments).map((file) => ({
      ...file,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    }));

    if (!attachments.length) {
      return res.status(400).json({ success: false, message: 'At least one attachment is required' });
    }

    task.attachments.push(...attachments);
    await task.save();

    const updated = await hydrateTask(task._id);
    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addCompletedFiles = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const completedFiles = normalizeFiles(req.body.completedFiles).map((file) => ({
      ...file,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    }));

    if (!completedFiles.length) {
      return res.status(400).json({ success: false, message: 'At least one completed file is required' });
    }

    task.completedFiles.push(...completedFiles);
    if (task.status === 'on_process') {
      task.status = 'review_required';
    }
    await task.save();

    const updated = await hydrateTask(task._id);
    res.json({ success: true, task: serializeTask(updated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTaskResponseDetails = async (req, res) => {
  try {
    const task = await hydrateTask(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    res.json({
      success: true,
      response: {
        clientResponse: task.clientResponse || 'pending',
        clientFeedback: task.clientFeedback || '',
        clientResponseDate: task.clientResponseDate || null,
        clientResponseBy: task.clientResponseBy || null,
        approvalStatus: task.approvalStatus || 'pending',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitClientTaskResponse = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can submit task responses' });
    }

    if (!task.isClientVisible) {
      return res.status(403).json({ success: false, message: 'This task is not visible to the client' });
    }

    if (!isTaskResponseOpen(task.status)) {
      return res.status(400).json({ success: false, message: 'Client response is not available for this task status' });
    }

    if (task.clientResponse && task.clientResponse !== 'pending') {
      return res.status(400).json({ success: false, message: 'Response already submitted. Ask admin to reopen the task to respond again.' });
    }

    const responseValue = (req.body.clientResponse || '').toString().toLowerCase();
    if (!['yes', 'no'].includes(responseValue)) {
      return res.status(400).json({ success: false, message: 'Client response must be Yes or No' });
    }

    const feedback = req.body.clientFeedback?.toString()?.trim() || '';
    if (responseValue === 'no' && !feedback) {
      return res.status(400).json({ success: false, message: 'Feedback is required when requesting changes' });
    }

    task.clientResponse = responseValue;
    task.clientFeedback = feedback;
    task.clientResponseDate = new Date();
    task.clientResponseBy = req.user._id;
    task.approvalStatus = responseValue === 'yes' ? 'approved' : 'rework_requested';
    task.status = responseValue === 'yes' ? 'approved' : 'rework';
    if (responseValue === 'yes') {
      task.approvedBy = req.user._id;
      task.approvedAt = new Date();
    }
    updateCompletionState(task);
    await task.save();

    const hydrated = await hydrateTask(task._id);
    const io = req.app.get('io');
    const client = task.client ? await Client.findById(task.client).select('assignedManager') : null;
    const message = responseValue === 'yes'
      ? `Client has approved the task: ${task.title}`
      : `Client requested changes for task: ${task.title}`;

    await notifyTaskStakeholders({
      task,
      sender: req.user._id,
      type: responseValue === 'yes' ? 'client_approved' : 'client_rework_requested',
      title: responseValue === 'yes' ? 'Task approved by client' : 'Client requested rework',
      message,
      io,
      extraRecipients: client?.assignedManager ? [client.assignedManager] : [],
    });

    await createActivityLog({
      actor: req.user,
      action: 'task.client.response',
      entityType: 'task',
      entityId: task._id,
      title: 'Client response submitted',
      description: message,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
      metadata: { clientResponse: responseValue, clientFeedback: feedback },
    });

    res.json({
      success: true,
      message: responseValue === 'yes'
        ? 'Thank you. Your approval has been submitted.'
        : 'Your feedback has been submitted. Our team will update the task.',
      task: serializeTask(hydrated),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const access = await assertTaskAccess(req, task);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    await Task.deleteMany({ $or: [{ parent: task._id }, { _id: task._id }] });

    const io = req.app.get('io');
    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'taskDeleted', { taskId: task._id });
    }

    await createActivityLog({
      actor: req.user,
      action: 'task.deleted',
      entityType: 'task',
      entityId: task._id,
      title: 'Task deleted',
      description: `${task.title} was deleted.`,
      relatedClient: task.client,
      relatedProject: task.project,
      relatedTask: task._id,
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
