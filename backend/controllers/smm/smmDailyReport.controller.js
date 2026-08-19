// =============================================
// SMM DAILY REPORT CONTROLLER
// =============================================
import SmmDailyReport from '../../models/smm/smmDailyReport.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';
import Client from '../../models/client.model.js';

export const getDailyReports = async (req, res) => {
  try {
    const { client, project, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await SmmDailyReport.countDocuments(query);
    const reports = await SmmDailyReport.find(query)
      .populate('client', 'name company logo')
      .populate('project', 'name')
      .populate('contentSummary.postedContentIds', 'name contentType platforms thumbnail actualPostedDate')
      .populate('loggedBy', 'name')
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, data: reports, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDailyReportByDate = async (req, res) => {
  try {
    const { client, date } = req.query;
    if (!client || !date) {
      return res.status(400).json({ success: false, message: 'Client and Date are required' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const existingReport = await SmmDailyReport.findOne({
      client,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('client', 'name company logo')
      .populate('contentSummary.postedContentIds', 'name contentType platforms thumbnail actualPostedDate')
      .populate('loggedBy', 'name');

    if (existingReport) {
      return res.json({ success: true, data: existingReport, isExisting: true });
    }

    // If no existing report saved, auto-aggregate draft metrics for that date
    const autoSummary = await aggregateDayData(client, startOfDay, endOfDay);
    res.json({ success: true, data: autoSummary, isExisting: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const aggregateDayData = async (clientId, startOfDay, endOfDay) => {
  const [
    postedContents,
    scheduledCount,
    pendingCount,
    spendLogs,
    activityLogs,
    clientInfo,
  ] = await Promise.all([
    SmmContent.find({
      client: clientId,
      actualPostedDate: { $gte: startOfDay, $lte: endOfDay },
    }),
    SmmContent.countDocuments({
      client: clientId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      postingStatus: 'Scheduled',
    }),
    SmmContent.countDocuments({
      client: clientId,
      postingStatus: 'Pending Approval',
    }),
    SmmAdSpend.find({
      client: clientId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate('campaign', 'name platform'),
    SmmActivityLog.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ createdAt: 1 }),
    Client.findById(clientId).select('name company logo'),
  ]);

  // Aggregate Organic
  let organicViews = 0;
  let organicReach = 0;
  let organicEngagement = 0;
  let organicFollowers = 0;

  postedContents.forEach((c) => {
    const p = c.performance || {};
    organicViews += p.views || p.videoViews || p.plays || 0;
    organicReach += p.reach || p.impressions || 0;
    organicEngagement += (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0) || p.engagement || 0;
    organicFollowers += p.followersGained || 0;
  });

  // Aggregate Ads
  let amountAdded = 0;
  let amountSpent = 0;
  let leads = 0;
  let messages = 0;
  let calls = 0;
  let conversions = 0;

  spendLogs.forEach((l) => {
    amountAdded += l.amountAdded || 0;
    amountSpent += l.amountSpent || 0;
    leads += l.leadsGenerated || 0;
    messages += l.messages || 0;
    calls += l.calls || 0;
    conversions += l.conversions || 0;
  });

  const cpl = leads > 0 ? Number((amountSpent / leads).toFixed(2)) : 0;

  // Build activity timeline
  const activityTimeline = activityLogs.map((log) => ({
    time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    description: `${log.action}: ${log.entityName || ''}`,
    category: log.action.toLowerCase().includes('budget') ? 'budget'
      : log.action.toLowerCase().includes('ad') ? 'spend'
      : log.action.toLowerCase().includes('approval') ? 'approval' : 'content',
  }));

  // If no logs, provide starter timeline points from today's content/spend
  if (activityTimeline.length === 0) {
    postedContents.forEach((c) => {
      activityTimeline.push({
        time: c.actualPostedTime || '10:00',
        description: `Posted ${c.contentType}: ${c.name}`,
        category: 'content',
      });
    });
    if (amountSpent > 0) {
      activityTimeline.push({
        time: '14:30',
        description: `₹${amountSpent.toLocaleString()} ad spend recorded across active campaigns`,
        category: 'spend',
      });
    }
  }

  return {
    client: clientInfo,
    date: startOfDay,
    contentSummary: {
      videosPosted: postedContents.length,
      videosScheduled: scheduledCount,
      videosPendingApproval: pendingCount,
      postedContentIds: postedContents.map((c) => c._id),
    },
    organicSummary: {
      views: organicViews,
      reach: organicReach,
      engagement: organicEngagement,
      followersGained: organicFollowers,
    },
    adsSummary: {
      amountAdded,
      amountSpent,
      leads,
      messages,
      calls,
      conversions,
      cpl,
    },
    notes: [
      { text: `Videos posted: ${postedContents.length}. Scheduled ahead: ${scheduledCount}.`, tag: 'info' },
      ...(leads > 0 ? [{ text: `${leads} leads generated at ₹${cpl} CPL today.`, tag: 'success' }] : []),
      ...(pendingCount > 0 ? [{ text: `${pendingCount} videos pending client approval.`, tag: 'warning' }] : []),
    ],
    activityTimeline,
    status: 'Draft',
  };
};

export const saveDailyReport = async (req, res) => {
  try {
    const { client, date, contentSummary, organicSummary, adsSummary, notes, activityTimeline, status } = req.body;

    if (!client || !date) {
      return res.status(400).json({ success: false, message: 'Client and Date are required' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const payload = {
      client,
      date: startOfDay,
      contentSummary,
      organicSummary,
      adsSummary,
      notes: notes || [],
      activityTimeline: activityTimeline || [],
      status: status || 'Completed',
      loggedBy: req.user?._id,
    };

    const report = await SmmDailyReport.findOneAndUpdate(
      { client, date: { $gte: startOfDay, $lte: endOfDay } },
      payload,
      { new: true, upsert: true, runValidators: true }
    )
      .populate('client', 'name company logo')
      .populate('loggedBy', 'name');

    res.status(200).json({ success: true, data: report, message: 'Daily Social Media Report saved successfully!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
