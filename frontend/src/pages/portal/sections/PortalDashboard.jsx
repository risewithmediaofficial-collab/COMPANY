import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api';
import {
  FileCheck, BarChart3, CheckCircle2, Clock, FolderKanban,
  Receipt, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight,
  Layers, Star, Activity, Calendar, FileText, IndianRupee,
  Film, Sparkles, CheckSquare, ArrowRight, ExternalLink,
  Megaphone, CreditCard, Download, ShieldCheck, Check
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import { useSocket } from '../../../context/SocketContext';
import { useDateFilter } from '../../../context/DateFilterContext';
import { exportProposalToPDF, exportInvoiceToPDF } from '../../../utils/pdfExport';
import { CardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { useProposals } from '../../../hooks/useProposals';

const KPICard = ({ label, value, icon: Icon, sub }) => (
  <div
    className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-150 hover:-translate-y-0.5 bg-card "
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
    </div>
    <p className="text-2xl font-black tracking-tight tabular-nums leading-none text-foreground">{value}</p>
    {sub && <p className="text-[11px] truncate text-muted-foreground">{sub}</p>}
  </div>
);

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PortalDashboard({ user, setPendingCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const socket = useSocket();
  const { isDateInRange, isFiltered: isDateFiltered } = useDateFilter();
  const { data: clientProposals = [] } = useProposals();

  const proposalMetrics = useMemo(() => {
    const list = (Array.isArray(clientProposals) ? clientProposals : []).filter((p) =>
      isDateInRange([p.sentDate, p.createdAt, p.validUntil])
    );
    const total = list.length;
    const accepted = list.filter((p) => p.status === 'accepted').length;
    const pending = list.filter((p) => ['sent', 'viewed', 'draft', 'pending'].includes(p.status)).length;
    const totalValue = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { total, accepted, pending, totalValue, list: list.slice(0, 5) };
  }, [clientProposals, isDateInRange]);

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

    const portalEvents = [
      'clientUpdated',
      'portalUpdated',
      'trackerUpdated',
      'smmTrackerUpdated',
      'taskUpdated',
      'projectUpdated',
      'financeUpdated',
      'invoicePaid',
      'contentProductionUpdated',
    ];

    portalEvents.forEach((evt) => socket.on(evt, handleUpdate));

    return () => {
      portalEvents.forEach((evt) => socket.off(evt, handleUpdate));
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
  const rawProjectMetrics = data?.projectMetrics || { total: 0, active: 0, completed: 0, projects: [] };
  const filteredProjects = (rawProjectMetrics.projects || []).filter((p) =>
    isDateInRange([p.startDate, p.dueDate, p.createdAt])
  );
  const projectMetrics = isDateFiltered
    ? {
        total: filteredProjects.length,
        active: filteredProjects.filter((p) => ['active', 'in_progress', 'planning'].includes(p.status)).length,
        completed: filteredProjects.filter((p) => ['completed', 'done'].includes(p.status)).length,
        projects: filteredProjects,
      }
    : rawProjectMetrics;

  const rawTaskMetrics = data?.taskMetrics || { total: 0, completed: 0, inProgress: 0, review: 0, pending: 0, completionRate: 0, tasks: [] };
  const filteredTasks = (rawTaskMetrics.tasks || []).filter((t) =>
    isDateInRange([t.dueDate, t.createdAt])
  );
  const taskMetrics = isDateFiltered
    ? {
        ...rawTaskMetrics,
        total: filteredTasks.length,
        completed: filteredTasks.filter((t) => ['done', 'approved', 'completed', 'Completed', 'Done', 'Approved'].includes(t.status)).length,
        inProgress: filteredTasks.filter((t) => ['in_progress', 'on_process', 'review', 'In Progress', 'Internal Approval', 'review_required', 'rework'].includes(t.status)).length,
        review: filteredTasks.filter((t) => ['client_approval', 'waiting_for_client', 'Client Approval'].includes(t.status)).length,
        tasks: filteredTasks,
      }
    : rawTaskMetrics;

  const smmMetrics = data?.smmMetrics || {
    month: 'This Month',
    year: new Date().getFullYear(),
    reels: { planned: 0, posted: 0, pending: 0 },
    posts: { planned: 0, posted: 0, pending: 0 },
    stories: { planned: 0, posted: 0, pending: 0 },
    total: { planned: 0, posted: 0, pending: 0, completionRate: 0 },
  };
  const rawInvoiceMetrics = data?.invoiceMetrics || {
    totalQuoted: 0,
    totalPaid: 0,
    balanceDue: 0,
    openCount: 0,
    overdueCount: 0,
    recentInvoices: [],
  };
  const filteredInvoices = (rawInvoiceMetrics.recentInvoices || []).filter((inv) =>
    isDateInRange([inv.invoiceDate, inv.dueDate, inv.createdAt])
  );
  const invoiceMetrics = isDateFiltered
    ? {
        ...rawInvoiceMetrics,
        totalQuoted: filteredInvoices.reduce((sum, item) => sum + Number(item.totalAmount || item.total || 0), 0),
        totalPaid: filteredInvoices.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
        balanceDue: filteredInvoices.reduce(
          (sum, item) => sum + Number(item.balanceAmount !== undefined ? item.balanceAmount : Math.max(0, (item.totalAmount || item.total || 0) - (item.paidAmount || 0))),
          0
        ),
        openCount: filteredInvoices.filter((item) => ['sent', 'overdue', 'partially_paid', 'draft'].includes(String(item.status).toLowerCase())).length,
        recentInvoices: filteredInvoices,
      }
    : rawInvoiceMetrics;

  const rawAdBudget = data?.adBudget;
  const adBudget = rawAdBudget && isDateFiltered
    ? {
        ...rawAdBudget,
        campaigns: (rawAdBudget.campaigns || []).filter((c) => isDateInRange([c.updatedAt, c.createdAt])),
      }
    : rawAdBudget;
  const tracker = data?.tracker || null;

  const handleProposalDownload = async (project) => {
    try {
      await exportProposalToPDF({ project, client });
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
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-zinc-950 text-zinc-50 ring-1 ring-brand/25"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {client.company && (
              <span className="inline-block text-brand text-xs font-bold uppercase tracking-wider mb-1">
                {client.company}
              </span>
            )}
            <h1 className="text-zinc-50 text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {client.name || user?.name || 'Client'}
            </h1>

            {/* Quick Action Navigation Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-black text-brand-foreground shadow-[0_6px_18px_-6px_rgba(18,183,212,0.65)] transition-all hover:bg-brand/90"
              >
                <FolderKanban size={15} />
                <span>My Projects</span>
              </Link>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-100 ring-1 ring-white/10 transition-all hover:bg-zinc-800 hover:ring-brand/40"
              >
                <CheckSquare size={15} className="text-brand" />
                <span>My Tasks &amp; Status</span>
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-100 ring-1 ring-white/10 transition-all hover:bg-zinc-800 hover:ring-brand/40"
              >
                <Calendar size={15} className="text-brand" />
                <span>Content Calendar</span>
              </Link>
              <Link
                to="/portal/invoices"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-100 ring-1 ring-white/10 transition-all hover:bg-zinc-800 hover:ring-brand/40"
              >
                <Receipt size={15} className="text-brand" />
                <span>Invoices &amp; Billing</span>
              </Link>
              <Link
                to="/client/proposals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-100 ring-1 ring-white/10 transition-all hover:bg-zinc-800 hover:ring-brand/40"
              >
                <FileText size={15} className="text-brand" />
                <span>Proposals &amp; Agreements</span>
              </Link>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-zinc-900 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:border-0">
            <div className="text-zinc-400 text-xs font-semibold mb-1">Onboarding Progress</div>
            <div className="text-brand text-3xl font-black tabular-nums leading-none">{onboardingPct}%</div>
            <div className="w-36 h-2 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${onboardingPct}%` }} />
            </div>
            <span className="text-zinc-400 text-[10px] mt-1 block tabular-nums">
              {onboardingSteps.filter(s => s.done).length} of {onboardingSteps.length} stages ready
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: SMM DELIVERABLES THIS MONTH (Reels, Posts, Stories Planned vs Posted) ── */}
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <Sparkles size={17} />
            </div>
            <h2 className="text-base font-bold text-foreground">
              SMM Deliverables — {smmMetrics.month} {smmMetrics.year}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-foreground tabular-nums">
              {smmMetrics.total.posted} of {smmMetrics.total.planned} Completed ({smmMetrics.total.completionRate}%)
            </span>
          </div>
        </div>

        {/* Deliverables 3-Column Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Reels / Short Videos */}
          <div className="rounded-2xl p-4 bg-secondary/40 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-card text-foreground flex items-center justify-center shrink-0">
                  <Film size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Reels / Shorts</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Video Deliverables</span>
                </div>
              </div>
              <span className="text-xs font-black text-foreground tabular-nums">
                {smmMetrics.reels.planned > 0
                  ? `${Math.round((smmMetrics.reels.posted / smmMetrics.reels.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1 tabular-nums">
                <span className="text-2xl font-black text-foreground">
                  {smmMetrics.reels.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.reels.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {smmMetrics.reels.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden ">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${smmMetrics.reels.planned > 0 ? Math.min(100, Math.round((smmMetrics.reels.posted / smmMetrics.reels.planned) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Feed Posts & Carousels */}
          <div className="rounded-2xl p-4 bg-secondary/40 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-card text-foreground flex items-center justify-center shrink-0">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Feed Posts</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Graphics &amp; Carousels</span>
                </div>
              </div>
              <span className="text-xs font-black text-foreground tabular-nums">
                {smmMetrics.posts.planned > 0
                  ? `${Math.round((smmMetrics.posts.posted / smmMetrics.posts.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1 tabular-nums">
                <span className="text-2xl font-black text-foreground">
                  {smmMetrics.posts.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.posts.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {smmMetrics.posts.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden ">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${smmMetrics.posts.planned > 0 ? Math.min(100, Math.round((smmMetrics.posts.posted / smmMetrics.posts.planned) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Daily Stories */}
          <div className="rounded-2xl p-4 bg-secondary/40 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-card text-foreground flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Daily Stories</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Stories &amp; Updates</span>
                </div>
              </div>
              <span className="text-xs font-black text-foreground tabular-nums">
                {smmMetrics.stories.planned > 0
                  ? `${Math.round((smmMetrics.stories.posted / smmMetrics.stories.planned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1 tabular-nums">
                <span className="text-2xl font-black text-foreground">
                  {smmMetrics.stories.posted}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">/ {smmMetrics.stories.planned} posted</span>
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {smmMetrics.stories.pending} to post
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden ">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
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
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
          <div className="flex items-center justify-between pb-3 ">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <FolderKanban size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">My Projects</h3>
              </div>
            </div>
            <Link
              to="/projects"
              className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
            >
              View Projects <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 tabular-nums">
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
              <p className="text-xl font-black text-foreground">{projectMetrics.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active</span>
              <p className="text-xl font-black text-foreground">{projectMetrics.active}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</span>
              <p className="text-xl font-black text-foreground">{projectMetrics.completed}</p>
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
                <div key={p._id} className="p-3.5 rounded-2xl bg-secondary/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                      {p.dueDate && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          Due: {new Date(p.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-extrabold text-foreground tabular-nums">
                        {p.progress || 0}%
                      </span>
                      {p.proposalText?.trim() && (
                        <button
                          type="button"
                          onClick={() => handleProposalDownload(p)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <FileCheck size={11} /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-500"
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Task Metrics & Status Card */}
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
          <div className="flex items-center justify-between pb-3 ">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <CheckSquare size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Tasks &amp; Deliverables</h3>
              </div>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
            >
              View Tasks <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2 tabular-nums">
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
              <p className="text-xl font-black text-foreground">{taskMetrics.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Done</span>
              <p className="text-xl font-black text-foreground">{taskMetrics.completed}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Process</span>
              <p className="text-xl font-black text-foreground">{taskMetrics.inProgress}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Review</span>
              <p className="text-xl font-black text-foreground">{taskMetrics.review}</p>
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
                <div key={t._id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/30 ">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-foreground">{t.taskTitle || t.title}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {t.taskCategory === 'non_content' ? 'Development / Operations' : 'Content Deliverable'}
                      {t.dueDate && ` • Due ${new Date(t.dueDate).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-foreground shrink-0">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: CLIENT INVOICES & FINANCE (Strictly Client Scoped) ── */}
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 ">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <Receipt size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Invoices &amp; Billing Summary</h2>
            </div>
          </div>
          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all self-start sm:self-center"
          >
            View All Invoices <ArrowRight size={13} />
          </Link>
        </div>

        {/* 4 Financial Metrics for the Client */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Quoted</span>
            <p className="text-xl font-black text-foreground">{fmt(invoiceMetrics.totalQuoted)}</p>
            <span className="text-[10px] text-muted-foreground block">Cumulative invoice value</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Paid</span>
            <p className="text-xl font-black text-foreground">{fmt(invoiceMetrics.totalPaid)}</p>
            <span className="text-[10px] text-muted-foreground block">Verified payments received</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Balance Due</span>
            <p className="text-xl font-black text-foreground">{fmt(invoiceMetrics.balanceDue)}</p>
            <span className="text-[10px] text-muted-foreground block">Pending balance to clear</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Invoices</span>
            <p className="text-xl font-black text-foreground">{invoiceMetrics.openCount}</p>
            <span className="text-[10px] text-muted-foreground block">Awaiting payment</span>
          </div>
        </div>

        {/* Recent Invoices Table */}
        {(invoiceMetrics.recentInvoices || []).length > 0 && (
          <div className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Quoted Amount</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {invoiceMetrics.recentInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-muted-foreground">{inv.project?.name || 'Project'}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">{fmt(inv.totalAmount || inv.total)}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">{fmt(inv.paidAmount)}</td>
                      <td className="py-3 px-3 font-semibold text-muted-foreground">{fmt(inv.balanceAmount || ((inv.totalAmount || inv.total || 0) - (inv.paidAmount || 0)))}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}>
                          {inv.status ? inv.status.toUpperCase() : 'SENT'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => exportInvoiceToPDF(inv, { save: true })}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
      <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 ">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <FileText size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Proposals &amp; Scope Agreements</h2>
            </div>
          </div>
          <Link
            to="/client/proposals"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all self-start sm:self-center"
          >
            Proposal Dashboard <ArrowRight size={13} />
          </Link>
        </div>

        {/* Proposal KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Proposals</span>
            <p className="text-xl font-black text-foreground">{proposalMetrics.total}</p>
            <span className="text-[10px] text-muted-foreground block">Formal agreements</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accepted</span>
            <p className="text-xl font-black text-foreground">{proposalMetrics.accepted}</p>
            <span className="text-[10px] text-muted-foreground block">Active signed agreements</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting Decision</span>
            <p className="text-xl font-black text-foreground">{proposalMetrics.pending}</p>
            <span className="text-[10px] text-muted-foreground block">Pending your review</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agreement Value</span>
            <p className="text-xl font-black text-foreground">{fmt(proposalMetrics.totalValue)}</p>
            <span className="text-[10px] text-muted-foreground block">Total contract value</span>
          </div>
        </div>

        {/* Proposals Table */}
        {proposalMetrics.list.length > 0 ? (
          <div className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Proposal #</th>
                    <th className="py-2.5 px-3">Title &amp; Scope</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
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
                          prop.status === 'accepted'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}>
                          {(prop.status || 'draft').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/proposals/${prop._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all font-semibold text-xs"
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
          <div className="rounded-2xl py-8 text-center bg-card/40">
            <FileText size={28} className="mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-xs font-semibold text-foreground">No proposals yet</p>
          </div>
        )}
      </div>

      {/* ── SECTION 4: CLIENT AD BUDGET & CAMPAIGNS ── */}
      {adBudget && (
        <div className="rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 ">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Megaphone size={17} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Ad Budget &amp; Live Campaigns</h2>
              </div>
            </div>
            {adBudget.notes && (
              <div className="text-[11px] px-3 py-1 rounded-xl bg-secondary text-foreground font-medium flex items-center gap-1.5 max-w-md truncate">
                <FileText size={13} className="shrink-0" />
                <span className="truncate">Note: {adBudget.notes}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Budget</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.monthlyBudget)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Budget</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.dailyBudget)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount Added</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.amountAdded)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available Balance</span>
              <p className="text-xl font-black text-foreground">{fmt(adBudget.balance)}</p>
            </div>
          </div>

          {/* Active Campaigns List */}
          {(adBudget.campaigns || []).length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold mb-2 text-foreground">Configured Campaigns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {adBudget.campaigns.map((c) => (
                  <div key={c._id} className="p-3.5 rounded-2xl bg-secondary/30 flex flex-col justify-between space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground">
                          {c.platform || 'Meta Ads'}
                        </span>
                        <h4 className="text-xs font-bold mt-1.5 text-foreground">{c.name}</h4>
                        {c.objective && <p className="text-[10px] text-muted-foreground">{c.objective}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'Active' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.status || 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] tabular-nums">
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Added</span>
                        <p className="font-bold text-foreground">{fmt(c.amountAdded)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Spent</span>
                        <p className="font-bold text-muted-foreground">{fmt(c.amountSpent)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">Balance</span>
                        <p className="font-bold text-foreground">{fmt(c.balance)}</p>
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
        <div className="lg:col-span-2 rounded-3xl p-5 sm:p-6 space-y-4 bg-card ">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 ">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Calendar size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {smmMetrics?.month || 'Monthly'} SMM Tracker Sheet
                </h3>
              </div>
            </div>
            <Link
              to="/portal/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all self-start sm:self-center"
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
                  <tr className="text-[10px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3 w-16">Day</th>
                    <th className="py-2.5 px-3">Post / Reel Topic</th>
                    <th className="py-2.5 px-3 w-24 text-center">Post</th>
                    <th className="py-2.5 px-3">Story</th>
                    <th className="py-2.5 px-3 w-24 text-center">Story</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {(tracker?.days || []).slice(0, 15).map((d) => {
                    const nowDay = new Date().getDate();
                    const isToday = d.day === nowDay;
                    const isSunday = new Date(tracker?.year || new Date().getFullYear(), (tracker?.month || new Date().getMonth() + 1) - 1, d.day).getDay() === 0;

                    return (
                      <tr
                        key={d.day}
                        className={`transition-colors ${
                          isToday ? 'bg-secondary font-medium' : isSunday ? 'bg-muted/30' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] ${
                            isToday ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground'
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
                            d.postStatus === 'done'
                              ? 'bg-primary text-primary-foreground'
                              : d.postStatus === 'pending'
                              ? 'bg-secondary text-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {d.postStatus === 'done' ? 'DONE' : d.postStatus === 'pending' ? 'PENDING' : 'TODO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[140px]">
                          {d.storyLabel || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.storyStatus === 'done'
                              ? 'bg-primary text-primary-foreground'
                              : d.storyStatus === 'pending'
                              ? 'bg-secondary text-foreground'
                              : 'bg-muted text-muted-foreground'
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
                <div className="pt-3 text-center ">
                  <Link
                    to="/portal/tracker"
                    className="text-xs font-bold text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    View All {tracker?.days?.length || 0} Days in SMM Tracker <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Onboarding Checklist Card */}
        <div className="rounded-3xl p-5 sm:p-6 space-y-3 bg-card ">
          <h3 className="text-sm font-bold pb-2 text-foreground">Onboarding Status</h3>
          <div className="space-y-2.5 pt-1">
            {onboardingSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    s.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.done ? <Check size={11} /> : null}
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
    'Draft': '#a1a1aa', 'Editing': '#71717a', 'Send to Client': '#52525b',
    'Revision Requested': '#3f3f46', 'Approved': '#18181b',
    'Scheduled': '#71717a', 'Posted': '#27272a', 'Done': '#18181b',
  };
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[status] || '#71717a' }} />;
}

export function StatusBadge({ status }) {
  const map = {
    'Draft':              { bg: 'bg-secondary', color: 'text-muted-foreground', label: 'Draft' },
    'Editing':            { bg: 'bg-secondary', color: 'text-foreground', label: 'Editing' },
    'Send to Client':     { bg: 'bg-secondary', color: 'text-foreground', label: 'For Review' },
    'Revision Requested': { bg: 'bg-secondary', color: 'text-foreground', label: 'Revision' },
    'Approved':           { bg: 'bg-primary', color: 'text-primary-foreground', label: 'Approved' },
    'Scheduled':          { bg: 'bg-secondary', color: 'text-foreground', label: 'Scheduled' },
    'Posted':             { bg: 'bg-primary', color: 'text-primary-foreground', label: 'Posted' },
    'Done':               { bg: 'bg-primary', color: 'text-primary-foreground', label: 'Done' },
  };
  const s = map[status] || { bg: 'bg-secondary', color: 'text-muted-foreground', label: status };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}
