import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  FileText, Video, CheckCircle2, Clock, Megaphone, PlayCircle,
  PauseCircle, IndianRupee, Users, TrendingUp, Share2,
  Eye, MousePointer, Activity, ArrowUpRight, AlertTriangle,
  Flame, Heart, Sparkles, CheckCircle, ShieldAlert, FileSpreadsheet, Plus
} from 'lucide-react';
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
        startDate: filters.startDate || startDate || undefined,
        endDate: filters.endDate || endDate || undefined,
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
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="text-primary" size={24} />
              {selectedClient ? `${selectedClient.company || selectedClient.name} Marketing OS` : 'Social Media + Ads Performance OS'}
            </h1>
            {selectedClient && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                Active Client
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Connected Content Production, Publishing, Ad Spend Ledger & Multi-Platform Intelligence
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Client Health Score Badge */}
          <div className="flex items-center gap-2.5 bg-card border border-border px-3.5 py-2 rounded-2xl shadow-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Client Health</span>
              <span className="text-sm font-black text-emerald-500">{clientHealthScore} / 100</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-500">
              🟢
            </div>
          </div>

          <button
            onClick={() => navigate('/smm/daily-tracking')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 font-semibold text-xs rounded-xl border border-border transition-all"
          >
            <Clock size={14} className="text-primary" />
            <span>Daily Report</span>
          </button>

          <button
            onClick={() => navigate('/smm/content')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus size={15} />
            <span>+ Add Video</span>
          </button>
        </div>
      </div>

      <SMMSubNav />
      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />

      {/* ── ALERTS SECTION (Budget Alerts & Spend Anomalies) ── */}
      {(budgetAlerts.length > 0 || spendAnomalies.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetAlerts.map((alert, idx) => (
            <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Budget Alert • {alert.percentSpent}% Spent</span>
                  <span className="text-[11px] font-semibold text-amber-500/80">₹{alert.amountSpent?.toLocaleString()} / ₹{alert.amountAdded?.toLocaleString()}</span>
                </div>
                <p className="text-xs font-medium text-foreground mt-0.5">
                  Campaign <strong>{alert.campaignName}</strong> ({alert.client}) has reached {alert.percentSpent}% of allocated budget.
                </p>
              </div>
            </div>
          ))}

          {spendAnomalies.map((anom, idx) => (
            <div key={idx} className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block">Daily Spend Anomaly Detected</span>
                <p className="text-xs font-medium text-foreground mt-0.5">
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
        <div className="space-y-8">
          {/* ── 3-COLUMN CORE OS SUMMARY ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: CONTENT DASHBOARD */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 font-bold">
                    <Video size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Content Pipeline</h3>
                    <span className="text-[11px] text-muted-foreground">Video Production Database</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/smm/content')}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View All <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Total Videos</span>
                  <span className="text-2xl font-black text-foreground block mt-0.5">{content.totalVideos || 0}</span>
                </div>
                <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Posted</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">{content.posted || 0}</span>
                </div>
                <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Not Posted</span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">{content.notPosted || 0}</span>
                </div>
                <div className="bg-sky-500/10 p-3.5 rounded-2xl border border-sky-500/20">
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 block">Scheduled</span>
                  <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block mt-0.5">{content.scheduled || 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Pending Client Approval</span>
                <span className="font-bold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                  {content.pendingApproval || 0} videos
                </span>
              </div>
            </div>

            {/* COLUMN 2: ORGANIC PERFORMANCE */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 font-bold">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Organic Reach</h3>
                    <span className="text-[11px] text-muted-foreground">Natural audience growth</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  +{organic.followersGained || 0} Followers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Organic Views</span>
                  <span className="text-2xl font-black text-foreground block mt-0.5">
                    {organic.views ? Number(organic.views).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-secondary/40 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Organic Reach</span>
                  <span className="text-2xl font-black text-foreground block mt-0.5">
                    {organic.reach ? Number(organic.reach).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-secondary/40 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Interactions</span>
                  <span className="text-2xl font-black text-foreground block mt-0.5">
                    {organic.engagement ? Number(organic.engagement).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="bg-secondary/40 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Engagement Rate</span>
                  <span className="text-2xl font-black text-indigo-500 block mt-0.5">{organic.engagementRate || 0}%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Published this month: <strong>{content.publishedThisMonth || 0}</strong></span>
                <span>Story Views: <strong>{organic.clicks || 0}</strong></span>
              </div>
            </div>

            {/* COLUMN 3: ADS & SPEND LEDGER */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Ads & Spend Ledger</h3>
                    <span className="text-[11px] text-muted-foreground">Amount Added vs Spent</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/smm/campaigns')}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Manage Ads <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-500/10 p-2.5 rounded-2xl border border-blue-500/20">
                  <span className="text-[10px] font-bold text-blue-500 block uppercase">Added</span>
                  <span className="text-base font-black text-foreground block mt-0.5">₹{(paid.amountAdded || 0).toLocaleString()}</span>
                </div>
                <div className="bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20">
                  <span className="text-[10px] font-bold text-rose-500 block uppercase">Spent</span>
                  <span className="text-base font-black text-foreground block mt-0.5">₹{(paid.amountSpent || 0).toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-500 block uppercase">Balance</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">₹{(paid.remainingBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 p-3 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Leads Generated</span>
                  <span className="text-2xl font-black text-foreground block mt-0.5">{paid.leads || 0}</span>
                </div>
                <div className="bg-secondary/40 p-3 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Cost Per Lead (CPL)</span>
                  <span className="text-2xl font-black text-emerald-500 block mt-0.5">₹{paid.costPerLead || 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Campaigns: <strong>{paid.activeCampaigns || 0}</strong></span>
                <span>Today's Spend: <strong>₹{(paid.todaysAdSpend || 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: TOP PERFORMING VIDEOS & APPROVAL AGING ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TOP PERFORMING VIDEOS LEADERBOARD (2 cols) */}
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="text-amber-500" size={18} />
                  <h3 className="text-sm font-bold text-foreground">Top Performing Videos & Ad Recommendations</h3>
                </div>
                <span className="text-xs text-muted-foreground font-medium">Ranked by Virality & Engagement</span>
              </div>

              <div className="space-y-3">
                {topVideos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No video records found yet.</div>
                ) : (
                  topVideos.map((video, idx) => (
                    <div key={video._id} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 hover:border-primary/40 transition-all flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-foreground">{video.name}</h4>
                            <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                              {video.contentType}
                            </span>
                            {video.adRecommendation === '🔥 HIGH POTENTIAL' && (
                              <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                🔥 HIGH POTENTIAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                            <span>👁 {(video.views || 0).toLocaleString()} Views</span>
                            <span>⚡ {video.engagementRate}% Engagement</span>
                            <span>🔄 {video.shares || 0} Shares</span>
                            <span>💾 {video.saves || 0} Saves</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Score</span>
                          <span className="text-sm font-black text-primary">{video.performanceScore || 85} / 100</span>
                        </div>

                        {video.usedAsAd ? (
                          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            Active Ad (₹{video.paidCpl || 0} CPL)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateAdFromVideo(video)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all"
                          >
                            <Megaphone size={12} />
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
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="text-rose-500" size={18} />
                  <h3 className="text-sm font-bold text-foreground">Approval Aging SLA</h3>
                </div>
                <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  {agingList.length} Bottlenecks
                </span>
              </div>

              <div className="space-y-2.5">
                {agingList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24} />
                    Zero approval bottlenecks! All client approvals are up to date.
                  </div>
                ) : (
                  agingList.map((item) => (
                    <div key={item.id} className="p-3 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground block">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground">{item.client}</span>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                          item.urgency === 'critical'
                            ? 'bg-rose-500 text-white animate-pulse'
                            : item.urgency === 'warning'
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.daysWaiting} days {item.urgency === 'critical' && '🔴'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 3: ORGANIC VS PAID COMPARISON & TODAY'S TIMELINE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ORGANIC VS PAID COMPARISON TABLE & METRICS */}
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="text-primary" size={18} />
                  Organic vs Paid Performance Comparison
                </h3>
                <button
                  onClick={() => navigate('/smm/performance')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  Full Analytics <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3 text-purple-600 dark:text-purple-400">Organic</th>
                      <th className="px-4 py-3 text-emerald-600 dark:text-emerald-400">Paid Ads</th>
                      <th className="px-4 py-3 text-right">Combined Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Reach</td>
                      <td className="px-4 py-3 font-bold">{(organicVsPaid.reach?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold">{(organicVsPaid.reach?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-foreground">
                        {((organicVsPaid.reach?.organic || 0) + (organicVsPaid.reach?.paid || 0)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Views</td>
                      <td className="px-4 py-3 font-bold">{(organicVsPaid.views?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold">{(organicVsPaid.views?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-foreground">
                        {((organicVsPaid.views?.organic || 0) + (organicVsPaid.views?.paid || 0)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Leads Generated</td>
                      <td className="px-4 py-3 text-muted-foreground/60">—</td>
                      <td className="px-4 py-3 font-bold text-emerald-500">{organicVsPaid.leads?.paid || 0} Leads</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-500">{organicVsPaid.leads?.paid || 0}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Ad Spend</td>
                      <td className="px-4 py-3 font-bold text-muted-foreground">₹0</td>
                      <td className="px-4 py-3 font-bold text-rose-500">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-black text-foreground">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Cost Per Lead (CPL)</td>
                      <td className="px-4 py-3 text-muted-foreground/60">—</td>
                      <td className="px-4 py-3 font-bold text-emerald-500">{organicVsPaid.cpl?.paid || '₹0'}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-500">{organicVsPaid.cpl?.paid || '₹0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TODAY'S AGENCY ACTIVITY TIMELINE */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="text-primary" size={18} />
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
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{act.action}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{act.entityName || act.entity}</p>
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
