import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  PlusCircle,
  Edit3,
  Trash2,
  LogIn,
  RotateCcw,
  CheckCircle2,
  Layers,
  Calendar,
  Building2,
  Briefcase,
  CheckSquare,
  TrendingUp,
  CreditCard,
  Share2,
  Lock,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
} from 'lucide-react';
import api from '../../api';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';

const MODULE_OPTIONS = [
  { id: 'all', label: 'All Modules', icon: Layers },
  { id: 'task', label: 'Tasks', icon: CheckSquare },
  { id: 'project', label: 'Projects', icon: Briefcase },
  { id: 'client', label: 'Clients', icon: Building2 },
  { id: 'lead', label: 'Leads & CRM', icon: TrendingUp },
  { id: 'expense', label: 'Expenses', icon: CreditCard },
  { id: 'invoice', label: 'Invoices', icon: CreditCard },
  { id: 'smm', label: 'Social & SMM', icon: Share2 },
  { id: 'auth', label: 'Auth & Logins', icon: Lock },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'recycle_bin', label: 'Recycle Bin', icon: Trash2 },
];

const ACTION_GROUPS = [
  { id: 'all', label: 'All Actions' },
  { id: 'login', label: '🔑 Logins' },
  { id: 'create', label: '➕ Created' },
  { id: 'update', label: '✏️ Updated' },
  { id: 'delete', label: '🗑️ Deleted' },
];

const TIMEFRAMES = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Past 7 Days' },
  { id: 'month', label: 'Past 30 Days' },
];

