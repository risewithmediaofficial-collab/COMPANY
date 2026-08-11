// =============================================
// SMM DASHBOARD CONTROLLER
// Real Marketing Analytics Engine with Client & Project Filtering
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
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

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

    // ── 1. ORGANIC CONTENT STATS ──────────────────────────────────
    const contentQuery = { ...filter };
    if (contentType) contentQuery.contentType = contentType;
    if (platform) contentQuery.platforms = platform;
    if (startDate || endDate) contentQuery.scheduledDate = dateFilter;

    const [
      totalPosts,
      totalReels,
      totalStories,
      totalContentPublished,
      contentPublishedThisMonth,
      contentScheduled,
      contentPending,
      allContents,
    ] = await Promise.all([
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Post' }),
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Reel' }),
      SmmContent.countDocuments({ ...contentQuery, contentType: 'Story' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Published' }),
      SmmContent.countDocuments({
        ...contentQuery,
        postingStatus: 'Published',
        actualPostedDate: { $gte: startOfMonth },
      }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Scheduled' }),
      SmmContent.countDocuments({ ...contentQuery, postingStatus: 'Draft' }),
      SmmContent.find(contentQuery).select('performance contentType platforms postingStatus actualPostedDate scheduledDate'),
    ]);

    const totalContent = totalPosts + totalReels + totalStories;

    // Organic reach & impressions sum
    let organicReach = 0;
    let organicImpressions = 0;
    let organicEngagement = 0;
    let organicClicks = 0;
    let organicVideoViews = 0;

    allContents.forEach((item) => {
      const p = item.performance || {};
      organicReach += p.reach || 0;
      organicImpressions += p.impressions || 0;
      organicEngagement += p.likes + p.comments + p.shares + p.saves || p.engagement || 0;
      organicClicks += p.clicks || 0;
      organicVideoViews += p.videoViews || p.plays || 0;
    });

    // ── 2. PAID ADS CAMPAIGN STATS ────────────────────────────────
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
      Campaign.find(campaignQuery).select('name status platform dailyBudget lifetimeBudget budgetType amountSpent remainingBalance performance durationDays'),
    ]);

    // Spend logs for accurate spend calculations
    const spendQuery = { ...filter };
    if (startDate || endDate) spendQuery.date = dateFilter;

    const [totalAdSpendAgg, todaysAdSpendAgg, recentLogs] = await Promise.all([
      SmmAdSpend.aggregate([
        { $match: spendQuery },
        { $group: { _id: null, total: { $sum: '$amountSpent' } } },
      ]),
      SmmAdSpend.aggregate([
        { $match: { ...spendQuery, date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amountSpent' } } },
      ]),
      SmmAdSpend.find(spendQuery).sort({ date: -1 }).limit(10),
    ]);

    const totalAdSpend = totalAdSpendAgg[0]?.total || allCampaigns.reduce((s, c) => s + (c.amountSpent || 0), 0);
    const todaysAdSpend = todaysAdSpendAgg[0]?.total || 0;

    const dailyBudgetSum = allCampaigns.reduce((s, c) => s + (c.dailyBudget || 0), 0);
    const remainingBudgetSum = allCampaigns.reduce((s, c) => s + (c.remainingBalance || 0), 0);

    // Aggregate paid impressions, reach, clicks
    let paidReach = 0;
    let paidImpressions = 0;
    let paidClicks = 0;
    let paidVideoViews = 0;

    allCampaigns.forEach((c) => {
      const p = c.performance || {};
      paidReach += p.reach || 0;
      paidImpressions += p.impressions || 0;
      paidClicks += p.clicks || 0;
      paidVideoViews += p.videoViews || 0;
    });

    // ── 3. LEADS STATS ────────────────────────────────────────────
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

    const costPerLead = totalLeads > 0 ? Number((totalAdSpend / totalLeads).toFixed(2)) : 0;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

    // Combined metrics
    const totalReach = organicReach + paidReach;
    const totalImpressions = organicImpressions + paidImpressions;
    const totalEngagement = organicEngagement;
    const engagementRate = totalImpressions > 0 ? Number(((totalEngagement / totalImpressions) * 100).toFixed(2)) : 0;
    const linkClicks = organicClicks + paidClicks;
    const videoViews = organicVideoViews + paidVideoViews;

    // ── 4. CHARTS & TABLES GENERATION ─────────────────────────────

    // Platform Performance Comparison
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

        return {
          platform: plat,
          posts: pPosts,
          reels: pReels,
          stories: pStories,
          ads: pAds,
          adSpend: pSpendAgg[0]?.spend || 0,
          leads: pLeads,
        };
      })
    );

    // Client Comparison Table (when viewing All Clients)
    let clientComparisonTable = [];
    if (!client) {
      const allClients = await Client.find().select('name company logo status');
      clientComparisonTable = await Promise.all(
        allClients.map(async (cl) => {
          const clFilter = { client: cl._id };
          const [cContent, cAds, cSpendAgg, cLeads] = await Promise.all([
            SmmContent.countDocuments(clFilter),
            Campaign.countDocuments(clFilter),
            SmmAdSpend.aggregate([
              { $match: clFilter },
              { $group: { _id: null, spend: { $sum: '$amountSpent' } } },
            ]),
            SmmLead.countDocuments(clFilter),
          ]);
          const spend = cSpendAgg[0]?.spend || 0;
          const cpl = cLeads > 0 ? (spend / cLeads).toFixed(2) : 0;

          return {
            clientId: cl._id,
            clientName: cl.company || cl.name,
            logo: cl.logo,
            status: cl.status,
            contentCount: cContent,
            adsCount: cAds,
            spend,
            leads: cLeads,
            cpl: Number(cpl),
          };
        })
      );
    }

    // Recent campaign list with budget & spend details
    const recentCampaigns = await Campaign.find(campaignQuery)
      .populate('client', 'name company logo')
      .populate('project', 'name')
      .populate('sourceContentId', 'name contentType')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(15);

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
        kpi: {
          organic: {
            totalPosts,
            totalReels,
            totalStories,
            totalContent,
            totalContentPublished,
            contentPublishedThisMonth,
            contentScheduled,
            contentPending,
          },
          paid: {
            totalCampaigns,
            activeCampaigns,
            stoppedCampaigns,
            completedCampaigns,
            totalAdSpend,
            todaysAdSpend,
            dailyBudget: dailyBudgetSum,
            remainingBudget: remainingBudgetSum,
          },
          leads: {
            totalLeads,
            leadsToday,
            leadsThisMonth,
            qualifiedLeads,
            convertedLeads,
            costPerLead,
            conversionRate,
          },
          performance: {
            totalReach,
            totalImpressions,
            totalEngagement,
            engagementRate,
            linkClicks,
            videoViews,
          },
        },
        charts: {
          platformPerformance,
          clientComparisonTable,
          postsVsReelsVsStories: [
            { name: 'Posts', value: totalPosts },
            { name: 'Reels', value: totalReels },
            { name: 'Stories', value: totalStories },
          ],
        },
        recentCampaigns,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
