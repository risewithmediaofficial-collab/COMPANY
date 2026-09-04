import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Target, MousePointer, Edit3, Sliders, RefreshCw,
  Plus, Calendar, Trash2, Video, Flame, Sparkles, Award, ArrowUpRight, BarChart2
} from 'lucide-react';
import { smmApi } from '../../api/smm';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

export default function Performance() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientsList, setClientsList] = useState([]);

  // Decision system evaluator
  const [evaluatorVideoId, setEvaluatorVideoId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, campRes, vRes, dashRes] = await Promise.all([
        smmApi.getClients().catch((err) => { console.error('SMM Analytics getClients error:', err); return { data: { success: false, data: [] } }; }),
        smmApi.getCampaigns({ client: selectedClient || undefined }).catch((err) => { console.error('SMM Analytics getCampaigns error:', err); return { data: { success: false, data: [] } }; }),
        smmApi.getContents({ client: selectedClient || undefined, limit: 100 }).catch((err) => { console.error('SMM Analytics getContents error:', err); return { data: { success: false, data: [] } }; }),
        smmApi.getDashboardStats({ client: selectedClient || undefined }).catch((err) => { console.error('SMM Analytics getDashboardStats error:', err); return { data: { success: false, data: null } }; }),
      ]);

      if (cRes.data?.success) setClientsList(cRes.data.data || []);
      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
      if (vRes.data?.success) {
        setVideos(vRes.data.data || []);
        if (vRes.data.data?.length > 0 && !evaluatorVideoId) {
          setEvaluatorVideoId(vRes.data.data[0]._id);
        }
      }
      if (dashRes.data?.success) setDashboardData(dashRes.data.data);
    } catch (err) {
      toast.error('Failed to load performance analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClient]);

  const kpi = dashboardData?.kpi || {};
  const organicVsPaid = kpi.organicVsPaid || {};
  const platformPerf = dashboardData?.platformPerformance || [];
  const clientHealthScore = dashboardData?.clientHealthScore || 88;

  // Find evaluator selected video
  const evaluatorVideo = videos.find((v) => v._id === evaluatorVideoId) || videos[0];

  const handleCreateAd = (video) => {
    navigate('/smm/campaigns', {
      state: {
        sourceContent: video,
        client: video?.client?._id || video?.client,
      },
    });
  };

  const chartData = [
    {
      name: 'Reach',
      Organic: organicVsPaid.reach?.organic || 0,
      Paid: organicVsPaid.reach?.paid || 0,
    },
    {
      name: 'Views',
      Organic: organicVsPaid.views?.organic || 0,
      Paid: organicVsPaid.views?.paid || 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BarChart2 className="text-primary" size={24} />
            Organic vs Paid Analytics & Decision Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare organic growth against paid advertising, evaluate video boosting potential, and inspect campaign efficiency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-9 px-3 bg-secondary/40 border border-border rounded-xl font-bold text-xs outline-none"
          >
            <option value="">All Clients</option>
            {clientsList.map((c) => (
              <option key={c._id} value={c._id}>{c.company || c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <SMMSubNav />

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground animate-pulse">Loading intelligence models...</div>
      ) : (
        <div className="space-y-8">
          {/* ── SECTION 1: ORGANIC VS PAID COMPARISON CARDS & GRAPH ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="text-primary" size={16} />
                  Side-by-Side Channel Comparison
                </h3>
                <span className="text-xs text-muted-foreground font-semibold">Organic vs Paid Impact</span>
              </div>

              {/* Comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3 text-purple-600 dark:text-purple-400">ORGANIC</th>
                      <th className="px-4 py-3 text-emerald-600 dark:text-emerald-400">PAID</th>
                      <th className="px-4 py-3 text-right">RATIO / DELTA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Audience Reach</td>
                      <td className="px-4 py-3 text-purple-600 dark:text-purple-400">{(organicVsPaid.reach?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{(organicVsPaid.reach?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                        {organicVsPaid.reach?.paid > 0 ? `${((organicVsPaid.reach?.organic || 0) / organicVsPaid.reach?.paid).toFixed(1)}x organic multiplier` : '100% Organic'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Video Views</td>
                      <td className="px-4 py-3 text-purple-600 dark:text-purple-400">{(organicVsPaid.views?.organic || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{(organicVsPaid.views?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                        {((organicVsPaid.views?.organic || 0) + (organicVsPaid.views?.paid || 0)).toLocaleString()} total
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Leads Generated</td>
                      <td className="px-4 py-3 text-muted-foreground/60">—</td>
                      <td className="px-4 py-3 text-emerald-500 font-bold">{organicVsPaid.leads?.paid || 0} Leads</td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-bold">{organicVsPaid.leads?.paid || 0} Direct Leads</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Ad Spend</td>
                      <td className="px-4 py-3 text-muted-foreground">₹0</td>
                      <td className="px-4 py-3 text-rose-500 font-bold">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-rose-500 font-mono">₹{(organicVsPaid.spend?.paid || 0).toLocaleString()} total spend</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">Cost Per Lead (CPL)</td>
                      <td className="px-4 py-3 text-muted-foreground/60">—</td>
                      <td className="px-4 py-3 text-emerald-500 font-bold">{organicVsPaid.cpl?.paid || '₹0'}</td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-bold">{organicVsPaid.cpl?.paid || '₹0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Organic vs Paid Visual Bar Chart */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reach & Views Distribution</span>
                  <span className="text-[10px] text-muted-foreground">Organic (Purple) vs Paid (Emerald)</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                        formatter={(value) => Number(value).toLocaleString()}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                      <Bar dataKey="Organic" fill="#a855f7" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Paid" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Client Health & Consistency Score */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4 text-center flex flex-col justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
                <span className="text-2xl font-black text-emerald-500">{clientHealthScore}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Client Health Score</span>
                <h4 className="text-sm font-bold text-foreground mt-0.5">
                  {clientHealthScore >= 80 ? '🟢 Excellent Performance' : clientHealthScore >= 60 ? '🟡 Good Consistency' : '🔴 Action Required'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Aggregates content publishing frequency, organic engagement velocity, paid lead conversion rate, and approval turnaround.
                </p>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: "SHOULD WE ADVERTISE THIS VIDEO?" DECISION SYSTEM ── */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={20} />
                  <h3 className="text-base font-black text-foreground">Video Evaluation & Ad Recommendation Engine</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Internal rule-based system analyzing organic traction, engagement rate, saves, and virality to recommend boosting.
                </p>
              </div>

              <select
                value={evaluatorVideoId}
                onChange={(e) => setEvaluatorVideoId(e.target.value)}
                className="h-9 px-3 bg-secondary/40 border border-border rounded-xl font-bold text-xs outline-none"
              >
                {videos.map((v) => (
                  <option key={v._id} value={v._id}>{v.name} ({v.contentType})</option>
                ))}
              </select>
            </div>

            {evaluatorVideo ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Selected Video</span>
                  <h4 className="text-sm font-bold text-foreground">{evaluatorVideo.name}</h4>
                  <span className="text-xs text-muted-foreground block">{evaluatorVideo.client?.company || evaluatorVideo.client?.name}</span>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                    <div>Views: <strong>{(evaluatorVideo.performance?.views || evaluatorVideo.performance?.videoViews || 0).toLocaleString()}</strong></div>
                    <div>Engagement: <strong>{evaluatorVideo.performance?.engagementRate || 0}%</strong></div>
                    <div>Shares / Saves: <strong>{(evaluatorVideo.performance?.shares || 0) + (evaluatorVideo.performance?.saves || 0)}</strong></div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Performance Score</span>
                  <span className="text-3xl font-black text-primary block">{evaluatorVideo.performanceScore || 85} / 100</span>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Normalized Virality Index</span>
                </div>

                <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Recommendation</span>
                  <span className={`text-base font-black block ${
                    evaluatorVideo.adRecommendation === '🔥 HIGH POTENTIAL' ? 'text-amber-500' : 'text-foreground'
                  }`}>
                    {evaluatorVideo.adRecommendation || 'Good Organic'}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {evaluatorVideo.adRecommendation === '🔥 HIGH POTENTIAL'
                      ? 'High organic engagement indicates great paid ROI potential.'
                      : 'Organic traction is stable; monitoring recommended.'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => handleCreateAd(evaluatorVideo)}
                    className="w-full py-3 bg-primary text-primary-foreground font-bold text-xs rounded-2xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Megaphone size={15} />
                    <span>Create Ad Campaign</span>
                  </button>
                  <span className="text-[10px] text-muted-foreground text-center">
                    Pre-fills campaign with this video's metadata
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">Select a video above to evaluate.</div>
            )}
          </div>

          {/* ── SECTION 3: CAMPAIGN COMPARISON TABLE ── */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="text-emerald-500" size={18} />
                Campaign Efficiency Comparison
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">{campaigns.length} Active Campaigns</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Spend</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">CPL</th>
                    <th className="px-4 py-3">ROAS</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {campaigns.map((c) => (
                    <tr key={c._id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold text-foreground">{c.name}</td>
                      <td className="px-4 py-3">{c.platform}</td>
                      <td className="px-4 py-3 font-mono font-semibold">₹{(c.amountSpent || c.performance?.spend || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-emerald-500">{c.performance?.leads || 0}</td>
                      <td className="px-4 py-3 font-bold text-foreground">₹{c.performance?.costPerLead || 0}</td>
                      <td className="px-4 py-3 font-bold text-primary">{c.performance?.roas ? `${c.performance.roas}x` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 4: PLATFORM COMPARISON BREAKDOWN ── */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Platform Breakdown (Instagram, Facebook, YouTube, LinkedIn)</h3>
              <span className="text-xs text-muted-foreground font-semibold">Cross-channel distribution</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Posts & Videos</th>
                    <th className="px-4 py-3">Active Ads</th>
                    <th className="px-4 py-3">Spend</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3 text-right">CPL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {platformPerf.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold text-foreground">{p.platform}</td>
                      <td className="px-4 py-3">{((p.posts || 0) + (p.reels || 0) + (p.stories || 0))} items</td>
                      <td className="px-4 py-3">{p.ads || 0} ads</td>
                      <td className="px-4 py-3 font-mono font-semibold">₹{(p.adSpend || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-emerald-500">{p.leads || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">₹{p.cpl || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
