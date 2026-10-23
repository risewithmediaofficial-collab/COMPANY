import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api';
import { motion } from 'framer-motion';
import {
  FileCheck, BarChart3, CheckCircle2, Clock, FolderKanban,
  Receipt, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight,
  Layers, Star, Activity, Calendar, FileText, IndianRupee,
  Film, Sparkles, CheckSquare, ArrowRight, ExternalLink,
  Megaphone, CreditCard, Download, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../../../context/SocketContext';
import { exportProposalToPDF, exportInvoiceToPDF } from '../../../utils/pdfExport';
import { CardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { useProposals } from '../../../hooks/useProposals';

const KPICard = ({ label, value, icon: Icon, color, sub }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rounded-2xl p-4 flex flex-col gap-3 transition-all bg-card border border-border shadow-xs hover:border-primary/40"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
    {sub && <p className="text-[11px] truncate text-muted-foreground">{sub}</p>}
  </motion.div>
);

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PortalDashboard({ user, setPendingCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const socket = useSocket();
  const { data: clientProposals = [] } = useProposals();

  const proposalMetrics = useMemo(() => {
    const list = Array.isArray(clientProposals) ? clientProposals : [];
    const total = list.length;
    const accepted = list.filter((p) => p.status === 'accepted').length;
    const pending = list.filter((p) => ['sent', 'viewed', 'draft', 'pending'].includes(p.status)).length;
    const totalValue = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { total, accepted, pending, totalValue, list: list.slice(0, 5) };
  }, [clientProposals]);

  const fetchData = () => {
    api.get('/portal/dashboard')
      .then(r => {
        setData(r.data);
        setPendingCount?.(r.data.stats?.pendingApproval || 0);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('clientUpdated', handleUpdate);
    socket.on('portalUpdated', handleUpdate);
    socket.on('trackerUpdated', handleUpdate);
    socket.on('smmTrackerUpdated', handleUpdate);

    return () => {
      socket.off('clientUpdated', handleUpdate);
      socket.off('portalUpdated', handleUpdate);
      socket.off('trackerUpdated', handleUpdate);
      socket.off('smmTrackerUpdated', handleUpdate);
    };
  }, [socket]);

  if (loading) return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-36 w-full rounded-2xl bg-muted/60 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <TableSkeleton columns={3} rows={4} />
        <TableSkeleton columns={3} rows={4} />
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const client = data?.client || {};
  const projectMetrics = data?.projectMetrics || { total: 0, active: 0, completed: 0, projects: [] };
  const taskMetrics = data?.taskMetrics || { total: 0, completed: 0, inProgress: 0, review: 0, pending: 0, completionRate: 0, tasks: [] };
  const smmMetrics = data?.smmMetrics || {
    month: 'This Month',
    year: new Date().getFullYear(),
    reels: { planned: 0, posted: 0, pending: 0 },
    posts: { planned: 0, posted: 0, pending: 0 },
    stories: { planned: 0, posted: 0, pending: 0 },
    total: { planned: 0, posted: 0, pending: 0, completionRate: 0 },
  };
  const invoiceMetrics = data?.invoiceMetrics || {
    totalQuoted: 0,
    totalPaid: 0,
    balanceDue: 0,
    openCount: 0,
    overdueCount: 0,
    recentInvoices: [],
  };
  const adBudget = data?.adBudget;
  const tracker = data?.tracker || null;

  const handleProposalDownload = (project) => {
    try {
      exportProposalToPDF({ project, client });
      toast.success('Proposal PDF downloaded');
    } catch (error) {
      toast.error(error.message || 'Failed to download proposal PDF');
    }
  };

  const onboardingSteps = [
    { label: 'Welcome Email', done: client.onboardingSteps?.welcomeEmailSent },
    { label: 'Project Created', done: client.onboardingSteps?.projectCreated },
    { label: 'Team Assigned', done: client.onboardingSteps?.teamAssigned },
    { label: 'Portal Activated', done: client.onboardingSteps?.portalActivated },
    { label: 'Kickoff Call', done: client.onboardingSteps?.kickoffCallScheduled },
  ];
  const onboardingPct = Math.round((onboardingSteps.filter(s => s.done).length / onboardingSteps.length) * 100);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Welcome Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, #fff 0%, transparent 55%)' }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-indigo-200 text-xs font-bold tracking-wider uppercase bg-white/10 px-2.5 py-0.5 rounded-full">
                Client Portal
              </span>
              {client.company && (
                <span className="text-white/80 text-xs font-semibold">
                  • {client.company}
                </span>
              )}
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-black mb-1 tracking-tight">
              Welcome back, {client.name || user?.name || 'Client'}
            </h1>
            <p className="text-indigo-100/90 text-xs sm:text-sm max-w-xl">
              Track project deliverables, monitor SMM posts, review tasks, manage ad campaigns, and view invoices in one secure place.
            </p>

            {/* Quick Action Navigation Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-indigo-700 shadow-md shadow-indigo-950/20 transition-all hover:bg-indigo-50"
              >
                <FolderKanban size={15} />
                My Projects
              </Link>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <CheckSquare size={15} />
                My Tasks & Status
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <Calendar size={15} />
                Content Calendar
              </Link>
              <Link
                to="/portal/invoices"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <Receipt size={15} />
                Invoices & Billing
              </Link>
              <Link
                to="/client/proposals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <FileText size={15} />
                Proposals & Agreements
              </Link>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-white/10 sm:bg-transparent p-4 sm:p-0 rounded-2xl border border-white/10 sm:border-0">
            <div className="text-white/80 text-xs font-semibold mb-1">Onboarding Progress</div>
            <div className="text-white text-3xl font-black">{onboardingPct}%</div>
            <div className="w-36 h-2 rounded-full bg-white/20 mt-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${onboardingPct}%` }} />
            </div>
            <span className="text-indigo-200 text-[10px] mt-1 block">
              {onboardingSteps.filter(s => s.done).length} of {onboardingSteps.length} stages ready
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 1: SMM DELIVERABLES THIS MONTH (Reels, Posts, Stories Planned vs Posted) ── */}
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles size={17} />
              </div>
              <h2 className="text-base font-bold text-foreground">
                SMM Deliverables — {smmMetrics.month} {smmMetrics.year}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly quota tracking for Reels, Posts, and Stories configured for your brand
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {smmMetrics.total.posted} of {smmMetrics.total.planned} Completed ({smmMetrics.total.completionRate}%)
            </span>
          </div>
        </div>

        {/* Deliverables 3-Column Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Reels / Short Videos */}
          <div className="rounded-2xl p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                  <Film size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Reels / Shorts</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Video Deliverables</span>
                </div>
              </div>
              <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                {smmMetrics.reels.planned > 0
                  ? `${Math.round((smmMetrics.reels.posted / smmMetrics.reels.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300">
                  {smmMetrics.reels.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.reels.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-600/80 dark:text-purple-400">
                  {smmMetrics.reels.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-purple-200/60 dark:bg-purple-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-500"
                  style={{
                    width: `${smmMetrics.reels.planned > 0 ? Math.min(100, Math.round((smmMetrics.reels.posted / smmMetrics.reels.planned) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Feed Posts & Carousels */}
          <div className="rounded-2xl p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Feed Posts</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Graphics & Carousels</span>
                </div>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {smmMetrics.posts.planned > 0
                  ? `${Math.round((smmMetrics.posts.posted / smmMetrics.posts.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                  {smmMetrics.posts.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.posts.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-indigo-600/80 dark:text-indigo-400">
                  {smmMetrics.posts.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-indigo-200/60 dark:bg-indigo-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{
                    width: `${smmMetrics.posts.planned > 0 ? Math.min(100, Math.round((smmMetrics.posts.posted / smmMetrics.posts.planned) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Daily Stories */}
          <div className="rounded-2xl p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Daily Stories</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Stories & Updates</span>
                </div>
              </div>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                {smmMetrics.stories.planned > 0
                  ? `${Math.round((smmMetrics.stories.posted / smmMetrics.stories.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
                  {smmMetrics.stories.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.stories.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400">
                  {smmMetrics.stories.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-amber-200/60 dark:bg-amber-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${smmMetrics.stories.planned > 0 ? Math.min(100, Math.round((smmMetrics.stories.posted / smmMetrics.stories.planned) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: PROJECTS & TASK METRICS (Side-by-side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Project Metrics & Status Card */}
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FolderKanban size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">My Projects</h3>
                <p className="text-[11px] text-muted-foreground">Active pipelines and progress</p>
              </div>
            </div>
            <Link
              to="/projects"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View Projects <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
              <p className="text-xl font-black text-foreground">{projectMetrics.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Active</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{projectMetrics.active}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{projectMetrics.completed}</p>
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-3 pt-1">
            {(projectMetrics.projects || []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No active projects found
              </div>
            ) : (
              (projectMetrics.projects || []).slice(0, 3).map((p) => (
                <div key={p._id} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                      {p.dueDate && (
                        <p className="text-[10px] text-muted-foreground">
                          Due: {new Date(p.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        {p.progress || 0}%
                      </span>
                      {p.proposalText?.trim() && (
                        <button
                          type="button"
                          onClick={() => handleProposalDownload(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-secondary transition-colors"
                        >
                          <FileCheck size={11} /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Task Metrics & Status Card */}
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckSquare size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Tasks & Deliverables</h3>
                <p className="text-[11px] text-muted-foreground">Task status, progress & approvals</p>
              </div>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View Tasks <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
              <p className="text-xl font-black text-foreground">{taskMetrics.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Done</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{taskMetrics.completed}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Process</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{taskMetrics.inProgress}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Review</span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{taskMetrics.review}</p>
            </div>
          </div>

          {/* Task Items List */}
          <div className="space-y-2 pt-1">
            {(taskMetrics.tasks || []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No deliverables pending review right now.
              </div>
            ) : (
              (taskMetrics.tasks || []).slice(0, 4).map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-foreground">{t.taskTitle || t.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.taskCategory === 'non_content' ? 'Development / Operations' : 'Content Deliverable'}
                      {t.dueDate && ` • Due ${new Date(t.dueDate).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: CLIENT INVOICES & FINANCE (Strictly Client Scoped) ── */}
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Invoices & Billing Summary</h2>
              <p className="text-xs text-muted-foreground">Individual invoicing details, amounts quoted, payments received, and balance</p>
            </div>
          </div>
          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all self-start sm:self-center"
          >
            View All Invoices <ArrowRight size={13} />
          </Link>
        </div>

        {/* 4 Financial Metrics for the Client */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Quoted</span>
            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{fmt(invoiceMetrics.totalQuoted)}</p>
            <span className="text-[10px] text-muted-foreground block">Cumulative invoice value</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Paid</span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{fmt(invoiceMetrics.totalPaid)}</p>
            <span className="text-[10px] text-muted-foreground block">Verified payments received</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Balance Due</span>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{fmt(invoiceMetrics.balanceDue)}</p>
            <span className="text-[10px] text-muted-foreground block">Pending balance to clear</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Open Invoices</span>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300">{invoiceMetrics.openCount}</p>
            <span className="text-[10px] text-muted-foreground block">Awaiting payment</span>
          </div>
        </div>

        {/* Recent Invoices Table */}
        {(invoiceMetrics.recentInvoices || []).length > 0 && (
          <div className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Quoted Amount</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {invoiceMetrics.recentInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-muted-foreground">{inv.project?.name || 'Project'}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">{fmt(inv.totalAmount || inv.total)}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{fmt(inv.paidAmount)}</td>
                      <td className="py-3 px-3 font-semibold text-amber-600 dark:text-amber-400">{fmt(inv.balanceAmount || ((inv.totalAmount || inv.total || 0) - (inv.paidAmount || 0)))}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                          inv.status === 'overdue' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                          'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                          {inv.status ? inv.status.toUpperCase() : 'SENT'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => exportInvoiceToPDF(inv, { save: true })}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          <Download size={12} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION: PROPOSALS & CONTRACTS ── */}
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Proposals & Scope Agreements</h2>
              <p className="text-xs text-muted-foreground">Review project proposals, service scopes, deliverables, and confirm acceptance</p>
            </div>
          </div>
          <Link
            to="/client/proposals"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all self-start sm:self-center"
          >
            Proposal Dashboard <ArrowRight size={13} />
          </Link>
        </div>

        {/* Proposal KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Proposals</span>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{proposalMetrics.total}</p>
            <span className="text-[10px] text-muted-foreground block">Formal agreements</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Accepted</span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{proposalMetrics.accepted}</p>
            <span className="text-[10px] text-muted-foreground block">Active signed agreements</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Awaiting Decision</span>
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{proposalMetrics.pending}</p>
            <span className="text-[10px] text-muted-foreground block">Pending your review</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Agreement Value</span>
            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{fmt(proposalMetrics.totalValue)}</p>
            <span className="text-[10px] text-muted-foreground block">Total contract value</span>
          </div>
        </div>

        {/* Proposals Table */}
        {proposalMetrics.list.length > 0 ? (
          <div className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Proposal #</th>
                    <th className="py-2.5 px-3">Title & Scope</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {proposalMetrics.list.map((prop) => (
                    <tr key={prop._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground font-mono">{prop.proposalNumber || 'PROP-DRAFT'}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-foreground block truncate max-w-[200px]">{prop.title}</span>
                        {prop.timeline && <span className="text-[11px] text-muted-foreground">{prop.timeline}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-medium">
                          {(prop.serviceCategory || prop.proposalType || 'General').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">{fmt(prop.amount)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prop.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                          prop.status === 'rejected' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                          'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                          {(prop.status || 'draft').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/proposals/${prop._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-600/10 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white transition-all font-semibold text-xs"
                        >
                          <span>{prop.status === 'accepted' ? 'View' : 'Review & Sign'}</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center bg-card/40">
            <FileText size={28} className="mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No proposals active right now. Official proposals sent by RiseWithMedia will be displayed here.</p>
          </div>
        )}
      </div>

      {/* ── SECTION 4: CLIENT AD BUDGET & CAMPAIGNS ── */}
      {adBudget && (
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Megaphone size={17} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Ad Budget & Live Campaigns</h2>
                <p className="text-xs text-muted-foreground">Live campaign spend configured by your media team</p>
              </div>
            </div>
            {adBudget.notes && (
              <div className="text-[11px] px-3 py-1 rounded-xl bg-primary/10 text-primary font-medium flex items-center gap-1.5 max-w-md truncate">
                <FileText size={13} className="shrink-0" />
                <span className="truncate">Note: {adBudget.notes}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Budget</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.monthlyBudget)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Budget</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.dailyBudget)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount Added</span>
              <p className="text-xl font-black text-amber-500">{fmt(adBudget.amountAdded)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available Balance</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{fmt(adBudget.balance)}</p>
            </div>
          </div>

          {/* Active Campaigns List */}
          {(adBudget.campaigns || []).length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold mb-2 text-foreground">Configured Campaigns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {adBudget.campaigns.map((c) => (
                  <div key={c._id} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 flex flex-col justify-between space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                          {c.platform || 'Meta Ads'}
                        </span>
                        <h4 className="text-xs font-bold mt-1.5 text-foreground">{c.name}</h4>
                        {c.objective && <p className="text-[10px] text-muted-foreground">{c.objective}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'Active' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.status || 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/30 text-[11px]">
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Added</span>
                        <p className="font-bold text-foreground">{fmt(c.amountAdded)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Spent</span>
                        <p className="font-bold text-rose-500">{fmt(c.amountSpent)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Balance</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.balance)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 5: SMM MONTHLY TRACKER SHEET (Day-by-Day Client Scope) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl p-5 sm:p-6 space-y-4 bg-card border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Calendar size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {smmMetrics?.month || 'Monthly'} SMM Tracker Sheet
                </h3>
                <p className="text-xs text-muted-foreground">
                  Live day-by-day status of your posts, reels, and daily stories
                </p>
              </div>
            </div>
            <Link
              to="/portal/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-all self-start sm:self-center"
            >
              Full Tracker Sheet <ArrowRight size={13} />
            </Link>
          </div>

          {!tracker || (tracker?.days || []).length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">SMM Monthly Tracker is being scheduled for your brand</p>
            </div>
          ) : (
            <div className="responsive-table-container custom-scrollbar">
              <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3 w-16">Day</th>
                    <th className="py-2.5 px-3">Post / Reel Topic</th>
                    <th className="py-2.5 px-3 w-24 text-center">Post</th>
                    <th className="py-2.5 px-3">Story</th>
                    <th className="py-2.5 px-3 w-24 text-center">Story</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(tracker?.days || []).slice(0, 15).map((d) => {
                    const nowDay = new Date().getDate();
                    const isToday = d.day === nowDay;
                    const isSunday = new Date(tracker?.year || new Date().getFullYear(), (tracker?.month || new Date().getMonth() + 1) - 1, d.day).getDay() === 0;

                    return (
                      <tr
                        key={d.day}
                        className={`transition-colors ${
                          isToday ? 'bg-primary/10 font-medium' : isSunday ? 'bg-amber-500/5' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] ${
                            isToday ? 'bg-primary text-primary-foreground font-black' : isSunday ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground'
                          }`}>
                            {d.day}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {d.postLabel ? (
                            <span className="font-semibold text-foreground truncate max-w-xs block">
                              {d.postLabel}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 italic">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.postStatus === 'done' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            d.postStatus === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {d.postStatus === 'done' ? 'DONE' : d.postStatus === 'pending' ? 'PENDING' : 'TODO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[140px]">
                          {d.storyLabel || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.storyStatus === 'done' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            d.storyStatus === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {d.storyStatus === 'done' ? 'DONE' : d.storyStatus === 'pending' ? 'PENDING' : 'TODO'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(tracker?.days || []).length > 15 && (
                <div className="pt-3 text-center border-t border-border/40">
                  <Link
                    to="/portal/tracker"
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                  >
                    View All {tracker?.days?.length || 0} Days in SMM Tracker <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Onboarding Checklist Card */}
        <div className="rounded-3xl p-5 sm:p-6 space-y-3 bg-card border border-border shadow-xs">
          <h3 className="text-sm font-bold pb-2 border-b border-border/50 text-foreground">Onboarding Status</h3>
          <div className="space-y-2.5 pt-1">
            {onboardingSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${
                    s.done ? 'bg-emerald-500' : 'bg-muted border border-border text-muted-foreground'
                  }`}
                >
                  {s.done ? '✓' : ''}
                </div>
                <span className={`text-xs font-medium ${s.done ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    'Draft': '#64748b', 'Editing': '#3b82f6', 'Send to Client': '#f59e0b',
    'Revision Requested': '#ef4444', 'Approved': '#10b981',
    'Scheduled': '#8b5cf6', 'Posted': '#14b8a6', 'Done': '#6366f1',
  };
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[status] || '#64748b' }} />;
}

export function StatusBadge({ status }) {
  const map = {
    'Draft':              { bg: 'bg-slate-500/15', color: 'text-slate-600 dark:text-slate-400', label: 'Draft' },
    'Editing':            { bg: 'bg-blue-500/15', color: 'text-blue-600 dark:text-blue-400', label: 'Editing' },
    'Send to Client':     { bg: 'bg-amber-500/15', color: 'text-amber-600 dark:text-amber-400', label: 'For Review' },
    'Revision Requested': { bg: 'bg-rose-500/15', color: 'text-rose-600 dark:text-rose-400', label: 'Revision' },
    'Approved':           { bg: 'bg-emerald-500/15', color: 'text-emerald-600 dark:text-emerald-400', label: 'Approved' },
    'Scheduled':          { bg: 'bg-purple-500/15', color: 'text-purple-600 dark:text-purple-400', label: 'Scheduled' },
    'Posted':             { bg: 'bg-teal-500/15', color: 'text-teal-600 dark:text-teal-400', label: 'Posted' },
    'Done':               { bg: 'bg-indigo-500/15', color: 'text-indigo-600 dark:text-indigo-400', label: 'Done' },
  };
  const s = map[status] || { bg: 'bg-secondary', color: 'text-muted-foreground', label: status };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}
