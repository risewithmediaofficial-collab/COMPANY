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
  Plus,
  Activity,
  Zap,
  Sparkles,
  Video,
  ChevronRight,
  UserCheck,
  Building2,
  FolderKanban,
  FolderOpen,
  Check,
  BarChart3,
  Flame,
  ArrowRight,
  Layers,
  CheckCheck,
  RefreshCw,
  SlidersHorizontal,
  Radio,
  AlertTriangle,
} from '@/components/ui/muiIcons';
import { getPersonColor, PersonAssigneeBadge } from '../utils/personColors';
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
import { KanbanCreateTaskModal } from '../components/tasks/KanbanCreateTaskModal';
import { AddProjectModal } from '../components/modals/AddProjectModal';
import { AddClientModal } from '../components/modals/AddClientModal';
import { useEodReports } from '../hooks/useEodReports';
import { AttendanceWidget } from '../components/attendance/AttendanceWidget';
import { WeeklyTodosWidget } from '../components/todos/WeeklyTodosWidget';
import { SelectDropdown } from '../components/ui/SelectDropdown';
import api from '../api';
import { formatINR } from '../utils/currency';
import { useSocket } from '../context/SocketContext';
import { useDateFilter } from '../context/DateFilterContext';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { startDate, endDate, period, isDateInRange } = useDateFilter();
  const queryClient = useQueryClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'todos' | 'metrics' | 'team'

  // Modals
  const [showEodModal, setShowEodModal] = useState(false);
  const [selectedEodRecord, setSelectedEodRecord] = useState(null);
  const [showEodDetailModal, setShowEodDetailModal] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);

  const [eodSearch, setEodSearch] = useState('');
  const [showFinance, setShowFinance] = useState(false);
  const [userMetricSearch, setUserMetricSearch] = useState('');
  const [userMetricRoleFilter, setUserMetricRoleFilter] = useState('all');

  const socket = useSocket();
  const isAdminOrManager = ['superAdmin', 'admin', 'organizationOwner', 'manager'].includes(user?.role);

  // Queries for manager and employee EOD views
  const { data: eodData } = useEodReports(
    (startDate || endDate) ? 'all' : 7,
    { startDate: startDate || undefined, endDate: endDate || undefined },
    { enabled: isAdminOrManager }
  );
  const rawEodReports = eodData?.records || [];

  const { data: myEodData } = useEodReports(
    (startDate || endDate) ? 'all' : 14,
    { mine: 'true', startDate: startDate || undefined, endDate: endDate || undefined },
    { enabled: user?.role === 'employee' }
  );
  const myEodReports = (myEodData?.records || data?.recentEodReports || []).filter((r) => isDateInRange(r.date));

  // Filtered reports for manager
  const eodReports = rawEodReports.filter((report) => {
    if (!isDateInRange(report.date)) return false;
    if (!eodSearch.trim()) return true;
    const query = eodSearch.toLowerCase();
    const name = report.user?.name?.toLowerCase() || '';
    const dept = report.user?.department?.toLowerCase() || report.user?.position?.toLowerCase() || '';
    const summary = report.eodReport?.summary?.toLowerCase() || '';
    return name.includes(query) || dept.includes(query) || summary.includes(query);
  });

  const fetchStats = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setIsRefreshing(true);
    try {
      const endpoint = ['superAdmin', 'admin', 'organizationOwner', 'manager'].includes(user.role)
        ? '/reports/admin'
        : user.role === 'client'
          ? '/reports/client'
          : user.role === 'referral'
            ? '/referrals'
            : '/reports/employee';

      const params = { period: period || 'this_month' };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get(endpoint, { params });
      setData(res.data);
      setLastSynced(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (showLoader) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    fetchStats(true);
  }, [user?.role, period, startDate, endDate]);

  // Controlled background fallback polling (3 minutes) - real-time updates are pushed instantaneously via WebSocket
  useEffect(() => {
    if (!user?.role) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(false);
      }
    }, 180000);
    return () => clearInterval(interval);
  }, [user?.role, period, startDate, endDate]);

  // Live Real-Time Socket Event Listeners for All Users (with 800ms debounce to prevent burst-flooding)
  useEffect(() => {
    let debounceTimer = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchStats(false);
        queryClient.invalidateQueries({ queryKey: ['eod-reports'] });
      }, 800);
    };

    const liveEvents = [
      'userCreated', 'userUpdated',
      'clientCreated', 'clientUpdated',
      'projectCreated', 'projectUpdated', 'projectDeleted',
      'taskCreated', 'taskUpdated', 'taskDeleted', 'taskStatusUpdated', 'taskMoved',
      'invoicePaid', 'expenseApproved', 'leadUpdated', 'financeUpdated',
      'eodSubmitted', 'attendanceUpdated', 'deliverableTargetUpdated',
      'activityLogged', 'metricsUpdated', 'crmLiveUpdate',
      'contentProductionUpdated',
    ];

    if (socket) {
      liveEvents.forEach((evt) => socket.on(evt, handleUpdate));
    }

    const handleLocalAttendance = () => {
      fetchStats(false);
    };
    window.addEventListener('attendanceStatusChanged', handleLocalAttendance);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (socket) {
        liveEvents.forEach((evt) => socket.off(evt, handleUpdate));
      }
      window.removeEventListener('attendanceStatusChanged', handleLocalAttendance);
    };
  }, [socket, queryClient, period, startDate, endDate]);

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
        <div className="h-28 bg-card rounded-2xl"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 1. DATA-DRIVEN NOTION-STYLE COMMAND CENTER
  // -------------------------------------------------------------------------
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
        <div className="bg-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}, {user.name}
              </h1>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {user.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => setShowFinance((v) => !v)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[38px] transition-colors cursor-pointer ${
                    showFinance
                      ? 'bg-secondary text-foreground hover:bg-secondary/80'
                      : 'bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {showFinance ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showFinance ? 'Hide Revenue' : 'Unhide Revenue'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors min-h-[38px] cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Task</span>
              </button>

              <Link
                to="/calendar"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-background hover:bg-secondary text-foreground text-xs font-semibold transition-colors min-h-[38px]"
              >
                <Calendar size={14} />
                <span>Content Calendar</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation & Live Sync Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-1">
            <div className="flex items-center gap-1 rounded-xl bg-secondary/75 p-1 overflow-x-auto custom-scrollbar">
              {[
                { id: 'command', label: 'Command Center', icon: Activity },
                { id: 'todos', label: 'Weekly Todos', icon: CheckSquare },
                { id: 'metrics', label: 'All Metrics & Analytics', icon: BarChart3 },
                { id: 'team', label: 'Team Workload & EOD', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-[0_3px_10px_-3px_hsl(var(--brand)/0.45)]'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/12 text-primary text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                <span>Live Real-Time Sync</span>
              </span>
              <button
                type="button"
                onClick={() => fetchStats(false)}
                title={`Last synced: ${lastSynced.toLocaleTimeString()}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-foreground' : ''} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>

        {/* - TAB 1: FULL DATA-DRIVEN COMMAND CENTER - */}
        {activeTab === 'command' && (
          <div className="space-y-6">
            {/* 1. TOP 5 CORE METRIC CARDS (INTERACTIVE & CLICKABLE) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Active Clients */}
              <div
                onClick={() => navigate('/clients')}
                className="p-5 rounded-2xl bg-card hover:bg-secondary/75 transition-colors cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Clients</span>
                  <div className="h-8 w-8 rounded-xl bg-background text-foreground flex items-center justify-center shrink-0">
                    <Building2 size={15} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {stats.activeClients || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                  <span>Client directory</span>
                  <ArrowRight size={11} />
                </div>
              </div>

              {/* Active Projects */}
              <div
                onClick={() => navigate('/projects')}
                className="p-5 rounded-2xl bg-card hover:bg-secondary/75 transition-colors cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live Projects</span>
                  <div className="h-8 w-8 rounded-xl bg-background text-foreground flex items-center justify-center shrink-0">
                    <FolderKanban size={15} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {stats.activeProjects || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                  <span>Project board</span>
                  <ArrowRight size={11} />
                </div>
              </div>

              {/* Total Tasks */}
              <div
                onClick={() => navigate('/tasks')}
                className="p-5 rounded-2xl bg-card hover:bg-secondary/75 transition-colors cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Tasks</span>
                  <div className="h-8 w-8 rounded-xl bg-background text-foreground flex items-center justify-center shrink-0">
                    <CheckSquare size={15} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {stats.totalTasks || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                  <span>Task pipeline</span>
                  <ArrowRight size={11} />
                </div>
              </div>

              {/* Overdue Tasks */}
              <div
                onClick={() => navigate('/tasks')}
                className={`p-5 rounded-2xl transition-colors cursor-pointer group space-y-2 ${
                  stats.overdueTasks > 0
                    ? 'bg-secondary hover:bg-secondary/80 ring-1 ring-brand/35'
                    : 'bg-card hover:bg-secondary/75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</span>
                  <div className="h-8 w-8 rounded-xl bg-background text-foreground flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {stats.overdueTasks || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                  <span>Action required</span>
                  <ArrowRight size={11} />
                </div>
              </div>

              {/* Pending Approvals */}
              <div
                onClick={() => navigate('/tasks')}
                className="p-5 rounded-2xl bg-card hover:bg-secondary/75 transition-colors cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Approvals</span>
                  <div className="h-8 w-8 rounded-xl bg-background text-foreground flex items-center justify-center shrink-0">
                    <ClipboardList size={15} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {stats.pendingApprovals || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">
                  <span>Review queue</span>
                  <ArrowRight size={11} />
                </div>
              </div>
            </div>

            {/* 2. REVENUE TREND VISUALIZER & REVENUE BY CLIENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Curve (Line / Area Chart) */}
              <div className="lg:col-span-2 bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary shrink-0" />
                      <span>Revenue Trend</span>
                    </h3>
                  </div>
                  <Link to="/finance" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    <span>Full Ledger</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="h-64 w-full">
                  {revenueTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rwmRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#12B7D4" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#12B7D4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.06)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => {
                            if (v === 0) return '₹0';
                            if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                            if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                            return `₹${v}`;
                          }}
                        />
                        <RechartsTooltip
                          formatter={(value) => [showFinance ? formatINR(value) : '*****', 'Revenue']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: 'none',
                            color: 'hsl(var(--foreground))',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#12B7D4" strokeWidth={2.5} fill="url(#rwmRevenueFill)" dot={{ fill: '#12B7D4', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#12B7D4' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No revenue data recorded yet for this period
                    </div>
                  )}
                </div>
              </div>

              {/* Top Revenue by Client */}
              <div className="lg:col-span-1 bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 size={16} className="text-primary shrink-0" />
                    <span>Revenue by Client</span>
                  </h3>
                  <Link to="/clients" className="text-xs font-semibold text-primary hover:underline">
                    View All
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {revenueByClient.length > 0 ? (
                    revenueByClient.map((client, idx) => (
                      <div
                        key={idx}
                        onClick={() => client.clientId ? navigate(`/clients/${client.clientId}`) : navigate('/clients')}
                        className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-foreground truncate min-w-0">
                            {client.name}
                          </span>
                          <span className="font-bold text-foreground tabular-nums shrink-0">
                            {!showFinance ? '*****' : formatINR(client.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
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
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FolderKanban size={16} className="text-primary shrink-0" />
                    <span>Project Health</span>
                  </h3>
                  <Link to="/projects" className="text-xs font-semibold text-primary hover:underline">
                    Projects →
                  </Link>
                </div>

                <div className="space-y-2">
                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                      <span className="text-xs font-semibold text-foreground">On Track</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {projectHealth.onTrack}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">At Risk</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {projectHealth.atRisk}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/projects')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                      <span className="text-xs font-semibold text-foreground">Delayed</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {projectHealth.delayed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Status Distribution */}
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CheckSquare size={16} className="text-foreground shrink-0" />
                    <span>Task Status</span>
                  </h3>
                  <Link to="/tasks" className="text-xs font-semibold text-foreground hover:underline">
                    Tasks →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">To Do</span>
                    <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{taskDist['To Do'] || 0}</div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On Process</span>
                    <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{taskDist['On Process'] || 0}</div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Review</span>
                    <div className="text-xl font-bold text-foreground mt-1 tabular-nums">
                      {(taskDist['Review Required'] || 0) + (taskDist['Waiting for Client'] || 0)}
                    </div>
                  </div>
                  <div
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Done</span>
                    <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{taskDist['Completed'] || 0}</div>
                  </div>
                </div>
              </div>

              {/* Client Health */}
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck size={16} className="text-foreground shrink-0" />
                    <span>Client Health</span>
                  </h3>
                  <Link to="/clients" className="text-xs font-semibold text-foreground hover:underline">
                    Clients →
                  </Link>
                </div>

                <div className="space-y-2">
                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
                      <span className="text-xs font-semibold text-foreground">Healthy</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {clientHealth.healthy}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Needs Attention</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {clientHealth.attention}
                    </span>
                  </div>

                  <div
                    onClick={() => navigate('/clients')}
                    className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                      <span className="text-xs font-semibold text-foreground">At Risk</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                      {clientHealth.atRisk}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CONTENT PRODUCTION PIPELINE FLOW (MONOCHROME STAGE FLOW) */}
            <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers size={16} className="text-foreground shrink-0" />
                    <span>Content Production Pipeline</span>
                  </h3>
                </div>
                <Link to="/calendar" className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1">
                  <span>Open Calendar</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              {/* Stage Flow Nodes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Ideas & Briefs', count: contentPipeline.ideas, link: '/tasks', icon: Sparkles },
                  { label: 'Shoots & Footage', count: contentPipeline.shoot, link: '/tasks', icon: Video },
                  { label: 'Editing Pipeline', count: contentPipeline.editing, link: '/tasks', icon: Activity },
                  { label: 'Internal Review', count: contentPipeline.review, link: '/tasks', icon: ClipboardList },
                  { label: 'Client Approval', count: contentPipeline.approval, link: '/tasks', icon: Clock },
                  { label: 'Published / Live', count: contentPipeline.published, link: '/calendar', icon: CheckCheck },
                ].map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.label}
                      onClick={() => navigate(stage.link)}
                      className="p-4 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stage.label}</span>
                        <div className="h-6 w-6 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                          <Icon size={13} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold tracking-tight tabular-nums leading-none text-foreground">{stage.count}</div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
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
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users size={16} className="text-foreground shrink-0" />
                    <span>Team Workload &amp; Capacity</span>
                  </h3>
                  <Link to="/admin/users" className="text-xs font-semibold text-foreground hover:underline">
                    Team Directory
                  </Link>
                </div>

                <div className="space-y-3.5">
                  {teamWorkload.length > 0 ? (
                    teamWorkload.map((member) => (
                      <div key={member.userId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-lg bg-background text-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                              {member.name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-semibold text-foreground truncate">{member.name}</span>
                            <span className="text-[11px] text-muted-foreground capitalize truncate">({member.department || member.role})</span>
                          </div>
                          <span className="font-bold text-foreground text-xs tabular-nums shrink-0">
                            {member.workloadPercent}% ({member.activeTasks} tasks)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              member.workloadPercent >= 90
                                ? 'bg-primary'
                                : member.workloadPercent >= 70
                                ? 'bg-brand/75'
                                : 'bg-brand/45'
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
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp size={16} className="text-foreground shrink-0" />
                    <span>Sales Pipeline Funnel</span>
                  </h3>
                  <Link to="/crm/leads" className="text-xs font-semibold text-foreground hover:underline">
                    CRM &amp; Leads →
                  </Link>
                </div>

                <div className="space-y-2">
                  {salesFunnel.map((step) => (
                    <div
                      key={step.stage}
                      onClick={() => navigate('/crm/leads')}
                      className="p-3 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer flex items-center justify-between group text-xs"
                    >
                      <span className="font-semibold text-foreground transition-colors">
                        {step.label}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary font-bold text-foreground text-xs tabular-nums">
                        {step.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* - TAB: ALL METRICS & COMPANY ANALYTICS - */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* 1. All Metrics Summary KPIs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Projects</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{stats.totalProjects || 0}</div>
                <div className="text-[11px] text-muted-foreground font-medium tabular-nums">{stats.activeProjects || 0} Active</div>
              </div>

              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Tasks</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{stats.totalTasks || 0}</div>
                <div className="text-[11px] text-muted-foreground font-medium tabular-nums">{taskDist['On Process'] || 0} In Process</div>
              </div>

              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Over-Target Tasks</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{stats.totalOverTargetTasks || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue Deliverables</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{stats.overdueTasks || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed Deliverables</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{taskDist['Completed'] || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-card space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Team</span>
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{stats.totalUsers || (viz.allUserMetrics || []).length}</div>
              </div>
            </div>

            {/* 2. All Users Live Performance & Workload Matrix */}
            <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users size={18} className="text-foreground shrink-0" />
                    <span>Cross-User Performance &amp; Workload Matrix</span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial min-w-[160px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search member name..."
                      value={userMetricSearch}
                      onChange={(e) => setUserMetricSearch(e.target.value)}
                      className="w-full sm:w-auto pl-8 pr-3 py-2 rounded-xl bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 outline-none transition-colors"
                    />
                  </div>

                  <div className="w-36">
                    <SelectDropdown
                      value={userMetricRoleFilter}
                      onChange={(val) => setUserMetricRoleFilter(val || 'all')}
                      options={[
                        { value: 'all', label: 'All Roles' },
                        { value: 'employee', label: 'Employees' },
                        { value: 'manager', label: 'Managers' },
                        { value: 'admin', label: 'Admins' },
                      ]}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-36 text-xs"
                      buttonClassName="h-8.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-background border border-border/40"
                    />
                  </div>
                </div>
              </div>

              {/* User Metric Rows / Table */}
              <div className="responsive-table-container custom-scrollbar">
                <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Team Member</th>
                      <th className="py-2.5 px-3">Role / Dept</th>
                      <th className="py-2.5 px-3 text-center">Active Tasks</th>
                      <th className="py-2.5 px-3 text-center">In Process</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-center">Over-Target</th>
                      <th className="py-2.5 px-3 text-center">Overdue</th>
                      <th className="py-2.5 px-3">Workload Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                    {((viz.allUserMetrics || viz.teamWorkload || []).filter((u) => {
                      if (userMetricRoleFilter !== 'all' && u.role !== userMetricRoleFilter) return false;
                      if (!userMetricSearch.trim()) return true;
                      const q = userMetricSearch.toLowerCase();
                      return (u.name || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q);
                    })).map((member) => {
                      return (
                        <tr key={member.userId} className="hover:bg-background/60 transition-colors">
                          <td className="py-3 px-3">
                            <PersonAssigneeBadge person={member} size="sm" />
                          </td>
                          <td className="py-3 px-3 text-muted-foreground font-medium capitalize">
                            {member.department || member.position || member.role}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">
                            {member.activeTasks || 0}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-md bg-background text-foreground font-semibold text-[11px]">
                              {member.inProgressTasks || 0}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-md bg-background text-foreground font-semibold text-[11px]">
                              {member.completedTasks || 0} ({member.completionRate || 0}%)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {member.overTargetTasks > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold text-[11px]">
                                <Flame size={10} />
                                <span>{member.overTargetTasks} Over</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {member.overdueTasks > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold text-[11px]">
                                <AlertTriangle size={10} />
                                <span>{member.overdueTasks}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 min-w-[140px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground font-medium">Capacity</span>
                                <span className="font-bold text-foreground">{member.workloadPercent || 0}%</span>
                              </div>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    (member.workloadPercent || 0) >= 90
                                      ? 'bg-primary'
                                      : (member.workloadPercent || 0) >= 70
                                      ? 'bg-brand/75'
                                      : 'bg-brand/45'
                                  }`}
                                  style={{ width: `${member.workloadPercent || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Monthly Project Deliverables Quotas & Real-Time Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Deliverable Quotas Tracker */}
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target size={16} className="text-foreground shrink-0" />
                      <span>Project Monthly Deliverable Quotas</span>
                    </h3>
                  </div>
                  <Link to="/projects" className="text-xs font-semibold text-foreground hover:underline">
                    Projects →
                  </Link>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {(viz.activeProjectDeliverables || []).length > 0 ? (
                    (viz.activeProjectDeliverables || []).map((target) => (
                      <div
                        key={target._id}
                        onClick={() => navigate(`/projects/${target.projectId}`)}
                        className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 transition-colors cursor-pointer space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-foreground">
                              {target.projectName}
                            </h4>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                              {target.contentType} Deliverables
                            </span>
                          </div>
                          {target.isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] tabular-nums">
                              <Flame size={10} />
                              <span>+{target.exceededBy} Over Target</span>
                            </span>
                          ) : target.currentCount >= target.targetQuantity ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold text-[10px]">
                              <CheckCircle2 size={10} />
                              <span>Target Reached</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold text-[10px] tabular-nums">
                              <Zap size={10} />
                              <span>{target.remaining} Remaining</span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] tabular-nums">
                            <span className="text-muted-foreground">Fulfillment</span>
                            <span className="font-bold text-foreground">
                              {target.currentCount} / {target.targetQuantity} ({target.progressPercent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all bg-foreground"
                              style={{ width: `${Math.min(100, target.progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No monthly deliverable quotas configured for current active projects.
                    </div>
                  )}
                </div>
              </div>

              {/* Real-Time Live Activity Stream */}
              <div className="bg-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Activity size={16} className="text-foreground shrink-0" />
                      <span>Live Agency Activity Stream</span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-foreground flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" /> Live Stream
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {(data.activityLogs || []).length > 0 ? (
                    (data.activityLogs || []).map((log, idx) => (
                      <div key={log._id || idx} className="p-2.5 rounded-xl bg-background/70 flex items-start gap-2.5 text-xs">
                        <div className="h-7 w-7 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {log.actor?.avatar ? (
                            <img src={getAssetUrl(log.actor.avatar)} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            log.actor?.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground truncate">{log.actor?.name || 'System'}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            <span className="font-semibold text-foreground">{log.action || 'Updated'}</span>: {log.description || log.title || 'Action recorded'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No recent activity logs recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* - TAB 3: TEAM WORKLOAD & EOD - */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-5 rounded-2xl">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users size={16} className="text-foreground shrink-0" />
                  <span>Team EOD Submissions &amp; Reports</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by name or dept..."
                    value={eodSearch}
                    onChange={(e) => setEodSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 rounded-xl bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 outline-none"
                  />
                </div>
              </div>
            </div>

            {eodReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {eodReports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => {
                      setSelectedEodRecord(report);
                      setShowEodDetailModal(true);
                    }}
                    className="p-5 rounded-2xl bg-card hover:bg-secondary/75 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-background text-foreground flex items-center justify-center font-bold text-xs shrink-0">
                          {report.user?.avatar ? (
                            <img src={getAssetUrl(report.user.avatar)} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            report.user?.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-none">{report.user?.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{report.user?.department || report.user?.role}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                        {new Date(report.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                      {report.eodReport?.summary || 'No summary text.'}
                    </p>

                    {report.eodReport?.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {report.eodReport.tasksCompleted.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-background px-2.5 py-0.5 rounded-full text-foreground font-medium">
                            <Check size={10} className="shrink-0" />
                            <span>{t}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-card rounded-2xl text-xs text-muted-foreground">
                No team EOD reports found for the selected filter.
              </div>
            )}
          </div>
        )}

        {/* - TAB: WEEKLY TODOS & DELIVERABLES - */}
        {activeTab === 'todos' && (
          <div className="space-y-6">
            <WeeklyTodosWidget isManagerOrAdmin={true} user={user} />
          </div>
        )}

        {/* Weekly Todos & Deliverables Hub (Overview widget) */}
        {activeTab === 'command' && (
          <WeeklyTodosWidget isManagerOrAdmin={true} user={user} />
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 2. EMPLOYEE DASHBOARD
  // -------------------------------------------------------------------------
  const renderEmployeeStats = () => {
    const assignedTasks = data?.assignedTasks || data?.myTasks || [];
    const pendingTasks = assignedTasks.filter(
      (t) => t.status !== 'completed' && t.status !== 'done' && t.status !== 'approved' && t.status !== 'Approved'
    );

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{getGreeting()}, {user.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchStats(false)}
              title={`Last synced: ${lastSynced.toLocaleTimeString()}`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-background hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors min-h-[38px] cursor-pointer"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-foreground' : ''} />
              <span>Sync</span>
            </button>

            {!['superAdmin', 'organizationOwner', 'admin'].includes(user?.role) && (
              <button
                type="button"
                onClick={() => setShowEodModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors min-h-[38px] cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Submit Daily EOD</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Employee Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">My Active Tasks</span>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{pendingTasks.length}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Priority Queue</div>
          </div>

          <div className="p-5 rounded-2xl bg-card space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In Progress</span>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{data?.inProgressTasks || 0}</div>
            <div className="text-[11px] text-muted-foreground">Currently Producing</div>
          </div>

          <div className="p-5 rounded-2xl bg-card space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed (Week)</span>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{data?.completedThisWeek || 0}</div>
            <div className="text-[11px] text-muted-foreground font-medium inline-flex items-center gap-1">
              <Check size={10} />
              <span>Delivered</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Over-Target Tasks</span>
            <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{data?.overTargetTasks || 0}</div>
            <div className="text-[11px] text-muted-foreground font-semibold">Over Quota</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AttendanceWidget todayRecord={data?.todayAttendance} user={user} />
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-foreground shrink-0" />
                <h2 className="text-sm font-bold text-foreground">My Assigned Tasks ({pendingTasks.length})</h2>
              </div>
              <Link to="/tasks" className="text-xs font-semibold text-foreground hover:underline">View All Tasks →</Link>
            </div>

            <div className="space-y-2">
              {pendingTasks.length > 0 ? (
                pendingTasks.slice(0, 10).map((task) => (
                  <div key={task._id} className="p-3.5 rounded-xl bg-background hover:bg-secondary/60 flex items-center justify-between gap-3 transition-colors">
                    <div className="space-y-1.5 min-w-0">
                      <p
                        onClick={() => navigate('/tasks')}
                        className="text-xs font-bold text-foreground hover:underline transition-colors cursor-pointer truncate"
                      >
                        {task.title || task.taskTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                        {(task.client?.company || task.client?.name || task.clientName) && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <Building2 size={11} className="shrink-0 text-muted-foreground" />
                            <span>{task.client?.company || task.client?.name || task.clientName}</span>
                          </span>
                        )}
                        {(task.project?.name || task.projectName) && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <FolderOpen size={11} className="shrink-0 text-muted-foreground" />
                            <span>{task.project?.name || task.projectName}</span>
                          </span>
                        )}
                        {task.createdAt && (
                          <span className="inline-flex items-center gap-1 text-foreground font-medium bg-secondary px-2 py-0.5 rounded-md">
                            <Calendar size={10} className="shrink-0" />
                            <span>Created: {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                          <Clock size={10} className="shrink-0" />
                          <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing / TBD'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground capitalize">
                        {task.status?.replace(/_/g, ' ') || 'Todo'}
                      </span>
                      {task.priority && (
                        <span className={`text-[10px] capitalize ${
                          task.priority === 'urgent' || task.priority === 'high' ? 'text-foreground font-bold' : 'text-muted-foreground font-semibold'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
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

        {/* Employee Weekly Todos & Personal Goals */}
        <WeeklyTodosWidget isManagerOrAdmin={false} user={user} />
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 3. CLIENT PORTAL
  // -------------------------------------------------------------------------
  const renderClientStats = () => {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-5 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{getGreeting()}, {user.name}</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/tasks" className="p-6 rounded-2xl bg-card hover:bg-secondary/75 transition-colors flex flex-col justify-center">
            <CheckSquare className="text-foreground mb-2.5" size={24} />
            <h3 className="font-bold text-sm text-foreground">Tasks &amp; Deliverables</h3>
          </Link>
          <Link to="/calendar" className="p-6 rounded-2xl bg-card hover:bg-secondary/75 transition-colors flex flex-col justify-center">
            <Calendar className="text-foreground mb-2.5" size={24} />
            <h3 className="font-bold text-sm text-foreground">Content Calendar</h3>
          </Link>
          <Link to="/finance" className="p-6 rounded-2xl bg-card hover:bg-secondary/75 transition-colors flex flex-col justify-center">
            <Receipt className="text-foreground mb-2.5" size={24} />
            <h3 className="font-bold text-sm text-foreground">Invoices &amp; Receipts</h3>
          </Link>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 4. REFERRAL PORTAL
  // -------------------------------------------------------------------------
  const renderReferralStats = () => {
    const referrals = data.referrals || [];
    const stats = [
      { label: 'Total Earnings', value: formatINR(data.totalEarnings || 0), icon: Wallet },
      { label: 'Pending Payouts', value: formatINR(data.pendingEarnings || 0), icon: IndianRupee },
      { label: 'Submitted Leads', value: referrals.length, icon: Users },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-5 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Partner Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="p-5 rounded-2xl bg-card">
              <span className="text-xs text-muted-foreground font-semibold">{s.label}</span>
              <div className="text-2xl font-bold mt-1.5 text-foreground tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      {['superAdmin', 'admin', 'organizationOwner', 'manager'].includes(user.role)
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
        <KanbanCreateTaskModal
          isOpen={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          onTaskCreated={() => fetchStats(false)}
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
