// =============================================
// SMM AD SPEND CONTROLLER (Daily Cash & Spend Ledger)
// =============================================
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import Campaign from '../../models/smm/campaign.model.js';
import Ad from '../../models/smm/ad.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';
import mongoose from 'mongoose';

// ─── Internal: Recalculate campaign totals after any log change ───────────────
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

// ─── GET All Spend Logs ────────────────────────────────────────────────────────
export const getAdSpendLogs = async (req, res) => {
  try {
    const { client, project, campaign, ad, startDate, endDate, page = 1, limit = 100 } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (campaign) query.campaign = campaign;
    if (ad) query.ad = ad;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); query.date.$gte = s; }
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    }

    const total = await SmmAdSpend.countDocuments(query);
    const logs = await SmmAdSpend.find(query)
      .populate('campaign', 'name platform dailyBudget lifetimeBudget amountAdded amountSpent remainingBalance status budgetAlerts objective')
      .populate('ad', 'name creativeType externalAdId')
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

// ─── POST Add Spend Log ────────────────────────────────────────────────────────
export const addAdSpendLog = async (req, res) => {
  try {
    const {
      campaign: campaignId,
      ad: adId,
      amountAdded = 0,
      amountSpent = 0,
      leadsGenerated = 0,
      clicks = 0,
      impressions = 0,
      sourceContentId,
    } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const cpl = leadsGenerated > 0 ? Number((amountSpent / leadsGenerated).toFixed(2)) : 0;
    const cpc = clicks > 0 ? Number((amountSpent / clicks).toFixed(2)) : 0;

    // Anomaly detection: compare with past 7-day average spend
    const recentLogs = await SmmAdSpend.find({ campaign: campaignId }).sort({ date: -1 }).limit(7);
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
    if (adId && adId !== '') {
      logPayload.ad = adId;
    } else {
      delete logPayload.ad;
    }
    if (resolvedContentId) {
      logPayload.sourceContentId = resolvedContentId;
    } else {
      delete logPayload.sourceContentId;
    }

    const spendLog = await SmmAdSpend.create(logPayload);
    await recalculateCampaignSpend(campaignId);

    // If adId provided, also update Ad performance stats
    if (adId) {
      try {
        const adDoc = await Ad.findById(adId);
        if (adDoc) {
          adDoc.performance = adDoc.performance || {};
          adDoc.performance.spend = (adDoc.performance.spend || 0) + Number(amountSpent);
          adDoc.performance.leads = (adDoc.performance.leads || 0) + Number(leadsGenerated);
          adDoc.performance.clicks = (adDoc.performance.clicks || 0) + Number(clicks);
          adDoc.performance.impressions = (adDoc.performance.impressions || 0) + Number(impressions);
          await adDoc.save();
        }
      } catch (e) {
        console.error('Failed to sync ad performance:', e);
      }
    }

    const populated = await SmmAdSpend.findById(spendLog._id)
      .populate('campaign', 'name platform amountAdded amountSpent remainingBalance')
      .populate('ad', 'name creativeType externalAdId')
      .populate('sourceContentId', 'name contentType thumbnail')
      .populate('client', 'name company');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── PUT Update Spend Log ──────────────────────────────────────────────────────
export const updateAdSpendLog = async (req, res) => {
  try {
    const log = await SmmAdSpend.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });

    const updated = await SmmAdSpend.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('campaign', 'name platform amountAdded amountSpent remainingBalance')
      .populate('ad', 'name creativeType')
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('loggedBy', 'name');

    await recalculateCampaignSpend(log.campaign);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE Spend Log ──────────────────────────────────────────────────────────
export const deleteAdSpendLog = async (req, res) => {
  try {
    const log = await SmmAdSpend.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });

    const campaignId = log.campaign;
    await SmmAdSpend.findByIdAndDelete(req.params.id);
    await recalculateCampaignSpend(campaignId);

    res.json({ success: true, message: 'Spend log deleted and campaign balance updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET Aggregated Budget Summary ────────────────────────────────────────────
export const getAdSpendSummary = async (req, res) => {
  try {
    const { client, project, campaign, ad, startDate, endDate } = req.query;

    const matchQuery = {};
    if (client) matchQuery.client = new mongoose.Types.ObjectId(client);
    if (project) matchQuery.project = new mongoose.Types.ObjectId(project);
    if (campaign) matchQuery.campaign = new mongoose.Types.ObjectId(campaign);
    if (ad) matchQuery.ad = new mongoose.Types.ObjectId(ad);
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); matchQuery.date.$gte = s; }
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); matchQuery.date.$lte = e; }
    }

    // Overall totals
    const [overall] = await SmmAdSpend.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAdded: { $sum: '$amountAdded' },
          totalSpent: { $sum: '$amountSpent' },
          totalLeads: { $sum: '$leadsGenerated' },
          totalClicks: { $sum: '$clicks' },
          totalImpressions: { $sum: '$impressions' },
          totalMessages: { $sum: '$messages' },
          totalCalls: { $sum: '$calls' },
          totalRevenue: { $sum: '$revenue' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Per-campaign breakdown with campaign info
    const perCampaign = await SmmAdSpend.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$campaign',
          totalAdded: { $sum: '$amountAdded' },
          totalSpent: { $sum: '$amountSpent' },
          totalLeads: { $sum: '$leadsGenerated' },
          totalClicks: { $sum: '$clicks' },
          totalMessages: { $sum: '$messages' },
          totalCalls: { $sum: '$calls' },
          totalRevenue: { $sum: '$revenue' },
          count: { $sum: 1 },
          lastEntry: { $max: '$date' },
        },
      },
      {
        $lookup: {
          from: 'smmcampaigns',
          localField: '_id',
          foreignField: '_id',
          as: 'campaignInfo',
        },
      },
      { $unwind: { path: '$campaignInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          campaignId: '$_id',
          campaignName: '$campaignInfo.name',
          platform: '$campaignInfo.platform',
          objective: '$campaignInfo.objective',
          status: '$campaignInfo.status',
          dailyBudget: '$campaignInfo.dailyBudget',
          lifetimeBudget: '$campaignInfo.lifetimeBudget',
          internalNotes: '$campaignInfo.internalNotes',
          budgetAllocated: '$campaignInfo.amountAdded',
          budgetAlerts: '$campaignInfo.budgetAlerts',
          totalAdded: 1,
          totalSpent: 1,
          remaining: { $max: [{ $subtract: ['$totalAdded', '$totalSpent'] }, 0] },
          totalLeads: 1,
          totalClicks: 1,
          totalMessages: 1,
          totalCalls: 1,
          totalRevenue: 1,
          count: 1,
          lastEntry: 1,
          cpl: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $divide: ['$totalSpent', '$totalLeads'] },
              0,
            ],
          },
          spendPercent: {
            $cond: [
              { $gt: ['$totalAdded', 0] },
              { $multiply: [{ $divide: ['$totalSpent', '$totalAdded'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { lastEntry: -1 } },
    ]);

    const totals = overall || {
      totalAdded: 0, totalSpent: 0, totalLeads: 0, totalClicks: 0,
      totalImpressions: 0, totalMessages: 0, totalCalls: 0, totalRevenue: 0, count: 0,
    };
    const cpl = totals.totalLeads > 0 ? Number((totals.totalSpent / totals.totalLeads).toFixed(2)) : 0;
    const roas = totals.totalSpent > 0 ? Number((totals.totalRevenue / totals.totalSpent).toFixed(2)) : 0;
    const remaining = Math.max(0, (totals.totalAdded || 0) - (totals.totalSpent || 0));

    res.json({
      success: true,
      data: {
        totals: { ...totals, remaining, cpl, roas },
        perCampaign,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET CSV Export ────────────────────────────────────────────────────────────
export const exportAdSpendReport = async (req, res) => {
  try {
    const { client, project, campaign, ad, startDate, endDate } = req.query;

    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;
    if (campaign) query.campaign = campaign;
    if (ad) query.ad = ad;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); query.date.$gte = s; }
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    }

    const logs = await SmmAdSpend.find(query)
      .populate('campaign', 'name platform objective')
      .populate('ad', 'name')
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('loggedBy', 'name')
      .sort({ date: -1 });

    const headers = [
      'Date', 'Client', 'Project', 'Campaign', 'Ad', 'Platform',
      'Amount Added (INR)', 'Amount Spent (INR)', 'Balance (INR)',
      'Leads', 'Messages', 'Calls', 'Clicks', 'Impressions',
      'CPL (INR)', 'CPC (INR)', 'Revenue (INR)',
      'Is Anomaly', 'Anomaly Reason', 'Notes', 'Sentiment', 'Logged By',
    ];

    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = logs.map(log => [
      log.date ? new Date(log.date).toLocaleDateString('en-IN') : '',
      esc(log.client?.company || log.client?.name || ''),
      esc(log.project?.name || ''),
      esc(log.campaign?.name || ''),
      esc(log.ad?.name || ''),
      esc(log.campaign?.platform || ''),
      log.amountAdded || 0,
      log.amountSpent || 0,
      log.balance || 0,
      log.leadsGenerated || 0,
      log.messages || 0,
      log.calls || 0,
      log.clicks || 0,
      log.impressions || 0,
      log.cpl || 0,
      log.cpc || 0,
      log.revenue || 0,
      log.isAnomaly ? 'Yes' : 'No',
      esc(log.anomalyReason || ''),
      esc(log.notes || ''),
      esc(log.sentiment || ''),
      esc(log.loggedBy?.name || ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `ad-budget-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
