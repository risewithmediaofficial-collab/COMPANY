// =============================================
// DEVELOPMENT MODULE CONTROLLER
// Dedicated development workflow powered by DevTask ('dev_tasks' collection)
// Completely decoupled from CRM Tasks database
// =============================================

import mongoose from 'mongoose';
import DevTask, { mapDevStageToGlobalStatus } from '../../models/development/devTask.model.js';
import Sprint from '../../models/development/sprint.model.js';
import Release from '../../models/development/release.model.js';
import User from '../../models/user.model.js';
import Project from '../../models/project.model.js';
import Client from '../../models/client.model.js';
import { createNotification } from '../../utils/notification.js';
import { createActivityLog } from '../../utils/activity.js';

// ── GET Development Dashboard Metrics ─────────────────────────────────────────
export const getDevDashboard = async (req, res) => {
  try {
    const tasks = await DevTask.find()
      .populate('project', 'name')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role')
      .populate('developer', 'name email avatar')
      .populate('development.developer', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('development.sprint', 'name status');

    const totalTasks = tasks.length;

    // Counts per pipeline stage
    const stages = [
      'backlog',
      'analysis',
      'ready_for_dev',
      'in_development',
      'code_review',
      'qa_testing',
      'client_uat',
      'approved',
      'deployment',
      'live',
      'closed',
      'blocked',
    ];

    const stageCounts = {};
    stages.forEach((s) => {
      stageCounts[s] = 0;
    });

    let totalBlocked = 0;
    let totalBugs = 0;
    const bugSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    // Workload aggregation by developer
    const developerWorkload = {};

    tasks.forEach((t) => {
      const currentStage = t.development?.stage || t.stage || 'backlog';
      if (stageCounts[currentStage] !== undefined) {
        stageCounts[currentStage] += 1;
      }

      if (t.isBlocked || t.development?.isBlocked || currentStage === 'blocked') {
        totalBlocked += 1;
      }

      if (t.isBug || t.development?.isBug) {
        totalBugs += 1;
        const sev = t.bugSeverity || t.development?.bugSeverity || 'medium';
        if (bugSeverityCounts[sev] !== undefined) {
          bugSeverityCounts[sev] += 1;
        }
      }

      // Developer assignment
      const assignedUsers = [];
      const devUser = t.developer || t.development?.developer;
      if (devUser) {
        assignedUsers.push(devUser);
      } else if (Array.isArray(t.assignedTo) && t.assignedTo.length > 0) {
        t.assignedTo.forEach((u) => assignedUsers.push(u));
      }

      assignedUsers.forEach((u) => {
        const uId = u._id ? u._id.toString() : u.toString();
        const uName = u.name || 'Developer';
        if (!developerWorkload[uId]) {
          developerWorkload[uId] = {
            id: uId,
            name: uName,
            avatar: u.avatar || '',
            total: 0,
            inProgress: 0,
            completed: 0,
            blocked: 0,
          };
        }
        developerWorkload[uId].total += 1;
        if (['in_development', 'code_review', 'qa_testing'].includes(currentStage)) {
          developerWorkload[uId].inProgress += 1;
        } else if (['live', 'closed'].includes(currentStage) || t.status === 'completed') {
          developerWorkload[uId].completed += 1;
        }
        if (t.isBlocked || t.development?.isBlocked || currentStage === 'blocked') {
          developerWorkload[uId].blocked += 1;
        }
      });
    });

    // Active Sprint info
    const activeSprint = await Sprint.findOne({ status: 'active' }).sort({ endDate: 1 });
    let sprintStats = null;
    if (activeSprint) {
      const activeSprintIdStr = activeSprint._id.toString();
      const sprintTasks = tasks.filter((t) => {
        const spId = t.sprint?._id?.toString() || t.sprint?.toString() || t.development?.sprint?._id?.toString() || t.development?.sprint?.toString();
        return spId === activeSprintIdStr;
      });
      const sprintTotal = sprintTasks.length;
      const sprintCompleted = sprintTasks.filter((t) => {
        const s = t.development?.stage || t.stage;
        return ['live', 'closed'].includes(s) || t.status === 'completed';
      }).length;
      const sprintBlocked = sprintTasks.filter((t) => t.isBlocked || t.development?.isBlocked).length;

      sprintStats = {
        _id: activeSprint._id,
        name: activeSprint.name,
        goal: activeSprint.goal,
        startDate: activeSprint.startDate,
        endDate: activeSprint.endDate,
        total: sprintTotal,
        completed: sprintCompleted,
        remaining: sprintTotal - sprintCompleted,
        blocked: sprintBlocked,
      };
    }

    res.json({
      success: true,
      data: {
        totalTasks,
        totalBlocked,
        totalBugs,
        bugSeverityCounts,
        stageCounts,
        developerWorkload: Object.values(developerWorkload),
        activeSprint: sprintStats,
      },
    });
  } catch (error) {
    console.error('getDevDashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET Development Tasks (Filtered) ──────────────────────────────────────────
export const getDevTasks = async (req, res) => {
  try {
    const {
      stage,
      sprint,
      release,
      developer,
      project,
      client,
      isBlocked,
      isBug,
      search,
    } = req.query;

    const query = {};

    if (stage) {
      query.$or = [{ stage }, { 'development.stage': stage }];
    }
    if (sprint) {
      query.$or = [{ sprint }, { 'development.sprint': sprint }];
    }
    if (release) {
      query.$or = [{ release }, { 'development.release': release }];
    }
    if (developer) {
      query.$or = [
        { developer },
        { 'development.developer': developer },
        { assignedTo: developer },
      ];
    }
    if (project) {
      query.project = project;
    }
    if (client) {
      query.client = client;
    }
    if (isBlocked !== undefined) {
      const blockedBool = isBlocked === 'true';
      query.$or = [{ isBlocked: blockedBool }, { 'development.isBlocked': blockedBool }];
    }
    if (isBug !== undefined) {
      const bugBool = isBug === 'true';
      query.$or = [{ isBug: bugBool }, { 'development.isBug': bugBool }];
    }
    if (search) {
      query.$and = [
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } },
            { 'development.branch': { $regex: search, $options: 'i' } },
            { pullRequestNumber: { $regex: search, $options: 'i' } },
            { 'development.pullRequestNumber': { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const tasks = await DevTask.find(query)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role position department')
      .populate('developer', 'name email avatar role position')
      .populate('reviewer', 'name email avatar role position')
      .populate('tester', 'name email avatar role position')
      .populate('development.developer', 'name email avatar role position')
      .populate('development.reviewer', 'name email avatar role position')
      .populate('development.tester', 'name email avatar role position')
      .populate('development.blockedBy', 'name email')
      .populate('sprint', 'name status startDate endDate')
      .populate('release', 'version name environment status')
      .populate('development.sprint', 'name status startDate endDate')
      .populate('development.release', 'version name environment status')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error('getDevTasks error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET Single Dev Task By ID ─────────────────────────────────────────────────
export const getDevTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await DevTask.findById(id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role position department')
      .populate('developer', 'name email avatar role position')
      .populate('reviewer', 'name email avatar role position')
      .populate('tester', 'name email avatar role position')
      .populate('development.developer', 'name email avatar role position')
      .populate('development.reviewer', 'name email avatar role position')
      .populate('development.tester', 'name email avatar role position')
      .populate('development.blockedBy', 'name email')
      .populate('sprint', 'name status startDate endDate')
      .populate('release', 'version name environment status')
      .populate('comments.author', 'name avatar email');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Development task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('getDevTaskById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── CREATE Development Task (Dedicated to dev_tasks collection) ───────────────
export const createDevTask = async (req, res) => {
  try {
    const payload = { ...req.body };

    const title = (payload.title || payload.taskTitle || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    payload.title = title;
    payload.taskTitle = title;
    payload.department = 'Development';
    payload.taskCategory = 'development';
    payload.isDevTask = true;
    payload.createdBy = req.user._id;
    payload.stage = payload.stage || payload.development?.stage || 'backlog';
    payload.status = mapDevStageToGlobalStatus(payload.stage);

    // Resolve project & client names
    if (payload.project) {
      const proj = await Project.findById(payload.project).select('name client');
      if (proj) {
        payload.projectName = proj.name;
        if (!payload.client && proj.client) {
          payload.client = proj.client;
        }
      }
    }
    if (payload.client) {
      const cli = await Client.findById(payload.client).select('name company');
      if (cli) {
        payload.clientName = cli.name || cli.company || '';
      }
    }

    // Assignee normalization
    const devId = payload.developer || payload.development?.developer || (Array.isArray(payload.assignedTo) && payload.assignedTo[0]);
    if (devId) {
      payload.developer = devId;
      if (!Array.isArray(payload.assignedTo)) {
        payload.assignedTo = [devId];
      } else if (!payload.assignedTo.includes(devId)) {
        payload.assignedTo.push(devId);
      }
      const devUser = await User.findById(devId).select('name');
      if (devUser) {
        payload.assignedPersonName = devUser.name;
      }
    }

    // Ensure development subdocument exists and is populated
    if (!payload.development) {
      payload.development = {};
    }
    payload.development.isDevTask = true;
    payload.development.stage = payload.stage;
    if (payload.developer) payload.development.developer = payload.developer;
    if (payload.reviewer) payload.development.reviewer = payload.reviewer;
    if (payload.tester) payload.development.tester = payload.tester;
    if (payload.sprint) payload.development.sprint = payload.sprint;
    if (payload.release) payload.development.release = payload.release;
    if (payload.branch) payload.development.branch = payload.branch;
    if (payload.isBug) payload.development.isBug = payload.isBug;
    if (payload.bugSeverity) payload.development.bugSeverity = payload.bugSeverity;

    const task = await DevTask.create(payload);

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role position')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('release', 'version name');

    // Notify developer if assigned
    if (payload.developer && payload.developer.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      await createNotification(
        {
          recipient: payload.developer,
          sender: req.user._id,
          type: 'task_assigned',
          title: 'Development Task Assigned',
          message: `You were assigned dev task: "${task.title}"`,
          link: '/development/board',
          metadata: { taskId: task._id },
        },
        io
      );
    }

    await createActivityLog({
      actor: req.user,
      action: 'dev_task.created',
      entityType: 'dev_task',
      entityId: task._id,
      title: 'Dev Task Created',
      description: `Created development task "${task.title}" in stage ${task.stage}`,
      relatedClient: task.client,
      relatedProject: task.project,
    });

    res.status(201).json({
      success: true,
      message: 'Development task created successfully',
      data: populated,
    });
  } catch (error) {
    console.error('createDevTask error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE Development Task ───────────────────────────────────────────────────
export const updateDevTask = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    if (payload.stage) {
      payload.status = mapDevStageToGlobalStatus(payload.stage);
    }

    const task = await DevTask.findByIdAndUpdate(id, payload, { new: true })
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('release', 'version name');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, message: 'Task updated successfully', data: task });
  } catch (error) {
    console.error('updateDevTask error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE Development Task ───────────────────────────────────────────────────
export const deleteDevTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await DevTask.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await createActivityLog({
      actor: req.user,
      action: 'dev_task.deleted',
      entityType: 'dev_task',
      entityId: id,
      title: 'Dev Task Deleted',
      description: `Deleted development task "${task.title}"`,
    });

    res.json({ success: true, message: 'Development task deleted successfully' });
  } catch (error) {
    console.error('deleteDevTask error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE Development Stage (Pipeline Transitions) ──────────────────────────
export const updateDevStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, blockedReason } = req.body;

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const previousStage = task.stage || task.development?.stage || 'backlog';

    if (stage === 'blocked') {
      task.previousStage = previousStage !== 'blocked' ? previousStage : (task.previousStage || 'in_development');
      task.stage = 'blocked';
      task.isBlocked = true;
      task.blockedReason = blockedReason || 'Blocked by team';
      task.blockedBy = req.user._id;
      task.blockedAt = new Date();

      if (!task.development) task.development = {};
      task.development.previousStage = task.previousStage;
      task.development.stage = 'blocked';
      task.development.isBlocked = true;
      task.development.blockedReason = task.blockedReason;
      task.development.blockedBy = req.user._id;
      task.development.blockedAt = task.blockedAt;
    } else {
      // If moving out of blocked
      if (task.isBlocked) {
        task.isBlocked = false;
        task.blockedReason = '';
      }
      task.previousStage = previousStage;
      task.stage = stage;

      if (!task.development) task.development = {};
      task.development.isBlocked = false;
      task.development.blockedReason = '';
      task.development.previousStage = previousStage;
      task.development.stage = stage;
    }

    task.status = mapDevStageToGlobalStatus(task.stage);
    if (['live', 'closed'].includes(task.stage)) {
      task.completedAt = new Date();
    }

    await task.save();

    const io = req.app.get('io');
    if (task.project) {
      io?.broadcastToProject?.(task.project.toString(), 'devTaskStageChanged', {
        taskId: task._id,
        stage: task.stage,
      });
    }

    // Create activity log
    await createActivityLog({
      actor: req.user,
      action: 'task.dev.stage_changed',
      entityType: 'dev_task',
      entityId: task._id,
      title: `Task moved to ${task.stage.replace(/_/g, ' ').toUpperCase()}`,
      description: task.isBlocked
        ? `Task blocked: ${task.blockedReason}`
        : `Task moved from ${previousStage.replace(/_/g, ' ')} to ${task.stage.replace(/_/g, ' ')}`,
      relatedClient: task.client,
      relatedProject: task.project,
      metadata: {
        fromStage: previousStage,
        toStage: task.stage,
        isBlocked: task.isBlocked,
        blockedReason: task.blockedReason,
      },
    });

    // Notify developer or assignees
    const recipient = task.developer || (task.assignedTo && task.assignedTo[0]);
    if (recipient && recipient.toString() !== req.user._id.toString()) {
      await createNotification(
        {
          recipient,
          sender: req.user._id,
          type: task.isBlocked ? 'task_blocked' : 'task_stage_changed',
          title: task.isBlocked ? 'Task Blocked' : 'Development Stage Updated',
          message: `Task "${task.title}" is now ${task.stage.replace(/_/g, ' ')}`,
          link: '/development/board',
          metadata: { taskId: task._id },
        },
        io
      );
    }

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar role')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar')
      .populate('development.developer', 'name email avatar')
      .populate('development.reviewer', 'name email avatar')
      .populate('development.tester', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('release', 'version name');

    res.json({
      success: true,
      message: `Task stage updated to ${task.stage}`,
      data: populated,
    });
  } catch (error) {
    console.error('updateDevStage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── SUBMIT Code Review (Reviewers) ───────────────────────────────────────────
export const submitCodeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewComments } = req.body;

    if (!['approved', 'changes_requested'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Review status must be either approved or changes_requested',
      });
    }

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.reviewer = req.user._id;
    task.reviewStatus = reviewStatus;
    task.reviewComments = reviewComments || '';
    task.reviewedAt = new Date();

    if (!task.development) task.development = {};
    task.development.reviewer = req.user._id;
    task.development.reviewStatus = reviewStatus;
    task.development.reviewComments = reviewComments || '';
    task.development.reviewedAt = new Date();

    // Rule: if changes_requested, route back to in_development.
    // Rule: if approved, route forward to qa_testing.
    if (reviewStatus === 'changes_requested') {
      task.stage = 'in_development';
      task.development.stage = 'in_development';
      task.status = 'in_progress';
    } else if (reviewStatus === 'approved') {
      task.stage = 'qa_testing';
      task.development.stage = 'qa_testing';
      task.status = 'review';
    }

    await task.save();

    const io = req.app.get('io');
    const actionTitle = reviewStatus === 'approved' ? 'Code Review Approved' : 'Code Review Changes Requested';
    const actionDesc = `${req.user.name} ${reviewStatus === 'approved' ? 'approved' : 'requested changes on'} task: "${task.title}"`;

    await createActivityLog({
      actor: req.user,
      action: 'task.dev.code_review',
      entityType: 'dev_task',
      entityId: task._id,
      title: actionTitle,
      description: reviewComments ? `${actionDesc} — Note: ${reviewComments}` : actionDesc,
      relatedClient: task.client,
      relatedProject: task.project,
      metadata: { reviewStatus, reviewComments },
    });

    // Notify developer
    const devId = task.developer || (task.assignedTo && task.assignedTo[0]);
    if (devId && devId.toString() !== req.user._id.toString()) {
      await createNotification(
        {
          recipient: devId,
          sender: req.user._id,
          type: reviewStatus === 'approved' ? 'review_approved' : 'changes_requested',
          title: actionTitle,
          message: reviewComments || actionDesc,
          link: '/development/board',
          metadata: { taskId: task._id, reviewStatus },
        },
        io
      );
    }

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar');

    res.json({
      success: true,
      message: `Code review recorded: ${reviewStatus}`,
      data: populated,
    });
  } catch (error) {
    console.error('submitCodeReview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── SUBMIT QA Testing Result (Testers) ────────────────────────────────────────
export const submitQAResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { testStatus, testNotes, testAttachments } = req.body;

    if (!['passed', 'failed', 'blocked'].includes(testStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Test status must be passed, failed, or blocked',
      });
    }

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.tester = req.user._id;
    task.testStatus = testStatus;
    task.testNotes = testNotes || '';
    task.testDate = new Date();

    if (!task.development) task.development = {};
    task.development.tester = req.user._id;
    task.development.testStatus = testStatus;
    task.development.testNotes = testNotes || '';
    task.development.testDate = new Date();

    if (Array.isArray(testAttachments)) {
      task.testAttachments = testAttachments;
      task.development.testAttachments = testAttachments;
    }

    // Rule: If failed, move back to in_development
    // Rule: If passed, move forward to client_uat
    // Rule: If blocked, move to blocked
    if (testStatus === 'failed') {
      task.stage = 'in_development';
      task.development.stage = 'in_development';
      task.status = 'in_progress';
    } else if (testStatus === 'passed') {
      task.stage = 'client_uat';
      task.development.stage = 'client_uat';
      task.status = 'waiting_for_client';
    } else if (testStatus === 'blocked') {
      task.previousStage = 'qa_testing';
      task.stage = 'blocked';
      task.isBlocked = true;
      task.blockedReason = testNotes || 'Blocked in QA testing';
      task.blockedBy = req.user._id;
      task.blockedAt = new Date();

      task.development.previousStage = 'qa_testing';
      task.development.stage = 'blocked';
      task.development.isBlocked = true;
      task.development.blockedReason = testNotes || 'Blocked in QA testing';
      task.development.blockedBy = req.user._id;
      task.development.blockedAt = new Date();
    }

    await task.save();

    const io = req.app.get('io');
    const actionTitle = testStatus === 'passed' ? 'QA Testing Passed' : testStatus === 'failed' ? 'QA Testing Failed' : 'QA Testing Blocked';
    const actionDesc = `${req.user.name} logged QA status "${testStatus}" on task "${task.title}"`;

    await createActivityLog({
      actor: req.user,
      action: 'task.dev.qa_result',
      entityType: 'dev_task',
      entityId: task._id,
      title: actionTitle,
      description: testNotes ? `${actionDesc} — Note: ${testNotes}` : actionDesc,
      relatedClient: task.client,
      relatedProject: task.project,
      metadata: { testStatus, testNotes },
    });

    // Notify developer
    const devId = task.developer || (task.assignedTo && task.assignedTo[0]);
    if (devId && devId.toString() !== req.user._id.toString()) {
      await createNotification(
        {
          recipient: devId,
          sender: req.user._id,
          type: testStatus === 'passed' ? 'qa_passed' : 'qa_failed',
          title: actionTitle,
          message: testNotes || actionDesc,
          link: '/development/board',
          metadata: { taskId: task._id, testStatus },
        },
        io
      );
    }

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar');

    res.json({
      success: true,
      message: `QA result recorded: ${testStatus}`,
      data: populated,
    });
  } catch (error) {
    console.error('submitQAResult error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── TOGGLE Blocked Status (Block / Unblock) ──────────────────────────────────
export const toggleBlocked = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockedReason } = req.body;

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (isBlocked) {
      task.previousStage = task.stage !== 'blocked' ? task.stage : (task.previousStage || 'in_development');
      task.stage = 'blocked';
      task.isBlocked = true;
      task.blockedReason = blockedReason || 'Task is blocked';
      task.blockedBy = req.user._id;
      task.blockedAt = new Date();

      if (!task.development) task.development = {};
      task.development.previousStage = task.previousStage;
      task.development.stage = 'blocked';
      task.development.isBlocked = true;
      task.development.blockedReason = task.blockedReason;
      task.development.blockedBy = req.user._id;
      task.development.blockedAt = task.blockedAt;
    } else {
      // Unblock: return to previousStage
      task.isBlocked = false;
      task.blockedReason = '';
      task.stage = task.previousStage || 'in_development';
      task.status = mapDevStageToGlobalStatus(task.stage);

      if (!task.development) task.development = {};
      task.development.isBlocked = false;
      task.development.blockedReason = '';
      task.development.stage = task.stage;
    }

    await task.save();

    const io = req.app.get('io');
    await createActivityLog({
      actor: req.user,
      action: isBlocked ? 'task.dev.blocked' : 'task.dev.unblocked',
      entityType: 'dev_task',
      entityId: task._id,
      title: isBlocked ? 'Task Blocked' : 'Task Unblocked',
      description: isBlocked ? `Task blocked: ${task.blockedReason}` : `Task unblocked, resumed at ${task.stage}`,
      relatedClient: task.client,
      relatedProject: task.project,
      metadata: { isBlocked, blockedReason: task.blockedReason },
    });

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('developer', 'name email avatar')
      .populate('blockedBy', 'name email');

    res.json({
      success: true,
      message: isBlocked ? 'Task marked as Blocked' : 'Task unblocked',
      data: populated,
    });
  } catch (error) {
    console.error('toggleBlocked error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE Development Metadata (Git, PR, Assignees, Sprint, Release) ─────────
export const updateDevMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      developer,
      reviewer,
      tester,
      branch,
      pullRequestUrl,
      pullRequestNumber,
      commitHash,
      sprint,
      release,
      isBug,
      bugSeverity,
      stepsToReproduce,
      expectedResult,
      actualResult,
      environment,
    } = req.body;

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!task.development) task.development = {};

    if (developer !== undefined) {
      task.developer = developer || null;
      task.development.developer = developer || null;
      if (developer && !task.assignedTo.some((u) => u.toString() === developer.toString())) {
        task.assignedTo.push(developer);
      }
    }
    if (reviewer !== undefined) {
      task.reviewer = reviewer || null;
      task.development.reviewer = reviewer || null;
    }
    if (tester !== undefined) {
      task.tester = tester || null;
      task.development.tester = tester || null;
    }
    if (branch !== undefined) {
      task.branch = branch;
      task.development.branch = branch;
    }
    if (pullRequestUrl !== undefined) {
      task.pullRequestUrl = pullRequestUrl;
      task.development.pullRequestUrl = pullRequestUrl;
    }
    if (pullRequestNumber !== undefined) {
      task.pullRequestNumber = pullRequestNumber;
      task.development.pullRequestNumber = pullRequestNumber;
    }
    if (commitHash !== undefined) {
      task.commitHash = commitHash;
      task.development.commitHash = commitHash;
    }
    if (sprint !== undefined) {
      task.sprint = sprint || null;
      task.development.sprint = sprint || null;
    }
    if (release !== undefined) {
      task.release = release || null;
      task.development.release = release || null;
    }
    if (isBug !== undefined) {
      task.isBug = Boolean(isBug);
      task.development.isBug = Boolean(isBug);
    }
    if (bugSeverity !== undefined) {
      task.bugSeverity = bugSeverity;
      task.development.bugSeverity = bugSeverity;
    }
    if (stepsToReproduce !== undefined) {
      task.stepsToReproduce = stepsToReproduce;
      task.development.stepsToReproduce = stepsToReproduce;
    }
    if (expectedResult !== undefined) {
      task.expectedResult = expectedResult;
      task.development.expectedResult = expectedResult;
    }
    if (actualResult !== undefined) {
      task.actualResult = actualResult;
      task.development.actualResult = actualResult;
    }
    if (environment !== undefined) {
      task.environment = environment;
      task.development.environment = environment;
    }

    await task.save();

    const populated = await DevTask.findById(task._id)
      .populate('project', 'name client')
      .populate('client', 'name company')
      .populate('assignedTo', 'name email avatar')
      .populate('developer', 'name email avatar')
      .populate('reviewer', 'name email avatar')
      .populate('tester', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('release', 'version name');

    res.json({
      success: true,
      message: 'Development details updated',
      data: populated,
    });
  } catch (error) {
    console.error('updateDevMetadata error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE Dev Checklist ──────────────────────────────────────────────────────
export const updateDevChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist } = req.body;

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (Array.isArray(checklist)) {
      task.checklist = checklist;
      await task.save();
    }

    res.json({ success: true, checklist: task.checklist });
  } catch (error) {
    console.error('updateDevChecklist error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADD Comment to Dev Task ───────────────────────────────────────────────────
export const addDevComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const task = await DevTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments = task.comments || [];
    const comment = {
      content: content.trim(),
      author: req.user._id,
      createdAt: new Date(),
    };
    task.comments.push(comment);
    await task.save();

    res.json({ success: true, message: 'Comment added', comment });
  } catch (error) {
    console.error('addDevComment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── SPRINT MANAGEMENT (CRUD) ──────────────────────────────────────────────────
export const getSprints = async (req, res) => {
  try {
    const sprints = await Sprint.find()
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 });

    const sprintIds = sprints.map((s) => s._id);
    const sprintTasks = await DevTask.find({
      $or: [
        { sprint: { $in: sprintIds } },
        { 'development.sprint': { $in: sprintIds } },
      ],
    }).select('sprint development.sprint stage development.stage status');

    const sprintStats = sprints.map((s) => {
      const sIdStr = s._id.toString();
      const tasks = sprintTasks.filter((t) => {
        const tid = t.sprint?.toString() || t.development?.sprint?.toString();
        return tid === sIdStr;
      });
      const total = tasks.length;
      const completed = tasks.filter((t) => {
        const st = t.stage || t.development?.stage;
        return ['live', 'closed'].includes(st) || t.status === 'completed';
      }).length;
      return {
        ...s.toObject(),
        totalTasks: total,
        completedTasks: completed,
        remainingTasks: total - completed,
      };
    });

    res.json({ success: true, data: sprintStats });
  } catch (error) {
    console.error('getSprints error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSprint = async (req, res) => {
  try {
    const { name, startDate, endDate, goal, status, project } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Name, Start Date, and End Date are required' });
    }

    const sprint = await Sprint.create({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goal: goal || '',
      status: status || 'planning',
      project: project || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: sprint });
  } catch (error) {
    console.error('createSprint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const sprint = await Sprint.findByIdAndUpdate(id, req.body, { new: true });
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }
    res.json({ success: true, data: sprint });
  } catch (error) {
    console.error('updateSprint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const sprint = await Sprint.findByIdAndDelete(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Unlink sprint from dev tasks
    await DevTask.updateMany(
      { $or: [{ sprint: id }, { 'development.sprint': id }] },
      { $set: { sprint: null, 'development.sprint': null } }
    );

    res.json({ success: true, message: 'Sprint deleted' });
  } catch (error) {
    console.error('deleteSprint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── RELEASE & DEPLOYMENT MANAGEMENT (CRUD) ────────────────────────────────────
export const getReleases = async (req, res) => {
  try {
    const releases = await Release.find()
      .populate('deployedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const releaseIds = releases.map((r) => r._id);
    const releaseTasks = await DevTask.find({
      $or: [
        { release: { $in: releaseIds } },
        { 'development.release': { $in: releaseIds } },
      ],
    })
      .select('title status stage development.stage release development.release')
      .populate('project', 'name');

    const result = releases.map((r) => {
      const rIdStr = r._id.toString();
      const tasks = releaseTasks.filter((t) => {
        const rid = t.release?.toString() || t.development?.release?.toString();
        return rid === rIdStr;
      });
      return {
        ...r.toObject(),
        taskCount: tasks.length,
        tasks,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getReleases error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRelease = async (req, res) => {
  try {
    const { version, name, description, environment, status, commit } = req.body;

    if (!version || !name) {
      return res.status(400).json({ success: false, message: 'Version and Name are required' });
    }

    const release = await Release.create({
      version,
      name,
      description: description || '',
      environment: environment || 'staging',
      status: status || 'planned',
      commit: commit || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: release });
  } catch (error) {
    console.error('createRelease error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    if (payload.status === 'deployed' && !payload.deploymentDate) {
      payload.deploymentDate = new Date();
      payload.deployedBy = req.user._id;
    }

    const release = await Release.findByIdAndUpdate(id, payload, { new: true });
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    // If release was deployed, update associated dev tasks stage to live
    if (payload.status === 'deployed') {
      await DevTask.updateMany(
        {
          $or: [{ release: id }, { 'development.release': id }],
          $or: [{ stage: { $in: ['approved', 'deployment'] } }, { 'development.stage': { $in: ['approved', 'deployment'] } }],
        },
        { $set: { stage: 'live', 'development.stage': 'live', status: 'completed' } }
      );
    }

    res.json({ success: true, data: release });
  } catch (error) {
    console.error('updateRelease error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const release = await Release.findByIdAndDelete(id);
    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    await DevTask.updateMany(
      { $or: [{ release: id }, { 'development.release': id }] },
      { $set: { release: null, 'development.release': null } }
    );

    res.json({ success: true, message: 'Release deleted' });
  } catch (error) {
    console.error('deleteRelease error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
