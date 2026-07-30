import React, { useEffect, useState } from 'react';
import {
  Users, Briefcase, PlayCircle, PauseCircle, CheckCircle2,
  Layers, FileText, DollarSign, Calendar, Target,
  ShoppingBag, TrendingUp, BarChart2, MousePointer,
  AlertCircle, RefreshCw, Plus, Palette, FileSpreadsheet, Users2
} from 'lucide-react';
import { smmApi } from '../../api/smm';
import { MetricCard, MetricGrid, PageHeader } from '../../components/ui/page';
import { ActivityFeed } from '../../components/smm/ActivityFeed';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SMMDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, charts: {}, recentActivity: [] });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await smmApi.getDashboardStats();
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = data.stats || {};

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Social Media Manager"
        subtitle="Manage all Meta, Google, LinkedIn & TikTok campaigns linked to website Clients & Projects"
        actions={
          <button
            onClick={loadDashboard}
            className="app-button-secondary gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Stats
          </button>
        }
      />

      {/* Top 9 Core SMM Module Navigation Bar */}
      <SMMSubNav />

      {/* Top Overview Cards */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Campaign Overview</h3>
        <MetricGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="CRM Clients" value={stats.totalClients || 0} icon={Users} />
          <MetricCard title="CRM Projects" value={stats.totalProjects || 0} icon={Briefcase} />
          <MetricCard title="Running Campaigns" value={stats.runningCampaigns || 0} icon={PlayCircle} />
          <MetricCard title="Paused Campaigns" value={stats.pausedCampaigns || 0} icon={PauseCircle} />
          <MetricCard title="Completed Campaigns" value={stats.completedCampaigns || 0} icon={CheckCircle2} />
          <MetricCard title="Running Ad Sets" value={stats.runningAdSets || 0} icon={Layers} />
        </MetricGrid>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Spend & Performance Overview</h3>
        <MetricGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Monthly Spend" value={`₹${(stats.monthlySpend || 0).toLocaleString()}`} icon={DollarSign} />
          <MetricCard title="Monthly Budget" value={`₹${(stats.monthlyBudget || 0).toLocaleString()}`} icon={Calendar} />
          <MetricCard title="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} icon={TrendingUp} />
          <MetricCard title="ROAS Return" value={`${stats.roas || 0}x`} icon={BarChart2} />
          <MetricCard title="Active Ads" value={stats.activeAds || 0} icon={FileText} />
          <MetricCard title="Pending Approvals" value={stats.pendingApprovals || 0} icon={AlertCircle} />
        </MetricGrid>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Conversions & Lead Costs</h3>
        <MetricGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          <MetricCard title="Total Leads" value={stats.totalLeads || 0} icon={Target} />
          <MetricCard title="Purchases" value={stats.totalPurchases || 0} icon={ShoppingBag} />
          <MetricCard title="Click Rate (CTR)" value={`${stats.ctr || 0}%`} icon={MousePointer} />
          <MetricCard title="Cost Per Click" value={`₹${stats.cpc || 0}`} icon={DollarSign} />
          <MetricCard title="CPM Cost" value={`₹${stats.cpm || 0}`} icon={BarChart2} />
          <MetricCard title="Cost Per Lead" value={`₹${stats.cpl || 0}`} icon={Target} />
          <MetricCard title="Total Clicks" value={stats.totalClicks || 0} icon={MousePointer} />
        </MetricGrid>
      </div>

      {/* SMM Core Workflow Quick Actions */}
      <div className="app-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">SMM Workflow Quick Access</h3>
          <p className="text-xs text-muted-foreground">Jump directly to campaigns, ad sets, ad copy, creatives, or reports</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          <Link to="/smm/campaigns" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <PlayCircle className="text-purple-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Campaigns</span>
            <span className="text-[10px] text-muted-foreground">Create & Track Campaigns</span>
          </Link>
          <Link to="/smm/adsets" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <Layers className="text-amber-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Ad Sets</span>
            <span className="text-[10px] text-muted-foreground">Targeting & Placements</span>
          </Link>
          <Link to="/smm/ads" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <FileText className="text-sky-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Ads & Copies</span>
            <span className="text-[10px] text-muted-foreground">Headlines, Copy & CTAs</span>
          </Link>
          <Link to="/smm/creatives" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <Palette className="text-pink-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Creative Library</span>
            <span className="text-[10px] text-muted-foreground">Images, Videos & Canva Links</span>
          </Link>
          <Link to="/smm/calendar" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <Calendar className="text-indigo-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Content Calendar</span>
            <span className="text-[10px] text-muted-foreground">Schedule Posts & Deadlines</span>
          </Link>
          <Link to="/smm/performance" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <BarChart2 className="text-teal-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Performance</span>
            <span className="text-[10px] text-muted-foreground">Live Metrics & ROAS</span>
          </Link>
          <Link to="/smm/reports" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <FileSpreadsheet className="text-orange-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Reports</span>
            <span className="text-[10px] text-muted-foreground">Export PDF / CSV</span>
          </Link>
          <Link to="/smm/team" className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-all flex flex-col items-center justify-center text-center group">
            <Users2 className="text-cyan-500 group-hover:scale-110 transition-transform mb-2" size={24} />
            <span className="text-xs font-bold text-foreground">Team & Workload</span>
            <span className="text-[10px] text-muted-foreground">Assign Workloads</span>
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="app-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Spend vs Revenue Growth</h3>
              <p className="text-xs text-muted-foreground">Campaign performance over time</p>
            </div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts?.campaignPerformance || [
                { _id: { month: 1 }, totalSpend: 15000, totalRevenue: 45000, totalLeads: 120 },
                { _id: { month: 2 }, totalSpend: 28000, totalRevenue: 92000, totalLeads: 240 },
                { _id: { month: 3 }, totalSpend: 45000, totalRevenue: 160000, totalLeads: 380 },
              ]}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="_id.month" tickFormatter={(m) => `Month ${m}`} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="totalSpend" name="Spend (₹)" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" />
                <Area type="monotone" dataKey="totalRevenue" name="Revenue (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-card p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Platform Performance</h3>
            <p className="text-xs text-muted-foreground">Campaign distribution by network</p>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={data.charts?.platformDistribution?.length ? data.charts.platformDistribution : [
                    { _id: 'Meta', count: 12 },
                    { _id: 'Google', count: 6 },
                    { _id: 'LinkedIn', count: 4 },
                    { _id: 'YouTube', count: 3 },
                  ]}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="app-card p-6">
        <h3 className="text-base font-bold text-foreground mb-4">Recent Activity Log</h3>
        <ActivityFeed activities={data.recentActivity} />
      </div>
    </div>
  );
}
