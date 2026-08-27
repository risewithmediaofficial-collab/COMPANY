// =============================================
// PROJECT CONTROLLER
// =============================================

import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Client from '../models/client.model.js';
import ActivityLog from '../models/activityLog.model.js';
import { createNotification } from '../utils/notification.js';
import { createActivityLog } from '../utils/activity.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';

const projectStatusMap = {
  Planning: 'planning',
  'In Progress': 'active',
  'On Hold': 'on_hold',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const priorityMap = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'urgent',
  Urgent: 'urgent',
};

const statusToColumnMap = {
  todo: 'todo',
  'To Do': 'todo',
  'Task Received': 'todo',

  in_progress: 'in_progress',
  on_process: 'in_progress',
  'In Progress': 'in_progress',
  'On Process': 'in_progress',
  'Work in Progress': 'in_progress',
  rework_completed: 'in_progress',
  'Rework Completed': 'in_progress',

  review: 'review',
  review_required: 'review',
  waiting_for_client: 'review',
  'In Review': 'review',
  'Review Required': 'review',
  'Waiting for Client': 'review',
  rework: 'review',
  Rework: 'review',

  approved: 'approved',
  Approved: 'approved',

  rejected: 'rejected',
  Blocked: 'rejected',
  Rejected: 'rejected',

  done: 'done',
  completed: 'done',
  Done: 'done',
  Completed: 'done',
};

const serializeProjectTask = (task) => {
  const item = task?.toObject ? task.toObject() : task;
  if (!item) return null;
  return {
    ...item,
    title: item.title || item.taskTitle || '',
    taskTitle: item.taskTitle || item.title || '',
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    }[item.priority] || item.priority || 'Medium',
    status: {
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
    }[item.status] || item.status || 'To Do',
  };
};

const serializeProject = (project) => {
  const item = project.toObject ? project.toObject() : project;
  const status = {
    planning: 'Planning',
    active: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[item.status] || item.status;

  let progress = item.progress !== undefined ? Number(item.progress) : 0;
  if ((status === 'Completed' || item.status === 'completed') && progress === 0) {
    progress = 100;
  }

  return {
    ...item,
    status,
    progress,
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Critical',
    }[item.priority] || item.priority,
    endDate: item.dueDate,
  };
};

const normalizeProjectPayload = (body) => {
  const payload = { ...body };
  if (payload.status) payload.status = projectStatusMap[payload.status] || payload.status;
  if (payload.priority) payload.priority = priorityMap[payload.priority] || payload.priority;
  if (payload.endDate !== undefined) {
    if (payload.endDate && typeof payload.endDate === 'string' && payload.endDate.trim() !== '') {
      payload.dueDate = new Date(payload.endDate);
    } else if (payload.endDate instanceof Date) {
      payload.dueDate = payload.endDate;
    } else {
      payload.dueDate = null;
    }
    delete payload.endDate;
  }
  if (payload.startDate !== undefined) {
    if (payload.startDate && typeof payload.startDate === 'string' && payload.startDate.trim() !== '') {
      payload.startDate = new Date(payload.startDate);
    } else if (payload.startDate instanceof Date) {
      // keep date
    } else {
      payload.startDate = null;
    }
  }
  if (payload.budget !== undefined) {
    payload.budget = Number(payload.budget) || 0;
  }
  if (payload.team && !Array.isArray(payload.team)) payload.team = [payload.team];
  if (!payload.currency) payload.currency = 'INR';

  // Support SaaS & Internal Products without Client
  if (
    payload.category === 'saas_product' ||
    payload.category === 'saas' ||
    payload.category === 'internal_product' ||
    payload.category === 'internal_tool' ||
    payload.isInternal
  ) {
    payload.isInternal = true;
    payload.productType = payload.productType || 'saas_product';
  }

  // Remove empty client reference
  if (!payload.client || payload.client === '' || payload.client === 'none' || payload.client === 'null') {
    delete payload.client;
  }

  return payload;
};

