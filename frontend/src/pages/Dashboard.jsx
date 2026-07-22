import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { EODReportModal } from '../components/modals/EODReportModal';
import { useEodReports } from '../hooks/useEodReports';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import api from '../api';
import { formatINR } from '../utils/currency';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEodModal, setShowEodModal] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [showFinance, setShowFinance] = useState(false);

  const socket = useSocket();
  const isAdminOrManager = user?.role === 'superAdmin' || user?.role === 'manager';
  const { data: eodData } = useEodReports(7, { enabled: isAdminOrManager });
  const eodReports = eodData?.records || [];

  const fetchStats = async () => {
    setLoading(true);
    try {
      const endpoint = user.role === 'superAdmin' || user.role === 'manager'
        ? '/reports/admin'
        : user.role === 'client'
          ? '/reports/client'
          : user.role === 'referral'
            ? '/referrals'
            : '/reports/employee';
          
      const res = await api.get(endpoint, { params: { period } });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    fetchStats();
  }, [user?.role, period]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchStats();
    };

    socket.on('userCreated', handleUpdate);
    socket.on('clientCreated', handleUpdate);
    socket.on('projectCreated', handleUpdate);
    socket.on('taskCreated', handleUpdate);
    socket.on('invoicePaid', handleUpdate);
    socket.on('expenseApproved', handleUpdate);
    socket.on('leadUpdated', handleUpdate);

    return () => {
      socket.off('userCreated', handleUpdate);
      socket.off('clientCreated', handleUpdate);
      socket.off('projectCreated', handleUpdate);
      socket.off('taskCreated', handleUpdate);
      socket.off('invoicePaid', handleUpdate);
      socket.off('expenseApproved', handleUpdate);
      socket.off('leadUpdated', handleUpdate);
    };
  }, [socket]);

  if (!user || loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card rounded-2xl border border-border"></div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We could not load your dashboard data. Please refresh or sign in again.</p>
      </div>
    );
  }

  const renderAdminStats = () => {
    const taskBreakdown = data.charts.taskBreakdown || [];
    const stageFunnel = data.charts.stageFunnel || [];
    const completedTasks = taskBreakdown
      .filter((item) => ['done', 'approved'].includes(item._id))
      .reduce((sum, item) => sum + item.count, 0);
    const taskCompletionRate = data.stats.totalTasks > 0
      ? Math.round((completedTasks / data.stats.totalTasks) * 100)
      : 0;
    const avgRevenuePerClient = data.stats.activeClients > 0
      ? Math.round(data.stats.monthRevenue / data.stats.activeClients)
      : 0;
    const pipelineLeads = stageFunnel.reduce((sum, item) => sum + item.count, 0);
    const wonLeads = stageFunnel.find((item) => item._id === 'won')?.count || 0;
    const isManager = user.role === 'manager';
    const roleTitle = isManager ? 'Admin Manager Workspace' : 'Executive Dashboard';
    const roleSubtitle = isManager
      ? 'See delivery, projects, and team activity with ad budgets only.'
      : "Company-wide revenue, pipeline, operations, and user health.";
    const analyticsCards = [
      {
        label: isManager ? 'Team Completion' : 'Task Completion',
        value: `${taskCompletionRate}%`,
        detail: `${completedTasks} of ${data.stats.totalTasks} tasks closed`,
        color: 'bg-emerald-500',
      },
      {
        label: 'Pipeline Volume',
        value: pipelineLeads,
        detail: `${wonLeads} won opportunities`,
        color: 'bg-blue-500',
      },
      {
        label: isManager ? 'Ads Budget' : 'Revenue / Active Client',
        value: isManager ? formatINR(data.stats.totalAdsBudget || 0) : formatINR(avgRevenuePerClient),
        detail: isManager ? 'Visible across all managed projects' : 'Monthly average from paid invoices',
        color: 'bg-indigo-500',
      },
      {
        label: 'Overdue Work',
        value: data.stats.overdueTasks,
        detail: 'Tasks past due date',
        color: 'bg-amber-500',
      },
      {
        label: 'Renewals This Week',
        value: data.stats.expiringRenewalsCount || 0,
        detail: 'Items nearing expiry',
        color: 'bg-rose-500',
      },
    ];

    const getRevenueLabel = () => {
      if (period === 'weekly') return 'This Week Revenue';
      if (period === 'yearly') return 'This Year Revenue';
      if (period === 'allTime') return 'All-Time Revenue';
      return 'This Month Revenue';
    };

    const getRevenueTrend = () => {
      if (period === 'allTime') return 'All-time revenue';
      const suffix = period === 'weekly' ? 'last week' : period === 'yearly' ? 'last year' : 'last month';
      return `${data.stats.revenueGrowth >= 0 ? '+' : ''}${data.stats.revenueGrowth}% vs ${suffix}`;
    };

    const getExpensesTrend = () => {
      if (period === 'weekly') return 'Approved expenses this week';
      if (period === 'yearly') return 'Approved expenses this year';
      if (period === 'allTime') return 'All approved expenses';
      return 'Approved expenses this month';
    };

    const stats = !isManager ? [
      // Row 1 – Revenue & Financials
      { label: 'Total Income', value: formatINR(data.stats.totalIncome || 0), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'All-time paid', up: true, isFinance: true },
      { label: getRevenueLabel(), value: formatINR(data.stats.monthRevenue || 0), icon: IndianRupee, color: 'text-green-500', bg: 'bg-green-500/10', trend: getRevenueTrend(), up: data.stats.revenueGrowth >= 0, isFinance: true },
      { label: 'Total Expenses', value: formatINR(data.stats.totalExpenses || 0), icon: Wallet, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: getExpensesTrend(), up: true, isFinance: true },
      // Row 2 – Clients & Projects
      { label: 'Total Clients', value: data.stats.totalClients, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: `${data.stats.activeClients} active`, up: true },
      { label: 'Active Projects', value: data.stats.activeProjects, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: `${data.stats.totalProjects} total`, up: true },
      { label: 'Conversion Rate', value: `${data.stats.conversionRate}%`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 'Won deals', up: data.stats.conversionRate > 0 },
      // Row 3 – Operations
      { label: 'Total Tasks', value: data.stats.totalTasks, icon: ClipboardList, color: 'text-violet-500', bg: 'bg-violet-500/10', trend: `${data.stats.overdueTasks} overdue`, up: data.stats.overdueTasks === 0 },
      { label: 'Team Members', value: data.stats.totalUsers, icon: ShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10', trend: 'Active users', up: true },
      { label: 'Renewals This Week', value: data.stats.expiringRenewalsCount || 0, icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: 'Expiry watch', up: (data.stats.expiringRenewalsCount || 0) === 0 },
    ] : [
      { label: 'Ads Budget', value: formatINR(data.stats.totalAdsBudget || 0), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'Project budget only', up: true },
      { label: 'Active Clients', value: data.stats.activeClients, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'In service', up: true },
      { label: 'Projects In Delivery', value: data.stats.activeProjects, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: 'In Delivery', up: true },
      { label: 'Team Tasks', value: data.stats.totalTasks, icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: `${data.stats.overdueTasks} Overdue`, up: data.stats.overdueTasks === 0 },
      { label: 'Renewals This Week', value: data.stats.expiringRenewalsCount || 0, icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: 'Expiry watch', up: (data.stats.expiringRenewalsCount || 0) === 0 },
    ];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {isManager ? <Target size={22} /> : <ShieldCheck size={22} />}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{roleTitle}</h1>
                <p className="text-muted-foreground text-sm">Welcome back, {user.name}. {roleSubtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {/* Finance visibility toggle – only for superAdmin */}
          {!isManager && (
            <button
              onClick={() => setShowFinance((v) => !v)}
              title={showFinance ? 'Hide finance amounts' : 'Show finance amounts'}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-sm ${
                showFinance
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {showFinance ? <Eye size={14} /> : <EyeOff size={14} />}
              {showFinance ? 'Hide Amounts' : 'Show Amounts'}
            </button>
          )}
          <Link to="/calendar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            <Calendar size={16} />
            Content Calendar
          </Link>
          <div className="flex items-center space-x-1 bg-card p-1 rounded-xl border border-border shadow-sm">
            {[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
              { value: 'allTime', label: 'All-Time' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  period === opt.value
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 bg-card p-1 rounded-xl border border-border shadow-sm">
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground">Overview</button>
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">Analytics</button>
          </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${!isManager ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
          {stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              key={stat.label}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm card-hover"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${stat.up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                  {stat.up ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-xl font-bold mt-1 tracking-tight">
                  {stat.isFinance && !showFinance
                    ? <span className="tracking-widest text-muted-foreground/60 select-none">•••••</span>
                    : stat.value
                  }
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Upcoming Renewals</h2>
              <p className="text-sm text-muted-foreground">Domains, hosting, and subscriptions expiring in the next 7 days.</p>
            </div>
            <Link to="/domain-renewals" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
              Open Renewal Tracker
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {(data.renewals || []).length ? data.renewals.map((item) => (
              <div key={item._id} className="rounded-2xl border border-border bg-background px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground">{item.clientId?.company || item.clientId?.name || 'No client linked'}</p>
                  </div>
                  <span className="text-xs font-semibold text-rose-600">
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                No renewals expiring this week.
              </div>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">{isManager ? 'Task Productivity' : 'Revenue Growth'}</h3>
              <select className="bg-secondary/50 border-none text-xs rounded-lg px-2 py-1 focus:ring-0">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isManager ? (
                  <BarChart data={taskBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="_id"
                      tickFormatter={(value) => String(value).replace(/_/g, ' ')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={data.charts.revenueChart}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="_id" 
                      tickFormatter={(val) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][val.month - 1]}`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="font-bold mb-6">{isManager ? 'Team Pipeline' : 'Lead Funnel'}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.stageFunnel}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {data.charts.stageFunnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.charts.stageFunnel.slice(0, 4).map((entry, i) => (
                <div key={entry._id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 4] }}></div>
                    <span className="capitalize text-muted-foreground">{entry._id.replace('_', ' ')}</span>
                  </div>
                  <span className="font-bold">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
              <p className="text-sm text-muted-foreground">{isManager ? 'Operational health across tasks, pipeline, and ad budgets.' : 'Operational health across revenue, pipeline, and delivery.'}</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
              Live MongoDB data
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {analyticsCards.map((card) => (
              <div key={card.label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${card.color}`} />
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Task Productivity</h3>
                <span className="text-xs text-muted-foreground">{taskCompletionRate}% completion</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="_id"
                      tickFormatter={(value) => String(value).replace(/_/g, ' ')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Lead Stage Analytics</h3>
                <span className="text-xs text-muted-foreground">{data.stats.conversionRate}% conversion</span>
              </div>
              <div className="space-y-4">
                {stageFunnel.length > 0 ? stageFunnel.map((stage) => {
                  const width = pipelineLeads > 0 ? Math.max(8, Math.round((stage.count / pipelineLeads) * 100)) : 0;
                  return (
                    <div key={stage._id}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="capitalize font-medium">{String(stage._id).replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{stage.count}</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                    No lead data yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* EOD Reports Section */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Team EOD Reports</h2>
              <p className="text-sm text-muted-foreground">Recent end-of-day reports from employees and interns.</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
              Last 7 days
            </span>
          </div>

          {eodReports.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {eodReports.slice(0, 6).map((report) => (
                <div key={report._id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{report.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{report.user?.department || report.user?.position || 'Employee'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground line-clamp-2">{report.eodReport?.summary}</p>
                    {report.eodReport?.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {report.eodReport.tasksCompleted.slice(0, 3).map((task, i) => (
                          <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{task}</span>
                        ))}
                        {report.eodReport.tasksCompleted.length > 3 && (
                          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">+{report.eodReport.tasksCompleted.length - 3}</span>
                        )}
                      </div>
                    )}
                    {report.eodReport?.blockers && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-2 py-1.5">
                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{report.eodReport.blockers}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <FileText size={32} className="mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold">No EOD reports yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Team members haven't submitted any end-of-day reports recently.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmployeeStats = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Personal Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome, {user.name}. Here's your focus for today.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/calendar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              <Calendar size={18} />
              Content Calendar
            </Link>
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center justify-center">
              <Calendar size={18} className="mr-2" />
              <span className="text-sm font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
                <h3 className="font-bold flex items-center">
                  <CheckCircle2 size={18} className="mr-2 text-primary" />
                  Priority Tasks
                </h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{data.myTasks.length} Assigned</span>
              </div>
              <div className="divide-y divide-border">
                {data.myTasks.length > 0 ? data.myTasks.map((task) => (
                  <Link key={task._id} to={`/tasks?open=${task._id}`} className="p-4 hover:bg-secondary/30 transition-colors flex items-center justify-between group">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <CheckSquare size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{task.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.project?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="flex items-center text-muted-foreground">
                        <Clock size={14} className="mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                      <span className={`px-2 py-1 rounded-lg font-bold capitalize ${
                        task.priority === 'urgent' ? 'bg-destructive/10 text-destructive' :
                        task.priority === 'high' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </Link>
                )) : (
                  <div className="p-8 text-center text-muted-foreground">No tasks assigned today. Take a break!</div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Attendance */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="font-bold mb-4">Daily Attendance</h3>
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl mb-4 border border-border">
                <div className="flex items-center">
                  <Clock size={20} className="text-primary mr-3" />
                  <div>
                    <p className="text-xs text-muted-foreground">Clock In</p>
                    <p className="text-sm font-bold">{data.todayAttendance?.clockIn ? new Date(data.todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                  </div>
                </div>
                {!data.todayAttendance?.clockIn && (
                  <Link to="/attendance" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all">Clock In</Link>
                )}
              </div>
              <div className="space-y-3">
                <Link to="/calendar" className="block w-full text-center py-2.5 rounded-xl bg-primary text-white text-sm font-bold transition-colors hover:bg-primary/90">Open Content Calendar</Link>
                <button onClick={() => setShowEodModal(true)} className="block w-full text-center py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors">Submit EOD Report</button>
                <Link to="/chat" className="block w-full text-center py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors">Message Manager</Link>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-br from-indigo-600 to-primary text-white">
              <Award size={32} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold leading-tight">Weekly Progress</h3>
              <p className="text-white/70 text-xs mt-1">You&apos;ve completed {data.completedThisWeek} tasks, logged {data.weeklyLoggedUpdates || 0} updates, and added {data.personalTasksThisWeek || 0} personal daily tasks this week.</p>
              <div className="mt-4 bg-white/20 h-2 rounded-full">
                <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(100, (data.completedThisWeek / 10) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClientStats = () => {
    const projects = data.projects || [];
    const invoices = data.invoices || [];
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
          <p className="text-muted-foreground text-sm">Project progress and recent billing for {data.client?.company || data.client?.name || user.name}.</p>
          </div>
          <Link to="/calendar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            <Calendar size={16} />
            Content Calendar
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Active Projects', projects.filter((project) => project.status === 'active').length || projects.length, Briefcase],
            ['Open Invoices', invoices.filter((invoice) => invoice.status !== 'paid').length, IndianRupee],
            ['Average Progress', projects.length ? `${Math.round(projects.reduce((sum, project) => sum + (project.progress || 0), 0) / projects.length)}%` : '0%', CheckCircle2],
          ].map(([label, value, Icon]) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <Icon size={20} className="text-primary mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="font-bold mb-4">Projects</h2>
            <div className="space-y-3">
              {projects.length ? projects.map((project) => (
                <Link key={project._id} to={`/projects/${project._id}`} className="block rounded-xl border border-border p-4 hover:bg-secondary/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{project.name}</span>
                    <span className="capitalize text-muted-foreground">{String(project.status).replace('_', ' ')}</span>
                  </div>
                  <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </Link>
              )) : <p className="text-sm text-muted-foreground">No projects are visible yet.</p>}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="font-bold mb-4">Recent Invoices</h2>
            <div className="space-y-3">
              {invoices.length ? invoices.map((invoice) => (
                <div key={invoice._id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{invoice.invoiceNumber}</span>
                    <span className="capitalize text-muted-foreground">{invoice.status}</span>
                  </div>
                  <p className="mt-2 text-xl font-bold">{formatINR(invoice.total || 0)}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No invoices found.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReferralStats = () => {
    const referrals = data.referrals || [];
    const converted = referrals.filter((referral) => referral.status === 'converted').length;
    const pending = referrals.filter((referral) => !referral.isPaid && referral.status === 'converted').length;
    const conversionRate = referrals.length ? Math.round((converted / referrals.length) * 100) : 0;
    const recentReferrals = referrals.slice(0, 5);
    const stats = [
      { label: 'Total Earnings', value: formatINR(data.totalEarnings || 0), icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Pending Payouts', value: formatINR(data.pendingEarnings || 0), icon: IndianRupee, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Submitted Leads', value: referrals.length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    const copyRefCode = () => {
      if (!user.referralCode) return;
      navigator.clipboard.writeText(user.referralCode);
    };

    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Award size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Referral Partner Home</h1>
              <p className="text-muted-foreground text-sm">Track your network, commissions, and active lead submissions.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/calendar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              <Calendar size={16} />
              Content Calendar
            </Link>
            <button
              onClick={copyRefCode}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-secondary transition-colors"
            >
              <Copy size={16} />
              {user.referralCode || 'No referral code'}
            </button>
            <Link to="/referral" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              <Send size={16} />
              Open Partner Portal
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              key={stat.label}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm card-hover"
            >
              <div className={`mb-5 inline-flex rounded-xl p-3 ${stat.bg} ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/20">
              <h2 className="font-bold">Recent Referrals</h2>
              <span className="text-xs font-semibold text-muted-foreground">{pending} pending payout</span>
            </div>
            <div className="divide-y divide-border">
              {recentReferrals.length ? recentReferrals.map((referral) => (
                <div key={referral._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{referral.lead?.name || 'Manual submission'}</p>
                    <p className="text-xs text-muted-foreground">{referral.lead?.email || 'Lead details pending'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      referral.status === 'converted' ? 'bg-emerald-500/10 text-emerald-600' :
                      referral.status === 'qualified' ? 'bg-blue-500/10 text-blue-600' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {referral.status}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">{formatINR(referral.commissionAmount || 0)}</span>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No referrals yet. Your submitted leads will appear here.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="font-bold">Partner Next Steps</h2>
            <div className="mt-5 space-y-4">
              {[
                ['Share your code', 'Use it with warm introductions and campaign links.'],
                ['Submit qualified leads', 'Add context so the sales team can follow up quickly.'],
                ['Track commissions', 'Converted leads move into payout review automatically.'],
              ].map(([title, detail], index) => (
                <div key={title} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500">
      {user.role === 'superAdmin' || user.role === 'manager'
        ? renderAdminStats()
        : user.role === 'client'
          ? renderClientStats()
          : user.role === 'referral'
            ? renderReferralStats()
            : renderEmployeeStats()}
      <EODReportModal open={showEodModal} onOpenChange={setShowEodModal} />
    </div>
  );
};

export default Dashboard;
