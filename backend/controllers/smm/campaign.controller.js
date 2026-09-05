// =============================================
// SMM CAMPAIGN CONTROLLER
// =============================================
import Campaign from '../../models/smm/campaign.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import SmmLead from '../../models/smm/smmLead.model.js';
import { recalculateCampaignSpend } from './smmAdSpend.controller.js';

const populateCampaign = (query) =>
  query
    .populate('client', 'name company email logo')
    .populate('project', 'name category status client')
    .populate('sourceContentId', 'name contentType platforms thumbnail mediaUpload actualPostedDate')
    .populate('sourceContentIds', 'name contentType platforms thumbnail mediaUpload actualPostedDate')
    .populate('team.campaignManager', 'name')
    .populate('team.performanceMarketer', 'name')
    .populate('team.designer', 'name')
    .populate('team.copywriter', 'name')
    .populate('createdBy', 'name');

export const getCampaigns = async (req, res) => {
  try {
    const { client, project, status, platform, objective, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;
    if (status) query.status = status;
    if (platform) query.platform = platform;
    if (objective) query.objective = objective;
    if (search) query.name = { $regex: search, $options: 'i' };

    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateCond.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateCond.$lte = e;
      }
      query.$or = [
        { startDate: dateCond },
        { endDate: dateCond },
        { createdAt: dateCond },
      ];
    }

    const total = await Campaign.countDocuments(query);
    const campaigns = await populateCampaign(
      Campaign.find(query).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit))
    );

    res.json({ success: true, data: campaigns, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaign = async (req, res) => {
  try {
    const campaign = await populateCampaign(Campaign.findById(req.params.id));
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    // Fetch daily spend logs and campaign leads
    const [spendLogs, campaignLeads] = await Promise.all([
      SmmAdSpend.find({ campaign: campaign._id }).sort({ date: -1 }),
      SmmLead.find({ campaign: campaign._id }).sort({ leadDate: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...campaign.toObject(),
        spendLogs,
        leadsList: campaignLeads,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const normalizeCampaignPayload = (body = {}) => {
  const payload = { ...body };

  if (payload.client && typeof payload.client === 'object' && payload.client._id) {
    payload.client = payload.client._id;
  }
  if (payload.project && typeof payload.project === 'object' && payload.project._id) {
    payload.project = payload.project._id;
  }

  if (!payload.sourceContentId) delete payload.sourceContentId;
  if (!payload.startDate) delete payload.startDate;
  if (!payload.endDate) delete payload.endDate;

  if (payload.team && typeof payload.team === 'object') {
    const cleanTeam = {};
    if (payload.team.campaignManager) cleanTeam.campaignManager = payload.team.campaignManager;
    if (payload.team.performanceMarketer) cleanTeam.performanceMarketer = payload.team.performanceMarketer;
    if (payload.team.designer) cleanTeam.designer = payload.team.designer;
    if (payload.team.copywriter) cleanTeam.copywriter = payload.team.copywriter;
    payload.team = cleanTeam;
  }

  return payload;
};

export const createCampaign = async (req, res) => {
  try {
    const payload = normalizeCampaignPayload(req.body);
    const { client, project, name, platform, objective, startDate, endDate, dailyBudget, lifetimeBudget, budgetType, adSource, sourceContentId } = payload;

    if (!client || !project) {
      return res.status(400).json({
        success: false,
        message: 'Client and Project selection are required to create a campaign.',
      });
    }

    if (!name || !platform || !objective) {
      return res.status(400).json({
        success: false,
        message: 'Campaign Name, Platform, and Objective are required.',
      });
    }

    if (adSource === 'Existing Posted Content' && !sourceContentId) {
      return res.status(400).json({
        success: false,
        message: 'Source content selection is required when creating an ad from an existing post.',
      });
    }

    // Calculate duration in days
    let durationDays = 0;
    if (startDate && endDate) {
      const diffMs = new Date(endDate) - new Date(startDate);
      durationDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Calculate initial remaining budget
    const effectiveMonthlyBudget = Number(payload.monthlyBudget || payload.lifetimeBudget) || 0;
    const depositedBudget = payload.amountAdded !== undefined && payload.amountAdded !== '' 
      ? Number(payload.amountAdded) 
      : (effectiveMonthlyBudget || (Number(dailyBudget) || 0) * (durationDays || 30));

    const initialBalance = payload.remainingBalance !== undefined && payload.remainingBalance !== ''
      ? Number(payload.remainingBalance)
      : depositedBudget;

    const campaignPayload = {
      ...payload,
      durationDays,
      monthlyBudget: effectiveMonthlyBudget,
      lifetimeBudget: effectiveMonthlyBudget,
      amountAdded: depositedBudget,
      amountSpent: Number(payload.amountSpent) || 0,
      remainingBalance: initialBalance,
      createdBy: req.user?._id,
    };

    const campaign = await Campaign.create(campaignPayload);

    // If linked to organic post(s), append campaign ID to SmmContent
    const allLinkedIds = [
      ...(sourceContentId ? [sourceContentId] : []),
      ...(Array.isArray(payload.sourceContentIds) ? payload.sourceContentIds : [])
    ].filter(Boolean);

    if (allLinkedIds.length > 0) {
      await SmmContent.updateMany(
        { _id: { $in: allLinkedIds } },
        { $addToSet: { linkedAdCampaignIds: campaign._id } }
      );
    }

    await SmmActivityLog.create({
      action: 'Campaign Created',
      entity: 'SmmCampaign',
      entityId: campaign._id,
      entityName: campaign.name,
      performedBy: req.user?._id,
    });

    const populated = await populateCampaign(Campaign.findById(campaign._id));
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const prevCampaign = await Campaign.findById(req.params.id);
    if (!prevCampaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const updates = normalizeCampaignPayload(req.body);

    if (updates.monthlyBudget !== undefined && updates.lifetimeBudget === undefined) {
      updates.lifetimeBudget = Number(updates.monthlyBudget) || 0;
    } else if (updates.lifetimeBudget !== undefined && updates.monthlyBudget === undefined) {
      updates.monthlyBudget = Number(updates.lifetimeBudget) || 0;
    }

    if (updates.startDate && updates.endDate) {
      const diffMs = new Date(updates.endDate) - new Date(updates.startDate);
      updates.durationDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const campaign = await populateCampaign(
      Campaign.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    );

    await SmmActivityLog.create({
      action: 'Campaign Updated',
      entity: 'SmmCampaign',
      entityId: campaign._id,
      entityName: campaign.name,
      performedBy: req.user?._id,
    });

    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCampaignPerformance = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { performance: req.body } },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    // Clean up daily spend logs and remove reference from source content
    await SmmAdSpend.deleteMany({ campaign: req.params.id });
    if (campaign.sourceContentId) {
      await SmmContent.findByIdAndUpdate(campaign.sourceContentId, {
        $pull: { linkedAdCampaignIds: campaign._id },
      });
    }

    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkUpdateCampaignStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ success: false, message: 'ids and status required' });
    await Campaign.updateMany({ _id: { $in: ids } }, { status });
    res.json({ success: true, message: `${ids.length} campaigns updated` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addDailyLog = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const spendLog = await SmmAdSpend.create({
      client: campaign.client,
      project: campaign.project,
      campaign: campaignId,
      date: req.body.date || new Date(),
      dailyBudget: campaign.dailyBudget,
      amountSpent: Number(req.body.spend || req.body.amountSpent) || 0,
      leadsGenerated: Number(req.body.leads || req.body.leadsGenerated) || 0,
      clicks: Number(req.body.clicks) || 0,
      impressions: Number(req.body.impressions) || 0,
      notes: req.body.notes || '',
      loggedBy: req.user?._id,
    });

    await recalculateCampaignSpend(campaignId);
    const updated = await populateCampaign(Campaign.findById(campaignId));
    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteDailyLog = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const logId = req.params.logId;
    await SmmAdSpend.findByIdAndDelete(logId);
    await recalculateCampaignSpend(campaignId);
    const updated = await populateCampaign(Campaign.findById(campaignId));
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
