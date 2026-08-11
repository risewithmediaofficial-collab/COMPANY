// =============================================
// SMM AD SPEND CONTROLLER
// =============================================
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import Campaign from '../../models/smm/campaign.model.js';

export const recalculateCampaignSpend = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  const logs = await SmmAdSpend.find({ campaign: campaignId });
  const totalSpent = logs.reduce((sum, log) => sum + (log.amountSpent || 0), 0);
  const totalLeads = logs.reduce((sum, log) => sum + (log.leadsGenerated || 0), 0);
  const totalClicks = logs.reduce((sum, log) => sum + (log.clicks || 0), 0);
  const totalImpressions = logs.reduce((sum, log) => sum + (log.impressions || 0), 0);
  const totalReach = logs.reduce((sum, log) => sum + (log.reach || 0), 0);

  const totalBudget = campaign.budgetType === 'Daily Budget'
    ? campaign.dailyBudget * (campaign.durationDays || 30)
    : campaign.lifetimeBudget;

  campaign.amountSpent = totalSpent;
  campaign.remainingBalance = Math.max(0, totalBudget - totalSpent);

  if (!campaign.performance) campaign.performance = {};
  campaign.performance.spend = totalSpent;
  campaign.performance.leads = totalLeads;
  campaign.performance.clicks = totalClicks;
  campaign.performance.impressions = totalImpressions;
  campaign.performance.reach = totalReach;
  campaign.performance.costPerLead = totalLeads > 0 ? Number((totalSpent / totalLeads).toFixed(2)) : 0;
  campaign.performance.cpc = totalClicks > 0 ? Number((totalSpent / totalClicks).toFixed(2)) : 0;

  await campaign.save();
};

export const getAdSpendLogs = async (req, res) => {
  try {
    const { client, project, campaign, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (campaign) query.campaign = campaign;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await SmmAdSpend.countDocuments(query);
    const logs = await SmmAdSpend.find(query)
      .populate('campaign', 'name platform dailyBudget lifetimeBudget status')
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('loggedBy', 'name')
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, data: logs, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAdSpendLog = async (req, res) => {
  try {
    const { campaign: campaignId, date, amountSpent, leadsGenerated = 0, clicks = 0 } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const cpl = leadsGenerated > 0 ? Number((amountSpent / leadsGenerated).toFixed(2)) : 0;
    const cpc = clicks > 0 ? Number((amountSpent / clicks).toFixed(2)) : 0;

    const spendLog = await SmmAdSpend.create({
      ...req.body,
      client: campaign.client,
      project: campaign.project,
      dailyBudget: campaign.dailyBudget,
      cpl,
      cpc,
      loggedBy: req.user?._id,
    });

    await recalculateCampaignSpend(campaignId);

    res.status(201).json({ success: true, data: spendLog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteAdSpendLog = async (req, res) => {
  try {
    const log = await SmmAdSpend.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });

    const campaignId = log.campaign;
    await SmmAdSpend.findByIdAndDelete(req.params.id);
    await recalculateCampaignSpend(campaignId);

    res.json({ success: true, message: 'Spend log deleted and campaign updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
