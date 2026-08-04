import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { EODReportModal } from '../components/modals/EODReportModal';
import { EODDetailModal } from '../components/modals/EODDetailModal';
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
  const queryClient = useQueryClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEodModal, setShowEodModal] = useState(false);
  const [selectedEodRecord, setSelectedEodRecord] = useState(null);
  const [showEodDetailModal, setShowEodDetailModal] = useState(false);
  const [eodSearch, setEodSearch] = useState('');
  const [eodDays, setEodDays] = useState(7);
  const [period, setPeriod] = useState('monthly');
  const [showFinance, setShowFinance] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const socket = useSocket();
  const isAdminOrManager = user?.role === 'superAdmin' || user?.role === 'manager';
  
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
      const endpoint = user.role === 'superAdmin' || user.role === 'manager'
        ? '/reports/admin'
        : user.role === 'client'
          ? '/reports/client'
          : user.role === 'referral'
            ? '/referrals'
            : '/reports/employee';
          
      const params = { period };
      if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    if (period === 'custom' && (!startDate || !endDate)) return;
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

  if (!user || loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card rounded-2xl border border-border"></div>
        ))}
      </div>
    );
  }

  const renderAdminStats = () => {
    const stats = data.stats || {};
    const pipelineLeads = stats.totalLeads || 0;
    
    return (
      <div className="space-y-8">
        {/* Premium Header */}
        <div className="overflow-hidden rounded-[24px] border border-border bg-card p-6 text-foreground shadow-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                Executive Dashboard
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Performance overview</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Real-time revenue, expenses, ad spend, team output, and conversion metrics across the business.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {user.role !== 'manager' && (
                <button
                  onClick={() => setShowFinance((v) => !v)}
                  title={showFinance ? 'Hide revenue & financial amounts' : 'Show revenue & financial amounts'}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                    showFinance
                      ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-border bg-background text-foreground hover:bg-secondary'
                  }`}
                >
                  {showFinance ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showFinance ? 'Hide Financials' : 'Show Financials'}
                </button>
              )}

              <Link
                to="/calendar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/20"
              >
                <Calendar size={16} />
                Content Calendar
              </Link>

              <select
                value={period}
                onChange={(e) => {
                  const val = e.target.value;
                  setPeriod(val);
                  if (val !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="app-select !py-2 !px-3.5 text-sm font-semibold"
              >
                <option value="monthly" className="text-slate-900">This Month</option>
                <option value="lastMonth" className="text-slate-900">Last Month</option>
                <option value="weekly" className="text-slate-900">This Week</option>
                <option value="yearly" className="text-slate-900">This Year</option>
                <option value="allTime" className="text-slate-900">All Time</option>
                <option value="custom" className="text-slate-900">Custom Date Range</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Calendar Date Filter Row */}
        {period === 'custom' && (
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" /> Filter Past Date Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-semibold">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary/40 border border-border rounded-xl px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-semibold">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-secondary/40 border border-border rounded-xl px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                  setStartDate(firstDay);
                  setEndDate(lastDay);
                }}
                className="text-[11px] font-semibold bg-secondary px-2.5 py-1 rounded-lg hover:bg-secondary/80 text-foreground"
              >
                Last Month
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                  const today = now.toISOString().split('T')[0];
                  setStartDate(firstDay);
                  setEndDate(today);
                }}
                className="text-[11px] font-semibold bg-secondary px-2.5 py-1 rounded-lg hover:bg-secondary/80 text-foreground"
              >
                This Year YTD
              </button>
            </div>
          </div>
        )}

        {/* Date Period Active Badge */}
        {data?.periodStart && data?.periodEnd && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-primary/5 border border-primary/15 px-4 py-2 rounded-xl">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Calendar size={14} className="text-primary" />
              Showing metrics for period: <strong className="text-primary">{new Date(data.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong> to <strong className="text-primary">{new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            </span>
            <span className="hidden sm:inline font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              Filtered Dashboard View
            </span>
          </div>
        )}

        {/* Top KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {[
            {
              label: 'Pending Amount',
              value: user.role === 'manager' ? 'Locked' : !showFinance ? '•••••' : formatINR(stats.totalPending || 0),
              helper: 'Unpaid invoice balances',
              accent: 'rose',
              icon: Clock,
              badge: null,
            },
            {
              label: 'Gross Amount',
              value: user.role === 'manager' ? 'Locked' : !showFinance ? '•••••' : formatINR(stats.grossAmount || 0),
              helper: 'Revenue collected this period',
              accent: 'emerald',
              icon: IndianRupee,
              badge: stats.revenueGrowth !== undefined && showFinance && user.role !== 'manager' ? `${Number(stats.revenueGrowth) >= 0 ? '+' : '-'}${Math.abs(stats.revenueGrowth)}%` : null,
              badgeTone: Number(stats.revenueGrowth || 0) >= 0 ? 'emerald' : 'rose',
            },
            {
              label: 'Net Profit',
              value: user.role === 'manager' ? 'Locked' : !showFinance ? '•••••' : formatINR(stats.netProfit || 0),
              helper: 'Revenue minus total expenses',
              accent: 'indigo',
              icon: Wallet,
              badge: null,
            },
            {
              label: 'Expenses',
              value: user.role === 'manager' ? 'Locked' : !showFinance ? '•••••' : formatINR(stats.totalExpenses || 0),
              helper: 'Approved business expenses',
              accent: 'rose',
              icon: Receipt,
              badge: null,
            },
            {
              label: 'Ads Budget',
              value: formatINR(stats.totalAdsBudget || 0),
              helper: 'Marketing & campaign spend',
              accent: 'amber',
              icon: Megaphone,
              badge: null,
            },
            {
              label: 'Remaining',
              value: user.role === 'manager' ? 'Locked' : !showFinance ? '•••••' : formatINR(stats.remainingAmount || 0),
              helper: 'Revenue after expenses and ad spend',
              accent: 'sky',
              icon: ShieldCheck,
              badge: null,
            },
          ].map(({ label, value, helper, accent, icon: Icon, badge, badgeTone }) => {
            const accentClasses = {
              emerald: 'bg-emerald-500/10 text-emerald-600',
              rose: 'bg-rose-500/10 text-rose-600',
              amber: 'bg-amber-500/10 text-amber-600',
              indigo: 'bg-indigo-500/10 text-indigo-600',
              sky: 'bg-sky-500/10 text-sky-600',
            };
            const badgeClasses = {
              emerald: 'bg-emerald-500/10 text-emerald-600',
              rose: 'bg-rose-500/10 text-rose-600',
            };

            return (
              <div key={label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accentClasses[accent]}`}>
                    <Icon size={18} />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-2xl font-black tracking-tight text-slate-900">{value}</p>
                  {badge && (
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${badgeClasses[badgeTone]}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">{helper}</p>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-base">Revenue Trend</h3>
                <p className="text-xs text-muted-foreground">Monthly paid invoice collections</p>
              </div>
            </div>

            <div className="h-[280px]">
              {user.role === 'manager' ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Financial charts restricted to Super Admin.
                </div>
              ) : !showFinance ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <EyeOff size={32} className="text-muted-foreground/40" />
                  <p>Revenue trend hidden.</p>
                  <button
                    onClick={() => setShowFinance(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Click &quot;Show Revenue&quot; to view charts
                  </button>
                </div>
              ) : data.charts?.revenueChart?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.revenueChart}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="_id.month" tickFormatter={(m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip formatter={(val) => [formatINR(val), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No revenue data recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Lead Funnel */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base mb-1">Lead Conversion Funnel</h3>
              <p className="text-xs text-muted-foreground mb-6">Distribution across current pipeline stages</p>

              <div className="space-y-4">
                {data.charts?.stageFunnel?.length > 0 ? data.charts.stageFunnel.map((stage) => {
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

        {/* Team EOD Reports Section */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Team EOD Reports
              </h2>
              <p className="text-sm text-muted-foreground">End-of-day reports submitted by employees and interns.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team or keyword..."
                  value={eodSearch}
                  onChange={(e) => setEodSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs outline-none focus:border-primary w-44 md:w-56"
                />
              </div>
              <select
                value={eodDays}
                onChange={(e) => setEodDays(Number(e.target.value))}
                className="bg-card border border-border text-xs rounded-xl px-3 py-1.5 font-medium outline-none focus:border-primary"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>

          {eodReports.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {eodReports.slice(0, 8).map((report) => (
                <div
                  key={report._id}
                  onClick={() => { setSelectedEodRecord(report); setShowEodDetailModal(true); }}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                        {report.user?.avatar ? (
                          <img src={getAssetUrl(report.user.avatar)} alt={report.user.name} className="h-full w-full object-cover" />
                        ) : (
                          report.user?.name ? report.user.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {report.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {report.user?.department || report.user?.position || report.user?.role || 'Team Member'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> EOD Submitted
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-sm text-foreground/90 line-clamp-2">{report.eodReport?.summary}</p>

                    {report.eodReport?.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {report.eodReport.tasksCompleted.slice(0, 3).map((task, i) => (
                          <span key={i} className="text-[10px] bg-secondary text-foreground/80 font-medium px-2.5 py-0.5 rounded-full border border-border">
                            ✓ {task}
                          </span>
                        ))}
                        {report.eodReport.tasksCompleted.length > 3 && (
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                            +{report.eodReport.tasksCompleted.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {report.eodReport?.blockers && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-1 font-medium">{report.eodReport.blockers}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <FileText size={36} className="mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground">No team EOD reports found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No end-of-day reports match your filter criteria for the past {eodDays} days.
              </p>
            </div>
          )}
        </div>

        {/* Web Activity & Edits Metrics (Admin Audit Log) */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-foreground flex items-center gap-2">
                <Activity className="text-indigo-600" size={22} />
                Web Activity & Edits Metrics
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                Real-time audit log of all creations, edits, status updates, and user actions on the website.
              </p>
            </div>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-border bg-card text-xs font-semibold text-slate-700 dark:text-foreground hover:bg-slate-50 transition-all"
            >
              View Full Audit Log
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-card p-5 shadow-sm divide-y divide-slate-100 dark:divide-border/60">
            {data.activityLogs?.length > 0 ? (
              data.activityLogs.map((log) => {
                const actionBadgeColors = {
                  create: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                  update: 'bg-blue-50 text-blue-600 border-blue-200',
                  delete: 'bg-rose-50 text-rose-600 border-rose-200',
                  status_change: 'bg-amber-50 text-amber-600 border-amber-200',
                };
                const badgeStyle = actionBadgeColors[log.action] || 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <div key={log._id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-secondary/30 px-2 rounded-xl transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {log.actor?.avatar ? (
                          <img src={getAssetUrl(log.actor.avatar)} alt={log.actor.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          log.actor?.name?.charAt(0).toUpperCase() || 'A'
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-foreground">
                            {log.actor?.name || 'System User'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">
                            ({log.actor?.role || log.actorRole || 'admin'})
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                            {log.action?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-secondary text-slate-500 px-2 py-0.5 rounded-md capitalize">
                            {log.entityType}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-foreground mt-0.5 truncate">
                          {log.title}
                        </p>
                        {log.description && (
                          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 line-clamp-1">
                            {log.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-medium text-slate-400 shrink-0 sm:self-center">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                No web activity logs recorded yet. Action edits across the platform will appear here automatically.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmployeeStats = () => {
    const todayEod = data?.todayAttendance?.eodReport;
    const isEodSubmittedToday = Boolean(todayEod?.submittedAt);

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Personal Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {user.name}. Here&apos;s your focus and report status today.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/sop" className="inline-flex items-center justify-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-secondary">
              <BookOpen size={18} className="text-primary" />
              SOP Dashboard
            </Link>
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

        {/* Today's EOD Report Status Card */}
        <div className={`rounded-2xl p-6 border transition-all ${
          isEodSubmittedToday
            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-sm'
            : 'bg-amber-500/5 border-amber-500/20 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                isEodSubmittedToday ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {isEodSubmittedToday ? <CheckCircle2 size={24} /> : <FileText size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-foreground">Today&apos;s EOD Report Status</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isEodSubmittedToday
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                  }`}>
                    {isEodSubmittedToday ? 'Submitted' : 'Pending'}
                  </span>
                  {todayEod?.submittedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} /> {new Date(todayEod.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {isEodSubmittedToday ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-sm text-foreground/90 font-medium line-clamp-2">{todayEod.summary}</p>
                    {todayEod.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {todayEod.tasksCompleted.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Remember to submit your end-of-day report before finishing work today so your manager and clients stay updated on your progress.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowEodModal(true)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all shrink-0 ${
                isEodSubmittedToday
                  ? 'bg-card border border-border text-foreground hover:bg-secondary'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
              }`}
            >
              {isEodSubmittedToday ? 'Update EOD Report' : 'Submit EOD Report'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Tasks & My EOD History & SOPs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
                <h3 className="font-bold flex items-center">
                  <CheckCircle2 size={18} className="mr-2 text-primary" />
                  Priority Tasks
                </h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{data.myTasks?.length || 0} Assigned</span>
              </div>
              <div className="divide-y divide-border">
                {data.myTasks?.length > 0 ? data.myTasks.map((task) => (
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

            {/* Standard Operating Procedures (SOPs) */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center text-base">
                    <BookOpen size={18} className="mr-2 text-primary" />
                    Standard Operating Procedures (SOPs)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Company guidelines, role procedures, and your created SOPs</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/sop" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add SOP
                  </Link>
                  <Link to="/sop" className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full font-semibold">
                    View All
                  </Link>
                </div>
              </div>

              {data.sops?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.sops.slice(0, 4).map((sop) => (
                    <Link
                      key={sop._id}
                      to="/sop"
                      className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors block group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 line-clamp-1">
                          <BookOpen size={13} className="text-primary shrink-0" />
                          {sop.title}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize shrink-0">
                          {sop.sopType?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{sop.content || 'No description provided.'}</p>
                      <div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>By {sop.createdBy?.name || 'Team'}</span>
                        <span>{sop.createdAt ? new Date(sop.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No SOPs added yet. Click &quot;Add SOP&quot; above to create your first standard operating procedure!
                </div>
              )}
            </div>

            {/* My EOD Reports History */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center text-base">
                    <FileText size={18} className="mr-2 text-primary" />
                    My Submitted EOD Reports
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Your recent daily work submissions</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  {myEodReports.length} Reports
                </span>
              </div>

              {myEodReports.length > 0 ? (
                <div className="space-y-3">
                  {myEodReports.slice(0, 5).map((report) => (
                    <div
                      key={report._id}
                      onClick={() => { setSelectedEodRecord(report); setShowEodDetailModal(true); }}
                      className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Calendar size={13} className="text-primary" />
                          {new Date(report.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          Submitted
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 line-clamp-2">{report.eodReport?.summary}</p>
                      {report.eodReport?.tasksCompleted?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {report.eodReport.tasksCompleted.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="text-[10px] bg-card px-2 py-0.5 rounded-md border border-border text-muted-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No EOD reports submitted yet. Use the submit button above to send your first report!
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Attendance */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="font-bold mb-4">Daily Attendance & Actions</h3>
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
                <Link to="/sop" className="w-full text-center py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <BookOpen size={16} className="text-primary" />
                  SOP Dashboard & My SOPs
                </Link>
                <Link to="/pending-notes" className="w-full text-center py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <StickyNote size={16} className="text-amber-500" />
                  My Pending Task Notes
                </Link>
                <button onClick={() => setShowEodModal(true)} className="block w-full text-center py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-colors">
                  {isEodSubmittedToday ? 'View / Edit EOD Report' : 'Submit EOD Report'}
                </button>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-br from-indigo-600 to-primary text-white">
              <Award size={32} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold leading-tight">Weekly Progress</h3>
              <p className="text-white/70 text-xs mt-1">You&apos;ve completed {data?.completedThisWeek || 0} tasks, logged {data?.weeklyLoggedUpdates || 0} updates, and added {data?.personalTasksThisWeek || 0} personal daily tasks this week.</p>
              <div className="mt-4 bg-white/20 h-2 rounded-full">
                <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(100, ((data?.completedThisWeek || 0) / 10) * 100)}%` }}></div>
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
    const clientEodReports = data.eodReports || [];

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
            <p className="text-muted-foreground text-sm">Project progress, daily team reports, and billing for {data.client?.company || data.client?.name || user.name}.</p>
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

        {/* Client View: Daily Team EOD & Work Progress Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Daily Team EOD & Work Reports
              </h2>
              <p className="text-sm text-muted-foreground">Daily progress reports submitted by team members working on your account.</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
              {clientEodReports.length} Reports
            </span>
          </div>

          {clientEodReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientEodReports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => { setSelectedEodRecord(report); setShowEodDetailModal(true); }}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                        {report.user?.avatar ? (
                          <img src={getAssetUrl(report.user.avatar)} alt={report.user.name} className="h-full w-full object-cover" />
                        ) : (
                          report.user?.name ? report.user.name.charAt(0).toUpperCase() : 'T'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {report.user?.name || 'Team Member'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {report.user?.position || report.user?.department || 'Project Team'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground/90 line-clamp-2">{report.eodReport?.summary}</p>
                    {report.eodReport?.tasksCompleted?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {report.eodReport.tasksCompleted.slice(0, 3).map((task, i) => (
                          <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-foreground/80 font-medium">
                            ✓ {task}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <FileText size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground">No team EOD reports yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Daily work reports submitted by your project team will appear here.
              </p>
            </div>
          )}
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
      <EODReportModal open={showEodModal} onOpenChange={setShowEodModal} report={data?.todayAttendance?.eodReport} />
      <EODDetailModal open={showEodDetailModal} onOpenChange={setShowEodDetailModal} record={selectedEodRecord} />
    </div>
  );
};

export default Dashboard;
