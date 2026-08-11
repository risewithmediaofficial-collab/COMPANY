import React, { useEffect, useState } from 'react';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  FileText, Video, ImageIcon, CheckCircle2, Clock, Megaphone, PlayCircle,
  PauseCircle, DollarSign, Users, UserCheck, Award, TrendingUp, Share2,
  Eye, MousePointer, Activity, ArrowUpRight, Building2, FolderKanban
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export const SMMDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    platform: '',
    contentType: '',
    campaignStatus: '',
    dateRange: 'all',
  });

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const params = {
        client: filters.client || undefined,
        project: filters.project || undefined,
        platform: filters.platform || undefined,
        contentType: filters.contentType || undefined,
        campaignStatus: filters.campaignStatus || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const res = await smmApi.getDashboardStats(params);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [filters]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetFilters = () => {
    setFilters({
      client: '',
      project: '',
      platform: '',
      contentType: '',
      campaignStatus: '',
      dateRange: 'all',
    });
  };

  const kpi = data?.kpi || {};
  const organic = kpi.organic || {};
  const paid = kpi.paid || {};
  const leads = kpi.leads || {};
  const performance = kpi.performance || {};
  const selectedClient = data?.selectedClient;
  const selectedProject = data?.selectedProject;

  const COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ec4899'];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {selectedClient ? `${selectedClient.company || selectedClient.name} Marketing Dashboard` : 'Social Media Manager Dashboard'}
            </h1>
            {selectedClient && (
              <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20">
                Client Dashboard
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedClient
              ? `Real-time organic content, paid campaigns, ad spend, and lead metrics for ${selectedClient.company || selectedClient.name}`
              : 'Complete agency client & project level marketing performance overview'}
          </p>
        </div>
      </div>

      <SMMSubNav />
      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground">Loading marketing analytics...</div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: ORGANIC CONTENT KPI CARDS */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <FileText size={16} className="text-blue-500" /> Organic Content Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Posts</span>
                <span className="text-xl font-bold text-foreground block mt-1">{organic.totalPosts || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Reels</span>
                <span className="text-xl font-bold text-purple-600 block mt-1">{organic.totalReels || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Stories</span>
                <span className="text-xl font-bold text-amber-600 block mt-1">{organic.totalStories || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Total Published</span>
                <span className="text-xl font-bold text-emerald-600 block mt-1">{organic.totalContentPublished || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">This Month</span>
                <span className="text-xl font-bold text-foreground block mt-1">{organic.contentPublishedThisMonth || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Scheduled</span>
                <span className="text-xl font-bold text-sky-600 block mt-1">{organic.contentScheduled || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Draft / Pending</span>
                <span className="text-xl font-bold text-muted-foreground block mt-1">{organic.contentPending || 0}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: PAID ADS KPI CARDS */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Megaphone size={16} className="text-primary" /> Paid Ads & Budget Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Total Campaigns</span>
                <span className="text-xl font-bold text-foreground block mt-1">{paid.totalCampaigns || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Active Running</span>
                <span className="text-xl font-bold text-emerald-600 block mt-1">{paid.activeCampaigns || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Stopped / Paused</span>
                <span className="text-xl font-bold text-amber-600 block mt-1">{paid.stoppedCampaigns || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Completed</span>
                <span className="text-xl font-bold text-blue-600 block mt-1">{paid.completedCampaigns || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs col-span-2">
                <span className="text-[11px] font-medium text-muted-foreground block">Total Ad Spend</span>
                <span className="text-xl font-extrabold text-foreground block mt-1">₹{(paid.totalAdSpend || 0).toLocaleString()}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Daily Budget</span>
                <span className="text-xl font-bold text-foreground block mt-1">₹{(paid.dailyBudget || 0).toLocaleString()}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">Remaining Budget</span>
                <span className="text-xl font-bold text-emerald-600 block mt-1">₹{(paid.remainingBudget || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Live Ad Campaigns Status & Budget Balance Table */}
            {data?.recentCampaigns?.length > 0 && (
              <div className="mt-4 bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Ad Campaigns Running Status & Budget Breakdown
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {data.recentCampaigns.length} Campaigns Listed
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
                      <tr>
                        <th className="px-4 py-2.5">Ad Campaign Name</th>
                        <th className="px-4 py-2.5">Client & Project</th>
                        <th className="px-4 py-2.5">Platform</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Allocated Budget</th>
                        <th className="px-4 py-2.5">Budget Used</th>
                        <th className="px-4 py-2.5">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.recentCampaigns.map((ad) => {
                        const isExceeded = ad.remainingBalance < 0;
                        return (
                          <tr key={ad._id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground">{ad.name}</div>
                              {ad.sourceContentId?.name && (
                                <div className="text-[10px] text-muted-foreground">
                                  Linked: {ad.sourceContentId.name} ({ad.sourceContentId.contentType})
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{ad.client?.company || ad.client?.name || 'Client'}</div>
                              <div className="text-[10px] text-muted-foreground">{ad.project?.name || 'Project'}</div>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {ad.platform}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  ad.status === 'Running'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : ad.status === 'Paused'
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : ad.status === 'Completed'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-red-500/10 text-red-600'
                                }`}
                              >
                                {ad.status === 'Running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                {ad.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {ad.budgetType === 'Daily Budget'
                                ? `₹${(ad.dailyBudget || 0).toLocaleString()}/day`
                                : `₹${(ad.lifetimeBudget || 0).toLocaleString()} total`}
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">
                              ₹{(ad.amountSpent || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {isExceeded ? (
                                <span className="text-red-500">Exceeded by ₹{Math.abs(ad.remainingBalance).toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600">₹{(ad.remainingBalance || 0).toLocaleString()}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: LEADS & PERFORMANCE KPI CARDS */}
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Users size={16} className="text-emerald-500" /> Leads & Audience Reach
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Total Leads</span>
                <span className="text-2xl font-extrabold text-foreground block mt-1">{leads.totalLeads || 0}</span>
                <span className="text-[10px] text-muted-foreground mt-1 block">{leads.leadsToday || 0} today</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Qualified Leads</span>
                <span className="text-2xl font-extrabold text-blue-600 block mt-1">{leads.qualifiedLeads || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Converted Leads</span>
                <span className="text-2xl font-extrabold text-emerald-600 block mt-1">{leads.convertedLeads || 0}</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">{leads.conversionRate || 0}% Conv. Rate</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Cost Per Lead (CPL)</span>
                <span className="text-2xl font-extrabold text-amber-600 block mt-1">₹{leads.costPerLead || 0}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Total Reach</span>
                <span className="text-2xl font-extrabold text-foreground block mt-1">{(performance.totalReach || 0).toLocaleString()}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground block">Total Impressions</span>
                <span className="text-2xl font-extrabold text-foreground block mt-1">{(performance.totalImpressions || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: CHARTS & COMPARISON TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Platform Wise Distribution */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Platform-Wise Performance Breakdown
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts?.platformPerformance || []}>
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="posts" fill="#3b82f6" name="Posts" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reels" fill="#a855f7" name="Reels" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stories" fill="#f59e0b" name="Stories" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ads" fill="#10b981" name="Ads" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Content Distribution Pie */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Content Format Share (Posts vs Reels vs Stories)
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.charts?.postsVsReelsVsStories || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {(data?.charts?.postsVsReelsVsStories || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SECTION 5: CLIENT COMPARISON TABLE (When viewing Agency All Clients) */}
          {!filters.client && data?.charts?.clientComparisonTable?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Client Marketing Comparison Table
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Organic Content</th>
                      <th className="px-4 py-3">Ad Campaigns</th>
                      <th className="px-4 py-3">Ad Spend</th>
                      <th className="px-4 py-3">Leads</th>
                      <th className="px-4 py-3">Cost Per Lead (CPL)</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.charts.clientComparisonTable.map((cl) => (
                      <tr key={cl.clientId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground flex items-center gap-2">
                          <Building2 size={14} className="text-primary" />
                          <span>{cl.clientName}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-semibold">
                          {cl.contentCount} published
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-semibold">
                          {cl.adsCount} campaigns
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          ₹{cl.spend.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          {cl.leads}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-600">
                          ₹{cl.cpl}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                            {cl.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SMMDashboard;
