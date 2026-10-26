// =============================================
// CONTENT PRODUCTION CONTROLLER
// Manages multi-stage content lifecycle:
// Scriptwriter -> Videographer -> Video Editor -> SMM
// =============================================

import ContentProduction from '../models/contentProduction.model.js';
import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Notification from '../models/notification.model.js';

const sanitizeText = (str) => (typeof str === 'string' ? str.trim() : '');

/**
 * Helper to emit socket events if available
 */
const emitSocketUpdate = (req, event, data) => {
  try {
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit(event, data);
    }
  } catch (err) {
    console.error('[Socket Emit Error]', err.message);
  }
};

/**
 * Helper to send notification to a user
 */
const notifyUser = async (req, recipientId, title, message, link, metadata = {}) => {
  if (!recipientId || String(recipientId) === String(req.user?._id)) return;
  try {
    const notif = await Notification.create({
      recipient: recipientId,
      sender: req.user?._id,
      type: 'task_assigned',
      title,
      message,
      link,
      metadata,
    });
    emitSocketUpdate(req, `notification:${recipientId}`, notif);
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
};

/**
 * Validates web or drive URLs safely
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * GET /api/content-production
 * List content production records with filtering, searching, and pagination
 */
export const listContentProduction = async (req, res) => {
  try {
    const {
      client,
      stage,
      status,
      assignedTo,
      priority,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { isDeleted: false };

    // Tenant / organization scoping
    if (req.user?.organizationId) {
      query.organizationId = req.user.organizationId;
    }

    // Role-based restrictions: Clients can only see their own client record
    if (req.user?.role === 'client') {
      const clientId = req.user.clientId?._id || req.user.clientId;
      if (!clientId) {
        return res.json({ success: true, count: 0, data: [], summary: {} });
      }
      query.client = clientId;
    } else if (client) {
      query.client = client;
    }

    // Stage filter
    if (stage && stage !== 'all') {
      query.currentStage = stage;
    }

    // Overall status filter
    if (status && status !== 'all') {
      query.overallStatus = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Assignee filter
    if (assignedTo && assignedTo !== 'all') {
      query.$or = [
        { assignedTo },
        { 'scriptwriter.assignedMember': assignedTo },
        { 'videographer.assignedMember': assignedTo },
        { 'videoEditor.assignedMember': assignedTo },
        { 'smm.assignedMember': assignedTo },
      ];
    }

    // Search by title, contentId, clientName, hook, captions
    if (search && search.trim()) {
      const s = search.trim();
      const searchRegex = new RegExp(s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      const searchConditions = [
        { title: searchRegex },
        { contentId: searchRegex },
        { clientName: searchRegex },
        { 'scriptwriter.hook': searchRegex },
        { 'scriptwriter.fullScript': searchRegex },
        { 'smm.caption': searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      ContentProduction.find(query)
        .populate('client', 'name company logo industry status')
        .populate('assignedTo', 'name email role avatar')
        .populate('scriptwriter.assignedMember', 'name email role avatar')
        .populate('videographer.assignedMember', 'name email role avatar')
        .populate('videoEditor.assignedMember', 'name email role avatar')
        .populate('smm.assignedMember', 'name email role avatar')
        .populate('createdBy', 'name email role avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ContentProduction.countDocuments(query),
    ]);

    // Build stage and status metrics summary for quick UI counts
    const baseSummaryQuery = { isDeleted: false };
    if (req.user?.organizationId) baseSummaryQuery.organizationId = req.user.organizationId;
    if (req.user?.role === 'client') {
      baseSummaryQuery.client = req.user.clientId?._id || req.user.clientId;
    } else if (client) {
      baseSummaryQuery.client = client;
    }

    const summaryAgg = await ContentProduction.aggregate([
      { $match: baseSummaryQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          scriptwriting: {
            $sum: { $cond: [{ $eq: ['$currentStage', 'Scriptwriting'] }, 1, 0] },
          },
          videography: {
            $sum: { $cond: [{ $eq: ['$currentStage', 'Videography'] }, 1, 0] },
          },
          videoEditing: {
            $sum: { $cond: [{ $eq: ['$currentStage', 'Video Editing'] }, 1, 0] },
          },
          smm: {
            $sum: { $cond: [{ $eq: ['$currentStage', 'SMM'] }, 1, 0] },
          },
          published: {
            $sum: { $cond: [{ $eq: ['$overallStatus', 'Published'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$overallStatus', 'Completed'] }, 1, 0] },
          },
          revisionRequired: {
            $sum: { $cond: [{ $eq: ['$overallStatus', 'Revision Required'] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      total: 0,
      scriptwriting: 0,
      videography: 0,
      videoEditing: 0,
      smm: 0,
      published: 0,
      completed: 0,
      revisionRequired: 0,
    };

    return res.json({
      success: true,
      count: items.length,
      total: totalCount,
      page: pageNum,
      pages: Math.ceil(totalCount / limitNum) || 1,
      summary,
      data: items,
    });
  } catch (err) {
    console.error('[listContentProduction error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve content list' });
  }
};

/**
 * GET /api/content-production/:id
 * Retrieve a single content production record
 */
export const getContentProductionById = async (req, res) => {
  try {
    const { id } = req.params;
    let query = { _id: id, isDeleted: false };

    // Support querying by contentId (e.g. CNT-2026-0001) as well
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { contentId: id, isDeleted: false };
    }

    if (req.user?.organizationId) {
      query.organizationId = req.user.organizationId;
    }
    if (req.user?.role === 'client') {
      const clientId = req.user.clientId?._id || req.user.clientId;
      query.client = clientId;
    }

    const item = await ContentProduction.findOne(query)
      .populate('client', 'name company logo industry status')
      .populate('assignedTo', 'name email role avatar')
      .populate('scriptwriter.assignedMember', 'name email role avatar')
      .populate('videographer.assignedMember', 'name email role avatar')
      .populate('videoEditor.assignedMember', 'name email role avatar')
      .populate('smm.assignedMember', 'name email role avatar')
      .populate('createdBy', 'name email role avatar')
      .populate('updatedBy', 'name email role avatar');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Content record not found' });
    }

    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('[getContentProductionById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve content record' });
  }
};

/**
 * POST /api/content-production
 * Create a new content production record and initialize workflow
 */
export const createContentProduction = async (req, res) => {
  try {
    const {
      client: clientId,
      title,
      priority = 'Medium',
      deadline,
      currentStage = 'Scriptwriting',
      overallStatus = 'Pending',
      assignedTo,
      additionalNotes = '',
      driveLinks = [],
      attachments = [],
      scriptwriter = {},
      videographer = {},
      videoEditor = {},
      smm = {},
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Content Title is required' });
    }
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client selection is required' });
    }

    // Verify client exists
    const clientRecord = await Client.findById(clientId).select('name company');
    if (!clientRecord) {
      return res.status(400).json({ success: false, message: 'Selected client does not exist' });
    }

    // URL Validations
    const allUrls = [
      scriptwriter?.referenceVideoLink,
      videographer?.locationMapLink,
      videographer?.referenceVideoLink,
      videographer?.rawFootageDriveLink,
      videoEditor?.editingReferenceVideo,
      videoEditor?.rawFootageDriveLink,
      videoEditor?.voiceOverAudioLink,
      videoEditor?.musicReferenceLink,
      videoEditor?.brandAssetsDriveLink,
      videoEditor?.finalVideoDriveLink,
      smm?.finalCreativeDriveLink,
      smm?.coverImageDriveLink,
      smm?.publishedPostUrl,
      ...(driveLinks || []).map((l) => l.url),
    ];

    for (const u of allUrls) {
      if (u && !isValidUrl(u)) {
        return res.status(400).json({
          success: false,
          message: `Invalid URL format detected: ${u}. Must begin with http:// or https://`,
        });
      }
    }

    // Resolve assigned member names
    let assignedPersonName = '';
    if (assignedTo) {
      const u = await User.findById(assignedTo).select('name');
      if (u) assignedPersonName = u.name;
    }

    const resolveMemberName = async (userId, providedName) => {
      if (!userId) return providedName || '';
      const u = await User.findById(userId).select('name');
      return u ? u.name : providedName || '';
    };

    const [swName, vgName, veName, smmName] = await Promise.all([
      resolveMemberName(scriptwriter.assignedMember, scriptwriter.assignedMemberName),
      resolveMemberName(videographer.assignedMember, videographer.assignedMemberName),
      resolveMemberName(videoEditor.assignedMember, videoEditor.assignedMemberName),
      resolveMemberName(smm.assignedMember, smm.assignedMemberName),
    ]);

    const sanitizedTitle = sanitizeText(title.trim());

    // Construct stage objects
    const initialScriptwriter = {
      ...scriptwriter,
      assignedMemberName: swName,
      status: scriptwriter.status || 'Draft',
    };

    const initialVideographer = {
      ...videographer,
      assignedMemberName: vgName,
      status: videographer.status || 'Scheduled',
    };

    const initialVideoEditor = {
      ...videoEditor,
      assignedMemberName: veName,
      status: videoEditor.status || 'Pending',
    };

    const initialSmm = {
      ...smm,
      assignedMemberName: smmName,
      status: smm.status || 'Content Pending',
    };

    const contentItem = new ContentProduction({
      client: clientId,
      clientName: clientRecord.name || clientRecord.company || '',
      title: sanitizedTitle,
      priority,
      deadline: deadline ? new Date(deadline) : null,
      currentStage,
      overallStatus,
      assignedTo: assignedTo || null,
      assignedPersonName,
      additionalNotes: additionalNotes ? sanitizeText(additionalNotes) : '',
      driveLinks: (driveLinks || []).filter((d) => d && d.url),
      attachments: attachments || [],
      scriptwriter: initialScriptwriter,
      videographer: initialVideographer,
      videoEditor: initialVideoEditor,
      smm: initialSmm,
      organizationId: req.user?.organizationId,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      activityLog: [
        {
          user: req.user._id,
          userName: req.user.name,
          action: 'Created content production record',
          stage: currentStage,
          timestamp: new Date(),
        },
      ],
    });

    await contentItem.save();

    // Populate for response
    await contentItem.populate([
      { path: 'client', select: 'name company logo industry' },
      { path: 'assignedTo', select: 'name email role avatar' },
      { path: 'scriptwriter.assignedMember', select: 'name email role avatar' },
      { path: 'videographer.assignedMember', select: 'name email role avatar' },
      { path: 'videoEditor.assignedMember', select: 'name email role avatar' },
      { path: 'smm.assignedMember', select: 'name email role avatar' },
      { path: 'createdBy', select: 'name email role avatar' },
    ]);

    emitSocketUpdate(req, 'content_production:created', contentItem);

    // Notify assigned members
    const notifyTasks = [];
    if (contentItem.assignedTo) {
      notifyTasks.push(
        notifyUser(
          req,
          contentItem.assignedTo._id || contentItem.assignedTo,
          'Content Assigned',
          `You have been assigned to content "${contentItem.title}" (${contentItem.contentId})`,
          `/content-production/${contentItem._id}`
        )
      );
    }
    if (contentItem.scriptwriter?.assignedMember) {
      notifyTasks.push(
        notifyUser(
          req,
          contentItem.scriptwriter.assignedMember._id || contentItem.scriptwriter.assignedMember,
          'Scriptwriting Assigned',
          `New scriptwriting task for "${contentItem.title}" (${contentItem.contentId})`,
          `/content-production/${contentItem._id}?tab=scriptwriter`
        )
      );
    }
    await Promise.allSettled(notifyTasks);

    return res.status(201).json({
      success: true,
      message: `Content ${contentItem.contentId} created successfully`,
      data: contentItem,
    });
  } catch (err) {
    console.error('[createContentProduction error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create content record' });
  }
};

/**
 * PUT /api/content-production/:id
 * Update top-level details of a content record
 */
export const updateContentProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const item = await ContentProduction.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Content record not found' });
    }

    // Role check: superAdmin, admin, manager, or assigned member
    const isManager = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    const isLeadAssignee = item.assignedTo && String(item.assignedTo) === String(req.user._id);

    if (!isManager && !isLeadAssignee) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify core content details' });
    }

    if (updateData.title && updateData.title.trim()) {
      item.title = sanitizeText(updateData.title.trim());
    }
    if (updateData.client) {
      item.client = updateData.client;
      const clientRecord = await Client.findById(updateData.client).select('name company');
      if (clientRecord) {
        item.clientName = clientRecord.name || clientRecord.company || '';
      }
    }
    if (updateData.priority) item.priority = updateData.priority;
    if (updateData.currentStage) item.currentStage = updateData.currentStage;
    if (updateData.overallStatus) item.overallStatus = updateData.overallStatus;
    if (updateData.deadline !== undefined) {
      item.deadline = updateData.deadline ? new Date(updateData.deadline) : null;
    }
    if (updateData.additionalNotes !== undefined) {
      item.additionalNotes = sanitizeText(updateData.additionalNotes);
    }
    if (Array.isArray(updateData.driveLinks)) {
      item.driveLinks = updateData.driveLinks.filter((d) => d && d.url && isValidUrl(d.url));
    }
    if (Array.isArray(updateData.attachments)) {
      item.attachments = updateData.attachments;
    }

    if (updateData.assignedTo !== undefined) {
      item.assignedTo = updateData.assignedTo || null;
      if (updateData.assignedTo) {
        const u = await User.findById(updateData.assignedTo).select('name');
        item.assignedPersonName = u ? u.name : '';
      } else {
        item.assignedPersonName = '';
      }
    }

    item.updatedBy = req.user._id;
    item.activityLog.push({
      user: req.user._id,
      userName: req.user.name,
      action: 'Updated content record details',
      stage: item.currentStage,
      timestamp: new Date(),
    });

    await item.save();

    await item.populate([
      { path: 'client', select: 'name company logo industry' },
      { path: 'assignedTo', select: 'name email role avatar' },
      { path: 'scriptwriter.assignedMember', select: 'name email role avatar' },
      { path: 'videographer.assignedMember', select: 'name email role avatar' },
      { path: 'videoEditor.assignedMember', select: 'name email role avatar' },
      { path: 'smm.assignedMember', select: 'name email role avatar' },
      { path: 'createdBy', select: 'name email role avatar' },
    ]);

    emitSocketUpdate(req, 'content_production:updated', item);

    return res.json({
      success: true,
      message: 'Content updated successfully',
      data: item,
    });
  } catch (err) {
    console.error('[updateContentProduction error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update content record' });
  }
};

/**
 * PATCH /api/content-production/:id/stage/:stageName
 * Update a specific team stage (scriptwriter, videographer, videoEditor, smm)
 */
export const updateStageDetails = async (req, res) => {
  try {
    const { id, stageName } = req.params;
    const stagePayload = req.body;

    const validStages = ['scriptwriter', 'videographer', 'videoEditor', 'smm'];
    if (!validStages.includes(stageName)) {
      return res.status(400).json({ success: false, message: `Invalid stage name: ${stageName}` });
    }

    const item = await ContentProduction.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Content record not found' });
    }

    const isManager = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    const assignedToStage = item[stageName]?.assignedMember;
    const isStageAssignee = assignedToStage && String(assignedToStage) === String(req.user._id);
    const isLeadAssignee = item.assignedTo && String(item.assignedTo) === String(req.user._id);

    // Permission check
    if (!isManager && !isStageAssignee && !isLeadAssignee) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this stage and do not have permission to modify it',
      });
    }

    // Validate URLs present in payload
    const stageUrls = [
      stagePayload.referenceVideoLink,
      stagePayload.locationMapLink,
      stagePayload.rawFootageDriveLink,
      stagePayload.editingReferenceVideo,
      stagePayload.voiceOverAudioLink,
      stagePayload.musicReferenceLink,
      stagePayload.brandAssetsDriveLink,
      stagePayload.finalVideoDriveLink,
      stagePayload.finalCreativeDriveLink,
      stagePayload.coverImageDriveLink,
      stagePayload.publishedPostUrl,
    ];

    for (const u of stageUrls) {
      if (u && !isValidUrl(u)) {
        return res.status(400).json({
          success: false,
          message: `Invalid URL format detected: ${u}. Must begin with http:// or https://`,
        });
      }
    }

    // Resolve assigned member name if member changed
    if (stagePayload.assignedMember !== undefined) {
      if (stagePayload.assignedMember) {
        const u = await User.findById(stagePayload.assignedMember).select('name');
        stagePayload.assignedMemberName = u ? u.name : '';
      } else {
        stagePayload.assignedMemberName = '';
      }
    }

    const previousStatus = item[stageName]?.status;
    const newStatus = stagePayload.status || previousStatus;

    // Apply stage updates
    item[stageName] = {
      ...(item[stageName] ? item[stageName].toObject() : {}),
      ...stagePayload,
      updatedAt: new Date(),
    };

    // Cross-stage synchronization & smart workflow progression
    if (stageName === 'scriptwriter') {
      // If approved, ensure videographer and editor have ready access to approved script
      if (newStatus === 'Approved') {
        if (!item.videographer.script) {
          item.videographer.script = item.scriptwriter.fullScript;
        }
        if (!item.videographer.referenceVideoLink) {
          item.videographer.referenceVideoLink = item.scriptwriter.referenceVideoLink;
        }
        if (!item.videoEditor.script) {
          item.videoEditor.script = item.scriptwriter.fullScript;
        }
        if (!item.videoEditor.editingReferenceVideo) {
          item.videoEditor.editingReferenceVideo = item.scriptwriter.referenceVideoLink;
        }
        // Advance current stage if still at Scriptwriting
        if (item.currentStage === 'Scriptwriting') {
          item.currentStage = 'Videography';
          item.overallStatus = 'In Progress';
        }
      } else if (newStatus === 'Revision Required') {
        item.overallStatus = 'Revision Required';
      }
    } else if (stageName === 'videographer') {
      // When raw footage uploaded / completed, sync raw footage link to video editor
      if (stagePayload.rawFootageDriveLink) {
        item.videoEditor.rawFootageDriveLink = stagePayload.rawFootageDriveLink;
      }
      if (newStatus === 'Completed') {
        if (item.currentStage === 'Videography') {
          item.currentStage = 'Video Editing';
        }
      }
    } else if (stageName === 'videoEditor') {
      // When final video drive link uploaded / completed, sync to SMM stage
      if (stagePayload.finalVideoDriveLink) {
        item.smm.finalCreativeDriveLink = stagePayload.finalVideoDriveLink;
      }
      if (newStatus === 'Completed') {
        if (item.currentStage === 'Video Editing') {
          item.currentStage = 'SMM';
          item.overallStatus = 'In Progress';
        }
      } else if (newStatus === 'Revision Required') {
        item.overallStatus = 'Revision Required';
      }
    } else if (stageName === 'smm') {
      if (newStatus === 'Scheduled') {
        item.overallStatus = 'Scheduled';
      } else if (newStatus === 'Published') {
        item.overallStatus = 'Published';
        item.currentStage = 'Published';
      }
    }

    // Check if revision required was flagged
    if (newStatus === 'Revision Required' && stagePayload.feedback) {
      item.revisions.push({
        stage: stageName.charAt(0).toUpperCase() + stageName.slice(1),
        requestedBy: req.user._id,
        requestedByName: req.user.name,
        feedback: sanitizeText(stagePayload.feedback),
        createdAt: new Date(),
      });
    }

    item.updatedBy = req.user._id;
    item.activityLog.push({
      user: req.user._id,
      userName: req.user.name,
      action: `Updated ${stageName} stage (Status: ${newStatus})`,
      stage: stageName,
      details: stagePayload.notes || '',
      timestamp: new Date(),
    });

    await item.save();

    await item.populate([
      { path: 'client', select: 'name company logo industry' },
      { path: 'assignedTo', select: 'name email role avatar' },
      { path: 'scriptwriter.assignedMember', select: 'name email role avatar' },
      { path: 'videographer.assignedMember', select: 'name email role avatar' },
      { path: 'videoEditor.assignedMember', select: 'name email role avatar' },
      { path: 'smm.assignedMember', select: 'name email role avatar' },
      { path: 'createdBy', select: 'name email role avatar' },
    ]);

    emitSocketUpdate(req, 'content_production:updated', item);

    // If new assigned member or status changed, send notification
    if (stagePayload.assignedMember && String(stagePayload.assignedMember) !== String(req.user._id)) {
      notifyUser(
        req,
        stagePayload.assignedMember,
        `${stageName.toUpperCase()} Assigned`,
        `You have been assigned to ${stageName} for "${item.title}" (${item.contentId})`,
        `/content-production/${item._id}?tab=${stageName}`
      );
    }

    return res.json({
      success: true,
      message: `${stageName} stage updated successfully`,
      data: item,
    });
  } catch (err) {
    console.error('[updateStageDetails error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update stage details' });
  }
};

