import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  FileText, Video, CheckCircle2, Clock, Megaphone, PlayCircle,
  PauseCircle, IndianRupee, Users, TrendingUp, Share2,
  Eye, MousePointer, Activity, ArrowUpRight, AlertTriangle,
  Flame, Heart, Sparkles, CheckCircle, ShieldAlert, FileSpreadsheet, Plus,
  Zap, RefreshCw, Bookmark
} from '@/components/ui/muiIcons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

export const SMMDashboard = () => {
  const navigate = useNavigate();
  const { startDate, endDate } = useDateFilter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    platform: '',
    contentType: '',
    campaignStatus: '',
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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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
  }, [filters, startDate, endDate]);

  const handleFilterChange = (keyOrObj, val) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      setFilters((prev) => ({ ...prev, ...keyOrObj }));
    } else {
      setFilters((prev) => ({ ...prev, [keyOrObj]: val }));
    }
  };

  const handleResetFilters = () => {
    setFilters({
      client: '',
      project: '',
      platform: '',
      contentType: '',
      campaignStatus: '',
    });
  };

  const kpi = data?.kpi || {};
  const content = kpi.content || {};
  const organic = kpi.organic || {};
  const paid = kpi.paid || {};
  const organicVsPaid = kpi.organicVsPaid || {};
  const selectedClient = data?.selectedClient;
  const clientHealthScore = data?.clientHealthScore || 88;
  const topVideos = data?.topPerformingVideos || [];
  const budgetAlerts = paid.budgetAlerts || [];
  const spendAnomalies = paid.spendAnomalies || [];
  const agingList = content.pendingApprovalAging || [];
  const recentActivity = data?.recentActivity || [];

  const handleCreateAdFromVideo = (video) => {
    navigate('/smm/campaigns', {
      state: {
        sourceContent: video,
        client: video.client?._id || filters.client,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 min-w-0">
            <Sparkles className="text-foreground shrink-0" size={22} />
            <span className="truncate max-w-[280px] sm:max-w-none">
              {selectedClient ? `${selectedClient.company || selectedClient.name} Marketing` : 'Social Media & Ads'}
            </span>
          </h1>
          {selectedClient && (
            <span className="bg-secondary text-foreground text-xs font-semibold px-3 py-1 rounded-full shrink-0">
              Active Client
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="h-10 flex items-center gap-2 bg-card px-3.5 rounded-xl">
            <Activity size={14} className="text-foreground shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Health:</span>
            <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">{clientHealthScore}/100</span>
          </div>

          <button
            onClick={() => navigate('/smm/daily-tracking')}
            className="h-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 bg-card text-foreground hover:bg-secondary font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Clock size={14} className="text-foreground shrink-0" />
            <span>Daily Report</span>
          </button>

          <button
            onClick={() => navigate('/smm/content')}
            className="h-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span>Add Video</span>
          </button>
        </div>
      </div>

      <SMMSubNav />
      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />

      {/* ── ALERTS SECTION (Budget Alerts & Spend Anomalies) ── */}
      {(budgetAlerts.length > 0 || spendAnomalies.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetAlerts.map((alert, idx) => (
            <div key={idx} className="bg-card rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider tabular-nums">
                    Budget Alert · {alert.percentSpent}% Spent
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                    ₹{alert.amountSpent?.toLocaleString()} / ₹{alert.amountAdded?.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  Campaign <strong className="text-foreground">{alert.campaignName}</strong> ({alert.client}) has reached {alert.percentSpent}% of allocated budget.
                </p>
              </div>
            </div>
          ))}

          {spendAnomalies.map((anom, idx) => (
            <div key={idx} className="bg-card rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Daily Spend Anomaly Detected</span>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {anom.anomalyReason || `Unusual spike in daily ad spend recorded on ${new Date(anom.date).toLocaleDateString()}.`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground animate-pulse">
          Loading Unified Marketing OS data...
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* ── 3-COLUMN CORE OS SUMMARY ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* COLUMN 1: CONTENT DASHBOARD */}
            <div className="bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
                    <Video size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Content Pipeline</h3>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/smm/content')}
                  className="text-[11px] font-semibold text-foreground hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Total Videos</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{content.totalVideos || 0}</span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Posted</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{content.posted || 0}</span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Not Posted</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{content.notPosted || 0}</span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Scheduled</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{content.scheduled || 0}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground">Pending Client Approval</span>
                <span className="font-semibold text-foreground bg-background px-2.5 py-0.5 rounded-full tabular-nums">
                  {content.pendingApproval || 0} videos
                </span>
              </div>
            </div>

            {/* COLUMN 2: ORGANIC PERFORMANCE */}
            <div className="bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Organic Reach</h3>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-foreground bg-background px-2.5 py-0.5 rounded-full shrink-0 tabular-nums">
                  +{organic.followersGained || 0} Followers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Organic Views</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">
                    {organic.views ? Number(organic.views).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Organic Reach</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">
                    {organic.reach ? Number(organic.reach).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Interactions</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">
                    {organic.engagement ? Number(organic.engagement).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Engagement Rate</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{organic.engagementRate || 0}%</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground gap-2">
                <span>Published this month: <strong className="text-foreground tabular-nums">{content.publishedThisMonth || 0}</strong></span>
                <span>Story Views: <strong className="text-foreground tabular-nums">{organic.clicks || 0}</strong></span>
              </div>
            </div>

            {/* COLUMN 3: ADS & SPEND LEDGER */}
            <div className="bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
                    <Megaphone size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Ads &amp; Spend Ledger</h3>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/smm/campaigns')}
                  className="text-[11px] font-semibold text-foreground hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Manage Ads</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Added</span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block mt-0.5 truncate tabular-nums">₹{(paid.amountAdded || 0).toLocaleString()}</span>
                </div>
                <div className="bg-background p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Spent</span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block mt-0.5 truncate tabular-nums">₹{(paid.amountSpent || 0).toLocaleString()}</span>
                </div>
                <div className="bg-background p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Balance</span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block mt-0.5 truncate tabular-nums">₹{(paid.remainingBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Leads Generated</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">{paid.leads || 0}</span>
                </div>
                <div className="bg-background p-3.5 rounded-xl">
                  <span className="text-[11px] font-medium text-muted-foreground block">Cost Per Lead (CPL)</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground block mt-1 tabular-nums">₹{paid.costPerLead || 0}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground gap-2">
                <span>Active Campaigns: <strong className="text-foreground tabular-nums">{paid.activeCampaigns || 0}</strong></span>
                <span>Today&apos;s Spend: <strong className="text-foreground tabular-nums">₹{(paid.todaysAdSpend || 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: TOP PERFORMING VIDEOS & APPROVAL AGING ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* TOP PERFORMING VIDEOS LEADERBOARD (2 cols) */}
            <div className="lg:col-span-2 bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Flame className="text-foreground shrink-0" size={18} />
                  <h3 className="text-sm font-bold text-foreground">Top Performing Videos</h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {topVideos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No video records found yet.</div>
                ) : (
                  topVideos.map((video, idx) => (
                    <div key={video._id} className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-secondary text-foreground font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 tabular-nums">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h4 className="text-xs font-bold text-foreground truncate">{video.name}</h4>
                            <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-secondary">
                              {video.contentType}
                            </span>
                            {video.adRecommendation === '🔥 HIGH POTENTIAL' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                                <Flame size={10} className="shrink-0" />
                                High Potential
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Eye size={12} className="shrink-0" />
                              {(video.views || 0).toLocaleString()} Views
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Zap size={12} className="shrink-0" />
                              {video.engagementRate}% Engagement
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <RefreshCw size={12} className="shrink-0" />
                              {video.shares || 0} Shares
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Bookmark size={12} className="shrink-0" />
                              {video.saves || 0} Saves
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Score</span>
                          <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">{video.performanceScore || 85} / 100</span>
                        </div>

                        {video.usedAsAd ? (
                          <span className="text-[11px] font-semibold text-foreground bg-secondary px-3 py-1.5 rounded-xl tabular-nums shrink-0">
                            Active Ad (₹{video.paidCpl || 0} CPL)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateAdFromVideo(video)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
                          >
                            <Megaphone size={12} className="shrink-0" />
                            <span>Create Ad</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CONTENT APPROVAL AGING BOTTLENECK (1 col) */}
            <div className="bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-foreground shrink-0" size={18} />
                  <h3 className="text-sm font-bold text-foreground">Approval Aging SLA</h3>
                </div>
                <span className="text-xs font-semibold text-foreground bg-background px-2.5 py-0.5 rounded-full tabular-nums">
                  {agingList.length} Bottlenecks
                </span>
              </div>

              <div className="space-y-2.5">
                {agingList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <CheckCircle className="mx-auto text-foreground mb-2" size={24} />
                    Zero approval bottlenecks. All client approvals are up to date.
                  </div>
                ) : (
                  agingList.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-background flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate block">{item.client}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums ${
                          item.urgency === 'critical'
                            ? 'bg-primary text-primary-foreground'
                            : item.urgency === 'warning'
                            ? 'bg-secondary text-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.daysWaiting} days
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 3: ORGANIC VS PAID COMPARISON & TODAY'S TIMELINE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* ORGANIC VS PAID COMPARISON TABLE & METRICS */}
            <div className="lg:col-span-2 bg-card rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="text-foreground shrink-0" size={18} />
                  <span>Organic vs Paid Performance Comparison</span>
                </h3>
                <button
                  onClick={() => navigate('/smm/analytics')}
                  className="text-xs text-foreground font-semibold hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Full Analytics</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="responsive-table-container overflow-x-auto [touch-action:pan-x] [-webkit-overflow-scrolling:touch]">
                <table className="min-w-[480px] w-full text-left text-xs border-collapse">
                  <thead className="bg-secondary/70 text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Metric</th>
                      <th className="px-4 py-3 text-right text-foreground">Organic</th>
                      <th className="px-4 py-3 text-right text-foreground">Paid Ads</th>
                      <th className="px-4 py-3 text-right text-foreground rounded-r-lg">Combined Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.05] font-medium tabular-nums">
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Reach</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{(organicVsPaid.reach?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{(organicVsPaid.reach?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {((organicVsPaid.reach?.organic || 0) + (organicVsPaid.reach?.paid || 0)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Views</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{(organicVsPaid.views?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{(organicVsPaid.views?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {((organicVsPaid.views?.organic || 0) + (organicVsPaid.views?.paid || 0)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Leads Generated</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{organicVsPaid.leads?.paid || 0} Leads</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{organicVsPaid.leads?.paid || 0}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Ad Spend</td>
                      <td className="px-4 py-3 text-right font-semibold text-muted-foreground">₹0</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Cost Per Lead (CPL)</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{organicVsPaid.cpl?.paid || '₹0'}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{organicVsPaid.cpl?.paid || '₹0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TODAY'S AGENCY ACTIVITY TIMELINE */}
            <div className="bg-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-foreground shrink-0" size={18} />
                  <h3 className="text-sm font-bold text-foreground">Activity Timeline</h3>
                </div>
                <span className="text-xs text-muted-foreground">Real-time log</span>
              </div>

              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No recent agency activity recorded.</div>
                ) : (
                  recentActivity.slice(0, 6).map((act) => (
                    <div key={act._id} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-foreground mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">{act.action}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{act.entityName || act.entity}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMMDashboard;
