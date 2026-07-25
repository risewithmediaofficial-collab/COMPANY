import DMVideoShoot from '../models/dmVideoShoot.model.js';
import DMRjPromotion from '../models/dmRjPromotion.model.js';
import DMVjPromotion from '../models/dmVjPromotion.model.js';
import DMAuditLog from '../models/dmAuditLog.model.js';
import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import { createNotification } from '../utils/notification.js';

const logDMAudit = async ({ moduleType, entityId, action, title, details, actor }) => {
  try {
    await DMAuditLog.create({
      moduleType,
      entityId,
      action,
      title: title || `${moduleType} ${action}`,
      details: details || '',
      actor,
    });
  } catch (err) {
    console.error('Failed to create DM Audit Log:', err);
  }
};

// Helper: Notify assigned team members, manager, and admin
const notifyDMTeam = async ({ title, message, link, recipientIds, io }) => {
  if (!recipientIds || !recipientIds.length) return;
  const uniqueRecipients = [...new Set(recipientIds.map((id) => id.toString()))];
  for (const recipientId of uniqueRecipients) {
    try {
      await createNotification(
        {
          recipient: recipientId,
          type: 'general',
          title,
          message,
          link: link || '/dm-calendar',
        },
        io
      );
    } catch (err) {
      console.error('Failed to send notification to', recipientId, err);
    }
  }
};

const generateNextInvoiceNumber = async () => {
  const [shootsCount, rjCount, vjCount] = await Promise.all([
    DMVideoShoot.countDocuments(),
    DMRjPromotion.countDocuments(),
    DMVjPromotion.countDocuments(),
  ]);
  const total = shootsCount + rjCount + vjCount + 1;
  return `RWM-INV-${String(total).padStart(3, '0')}`;
};

// =============================================
// VIDEO SHOOT CONTROLLERS
// =============================================