const assertProjectAccess = async (req, project) => {
  if (!project) return { allowed: false, status: 404, message: 'Project not found' };
  if (req.user.role === 'superAdmin' || req.user.role === 'admin') return { allowed: true };
  if (req.user.role === 'manager') return { allowed: true };
  if (req.user.role === 'employee' && project.team?.some((member) => member.toString() === req.user._id.toString())) return { allowed: true };
  if (req.user.role === 'client') {
    const client = await Client.findOne({ userId: req.user._id }).select('_id');
    if (client && project.client?.toString() === client._id.toString()) return { allowed: true };
  }
  return { allowed: false, status: 403, message: 'Access denied' };
};

export const getProjects = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      client,
      manager,
      isInternal,
      search,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      createdFrom,
      createdTo,
      page = 1,
      limit = 1000,
    } = req.query;
    const filter = {};

    if (status) filter.status = projectStatusMap[status] || status;
    if (category && category !== 'all') {
      if (category === 'saas_product' || category === 'saas') {
        filter.category = { $in: ['saas_product', 'saas'] };
      } else if (category === 'internal_tool' || category === 'internal_product') {
        filter.category = { $in: ['internal_tool', 'internal_product'] };
      } else if (category === 'web_development' || category === 'website') {
        filter.category = { $in: ['web_development', 'web_design'] };
      } else if (category === 'video_content' || category === 'video') {
        filter.category = { $in: ['video_content', 'video'] };
      } else {
        filter.category = category;
      }
    }
    if (priority) filter.priority = priorityMap[priority] || priority;
    if (client) filter.client = client;
    if (manager) filter.manager = manager;
    if (isInternal !== undefined && isInternal !== '') {
      filter.isInternal = isInternal === 'true' || isInternal === true;
    }
    if (startDateFrom || startDateTo) {
      filter.startDate = {};
      if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.startDate.$lte = new Date(`${startDateTo}T23:59:59.999Z`);
    }
    if (endDateFrom || endDateTo) {
      filter.dueDate = {};
      if (endDateFrom) filter.dueDate.$gte = new Date(endDateFrom);
      if (endDateTo) filter.dueDate.$lte = new Date(`${endDateTo}T23:59:59.999Z`);
    }
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(`${createdTo}T23:59:59.999Z`);
    }
    if (search) {
      const matchingClients = await Client.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { client: { $in: matchingClients.map((item) => item._id) } },
      ];
    }
    
    if (req.user.role === 'employee') filter.team = req.user._id;
    if (req.user.role === 'client') {
      const clientRecord = await Client.findOne({ userId: req.user._id }).select('_id');
      if (clientRecord) filter.client = clientRecord._id;
    }

    const scopedFilter = withWorkspaceScope(req, filter);

    const total = await Project.countDocuments(scopedFilter);
    const projects = await Project.find(scopedFilter)
      .populate('client', 'name email logo company')
      .populate('acceptedProposalId', 'title amount acceptedAt proposalNumber status')
      .populate('manager', 'name avatar')
      .populate('team', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const projectIds = projects.map((p) => p._id);
    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          totalTasks: { $sum: 1 },
          doneTasks: {
            $sum: {
              $cond: [
                { $in: ['$status', ['done', 'approved', 'completed', 'Completed', 'Done', 'Approved']] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const taskStatsMap = {};
    taskStats.forEach((stat) => {
      taskStatsMap[stat._id.toString()] = stat;
    });

    const serializedProjects = projects.map((project) => {
      const pObj = project.toObject ? project.toObject() : project;
      const stat = taskStatsMap[project._id.toString()];
      let progress = 0;
      if (pObj.status === 'completed' || pObj.status === 'Completed') {
        progress = 100;
      } else if (stat && stat.totalTasks > 0) {
        progress = Math.round((stat.doneTasks / stat.totalTasks) * 100);
      } else if (pObj.progress) {
        progress = Number(pObj.progress);
      }

      return serializeProject({
        ...pObj,
        progress,
        totalTasks: stat?.totalTasks || 0,
        doneTasks: stat?.doneTasks || 0,
      });
    });

    res.json({ success: true, total, projects: serializedProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email logo company')
      .populate('acceptedProposalId', 'title amount acceptedAt proposalNumber status currency')
      .populate('manager', 'name email avatar')
      .populate('team', 'name email avatar');

    const access = await assertProjectAccess(req, project);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const [totalTasks, doneTasks, recentActivity, recentTasks] = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({
        project: project._id,
        status: { $in: ['done', 'approved', 'completed', 'Completed', 'Done', 'Approved'] },
      }),
      ActivityLog.find({ relatedProject: project._id })
        .populate('actor', 'name avatar role')
        .sort({ createdAt: -1 })
        .limit(20),
      Task.find({ project: project._id, $or: [{ parent: null }, { parent: { $exists: false } }] })
        .populate('assignedTo', 'name avatar role')
        .sort({ updatedAt: -1 })
        .limit(20),
    ]);

    let progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (project.progress || 0);
    if (project.status === 'completed' || project.status === 'Completed') {
      progress = 100;
    }

    res.json({
      success: true,
      project: serializeProject({ ...project.toObject(), progress }),
      progress,
      recentActivity,
      recentTasks: recentTasks.map(serializeProjectTask),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const project = await Project.create(normalizeProjectPayload(req.body));
    const populated = await Project.findById(project._id)
      .populate('client', 'name email logo company')
      .populate('manager', 'name avatar')
      .populate('team', 'name avatar');

    if (project.manager) {
      await createNotification({
        recipient: project.manager,
        sender: req.user._id,
        type: 'project_created',
        title: 'New Project Assigned',
        message: `You have been assigned as manager for: ${project.name}`,
        link: `/projects/${project._id}`,
      }, req.app.get('io'));
    }

    if (project.client) {
      await Client.findByIdAndUpdate(project.client, {
        $set: {
          'onboardingSteps.projectCreated': true,
          lastActivityDate: new Date(),
        },
      });
    }

    await createActivityLog({
      actor: req.user,
      action: 'project.created',
      entityType: 'project',
      entityId: project._id,
      title: 'Project created',
      description: `${project.name} was created.`,
      relatedClient: project.client,
      relatedProject: project._id,
      relatedUser: project.manager,
    });

    res.status(201).json({ success: true, project: serializeProject(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, normalizeProjectPayload(req.body), { new: true, runValidators: true })
      .populate('client', 'name email logo company')
      .populate('manager', 'name avatar')
      .populate('team', 'name avatar');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    req.app.get('io').broadcastToProject(project._id.toString(), 'projectUpdated', project);

    await createActivityLog({
      actor: req.user,
      action: 'project.updated',
      entityType: 'project',
      entityId: project._id,
      title: 'Project updated',
      description: `${project.name} was updated.`,
      relatedClient: project.client?._id || project.client,
      relatedProject: project._id,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, project: serializeProject(project) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    await createActivityLog({
      actor: req.user,
      action: 'project.deleted',
      entityType: 'project',
      entityId: project._id,
      title: 'Project deleted',
      description: `${project.name} and its tasks were deleted.`,
      relatedClient: project.client,
      relatedProject: project._id,
    });

    res.json({ success: true, message: 'Project and associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectKanban = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('_id client manager team');
    const access = await assertProjectAccess(req, project);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const statuses = ['todo', 'in_progress', 'review', 'approved', 'rejected', 'done'];
    const taskFilter = {
      project: req.params.id,
      $or: [{ parent: null }, { parent: { $exists: false } }],
    };
    if (req.user.role === 'client') taskFilter.isClientVisible = true;

    const tasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name avatar role')
      .populate('scriptWriterAssigned', 'name avatar')
      .populate('videographerAssigned', 'name avatar')
      .populate('editorAssigned', 'name avatar')
      .populate('publisherAssigned', 'name avatar')
      .sort({ orderIndex: 1, createdAt: -1 });

    const kanban = {};
    statuses.forEach((status) => { kanban[status] = []; });
    tasks.forEach((task) => {
      const col = statusToColumnMap[task.status] || 'todo';
      const serialized = serializeProjectTask(task);
      if (kanban[col]) {
        kanban[col].push(serialized);
      } else {
        kanban.todo.push(serialized);
      }
    });

    res.json({ success: true, kanban });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
