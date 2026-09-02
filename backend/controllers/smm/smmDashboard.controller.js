// =============================================
// SMM DASHBOARD CONTROLLER (Social Media + Ads OS Command Engine)
// =============================================
import Client from '../../models/client.model.js';
import Project from '../../models/project.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';
import Campaign from '../../models/smm/campaign.model.js';
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';
import SmmLead from '../../models/smm/smmLead.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getSmmDashboardStats = async (req, res) => {
  try {
    const {
      client,
      project,
      startDate,
      endDate,
      platform,
      contentType,
      campaignStatus,
    } = req.query;

    const filter = {};
    if (client) filter.client = client;
    if (project) filter.project = project;

    const dateFilter = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateFilter.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.$lte = e;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Selected client info if filtered
    let selectedClient = null;
    if (client) {
      selectedClient = await Client.findById(client).select('name company logo website email phone status tier contractValue driveLink');
    }

    let selectedProject = null;
    if (project) {
      selectedProject = await Project.findById(project).select('name status category client startDate dueDate budget');
    }

    // ── 1. CONTENT BREAKDOWN & STATUS STATS ───────────────────────
    const contentQuery = { ...filter };
    if (contentType) contentQuery.contentType = contentType;
    if (platform) contentQuery.platforms = platform;
    if (startDate || endDate) {
      contentQuery.$or = [
        { actualPostedDate: dateFilter },
        { scheduledDate: dateFilter },
        { shootDate: dateFilter },
        { createdAt: dateFilter },
      ];
    }

    const [
      totalPosts,
      totalReels,
      totalStories,
      totalVideos,
      totalContentPublished,
      contentPublishedThisMonth,
      contentScheduled,
      contentPendingApproval,
      contentDrafts,
      contentReady,
      contentRevision,
      allContents,
    ] = await Promise.all([
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Post' }),
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Reel' }),
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Story' }),
      SmmContent.countDocuments({ ...contentQuery, contentType: { $in: ['Video', 'Short'] } }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Published' }),
      SmmContent.countDocuments({
        ...contentQuery,
        postingStatus: 'Published',
        actualPostedDate: { $gte: startOfMonth },
      }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Scheduled' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Pending Approval' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Draft' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Ready' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Revision Required' }),
      SmmContent.find(contentQuery)
        .populate('client', 'name company logo')
        .populate('project', 'name')
        .populate('advertising.campaign', 'name status dailyBudget amountSpent remainingBalance')
        .sort({ performanceScore: -1, createdAt: -1 }),
    ]);

    const totalContent = totalPosts + totalReels + totalStories + totalVideos;
    const notPostedCount = contentDrafts + contentReady + contentRevision + contentPendingApproval;

    // Reason breakdown for unposted content
    const notPostedReasonMap = {};
    const pendingApprovalAgingList = [];

    allContents.forEach((item) => {
      if (item.postingStatus !== 'Published') {
        const reason = item.notPostedReason || 'Not Scheduled';
        notPostedReasonMap[reason] = (notPostedReasonMap[reason] || 0) + 1;
      }
      if (item.postingStatus === 'Pending Approval') {
        const refDate = item.approvalRequestedAt || item.createdAt;
        const diffMs = now - new Date(refDate);
        const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        pendingApprovalAgingList.push({
          id: item._id,
          name: item.name,
          client: item.client?.company || item.client?.name || 'Client',
          daysWaiting: days,
          urgency: days >= 3 ? 'critical' : days >= 2 ? 'warning' : 'normal',
        });
      }
    });

    // Sort aging list descending
    pendingApprovalAgingList.sort((a, b) => b.daysWaiting - a.daysWaiting);

    // Organic reach & impressions sum
    let organicReach = 0;
    let organicImpressions = 0;
    let organicEngagement = 0;
    let organicClicks = 0;
    let organicVideoViews = 0;
    let organicFollowers = 0;

    allContents.forEach((item) => {
      const p = item.performance || {};
      organicReach += p.reach || 0;
      organicImpressions += p.impressions || 0;
      organicEngagement += (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0) || p.engagement || 0;
      organicClicks += p.clicks || 0;
      organicVideoViews += p.views || p.videoViews || p.plays || 0;
      organicFollowers += p.followersGained || 0;
    });

    // ── 2. PAID ADS CAMPAIGN STATS & MONEY LEDGER ───────────────────
    const campaignQuery = { ...filter };
    if (platform) campaignQuery.platform = platform;
    if (campaignStatus) campaignQuery.status = campaignStatus;

    const [
      totalCampaigns,
      activeCampaigns,
      stoppedCampaigns,
      completedCampaigns,
      allCampaigns,
    ] = await Promise.all([
      Campaign.countDocuments(campaignQuery),
      Campaign.countDocuments({ ...campaignQuery, status: 'Running' }),
      Campaign.countDocuments({ ...campaignQuery, status: { $in: ['Stopped', 'Paused'] } }),
      Campaign.countDocuments({ ...campaignQuery, status: 'Completed' }),
      Campaign.find(campaignQuery)
        .populate('client', 'name company logo')
        .populate('project', 'name')
        .populate('sourceContentId', 'name contentType thumbnail performanceScore')
        .select('name status platform dailyBudget lifetimeBudget budgetType amountAdded amountSpent remainingBalance performance durationDays budgetAlerts'),
    ]);

    // Spend logs for accurate spend calculations
    const spendQuery = { ...filter };
    if (startDate || endDate) spendQuery.date = dateFilter;

    const [totalAdSpendAgg, todaysAdSpendAgg, totalAmountAddedAgg, recentLogs, recentAnomalies] = await Promise.all([
      SmmAdSpend.aggregate([
        { $match: spendQuery },
        { $group: { _id: null, total: { $sum: '$amountSpent' } } },
      ]),
      SmmAdSpend.aggregate([
        { $match: { ...spendQuery, date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amountSpent' } } },
      ]),
      SmmAdSpend.aggregate([
        { $match: spendQuery },
        { $group: { _id: null, total: { $sum: '$amountAdded' } } },
      ]),
      SmmAdSpend.find(spendQuery)
        .populate('campaign', 'name platform')
        .populate('sourceContentId', 'name contentType thumbnail')
        .sort({ date: -1 })
        .limit(10),
      SmmAdSpend.find({ ...spendQuery, isAnomaly: true })
        .populate('campaign', 'name platform')
        .sort({ date: -1 })
        .limit(5),
    ]);

    const totalAdSpend = totalAdSpendAgg[0]?.total || allCampaigns.reduce((s, c) => s + (c.amountSpent || 0), 0);
    const todaysAdSpend = todaysAdSpendAgg[0]?.total || 0;
    const totalAmountAdded = totalAmountAddedAgg[0]?.total || allCampaigns.reduce((s, c) => s + (c.amountAdded || c.lifetimeBudget || (c.dailyBudget * 30)), 0);
    const remainingBudgetSum = Math.max(0, totalAmountAdded - totalAdSpend);

    // Aggregate paid impressions, reach, clicks
    let paidReach = 0;
    let paidImpressions = 0;
    let paidClicks = 0;
    let paidVideoViews = 0;
    let paidLeadsSum = 0;
    let paidConversionsSum = 0;

    const activeBudgetAlerts = [];

    allCampaigns.forEach((c) => {
      const p = c.performance || {};
      paidReach += p.reach || 0;
      paidImpressions += p.impressions || 0;
      paidClicks += p.clicks || 0;
      paidVideoViews += p.videoViews || 0;
      paidLeadsSum += p.leads || 0;
      paidConversionsSum += p.purchases || 0;

      const spentRatio = (c.amountAdded > 0) ? (c.amountSpent / c.amountAdded) : (c.amountSpent / (c.lifetimeBudget || 1));
      if (spentRatio >= 0.8) {
        activeBudgetAlerts.push({
          campaignId: c._id,
          campaignName: c.name,
          client: c.client?.company || c.client?.name || 'Client',
          amountAdded: c.amountAdded || c.lifetimeBudget,
          amountSpent: c.amountSpent,
          percentSpent: Math.min(100, Math.round(spentRatio * 100)),
          isExhausted: spentRatio >= 1.0,
        });
      }
    });

    // ── 3. LEADS & ORGANIC VS PAID STATS ───────────────────────────
    const leadQuery = { ...filter };
    if (startDate || endDate) leadQuery.leadDate = dateFilter;

    const [
      totalLeads,
      leadsToday,
      leadsThisMonth,
      qualifiedLeads,
      convertedLeads,
    ] = await Promise.all([
      SmmLead.countDocuments(leadQuery),
      SmmLead.countDocuments({ ...leadQuery, leadDate: { $gte: startOfToday } }),
      SmmLead.countDocuments({ ...leadQuery, leadDate: { $gte: startOfMonth } }),
      SmmLead.countDocuments({ ...leadQuery, status: 'Qualified' }),
      SmmLead.countDocuments({ ...leadQuery, status: 'Converted' }),
    ]);

    const effectiveTotalLeads = Math.max(totalLeads, paidLeadsSum);
    const costPerLead = effectiveTotalLeads > 0 ? Number((totalAdSpend / effectiveTotalLeads).toFixed(2)) : 0;
    const conversionRate = effectiveTotalLeads > 0 ? Number(((convertedLeads / effectiveTotalLeads) * 100).toFixed(2)) : 0;

    // Combined metrics
    const totalReach = organicReach + paidReach;
    const totalImpressions = organicImpressions + paidImpressions;
    const totalEngagement = organicEngagement;
    const engagementRate = totalImpressions > 0 ? Number(((totalEngagement / totalImpressions) * 100).toFixed(2)) : 0;
    const linkClicks = organicClicks + paidClicks;
    const videoViews = organicVideoViews + paidVideoViews;

    // ── 4. TOP PERFORMING VIDEOS & DECISION MATRIX ──────────────────
    const topPerformingVideos = allContents.slice(0, 5).map((v) => {
      const p = v.performance || {};
      const adv = v.advertising || {};
      return {
        _id: v._id,
        name: v.name,
        contentType: v.contentType,
        client: v.client?.company || v.client?.name,
        thumbnail: v.thumbnail,
        platforms: v.platforms,
        views: p.views || p.videoViews || p.plays || 0,
        engagementRate: p.engagementRate || 0,
        shares: p.shares || 0,
        saves: p.saves || 0,
        performanceScore: v.performanceScore || 0,
        adRecommendation: v.adRecommendation || 'Under Review',
        usedAsAd: Boolean(adv.usedAsAd || v.linkedAdCampaignIds?.length),
        paidSpend: adv.amountSpent || 0,
        paidLeads: adv.leads || 0,
        paidCpl: adv.cpl || 0,
      };
    });

    // ── 5. CLIENT HEALTH SCORE (0 - 100) ───────────────────────────
    let clientHealthScore = 85;
    if (selectedClient) {
      let consistencyScore = Math.min(25, (contentPublishedThisMonth / 10) * 25);
      let engagementScore = Math.min(25, ((organicEngagement / (organicReach || 1)) * 100) * 4);
      let adEfficiencyScore = costPerLead > 0 ? Math.max(10, Math.min(25, (100 / costPerLead) * 25)) : 20;
      let approvalSpeedScore = pendingApprovalAgingList.length === 0 ? 25 : Math.max(5, 25 - (pendingApprovalAgingList[0]?.daysWaiting * 5));
      clientHealthScore = Math.min(100, Math.max(30, Math.round(consistencyScore + engagementScore + adEfficiencyScore + approvalSpeedScore)));
    }

    // ── 6. PLATFORM COMPARISON ─────────────────────────────────────
    const platformsList = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'X/Twitter', 'Other'];
    const platformPerformance = await Promise.all(
      platformsList.map(async (plat) => {
        const platContentQuery = { ...filter, platforms: plat };
        const platCampQuery = { ...filter, platform: plat === 'X/Twitter' ? 'Twitter' : plat === 'Instagram' || plat === 'Facebook' ? 'Meta' : plat };

        const [pPosts, pReels, pStories, pAds, pSpendAgg, pLeads] = await Promise.all([
          SmmContent.countDocuments({ ...platContentQuery, contentType: 'Post' }),
          SmmContent.countDocuments({ ...platContentQuery, contentType: 'Reel' }),
          SmmContent.countDocuments({ ...platContentQuery, contentType: 'Story' }),
          Campaign.countDocuments(platCampQuery),
          SmmAdSpend.aggregate([
            { $match: { ...filter, campaign: { $in: await Campaign.find(platCampQuery).distinct('_id') } } },
            { $group: { _id: null, spend: { $sum: '$amountSpent' } } },
          ]),
          SmmLead.countDocuments({ ...filter, source: { $regex: plat, $options: 'i' } }),
        ]);

        const spend = pSpendAgg[0]?.spend || 0;
        const leads = pLeads || 0;
        const cpl = leads > 0 ? Number((spend / leads).toFixed(2)) : 0;

        return {
          platform: plat,
          posts: pPosts,
          reels: pReels,
          stories: pStories,
          ads: pAds,
          adSpend: spend,
          leads,
          cpl,
        };
      })
    );

    // Recent activity log
    const recentActivity = await SmmActivityLog.find()
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        selectedClient,
        selectedProject,
        clientHealthScore,
        kpi: {
          content: {
            totalVideos: totalContent,
            posted: totalContentPublished,
            notPosted: notPostedCount,
            scheduled: contentScheduled,
            pendingApproval: contentPendingApproval,
            publishedThisMonth: contentPublishedThisMonth,
            notPostedReasons: notPostedReasonMap,
            pendingApprovalAging: pendingApprovalAgingList,
          },
          organic: {
            views: organicVideoViews,
            reach: organicReach,
            impressions: organicImpressions,
            engagement: organicEngagement,
            engagementRate,
            followersGained: organicFollowers,
            clicks: organicClicks,
          },
          paid: {
            totalCampaigns,
            activeCampaigns,
            stoppedCampaigns,
            completedCampaigns,
            amountAdded: totalAmountAdded,
            amountSpent: totalAdSpend,
            remainingBalance: remainingBudgetSum,
            todaysAdSpend,
            reach: paidReach,
            impressions: paidImpressions,
            clicks: paidClicks,
            leads: effectiveTotalLeads,
            costPerLead,
            conversions: paidConversionsSum,
            budgetAlerts: activeBudgetAlerts,
            spendAnomalies: recentAnomalies,
          },
          organicVsPaid: {
            reach: { organic: organicReach, paid: paidReach },
            views: { organic: organicVideoViews, paid: paidVideoViews },
            leads: { organic: 0, paid: effectiveTotalLeads },
            spend: { organic: 0, paid: totalAdSpend },
            cpl: { organic: '—', paid: `₹${costPerLead}` },
          },
        },
        topPerformingVideos,
        platformPerformance,
        recentCampaigns: allCampaigns.slice(0, 10),
        recentActivity,
        recentLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