export const getVideoShoots = async (req, res) => {
  try {
    const { client, status, search, month, year, startDate, endDate } = req.query;
    const filter = { isDeleted: false };

    if (client) filter.client = client;
    if (status && status !== 'all') filter.status = status;

    if (search) {
      filter.$or = [
        { shootTitle: { $regex: search, $options: 'i' } },
        { shootLocation: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (month && year) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.shootDate = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      filter.shootDate = {};
      if (startDate) filter.shootDate.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.shootDate.$lte = eDate;
      }
    }

    const shoots = await DMVideoShoot.find(filter)
      .populate('client', 'name company email phone')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('assignedTeam.user', 'name email avatar role')
      .sort({ shootDate: 1, startTime: 1 });

    res.json({ success: true, count: shoots.length, shoots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createVideoShoot = async (req, res) => {
  try {
    if (!req.body.client || !req.body.shootTitle || !req.body.shootDate) {
      return res.status(400).json({ success: false, message: 'Client, Shoot Title, and Shoot Date are required.' });
    }

    if (!req.body.invoiceNumber) {
      req.body.invoiceNumber = await generateNextInvoiceNumber();
    }

    const shoot = await DMVideoShoot.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populatedShoot = await DMVideoShoot.findById(shoot._id)
      .populate('client', 'name company')
      .populate('assignedTeam.user', 'name');

    await logDMAudit({
      moduleType: 'VideoShoot',
      entityId: shoot._id,
      action: 'created',
      title: 'Video Shoot Created',
      details: `${shoot.shootTitle} scheduled for ${new Date(shoot.shootDate).toLocaleDateString('en-IN')}`,
      actor: req.user._id,
    });

    // Notify assigned team members
    const teamUserIds = shoot.assignedTeam.map((t) => t.user).filter(Boolean);
    const admins = await User.find({ role: { $in: ['superAdmin', 'manager'] }, isActive: true }).select('_id');
    const recipientIds = [...teamUserIds, ...admins.map((a) => a._id)];

    await notifyDMTeam({
      title: 'New Video Shoot Scheduled',
      message: `Shoot "${shoot.shootTitle}" for ${populatedShoot.client?.company || populatedShoot.client?.name || 'Client'} scheduled on ${new Date(shoot.shootDate).toLocaleDateString('en-IN')}.`,
      recipientIds,
      io: req.app.get('io'),
    });

    res.status(201).json({ success: true, shoot: populatedShoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVideoShoot = async (req, res) => {
  try {
    const shoot = await DMVideoShoot.findOne({ _id: req.params.id, isDeleted: false });
    if (!shoot) return res.status(404).json({ success: false, message: 'Video Shoot not found' });

    Object.assign(shoot, req.body, { updatedBy: req.user._id });
    await shoot.save();

    const updated = await DMVideoShoot.findById(shoot._id)
      .populate('client', 'name company')
      .populate('assignedTeam.user', 'name');

    await logDMAudit({
      moduleType: 'VideoShoot',
      entityId: shoot._id,
      action: 'updated',
      title: 'Video Shoot Updated',
      details: `${shoot.shootTitle} details updated. Status: ${shoot.status}`,
      actor: req.user._id,
    });

    res.json({ success: true, shoot: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteVideoShoot = async (req, res) => {
  try {
    const shoot = await DMVideoShoot.findOne({ _id: req.params.id, isDeleted: false });
    if (!shoot) return res.status(404).json({ success: false, message: 'Video Shoot not found' });

    shoot.isDeleted = true;
    shoot.deletedBy = req.user._id;
    shoot.deletedAt = new Date();
    await shoot.save();

    await logDMAudit({
      moduleType: 'VideoShoot',
      entityId: shoot._id,
      action: 'deleted',
      title: 'Video Shoot Deleted',
      details: `${shoot.shootTitle} was deleted by ${req.user.name}.`,
      actor: req.user._id,
    });

    res.json({ success: true, message: 'Video shoot deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const trackVideoShootTime = async (req, res) => {
  try {
    const { action } = req.body; // 'start' or 'stop'
    const shoot = await DMVideoShoot.findOne({ _id: req.params.id, isDeleted: false });
    if (!shoot) return res.status(404).json({ success: false, message: 'Video Shoot not found' });

    if (action === 'start') {
      shoot.shootStartedAt = new Date();
      shoot.status = 'In Progress';
    } else if (action === 'stop') {
      shoot.shootEndedAt = new Date();
      shoot.status = 'Completed';
      if (shoot.shootStartedAt) {
        const diffMins = Math.round((new Date(shoot.shootEndedAt) - new Date(shoot.shootStartedAt)) / (1000 * 60));
        shoot.actualDuration = diffMins;
      }
    }

    shoot.updatedBy = req.user._id;
    await shoot.save();

    await logDMAudit({
      moduleType: 'VideoShoot',
      entityId: shoot._id,
      action: 'time_tracked',
      title: `Shoot Time Tracking ${action.toUpperCase()}`,
      details: `${shoot.shootTitle} ${action === 'start' ? 'started at ' + shoot.shootStartedAt.toLocaleTimeString() : 'ended at ' + shoot.shootEndedAt.toLocaleTimeString()}`,
      actor: req.user._id,
    });

    res.json({ success: true, shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// =============================================
// RJ PROMOTION CONTROLLERS
// =============================================

export const getRjPromotions = async (req, res) => {
  try {
    const { client, status, search, month, year } = req.query;
    const filter = { isDeleted: false };

    if (client) filter.client = client;
    if (status && status !== 'all') filter.status = status;

    if (search) {
      filter.$or = [
        { promotionTitle: { $regex: search, $options: 'i' } },
        { promotionDetails: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    if (month && year) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.promotionDate = { $gte: start, $lte: end };
    }

    const promotions = await DMRjPromotion.find(filter)
      .populate('client', 'name company email phone')
      .populate('createdBy', 'name')
      .populate('rjMembers.user', 'name email role')
      .sort({ promotionDate: 1, startTime: 1 });

    res.json({ success: true, count: promotions.length, promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRjPromotion = async (req, res) => {
  try {
    if (!req.body.client || !req.body.promotionTitle || !req.body.promotionDate) {
      return res.status(400).json({ success: false, message: 'Client, Promotion Title, and Promotion Date are required.' });
    }

    if (!req.body.invoiceNumber) {
      req.body.invoiceNumber = await generateNextInvoiceNumber();
    }

    const promotion = await DMRjPromotion.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populated = await DMRjPromotion.findById(promotion._id)
      .populate('client', 'name company')
      .populate('rjMembers.user', 'name');

    await logDMAudit({
      moduleType: 'RJPromotion',
      entityId: promotion._id,
      action: 'created',
      title: 'RJ Promotion Created',
      details: `${promotion.promotionTitle} scheduled for ${new Date(promotion.promotionDate).toLocaleDateString('en-IN')}`,
      actor: req.user._id,
    });

    res.status(201).json({ success: true, promotion: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateRjPromotion = async (req, res) => {
  try {
    const promotion = await DMRjPromotion.findOne({ _id: req.params.id, isDeleted: false });
    if (!promotion) return res.status(404).json({ success: false, message: 'RJ Promotion not found' });

    Object.assign(promotion, req.body, { updatedBy: req.user._id });
    await promotion.save();

    const updated = await DMRjPromotion.findById(promotion._id)
      .populate('client', 'name company')
      .populate('rjMembers.user', 'name');

    await logDMAudit({
      moduleType: 'RJPromotion',
      entityId: promotion._id,
      action: 'updated',
      title: 'RJ Promotion Updated',
      details: `${promotion.promotionTitle} updated.`,
      actor: req.user._id,
    });

    res.json({ success: true, promotion: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteRjPromotion = async (req, res) => {
  try {
    const promotion = await DMRjPromotion.findOne({ _id: req.params.id, isDeleted: false });
    if (!promotion) return res.status(404).json({ success: false, message: 'RJ Promotion not found' });

    promotion.isDeleted = true;
    promotion.deletedBy = req.user._id;
    promotion.deletedAt = new Date();
    await promotion.save();

    await logDMAudit({
      moduleType: 'RJPromotion',
      entityId: promotion._id,
      action: 'deleted',
      title: 'RJ Promotion Deleted',
      details: `${promotion.promotionTitle} deleted.`,
      actor: req.user._id,
    });

    res.json({ success: true, message: 'RJ Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// VJ PROMOTION CONTROLLERS
// =============================================

export const getVjPromotions = async (req, res) => {
  try {
    const { client, status, platform, search, month, year } = req.query;
    const filter = { isDeleted: false };

    if (client) filter.client = client;
    if (status && status !== 'all') filter.status = status;
    if (platform && platform !== 'all') filter.platform = platform;

    if (search) {
      filter.$or = [
        { promotionTitle: { $regex: search, $options: 'i' } },
        { promotionDetails: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    if (month && year) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.promotionDate = { $gte: start, $lte: end };
    }

    const promotions = await DMVjPromotion.find(filter)
      .populate('client', 'name company email phone')
      .populate('createdBy', 'name')
      .populate('vjMembers.user', 'name email role')
      .sort({ promotionDate: 1, startTime: 1 });

    res.json({ success: true, count: promotions.length, promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createVjPromotion = async (req, res) => {
  try {
    if (!req.body.client || !req.body.promotionTitle || !req.body.promotionDate || !req.body.platform) {
      return res.status(400).json({ success: false, message: 'Client, Promotion Title, Platform, and Promotion Date are required.' });
    }

    if (!req.body.invoiceNumber) {
      req.body.invoiceNumber = await generateNextInvoiceNumber();
    }

    const promotion = await DMVjPromotion.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populated = await DMVjPromotion.findById(promotion._id)
      .populate('client', 'name company')
      .populate('vjMembers.user', 'name');

    await logDMAudit({
      moduleType: 'VJPromotion',
      entityId: promotion._id,
      action: 'created',
      title: 'VJ Promotion Created',
      details: `${promotion.promotionTitle} (${promotion.platform}) scheduled for ${new Date(promotion.promotionDate).toLocaleDateString('en-IN')}`,
      actor: req.user._id,
    });

    res.status(201).json({ success: true, promotion: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVjPromotion = async (req, res) => {
  try {
    const promotion = await DMVjPromotion.findOne({ _id: req.params.id, isDeleted: false });
    if (!promotion) return res.status(404).json({ success: false, message: 'VJ Promotion not found' });

    Object.assign(promotion, req.body, { updatedBy: req.user._id });
    await promotion.save();

    const updated = await DMVjPromotion.findById(promotion._id)
      .populate('client', 'name company')
      .populate('vjMembers.user', 'name');

    await logDMAudit({
      moduleType: 'VJPromotion',
      entityId: promotion._id,
      action: 'updated',
      title: 'VJ Promotion Updated',
      details: `${promotion.promotionTitle} updated.`,
      actor: req.user._id,
    });

    res.json({ success: true, promotion: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteVjPromotion = async (req, res) => {
  try {
    const promotion = await DMVjPromotion.findOne({ _id: req.params.id, isDeleted: false });
    if (!promotion) return res.status(404).json({ success: false, message: 'VJ Promotion not found' });

    promotion.isDeleted = true;
    promotion.deletedBy = req.user._id;
    promotion.deletedAt = new Date();
    await promotion.save();

    await logDMAudit({
      moduleType: 'VJPromotion',
      entityId: promotion._id,
      action: 'deleted',
      title: 'VJ Promotion Deleted',
      details: `${promotion.promotionTitle} deleted.`,
      actor: req.user._id,
    });

    res.json({ success: true, message: 'VJ Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// MASTER CALENDAR FEED
// =============================================

export const getMasterCalendarEvents = async (req, res) => {
  try {
    const { start, end, activityType, status, client } = req.query;
    const dateFilter = {};
    if (start && end) {
      dateFilter.$gte = new Date(start);
      dateFilter.$lte = new Date(end);
    }

    const events = [];

    // Fetch Video Shoots
    if (!activityType || activityType === 'all' || activityType === 'video_shoot') {
      const shootFilter = { isDeleted: false };
      if (client) shootFilter.client = client;
      if (status && status !== 'all') shootFilter.status = status;
      if (start && end) shootFilter.shootDate = dateFilter;

      const shoots = await DMVideoShoot.find(shootFilter)
        .populate('client', 'name company')
        .populate('assignedTeam.user', 'name');

      shoots.forEach((s) => {
        events.push({
          id: s._id,
          activityType: 'video_shoot',
          title: `🎬 ${s.shootTitle} (${s.client?.company || s.client?.name || 'Client'})`,
          rawTitle: s.shootTitle,
          clientName: s.client?.company || s.client?.name || 'Client',
          date: s.shootDate,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          item: s,
        });
      });
    }

    // Fetch RJ Promotions
    if (!activityType || activityType === 'all' || activityType === 'rj_promotion') {
      const rjFilter = { isDeleted: false };
      if (client) rjFilter.client = client;
      if (status && status !== 'all') rjFilter.status = status;
      if (start && end) rjFilter.promotionDate = dateFilter;

      const rjList = await DMRjPromotion.find(rjFilter)
        .populate('client', 'name company')
        .populate('rjMembers.user', 'name');

      rjList.forEach((r) => {
        events.push({
          id: r._id,
          activityType: 'rj_promotion',
          title: `🎙️ ${r.promotionTitle} (${r.client?.company || r.client?.name || 'Client'})`,
          rawTitle: r.promotionTitle,
          clientName: r.client?.company || r.client?.name || 'Client',
          date: r.promotionDate,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          item: r,
        });
      });
    }

    // Fetch VJ Promotions
    if (!activityType || activityType === 'all' || activityType === 'vj_promotion') {
      const vjFilter = { isDeleted: false };
      if (client) vjFilter.client = client;
      if (status && status !== 'all') vjFilter.status = status;
      if (start && end) vjFilter.promotionDate = dateFilter;

      const vjList = await DMVjPromotion.find(vjFilter)
        .populate('client', 'name company')
        .populate('vjMembers.user', 'name');

      vjList.forEach((v) => {
        events.push({
          id: v._id,
          activityType: 'vj_promotion',
          title: `📺 [${v.platform}] ${v.promotionTitle} (${v.client?.company || v.client?.name || 'Client'})`,
          rawTitle: v.promotionTitle,
          clientName: v.client?.company || v.client?.name || 'Client',
          date: v.promotionDate,
          startTime: v.startTime,
          endTime: v.endTime,
          status: v.status,
          item: v,
        });
      });
    }

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// DASHBOARD & ANALYTICS SUMMARY
// =============================================

export const getDMDashboardSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      allShoots,
      todayShoots,
      upcomingShoots,
      completedShoots,
      pendingShoots,
      allRj,
      allVj,
    ] = await Promise.all([
      DMVideoShoot.find({ isDeleted: false }),
      DMVideoShoot.countDocuments({ isDeleted: false, shootDate: { $gte: todayStart, $lte: todayEnd } }),
      DMVideoShoot.countDocuments({ isDeleted: false, shootDate: { $gt: todayEnd }, status: { $in: ['Scheduled', 'In Progress'] } }),
      DMVideoShoot.countDocuments({ isDeleted: false, status: 'Completed' }),
      DMVideoShoot.countDocuments({ isDeleted: false, status: { $in: ['Scheduled', 'In Progress', 'Postponed'] } }),
      DMRjPromotion.find({ isDeleted: false }),
      DMVjPromotion.find({ isDeleted: false }),
    ]);

    // Aggregate Video Shoot Metrics
    let totalContentsPlanned = 0;
    let totalContentsCompleted = 0;
    let totalReelsPlanned = 0;
    let totalReelsCompleted = 0;
    let totalShootExpenses = 0;
    let totalShootPaid = 0;

    allShoots.forEach((s) => {
      totalContentsPlanned += s.plannedContents || 0;
      totalContentsCompleted += s.completedContents || 0;
      totalReelsPlanned += s.plannedReels || 0;
      totalReelsCompleted += s.completedReels || 0;
      totalShootExpenses += s.totalAmount || 0;
      totalShootPaid += s.amountPaid || 0;
    });

    const contentCompletionPct = totalContentsPlanned > 0
      ? Number(((totalContentsCompleted / totalContentsPlanned) * 100).toFixed(1))
      : 0;

    const reelsCompletionPct = totalReelsPlanned > 0
      ? Number(((totalReelsCompleted / totalReelsPlanned) * 100).toFixed(1))
      : 0;

    // RJ Metrics
    let rjTotalAmount = 0;
    let rjPaidAmount = 0;
    let rjTotalHours = 0;
    allRj.forEach((r) => {
      rjTotalAmount += r.totalAmount || 0;
      rjPaidAmount += r.amountPaid || 0;
      rjTotalHours += r.durationSpoken || 0;
    });

    // VJ Metrics
    let vjTotalAmount = 0;
    let vjPaidAmount = 0;
    let vjTotalHours = 0;
    allVj.forEach((v) => {
      vjTotalAmount += v.totalAmount || 0;
      vjPaidAmount += v.amountPaid || 0;
      vjTotalHours += v.duration || 0;
    });

    const grandTotalExpenses = totalShootExpenses + rjTotalAmount + vjTotalAmount;
    const grandTotalPaid = totalShootPaid + rjPaidAmount + vjPaidAmount;
    const grandOutstanding = grandTotalExpenses - grandTotalPaid;

    res.json({
      success: true,
      summary: {
        videoShoots: {
          todayShoots,
          upcomingShoots,
          completedShoots,
          pendingShoots,
          totalContentsPlanned,
          totalContentsCompleted,
          contentCompletionPct,
          totalReelsPlanned,
          totalReelsCompleted,
          reelsCompletionPct,
          totalExpenses: totalShootExpenses,
          totalPaid: totalShootPaid,
          outstandingAmount: totalShootExpenses - totalShootPaid,
        },
        rjPromotions: {
          totalPromotions: allRj.length,
          totalHours: Number(rjTotalHours.toFixed(1)),
          totalRevenue: rjTotalAmount,
          paid: rjPaidAmount,
          balance: rjTotalAmount - rjPaidAmount,
          upcomingPromotions: allRj.filter((r) => r.status === 'Scheduled').length,
        },
        vjPromotions: {
          totalPromotions: allVj.length,
          totalHours: Number(vjTotalHours.toFixed(1)),
          totalRevenue: vjTotalAmount,
          paid: vjPaidAmount,
          balance: vjTotalAmount - vjPaidAmount,
          upcomingPromotions: allVj.filter((v) => v.status === 'Scheduled').length,
        },
        overall: {
          grandTotalExpenses,
          grandTotalPaid,
          grandOutstanding,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// CLIENT & TEAM PERFORMANCE ANALYSIS
// =============================================

export const getDMClientPerformance = async (req, res) => {
  try {
    const clients = await Client.find({}).select('_id name company email phone');
    const [shoots, rjList, vjList] = await Promise.all([
      DMVideoShoot.find({ isDeleted: false }),
      DMRjPromotion.find({ isDeleted: false }),
      DMVjPromotion.find({ isDeleted: false }),
    ]);

    const performance = clients.map((c) => {
      const cShoots = shoots.filter((s) => s.client?.toString() === c._id.toString());
      const cRj = rjList.filter((r) => r.client?.toString() === c._id.toString());
      const cVj = vjList.filter((v) => v.client?.toString() === c._id.toString());

      let contentsPlanned = 0;
      let contentsCompleted = 0;
      let reelsPlanned = 0;
      let reelsCompleted = 0;
      let totalExp = 0;
      let totalPaid = 0;

      cShoots.forEach((s) => {
        contentsPlanned += s.plannedContents || 0;
        contentsCompleted += s.completedContents || 0;
        reelsPlanned += s.plannedReels || 0;
        reelsCompleted += s.completedReels || 0;
        totalExp += s.totalAmount || 0;
        totalPaid += s.amountPaid || 0;
      });

      cRj.forEach((r) => {
        totalExp += r.totalAmount || 0;
        totalPaid += r.amountPaid || 0;
      });

      cVj.forEach((v) => {
        totalExp += v.totalAmount || 0;
        totalPaid += v.amountPaid || 0;
      });

      return {
        client: {
          _id: c._id,
          name: c.name,
          company: c.company || c.name,
          email: c.email,
        },
        totalShoots: cShoots.length,
        contentsPlanned,
        contentsCompleted,
        reelsPlanned,
        reelsCompleted,
        rjPromotionsCount: cRj.length,
        vjPromotionsCount: cVj.length,
        totalExpenses: totalExp,
        paidAmount: totalPaid,
        pendingAmount: Math.max(totalExp - totalPaid, 0),
      };
    });

    res.json({ success: true, performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDMTeamPerformance = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('_id name email role avatar');
    const [shoots, rjList, vjList] = await Promise.all([
      DMVideoShoot.find({ isDeleted: false }),
      DMRjPromotion.find({ isDeleted: false }),
      DMVjPromotion.find({ isDeleted: false }),
    ]);

    const performance = users.map((u) => {
      const uShoots = shoots.filter((s) => s.assignedTeam?.some((t) => t.user?.toString() === u._id.toString()));
      const uRj = rjList.filter((r) => r.rjMembers?.some((m) => m.user?.toString() === u._id.toString()));
      const uVj = vjList.filter((v) => v.vjMembers?.some((m) => m.user?.toString() === u._id.toString()));

      let totalHours = 0;
      let completedTasks = 0;
      let pendingTasks = 0;

      uShoots.forEach((s) => {
        totalHours += s.duration || 0;
        if (s.status === 'Completed') completedTasks += 1;
        else pendingTasks += 1;
      });

      uRj.forEach((r) => {
        totalHours += r.durationSpoken || 0;
        if (r.status === 'Completed') completedTasks += 1;
        else pendingTasks += 1;
      });

      uVj.forEach((v) => {
        totalHours += v.duration || 0;
        if (v.status === 'Completed') completedTasks += 1;
        else pendingTasks += 1;
      });

      return {
        employee: {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.avatar,
        },
        totalShoots: uShoots.length,
        rjActivities: uRj.length,
        vjActivities: uVj.length,
        workingHours: Number(totalHours.toFixed(1)),
        completedTasks,
        pendingTasks,
      };
    });

    res.json({ success: true, performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// AUDIT LOGS & REPORTS
// =============================================

export const getDMAuditLogs = async (req, res) => {
  try {
    const { moduleType, limit = 50 } = req.query;
    const filter = {};
    if (moduleType) filter.moduleType = moduleType;

    const logs = await DMAuditLog.find(filter)
      .populate('actor', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
