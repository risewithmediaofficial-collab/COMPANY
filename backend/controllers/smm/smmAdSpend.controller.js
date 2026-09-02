// =============================================
// SMM AD SPEND CONTROLLER (Daily Cash & Spend Ledger)
// =============================================
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import Campaign from '../../models/smm/campaign.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';

export const recalculateCampaignSpend = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  const logs = await SmmAdSpend.find({ campaign: campaignId }).sort({ date: 1 });
  const totalAdded = logs.reduce((sum, log) => sum + (log.amountAdded || 0), 0);
  const totalSpent = logs.reduce((sum, log) => sum + (log.amountSpent || 0), 0);
  const totalLeads = logs.reduce((sum, log) => sum + (log.leadsGenerated || 0), 0);
  const totalClicks = logs.reduce((sum, log) => sum + (log.clicks || 0), 0);
  const totalImpressions = logs.reduce((sum, log) => sum + (log.impressions || 0), 0);
  const totalReach = logs.reduce((sum, log) => sum + (log.reach || 0), 0);
  const totalConversions = logs.reduce((sum, log) => sum + (log.conversions || 0), 0);
  const totalRevenue = logs.reduce((sum, log) => sum + (log.revenue || 0), 0);

  const baseBudget = campaign.amountAdded > 0
    ? campaign.amountAdded
    : (campaign.budgetType === 'Daily Budget'
        ? campaign.dailyBudget * (campaign.durationDays || 30)
        : campaign.lifetimeBudget);

  const effectiveBudget = Math.max(baseBudget, totalAdded);
  const remaining = Math.max(0, effectiveBudget - totalSpent);

  campaign.amountAdded = effectiveBudget;
  campaign.amountSpent = totalSpent;
  campaign.remainingBalance = remaining;

  // Calculate Budget Alerts
  const alerts = [];
  const spendRatio = effectiveBudget > 0 ? (totalSpent / effectiveBudget) : 0;
  if (spendRatio >= 1.0) alerts.push('100% (Budget Exhausted)');
  else if (spendRatio >= 0.9) alerts.push('90% spent');
  else if (spendRatio >= 0.8) alerts.push('80% spent ⚠️');
  else if (spendRatio >= 0.75) alerts.push('75% spent');
  else if (spendRatio >= 0.5) alerts.push('50% spent');

  campaign.budgetAlerts = alerts;

  if (!campaign.performance) campaign.performance = {};
  campaign.performance.spend = totalSpent;
  campaign.performance.leads = totalLeads;
  campaign.performance.clicks = totalClicks;
  campaign.performance.impressions = totalImpressions;
  campaign.performance.reach = totalReach;
  campaign.performance.purchases = totalConversions;
  campaign.performance.revenue = totalRevenue;
  campaign.performance.costPerLead = totalLeads > 0 ? Number((totalSpent / totalLeads).toFixed(2)) : 0;
  campaign.performance.cpc = totalClicks > 0 ? Number((totalSpent / totalClicks).toFixed(2)) : 0;
  campaign.performance.roas = totalSpent > 0 ? Number((totalRevenue / totalSpent).toFixed(2)) : 0;

  await campaign.save();

  // If connected to a source video/content, sync advertising metrics directly
  if (campaign.sourceContentId) {
    try {
      const content = await SmmContent.findById(campaign.sourceContentId);
      if (content) {
        if (!content.advertising) content.advertising = {};
        content.advertising.usedAsAd = true;
        content.advertising.campaign = campaign._id;
        content.advertising.amountAdded = effectiveBudget;
        content.advertising.amountSpent = totalSpent;
        content.advertising.leads = totalLeads;
        content.advertising.results = totalConversions || totalLeads;
        content.advertising.conversions = totalConversions;
        content.advertising.cpl = campaign.performance.costPerLead;
        content.advertising.roas = campaign.performance.roas;
        await content.save();
      }
    } catch (e) {
      console.error('Failed to sync advertising stats to source content:', e);
    }
  }
};

export const getAdSpendLogs = async (req, res) => {
  try {
    const { client, project, campaign, startDate, endDate, page = 1, limit = 100 } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (campaign) query.campaign = campaign;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const total = await SmmAdSpend.countDocuments(query);
    const logs = await SmmAdSpend.find(query)
      .populate('campaign', 'name platform dailyBudget lifetimeBudget amountAdded amountSpent remainingBalance status budgetAlerts')
      .populate('sourceContentId', 'name contentType platforms thumbnail mediaUpload performanceScore')
      .populate('client', 'name company logo')
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
    const {
      campaign: campaignId,
      date,
      amountAdded = 0,
      amountSpent = 0,
      leadsGenerated = 0,
      clicks = 0,
      sourceContentId,
    } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const cpl = leadsGenerated > 0 ? Number((amountSpent / leadsGenerated).toFixed(2)) : 0;
    const cpc = clicks > 0 ? Number((amountSpent / clicks).toFixed(2)) : 0;

    // Check for Spend Anomaly (compare with past 7 days average spend)
    const recentLogs = await SmmAdSpend.find({ campaign: campaignId })
      .sort({ date: -1 })
      .limit(7);

    let isAnomaly = false;
    let anomalyReason = '';
    if (recentLogs.length >= 3) {
      const avgRecentSpend = recentLogs.reduce((s, l) => s + (l.amountSpent || 0), 0) / recentLogs.length;
      if (avgRecentSpend > 0 && amountSpent >= avgRecentSpend * 1.6) {
        const pctIncrease = Math.round(((amountSpent - avgRecentSpend) / avgRecentSpend) * 100);
        isAnomaly = true;
        anomalyReason = `⚠️ Spend increased ${pctIncrease}% compared with 7-day average (₹${Math.round(avgRecentSpend)}/day)`;
      }
    }

    const resolvedContentId = (sourceContentId && sourceContentId !== '') ? sourceContentId : (campaign.sourceContentId || undefined);

    const logPayload = {
      ...req.body,
      client: campaign.client,
      project: campaign.project,
      campaign: campaign._id,
      dailyBudget: campaign.dailyBudget,
      cpl,
      cpc,
      isAnomaly,
      anomalyReason,
      sentiment: isAnomaly ? 'warning' : (leadsGenerated > 0 ? 'positive' : 'info'),
      loggedBy: req.user?._id,
    };
    if (resolvedContentId) {
      logPayload.sourceContentId = resolvedContentId;
    } else {
      delete logPayload.sourceContentId;
    }

    const spendLog = await SmmAdSpend.create(logPayload);

    await recalculateCampaignSpend(campaignId);

    const populated = await SmmAdSpend.findById(spendLog._id)
      .populate('campaign', 'name platform amountAdded amountSpent remainingBalance')
      .populate('sourceContentId', 'name contentType thumbnail')
      .populate('client', 'name company');

    res.status(201).json({ success: true, data: populated });
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