export default function AuditLogs() {
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserId = currentUser?._id;
  const socket = useSocket();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    todayCount: 0,
    loginCount: 0,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedActionGroup, setSelectedActionGroup] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [filterMyActionsOnly, setFilterMyActionsOnly] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Fetch audit logs from backend
  const fetchAuditLogs = useCallback(
    async (currentPage = page) => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: 35,
          search: searchTerm.trim() || undefined,
          entityType: selectedModule !== 'all' ? selectedModule : undefined,
          actionType: selectedActionGroup !== 'all' ? selectedActionGroup : undefined,
          timeframe: selectedTimeframe !== 'all' ? selectedTimeframe : undefined,
          actor: filterMyActionsOnly ? 'me' : undefined,
        };

        const res = await api.get('/reports/audit-logs', { params });
        if (res.data?.success) {
          setLogs(res.data.logs || []);
          setTotal(res.data.total || 0);
          setPages(res.data.pages || 1);
          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    },
    [page, searchTerm, selectedModule, selectedActionGroup, selectedTimeframe, filterMyActionsOnly]
  );

  useEffect(() => {
    fetchAuditLogs(1);
  }, [fetchAuditLogs]);

  // Real-time listener for live activity events
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (newLog) => {
      if (!newLog || !newLog._id) return;

      // If user is currently filtering by module or action and it doesn't match, still update stats
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        todayCount: prev.todayCount + 1,
        loginCount: /login|auth/i.test(newLog.action) ? prev.loginCount + 1 : prev.loginCount,
        createdCount: /created|added/i.test(newLog.action) ? prev.createdCount + 1 : prev.createdCount,
        updatedCount: /updated|edited|status/i.test(newLog.action) ? prev.updatedCount + 1 : prev.updatedCount,
        deletedCount: /deleted|removed/i.test(newLog.action) ? prev.deletedCount + 1 : prev.deletedCount,
      }));

      // Prepend to visible list
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      setTotal((prev) => prev + 1);
    };

    socket.on('activityLogged', handleNewActivity);
    return () => {
      socket.off('activityLogged', handleNewActivity);
    };
  }, [socket]);

  // Helper: Format relative time
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper: Action Badge & Icon
  const getActionDesign = (action = '') => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('auth')) {
      return {
        icon: LogIn,
        label: 'User Login',
        badge: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300 dark:border-purple-800',
        dot: 'bg-purple-500',
      };
    }
    if (act.includes('delete') || act.includes('removed') || act.includes('purged')) {
      return {
        icon: Trash2,
        label: 'Deleted',
        badge: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
      };
    }
    if (act.includes('restored')) {
      return {
        icon: RotateCcw,
        label: 'Restored',
        badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-300 dark:border-indigo-800',
        dot: 'bg-indigo-500',
      };
    }
    if (act.includes('created') || act.includes('added') || act.includes('register')) {
      return {
        icon: PlusCircle,
        label: 'Created',
        badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    }
    return {
      icon: Edit3,
      label: 'Updated',
      badge: 'bg-sky-500/10 text-sky-700 border-sky-300 dark:text-sky-300 dark:border-sky-800',
      dot: 'bg-sky-500',
    };
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck size={13} className="stroke-[2.5]" />
              System Audit Logs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE FEED
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Activity & Change History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Real-time audit log of all operations across the platform — user logins, creates, updates, and deletions, including your own actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMyActionsOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border transition-all cursor-pointer ${
              filterMyActionsOnly
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <User size={13} />
            <span>{filterMyActionsOnly ? 'Showing: My Actions Only' : 'Filter: My Actions Only'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchAuditLogs(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-500' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Events
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">All matching logs</span>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-500/5 to-transparent p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Clock size={12} /> Today's Events
          </span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.todayCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Since 12:00 AM</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-500/5 to-transparent p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <LogIn size={12} /> Logins
          </span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {stats.loginCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">User sessions</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/5 to-transparent p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <PlusCircle size={12} /> Created
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.createdCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">New records</span>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-500/5 to-transparent p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <Edit3 size={12} /> Updates
          </span>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {stats.updatedCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Edits & statuses</span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-500/5 to-transparent p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <Trash2 size={12} /> Deletions
          </span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.deletedCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Archived items</span>
        </div>
      </div>

      {/* ── 3. FILTER BAR ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, title, user..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl dark:bg-slate-800 self-stretch sm:self-auto overflow-x-auto">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedTimeframe === t.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Group Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={11} /> Action:
          </span>
          {ACTION_GROUPS.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setSelectedActionGroup(act.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedActionGroup === act.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* Module / Entity Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Module:
          </span>
          {MODULE_OPTIONS.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedModule === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModule(m.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon size={12} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. AUDIT LOGS LIST ── */}
      <div className="space-y-3">
        {loading && logs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="mx-auto h-8 w-8 text-indigo-500 animate-spin mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Loading audit logs...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Querying database for real-time activity events
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No audit logs found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No activity logs match your selected filter criteria. Try resetting filters or clearing the search term.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('all');
                setSelectedActionGroup('all');
                setSelectedTimeframe('all');
                setFilterMyActionsOnly(false);
              }}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          logs.map((log) => {
            const design = getActionDesign(log.action);
            const ActionIcon = design.icon;
            const isMe = String(log.actor?._id || log.actor) === String(currentUserId);
            const isExpanded = expandedLogId === log._id;

            return (
              <div
                key={log._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  {/* Left: User Avatar & Activity Description */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Actor Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-black text-sm dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {log.actor?.name ? log.actor.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${design.dot}`}
                        title={design.label}
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Name */}
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {log.actor?.name || 'System / Automated'}
                        </span>

                        {/* Is You Pill */}
                        {isMe && (
                          <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            YOU
                          </span>
                        )}

                        {/* Actor Role */}
                        {log.actor?.role && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {log.actor.role}
                          </span>
                        )}

                        {/* Action Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${design.badge}`}
                        >
                          <ActionIcon size={10} />
                          <span>{log.action}</span>
                        </span>

                        {/* Entity Type Tag */}
                        {log.entityType && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {log.entityType}
                          </span>
                        )}
                      </div>

                      {/* Main Title & Description */}
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {log.title}
                      </p>
                      {log.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {log.description}
                        </p>
                      )}

                      {/* Associated Client / Project Pills */}
                      {(log.relatedClient || log.relatedProject) && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 flex-wrap">
                          {log.relatedClient && (
                            <span className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              <Building2 size={11} className="text-indigo-500" />
                              {log.relatedClient.company || log.relatedClient.name || 'Client'}
                            </span>
                          )}
                          {log.relatedProject && (
                            <span className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              <Briefcase size={11} className="text-sky-500" />
                              {log.relatedProject.name || 'Project'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp & Details Expander */}
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatRelativeTime(log.createdAt)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="View metadata payload"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Metadata Payload */}
                {isExpanded && log.metadata && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1.5">
                      <Info size={12} className="text-indigo-500" />
                      <span>Event Metadata Payload</span>
                    </div>
                    <pre className="rounded-xl bg-slate-900 p-3 text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-48 custom-scrollbar">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. PAGINATION ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{pages}</strong> ({total} total logs)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                fetchAuditLogs(newPage);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchAuditLogs(newPage);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

