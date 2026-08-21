import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckSquare,
  Award,
  IndianRupee,
  ShieldCheck,
  Target,
  ClipboardList,
  Wallet,
  Send,
  Copy,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  Receipt,
  Megaphone,
  BookOpen,
  StickyNote,
  Plus,
  Activity,
  Zap,
  Sparkles,
  Video,
  ChevronRight,
  UserCheck,
  Building2,
  FolderKanban,
  Check,
  BarChart3,
  Flame,
  ArrowRight,
  Layers,
  CheckCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { getAssetUrl } from '../utils/assetUrl';
import { EODReportModal } from '../components/modals/EODReportModal';
import { EODDetailModal } from '../components/modals/EODDetailModal';
import { AddTaskModal } from '../components/modals/AddTaskModal';
import { AddProjectModal } from '../components/modals/AddProjectModal';
import { AddClientModal } from '../components/modals/AddClientModal';
import { useEodReports } from '../hooks/useEodReports';
import { AttendanceWidget } from '../components/attendance/AttendanceWidget';
import api from '../api';
import { formatINR } from '../utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useDateFilter } from '../context/DateFilterContext';
import { DateRangePicker } from '../components/ui/DateRangePicker';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { startDate, endDate, period, setFromDate, setToDate, setPeriod, resetDateFilter } = useDateFilter();
  const queryClient = useQueryClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'operations' | 'team'

  // Modals
  const [showEodModal, setShowEodModal] = useState(false);
  const [selectedEodRecord, setSelectedEodRecord] = useState(null);
  const [showEodDetailModal, setShowEodDetailModal] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);

  const [eodSearch, setEodSearch] = useState('');
  const [eodDays, setEodDays] = useState(7);
  const [showFinance, setShowFinance] = useState(true);

  const socket = useSocket();
  const isAdminOrManager = user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager';

  // Queries for manager and employee EOD views
  const { data: eodData } = useEodReports(eodDays, {}, { enabled: isAdminOrManager });
  const rawEodReports = eodData?.records || [];

  const { data: myEodData } = useEodReports(14, { mine: 'true' }, { enabled: user?.role === 'employee' });
  const myEodReports = myEodData?.records || data?.recentEodReports || [];

  // Filtered reports for manager
  const eodReports = rawEodReports.filter((report) => {
    if (!eodSearch.trim()) return true;
    const query = eodSearch.toLowerCase();
    const name = report.user?.name?.toLowerCase() || '';
    const dept = report.user?.department?.toLowerCase() || report.user?.position?.toLowerCase() || '';
    const summary = report.eodReport?.summary?.toLowerCase() || '';
    return name.includes(query) || dept.includes(query) || summary.includes(query);
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const endpoint = user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager'
        ? '/reports/admin'
        : user.role === 'client'
          ? '/reports/client'
          : user.role === 'referral'
            ? '/referrals'
            : '/reports/employee';

      const params = { period };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        params.period = 'custom';
      }

      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    fetchStats();
  }, [user?.role, period, startDate, endDate]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchStats();
      queryClient.invalidateQueries({ queryKey: ['eod-reports'] });
    };

    socket.on('userCreated', handleUpdate);
    socket.on('clientCreated', handleUpdate);
    socket.on('projectCreated', handleUpdate);
    socket.on('taskCreated', handleUpdate);
    socket.on('invoicePaid', handleUpdate);
    socket.on('expenseApproved', handleUpdate);
    socket.on('leadUpdated', handleUpdate);
    socket.on('eodSubmitted', handleUpdate);

    return () => {
      socket.off('userCreated', handleUpdate);
      socket.off('clientCreated', handleUpdate);
      socket.off('projectCreated', handleUpdate);
      socket.off('taskCreated', handleUpdate);
      socket.off('invoicePaid', handleUpdate);
      socket.off('expenseApproved', handleUpdate);
      socket.off('leadUpdated', handleUpdate);
      socket.off('eodSubmitted', handleUpdate);
    };
  }, [socket, queryClient]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!user || loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-card rounded-2xl border border-border"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA-DRIVEN NOTION-STYLE COMMAND CENTER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderAdminCommandCenter = () => {
    const stats = data.stats || {};
    const viz = data.visualizations || {};

    const revenueTrend = viz.revenueTrend || [];
    const revenueByClient = viz.revenueByClient || [];
    const projectHealth = viz.projectHealth || { onTrack: 0, atRisk: 0, delayed: 0, byStatus: {} };
    const taskDist = viz.taskDistribution || { 'To Do': 0, 'On Process': 0, 'Waiting for Client': 0, 'Review Required': 0, Completed: 0 };
    const clientHealth = viz.clientHealth || { healthy: 0, attention: 0, atRisk: 0, breakdown: {} };
    const teamWorkload = viz.teamWorkload || [];
    const contentPipeline = viz.contentPipeline || { ideas: 0, shoot: 0, editing: 0, review: 0, approval: 0, published: 0 };
    const salesFunnel = viz.salesFunnel || [];

    return (
      <div className="space-y-6">
        {/* Command Center Title Header */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Agency Command Center
                </span>
                <span className="text-xs text-muted-foreground">• {currentDateStr}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {getGreeting()}, {user.name} 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Real-time operational health, active revenue flow, project progress, and content velocity across RiseWithMedia.
              </p>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {user.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => setShowFinance((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    showFinance
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {showFinance ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{showFinance ? 'Financials Visible' : 'Financials Hidden'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Create Task</span>
              </button>

              <Link
                to="/calendar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-secondary text-foreground text-xs font-semibold transition-all"
              >
                <Calendar size={14} />
                <span>Content Calendar</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-6 pt-4 border-t border-border/60 overflow-x-auto custom-scrollbar">
            {[
              { id: 'command', label: 'Agency Command Center', icon: Activity },
              { id: 'operations', label: 'My Focus & Deliverables', icon: Target },
              { id: 'team', label: 'Team Workload & EOD', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB 1: FULL DATA-DRIVEN COMMAND CENTER ─────────────────────────── */}
        {activeTab === 'command' && (
          <div className="space-y-6">
            {/* 1. TOP 6 CORE METRIC CARDS (INTERACTIVE & CLICKABLE) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {/* Revenue */}
              <div
                onClick={() => navigate('/finance')}
                className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer shadow-sm group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
                  <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <IndianRupee size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {!showFinance ? '•••••' : formatINR(stats.grossAmount || 0)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <span>View ledger</span>
                  <ArrowRight size={10} />
                </div>
              </div>

              {/* Active Clients */}
              <div
                onClick={() => navigate('/clients')}
                className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer shadow-sm group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Clients</span>
                  <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Building2 size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats.activeClients || 0}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Client directory</span>
                  <ArrowRight size={10} />
                </div>
              </div>

              {/* Active Projects */}
              <div
                onClick={() => navigate('/projects')}
                className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer shadow-sm group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Projects</span>
                  <div className="h-7 w-7 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <FolderKanban size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats.activeProjects || 0}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Project board</span>
                  <ArrowRight size={10} />
                </div>
              </div>

              {/* Total Tasks */}
              <div
                onClick={() => navigate('/tasks')}
                className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer shadow-sm group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Tasks</span>
                  <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <CheckSquare size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats.totalTasks || 0}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Task pipeline</span>
                  <ArrowRight size={10} />
                </div>
              </div>

              {/* Overdue Tasks */}
              <div
                onClick={() => navigate('/tasks')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm group space-y-1.5 ${
                  stats.overdueTasks > 0
                    ? 'border-rose-500/40 bg-rose-500/[0.04] hover:bg-rose-500/10'
                    : 'border-border bg-card hover:bg-secondary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Overdue</span>
                  <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-600">
                  {stats.overdueTasks || 0}
                </div>
                <div className="flex items-center justify-between text-[10px] text-rose-600/80 group-hover:text-rose-600 transition-colors">
                  <span>Action required</span>
                  <ArrowRight size={10} />
                </div>
              </div>

              {/* Pending Approvals */}
              <div
                onClick={() => navigate('/manager-board')}
                className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer shadow-sm group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Approvals</span>
                  <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <ClipboardList size={14} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats.pendingApprovals || 0}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Review queue</span>
                  <ArrowRight size={10} />
                </div>
              </div>
            </div>

            {/* 2. REVENUE TREND VISUALIZER & REVENUE BY CLIENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Curve (Line / Area Chart) */}
              <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" />
                      Revenue Trend
                    </h3>
                    <p className="text-xs text-muted-foreground">Monthly collected revenue trajectory across past periods.</p>
                  </div>
                  <Link to="/finance" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    <span>Full Ledger</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="rgba(150,150,150,0.3)" />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'currentColor' }}
                        stroke="rgba(150,150,150,0.3)"
                        tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k'}`}
                      />
                      <RechartsTooltip
                        formatter={(value) => [showFinance ? formatINR(value) : '•••••', 'Revenue']}
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Revenue by Client */}
              <div className="lg:col-span-1 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-600" />
                    Revenue by Client
                  </h3>
                  <Link to="/clients" className="text-xs font-semibold text-primary hover:underline">
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {revenueByClient.length > 0 ? (
                    revenueByClient.map((client, idx) => (
                      <div
                        key={idx}
                        onClick={() => client.clientId ? navigate(`/clients/${client.clientId}`) : navigate('/clients')}
                        className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-secondary/40 transition-all cursor-pointer space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {client.name}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {!showFinance ? '•••••' : formatINR(client.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(Math.round((client.revenue / (revenueByClient[0]?.revenue || 1)) * 100), 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No paid invoices recorded for this period.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PROJECT HEALTH & TASK STATUS (SIDE BY SIDE INTERACTIVE PANELS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Project Health */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FolderKanban size={16} className="text-indigo-600" />
                    Project Health
                  </h3>
                  <Link to="/projects" className="text-xs font-semibold text-primary hover:underline">
                    Projects →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-emerald-500/[0.06] hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-foreground">On Track</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                      {projectHealth.onTrack}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-amber-500/[0.06] hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-foreground">At Risk</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                      {projectHealth.atRisk}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-rose-500/[0.06] hover:border-rose-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-foreground">Delayed</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-xs">
                      {projectHealth.delayed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Status Distribution */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CheckSquare size={16} className="text-blue-600" />
                    Task Status
                  </h3>
                  <Link to="/tasks" className="text-xs font-semibold text-primary hover:underline">
                    Tasks →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-secondary/50 transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">To Do</span>
                    <div className="text-lg font-black text-foreground mt-0.5">{taskDist['To Do'] || 0}</div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-blue-500/[0.06] transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase text-blue-600">On Process</span>
                    <div className="text-lg font-black text-blue-600 mt-0.5">{taskDist['On Process'] || 0}</div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-amber-500/[0.06] transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-600">Review</span>
                    <div className="text-lg font-black text-amber-600 mt-0.5">
                      {(taskDist['Review Required'] || 0) + (taskDist['Waiting for Client'] || 0)}
                    </div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-emerald-500/[0.06] transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Done</span>
                    <div className="text-lg font-black text-emerald-600 mt-0.5">{taskDist['Completed'] || 0}</div>
                  </div>
                </div>
              </div>

              {/* Client Health */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Client Health
                  </h3>
                  <Link to="/clients" className="text-xs font-semibold text-primary hover:underline">
                    Clients →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-emerald-500/[0.06] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-foreground">Healthy</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                      {clientHealth.healthy}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-amber-500/[0.06] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-foreground">Needs Attention</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                      {clientHealth.attention}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl border border-border/80 hover:bg-rose-500/[0.06] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-foreground">At Risk</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-xs">
                      {clientHealth.atRisk}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CONTENT PRODUCTION PIPELINE FLOW (NOTION-STYLE STAGE FLOW) */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers size={16} className="text-primary" />
                    Content Production Pipeline
                  </h3>
                  <p className="text-xs text-muted-foreground">Live lifecycle velocity from creative brief to final published post.</p>
                </div>
                <Link to="/calendar" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <span>Open Calendar</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              {/* Stage Flow Nodes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Ideas & Briefs', count: contentPipeline.ideas, link: '/tasks', icon: Sparkles, color: 'text-blue-500 bg-blue-500/10' },
                  { label: 'Shoots & Footage', count: contentPipeline.shoot, link: '/dm-calendar', icon: Video, color: 'text-amber-500 bg-amber-500/10' },
                  { label: 'Editing Pipeline', count: contentPipeline.editing, link: '/tasks', icon: Activity, color: 'text-purple-500 bg-purple-500/10' },
                  { label: 'Internal Review', count: contentPipeline.review, link: '/manager-board', icon: ClipboardList, color: 'text-indigo-500 bg-indigo-500/10' },
                  { label: 'Client Approval', count: contentPipeline.approval, link: '/tasks', icon: Clock, color: 'text-rose-500 bg-rose-500/10' },
                  { label: 'Published / Live', count: contentPipeline.published, link: '/calendar', icon: CheckCheck, color: 'text-emerald-500 bg-emerald-500/10' },
                ].map((stage, idx) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.label}
                      onClick={() => navigate(stage.link)}
                      className="p-3.5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/60 hover:border-primary/40 transition-all cursor-pointer space-y-2 group shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{stage.label}</span>
                        <div className={`h-6 w-6 rounded-lg ${stage.color} flex items-center justify-center`}>
                          <Icon size={13} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-foreground">{stage.count}</div>
                      <div className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>Open stage</span>
                        <ArrowRight size={10} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. TEAM WORKLOAD & SALES PIPELINE (TWO-COLUMN OPERATIONAL VIEW) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Workload */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    Team Workload & Capacity
                  </h3>
                  <Link to="/admin/users" className="text-xs font-semibold text-primary hover:underline">
                    Team Directory
                  </Link>
                </div>

                <div className="space-y-3.5">
                  {teamWorkload.length > 0 ? (
                    teamWorkload.map((member) => (
                      <div key={member.userId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {member.name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-bold text-foreground truncate">{member.name}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">({member.department || member.role})</span>
                          </div>
                          <span className="font-bold text-foreground text-xs">
                            {member.workloadPercent}% ({member.activeTasks} tasks)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              member.workloadPercent >= 90
                                ? 'bg-rose-500'
                                : member.workloadPercent >= 70
                                ? 'bg-amber-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${member.workloadPercent}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No active task allocations found.
                    </div>
                  )}
                </div>
              </div>

              {/* Sales & CRM Pipeline */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    Sales Pipeline Funnel
                  </h3>
                  <Link to="/crm/leads" className="text-xs font-semibold text-primary hover:underline">
                    CRM & Leads →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {salesFunnel.map((step) => (
                    <div
                      key={step.stage}
                      onClick={() => navigate('/crm/leads')}
                      className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer flex items-center justify-between group text-xs"
                    >
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {step.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary font-bold text-foreground text-xs">
                        {step.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: MY FOCUS & DELIVERABLES ──────────────────────────────────── */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AttendanceWidget />
              </div>

              <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" />
                    My Deliverables & Priority Tasks
                  </h2>
                  <Link to="/tasks" className="text-xs font-semibold text-primary hover:underline">
                    All Tasks →
                  </Link>
                </div>

                <div className="divide-y divide-border/60">
                  {(data.recentTasks || []).length > 0 ? (
                    data.recentTasks.slice(0, 6).map((task) => (
                      <div key={task._id} className="py-3 flex items-center justify-between gap-3 group">
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.title || task.taskTitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {task.clientName ? `🏢 ${task.clientName} • ` : ''}
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground capitalize">
                          {task.status?.replace(/_/g, ' ') || 'Todo'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No active tasks found in your priority queue.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: TEAM WORKLOAD & EOD ──────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
              <div>
                <h2 className="text-sm font-bold text-foreground">Team Daily Work Reports (EOD)</h2>
                <p className="text-xs text-muted-foreground">Daily progress logs submitted by your project and production team.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={eodSearch}
                    onChange={(e) => setEodSearch(e.target.value)}
                    placeholder="Search by name, summary..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-border text-xs bg-background w-48 sm:w-64"
                  />
                </div>
              </div>
            </div>

            {/* EOD Reports Grid */}
            {eodReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eodReports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => {
                      setSelectedEodRecord(report);
                      setShowEodDetailModal(true);
                    }}
                    className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer space-y-3 group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {report.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {report.user?.name || 'Team Member'}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {report.user?.department || report.user?.role || 'Employee'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                      {report.eodReport?.summary || 'No summary text.'}
                    </p>

                    {report.eodReport?.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                        {report.eodReport.tasksCompleted.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-foreground/80 font-medium">
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
                No team EOD reports found for the selected filter.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. EMPLOYEE DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  const renderEmployeeStats = () => {
    const assignedTasks = data.assignedTasks || [];
    const pendingTasks = assignedTasks.filter((t) => t.status !== 'completed' && t.status !== 'Approved');

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Employee Workspace</span>
            <h1 className="text-2xl font-black text-foreground mt-0.5">{getGreeting()}, {user.name} 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Here is your daily agenda, assigned deliverables, and attendance log.</p>
          </div>
          <button
            onClick={() => setShowEodModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm"
          >
            <CheckCircle2 size={15} />
            <span>Submit Daily EOD Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AttendanceWidget todayRecord={data?.todayAttendance} user={user} />
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">My Assigned Tasks ({pendingTasks.length})</h2>
              <Link to="/tasks" className="text-xs font-semibold text-primary hover:underline">View All Tasks →</Link>
            </div>

            <div className="divide-y divide-border/60">
              {pendingTasks.length > 0 ? (
                pendingTasks.slice(0, 6).map((task) => (
                  <div key={task._id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">{task.title || task.taskTitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {task.clientName ? `🏢 ${task.clientName} • ` : ''}
                        Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground capitalize">
                      {task.status?.replace(/_/g, ' ') || 'Todo'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  You are all caught up! No pending tasks assigned.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CLIENT PORTAL
  // ─────────────────────────────────────────────────────────────────────────────
  const renderClientStats = () => {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h1 className="text-2xl font-black text-foreground">{getGreeting()}, {user.name} 👋</h1>
          <p className="text-xs text-muted-foreground mt-1">Welcome to your RiseWithMedia Client Portal. Review projects, approve content, and view invoices.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/tasks" className="p-5 rounded-2xl border border-border bg-card hover:bg-secondary/40 transition-all">
            <CheckSquare className="text-primary mb-2" size={24} />
            <h3 className="font-bold text-sm">Tasks & Deliverables</h3>
            <p className="text-xs text-muted-foreground mt-1">Check active content and progress</p>
          </Link>
          <Link to="/calendar" className="p-5 rounded-2xl border border-border bg-card hover:bg-secondary/40 transition-all">
            <Calendar className="text-blue-500 mb-2" size={24} />
            <h3 className="font-bold text-sm">Content Calendar</h3>
            <p className="text-xs text-muted-foreground mt-1">View scheduled posts and shoots</p>
          </Link>
          <Link to="/finance" className="p-5 rounded-2xl border border-border bg-card hover:bg-secondary/40 transition-all">
            <Receipt className="text-emerald-500 mb-2" size={24} />
            <h3 className="font-bold text-sm">Invoices & Receipts</h3>
            <p className="text-xs text-muted-foreground mt-1">View billing status and receipts</p>
          </Link>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. REFERRAL PORTAL
  // ─────────────────────────────────────────────────────────────────────────────
  const renderReferralStats = () => {
    const referrals = data.referrals || [];
    const stats = [
      { label: 'Total Earnings', value: formatINR(data.totalEarnings || 0), icon: Wallet },
      { label: 'Pending Payouts', value: formatINR(data.pendingEarnings || 0), icon: IndianRupee },
      { label: 'Submitted Leads', value: referrals.length, icon: Users },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h1 className="text-2xl font-black text-foreground">Partner Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Track your referred leads, client wins, and commission payouts.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="p-5 rounded-2xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-semibold">{s.label}</span>
              <div className="text-2xl font-bold mt-1 text-foreground">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      {user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager'
        ? renderAdminCommandCenter()
        : user.role === 'client'
        ? renderClientStats()
        : user.role === 'referral'
        ? renderReferralStats()
        : renderEmployeeStats()}

      {/* Shared EOD Modals */}
      <EODReportModal
        open={showEodModal}
        onOpenChange={setShowEodModal}
        report={data?.todayAttendance?.eodReport}
      />
      <EODDetailModal
        open={showEodDetailModal}
        onOpenChange={setShowEodDetailModal}
        record={selectedEodRecord}
      />

      {/* Quick Action Modals */}
      {createTaskOpen && (
        <AddTaskModal
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
        />
      )}
      {createProjectOpen && (
        <AddProjectModal
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
        />
      )}
      {createClientOpen && (
        <AddClientModal
          open={createClientOpen}
          onOpenChange={setCreateClientOpen}
        />
      )}
    </div>
  );
};

export default Dashboard;