/**
 * GET /api/content-production/scripts-and-references
 * Fetch saved scripts and reference videos filtered by client and content
 * Reusable in Video Editor form and other stages
 */
export const getScriptsAndReferences = async (req, res) => {
  try {
    const { clientId, contentId } = req.query;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId query parameter is required' });
    }

    // 1. Fetch scripts and reference videos from ContentProduction records for this client
    const cpRecords = await ContentProduction.find({
      client: clientId,
      isDeleted: false,
    })
      .select('contentId title scriptwriter videoEditor videographer createdAt')
      .lean();

    const scripts = [];
    const referenceVideos = [];

    cpRecords.forEach((item) => {
      // Scriptwriter stage
      if (item.scriptwriter?.fullScript || item.scriptwriter?.hook) {
        scripts.push({
          id: `cp-${item._id}-sw`,
          recordId: item._id,
          contentId: item.contentId,
          contentTitle: item.title,
          title: item.scriptwriter.hook
            ? `${item.title} — ${item.scriptwriter.hook.slice(0, 50)}`
            : `${item.title} (Script)`,
          hook: item.scriptwriter.hook || '',
          fullScript: item.scriptwriter.fullScript || '',
          sceneBySceneInstructions: item.scriptwriter.sceneBySceneInstructions || '',
          onScreenText: item.scriptwriter.onScreenText || '',
          videoType: item.scriptwriter.videoType || '',
          language: item.scriptwriter.language || 'English',
          status: item.scriptwriter.status || 'Draft',
          source: 'Content Production',
          referenceVideoLink: item.scriptwriter.referenceVideoLink || '',
          createdAt: item.createdAt,
        });
      }

      // Collect reference videos
      if (item.scriptwriter?.referenceVideoLink) {
        referenceVideos.push({
          id: `cp-${item._id}-ref-sw`,
          recordId: item._id,
          contentId: item.contentId,
          title: `${item.title} (Script Ref)`,
          url: item.scriptwriter.referenceVideoLink,
          source: 'Content Production Script',
          createdAt: item.createdAt,
        });
      }
      if (item.videographer?.referenceVideoLink) {
        referenceVideos.push({
          id: `cp-${item._id}-ref-vg`,
          recordId: item._id,
          contentId: item.contentId,
          title: `${item.title} (Shoot Ref)`,
          url: item.videographer.referenceVideoLink,
          source: 'Videography Stage',
          createdAt: item.createdAt,
        });
      }
      if (item.videoEditor?.editingReferenceVideo) {
        referenceVideos.push({
          id: `cp-${item._id}-ref-ve`,
          recordId: item._id,
          contentId: item.contentId,
          title: `${item.title} (Editor Ref)`,
          url: item.videoEditor.editingReferenceVideo,
          source: 'Video Editor Stage',
          createdAt: item.createdAt,
        });
      }
    });

    // 2. Fetch scripts and reference links from existing CRM Task records for this client
    try {
      const taskRecords = await Task.find({
        client: clientId,
        $or: [
          { scriptText: { $exists: true, $ne: '' } },
          { referenceLink: { $exists: true, $ne: '' } },
          { scriptLink: { $exists: true, $ne: '' } },
        ],
      })
        .select('title scriptText scriptLink referenceLink createdAt')
        .limit(50)
        .lean();

      taskRecords.forEach((task) => {
        if (task.scriptText && task.scriptText.trim()) {
          scripts.push({
            id: `task-${task._id}`,
            recordId: task._id,
            contentId: `TASK-${task._id.toString().slice(-4).toUpperCase()}`,
            contentTitle: task.title,
            title: `${task.title} (Task Script)`,
            hook: '',
            fullScript: task.scriptText,
            sceneBySceneInstructions: '',
            onScreenText: '',
            videoType: 'Voice-over',
            language: 'English',
            status: 'Approved',
            source: 'Tasks CRM',
            referenceVideoLink: task.referenceLink || '',
            createdAt: task.createdAt,
          });
        }

        if (task.referenceLink && task.referenceLink.trim()) {
          referenceVideos.push({
            id: `task-${task._id}-ref`,
            recordId: task._id,
            contentId: `TASK-${task._id.toString().slice(-4).toUpperCase()}`,
            title: `${task.title} (Task Reference)`,
            url: task.referenceLink.trim(),
            source: 'Tasks CRM',
            createdAt: task.createdAt,
          });
        }
      });
    } catch (taskErr) {
      console.warn('[Task scripts lookup error]', taskErr.message);
    }

    // Deduplicate reference videos by URL
    const uniqueRefVideos = [];
    const seenUrls = new Set();
    for (const ref of referenceVideos) {
      if (ref.url && !seenUrls.has(ref.url)) {
        seenUrls.add(ref.url);
        uniqueRefVideos.push(ref);
      }
    }

    return res.json({
      success: true,
      countScripts: scripts.length,
      countReferenceVideos: uniqueRefVideos.length,
      scripts,
      referenceVideos: uniqueRefVideos,
    });
  } catch (err) {
    console.error('[getScriptsAndReferences error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch scripts and references' });
  }
};

