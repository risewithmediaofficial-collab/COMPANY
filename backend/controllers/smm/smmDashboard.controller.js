// =============================================
// SMM DASHBOARD CONTROLLER
// =============================================
import Client from '../../models/client.model.js';
import Project from '../../models/project.model.js';
import Campaign from '../../models/smm/campaign.model.js';
import AdSet from '../../models/smm/adSet.model.js';
import Ad from '../../models/smm/ad.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getSmmDashboardStats = async (req, res) => {
  try {
    const [
      totalClients,
      totalProjects,
      campaigns,
      adSets,
      ads,
      recentActivity,
    ] = await Promise.all([
      Client.countDocuments(),
      Project.countDocuments(),
      Campaign.find().select('status platform performance dailyBudget lifetimeBudget budgetType'),
      AdSet.find({ status: 'Active' }).countDocuments(),
      Ad.find({ approvalStatus: 'Pending' }).countDocuments(),
      SmmActivityLog.find()
        .populate('performedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(15),
    ]);

    const runningCampaigns = campaigns.filter(c => c.status === 'Active').length;
    const pausedCampaigns = campaigns.filter(c => c.status === 'Paused').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'Completed').length;

    // Aggregate performance metrics across all campaigns
    const totals = campaigns.reduce((acc, c) => {
      const p = c.performance || {};
      acc.totalLeads += p.leads || 0;
      acc.totalPurchases += p.purchases || 0;
      acc.totalRevenue += p.revenue || 0;
      acc.totalSpend += p.spend || 0;
      acc.totalImpressions += p.impressions || 0;
      acc.totalClicks += p.clicks || 0;
      return acc;
    }, {
      totalLeads: 0,
      totalPurchases: 0,
      totalRevenue: 0,
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCampaigns = campaigns.filter(c => new Date(c.createdAt) >= monthStart);
    const monthlySpend = monthCampaigns.reduce((s, c) => s + (c.performance?.spend || 0), 0);
    const monthlyBudget = campaigns.reduce((s, c) => {
      if (c.budgetType === 'Daily Budget') return s + (c.dailyBudget * 30 || 0);
      return s + (c.lifetimeBudget || 0);
    }, 0);

    const roas = totals.totalSpend > 0 ? (totals.totalRevenue / totals.totalSpend).toFixed(2) : 0;
    const ctr = totals.totalImpressions > 0 ? ((totals.totalClicks / totals.totalImpressions) * 100).toFixed(2) : 0;
    const cpc = totals.totalClicks > 0 ? (totals.totalSpend / totals.totalClicks).toFixed(2) : 0;
    const cpl = totals.totalLeads > 0 ? (totals.totalSpend / totals.totalLeads).toFixed(2) : 0;

    // Campaign performance chart data (last 6 months)
    const campaignPerformanceData = await Campaign.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 },
          totalSpend: { $sum: '$performance.spend' },
          totalLeads: { $sum: '$performance.leads' },
          totalRevenue: { $sum: '$performance.revenue' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    // Platform distribution
    const platformData = await Campaign.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 }, spend: { $sum: '$performance.spend' } } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalClients,
          totalProjects,
          runningCampaigns,
          pausedCampaigns,
          completedCampaigns,
          runningAdSets: adSets,
          activeAds: await Ad.countDocuments({ status: 'Active' }),
          pendingApprovals: ads,
          ...totals,
          monthlySpend,
          monthlyBudget,
          roas: Number(roas),
          ctr: Number(ctr),
          cpc: Number(cpc),
          cpl: Number(cpl),
        },
        charts: {
          campaignPerformance: campaignPerformanceData,
          platformDistribution: platformData,
        },
        recentActivity,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
