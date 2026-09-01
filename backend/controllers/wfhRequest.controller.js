// =============================================
// WFH REQUEST CONTROLLER
// =============================================

import WFHRequest from '../models/wfhRequest.model.js';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';

/**
 * Submit a WFH request
 */
export const submitWFHRequest = async (req, res) => {
  try {
    const { date, reason, startTime, endTime, notes } = req.body;

    // Validate date
    const requestDate = new Date(date);
    requestDate.setHours(0, 0, 0, 0);

    if (requestDate < new Date() && requestDate.toDateString() !== new Date().toDateString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot request WFH for past dates' 
      });
    }

    // Check if request already exists for this date
    const existingRequest = await WFHRequest.findOne({
      user: req.user._id,
      date: requestDate,
    });

    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'WFH request already pending for this date' 
      });
    }

    const wfhRequest = new WFHRequest({
      user: req.user._id,
      date: requestDate,
      reason,
      startTime: startTime || null,
      endTime: endTime || null,
      notes: notes || '',
      status: 'pending',
      department: req.user.department,
    });

    await wfhRequest.save();
    await wfhRequest.populate('user', 'name email department');

    // Notify managers about the WFH request
    try {
      const managers = await User.find({
        role: { $in: ['superAdmin', 'admin', 'manager'] },
        isActive: true,
      }).select('_id');

      const dateStr = requestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      for (const manager of managers) {
        await createNotification({
          recipient: manager._id,
          type: 'wfh_request',
          title: 'New WFH Request',
          message: `${req.user.name} requested WFH approval for ${dateStr}. Reason: ${reason}`,
          link: '/wfh-requests',
        });
      }
    } catch (notifErr) {
      console.error('WFH notification error:', notifErr);
    }

    res.status(201).json({ 
      success: true, 
      message: 'WFH request submitted successfully', 
      wfhRequest 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all WFH requests (for managers/admins)
 */
export const getWFHRequests = async (req, res) => {
  try {
    const { status, userId, month, year, page = 1, limit = 20 } = req.query;

    // Only managers and admins can view all WFH requests
    if (!['superAdmin', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (userId) {
      filter.user = userId;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const wfhRequests = await WFHRequest.find(filter)
      .populate('user', 'name email department avatar')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WFHRequest.countDocuments(filter);

    res.json({
      success: true,
      wfhRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user's own WFH requests
 */
export const getMyWFHRequests = async (req, res) => {
  try {
    const { status, month, year, page = 1, limit = 20 } = req.query;

    const filter = { user: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const wfhRequests = await WFHRequest.find(filter)
      .populate('approvedBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WFHRequest.countDocuments(filter);

    res.json({
      success: true,
      wfhRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve WFH request
 */
export const approveWFHRequest = async (req, res) => {
  try {
    const { wfhRequestId } = req.params;
    const { approvalNotes } = req.body;

    // Only managers and admins can approve
    if (!['superAdmin', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const wfhRequest = await WFHRequest.findById(wfhRequestId).populate('user');

    if (!wfhRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'WFH request not found' 
      });
    }

    if (wfhRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot approve request with status: ${wfhRequest.status}` 
      });
    }

    wfhRequest.status = 'approved';
    wfhRequest.approvedBy = req.user._id;
    wfhRequest.approvalDate = new Date();
    wfhRequest.notes = approvalNotes || '';

    await wfhRequest.save();

    // Update attendance record if it exists
    const targetDate = new Date(wfhRequest.date);
    targetDate.setHours(0, 0, 0, 0);

    await Attendance.updateOne(
      { user: wfhRequest.user._id, date: targetDate },
      {
        $set: {
          status: 'work_from_home',
          wfhApprovedForDate: true,
          wfhRequestId: wfhRequest._id,
          locationVerificationStatus: 'none',
        },
      },
      { upsert: true }
    );

    // Notify user about approval
    try {
      const dateStr = wfhRequest.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      await createNotification({
        recipient: wfhRequest.user._id,
        type: 'wfh_approved',
        title: 'WFH Request Approved',
        message: `Your WFH request for ${dateStr} has been approved.`,
        link: '/attendance',
      });
    } catch (notifErr) {
      console.error('WFH approval notification error:', notifErr);
    }

    res.json({ 
      success: true, 
      message: 'WFH request approved successfully', 
      wfhRequest 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject WFH request
 */
export const rejectWFHRequest = async (req, res) => {
  try {
    const { wfhRequestId } = req.params;
    const { rejectionReason } = req.body;

    // Only managers and admins can reject
    if (!['superAdmin', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const wfhRequest = await WFHRequest.findById(wfhRequestId).populate('user');

    if (!wfhRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'WFH request not found' 
      });
    }

    if (wfhRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reject request with status: ${wfhRequest.status}` 
      });
    }

    wfhRequest.status = 'rejected';
    wfhRequest.approvedBy = req.user._id;
    wfhRequest.approvalDate = new Date();
    wfhRequest.rejectionReason = rejectionReason || '';

    await wfhRequest.save();

    // Notify user about rejection
    try {
      const dateStr = wfhRequest.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      await createNotification({
        recipient: wfhRequest.user._id,
        type: 'wfh_rejected',
        title: 'WFH Request Rejected',
        message: `Your WFH request for ${dateStr} has been rejected.`,
        link: '/wfh-requests',
      });
    } catch (notifErr) {
      console.error('WFH rejection notification error:', notifErr);
    }

    res.json({ 
      success: true, 
      message: 'WFH request rejected successfully', 
      wfhRequest 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check WFH status for specific date
 */
export const checkWFHStatus = async (req, res) => {
  try {
    const { date } = req.query;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const wfhRequest = await WFHRequest.findOne({
      user: req.user._id,
      date: targetDate,
    });

    res.json({
      success: true,
      isWFHApproved: wfhRequest && wfhRequest.status === 'approved',
      wfhRequest: wfhRequest || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