/**
 * POST /api/content-production/:id/revisions
 * Add revision feedback to a content record
 */
export const addContentRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, feedback } = req.body;

    if (!stage || !feedback || !feedback.trim()) {
      return res.status(400).json({ success: false, message: 'Stage and feedback message are required' });
    }

    const item = await ContentProduction.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Content record not found' });
    }

    item.revisions.push({
      stage,
      requestedBy: req.user._id,
      requestedByName: req.user.name,
      feedback: sanitizeText(feedback.trim()),
      createdAt: new Date(),
      resolved: false,
    });

    item.overallStatus = 'Revision Required';

    // Map stage to stage subdocument
    const stageKeyMap = {
      Scriptwriting: 'scriptwriter',
      Videography: 'videographer',
      'Video Editing': 'videoEditor',
      SMM: 'smm',
    };
    const key = stageKeyMap[stage];
    if (key && item[key]) {
      item[key].status = 'Revision Required';
    }

    item.activityLog.push({
      user: req.user._id,
      userName: req.user.name,
      action: `Requested revision for ${stage}`,
      stage,
      details: feedback,
      timestamp: new Date(),
    });

    item.updatedBy = req.user._id;
    await item.save();

    emitSocketUpdate(req, 'content_production:revision', item);

    // Notify stage assignee if exists
    if (key && item[key]?.assignedMember) {
      notifyUser(
        req,
        item[key].assignedMember,
        'Revision Required',
        `Revision requested for ${stage} on "${item.title}" (${item.contentId})`,
        `/content-production/${item._id}?tab=${key}`
      );
    }

    return res.json({
      success: true,
      message: 'Revision requested successfully',
      data: item,
    });
  } catch (err) {
    console.error('[addContentRevision error]', err);
    return res.status(500).json({ success: false, message: 'Failed to record revision' });
  }
};

/**
 * DELETE /api/content-production/:id
 * Soft delete a content production record
 */
export const deleteContentProduction = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await ContentProduction.findOne({ _id: id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Content record not found' });
    }

    // Role check
    const isManager = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    if (!isManager && String(item.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this content record' });
    }

    item.isDeleted = true;
    item.updatedBy = req.user._id;
    await item.save();

    emitSocketUpdate(req, 'content_production:deleted', { id: item._id });

    return res.json({
      success: true,
      message: `Content record ${item.contentId} deleted successfully`,
    });
  } catch (err) {
    console.error('[deleteContentProduction error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete content record' });
  }
};
