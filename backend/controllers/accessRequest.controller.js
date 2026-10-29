import AccessRequest from '../models/accessRequest.model.js';
import Project from '../models/project.model.js';
import { createNotification } from '../utils/notification.js';
import { emitLiveEvent } from '../utils/socketEmitter.js';

export const createRequest = async (req, res) => {
  try {
    const { projectId, reason } = req.body;

    // Check if already requested
    const existing = await AccessRequest.findOne({
      requester: req.user._id,
      project: projectId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending request for this project.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const request = await AccessRequest.create({
      requester: req.user._id,
      project: projectId,
      brandId: project.brandId,
      organizationId: project.organizationId,
      reason
    });

    // Notify project manager or super admins
    await createNotification({
      recipient: project.manager || project.organizationId, // Fallback to org or manager
      sender: req.user._id,
      type: 'request',
      title: 'Access Request',
      message: `${req.user.name} requested access to project: ${project.name}`,
      link: `/projects/${projectId}`
    });

    emitLiveEvent('accessRequestCreated', request);

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({ project: req.params.projectId })
      .populate('requester', 'name email avatar role')
      .sort('-createdAt');
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const request = await AccessRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = Date.now();
    await request.save();

    if (status === 'approved') {
      // Add user to project team
      await Project.findByIdAndUpdate(request.project, {
        $addToSet: { team: request.requester }
      });
    }

    // Notify requester
    await createNotification({
      recipient: request.requester,
      sender: req.user._id,
      type: 'info',
      title: `Access ${status}`,
      message: `Your request for project access was ${status}.`,
      link: `/projects/${request.project}`
    });

    emitLiveEvent('accessRequestUpdated', request);
    if (status === 'approved') {
      emitLiveEvent('projectUpdated', { projectId: request.project });
    }

    res.status(200).json({ success: true, message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate('requester', 'name email avatar role')
      .populate('project', 'name')
      .sort('-createdAt');
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
