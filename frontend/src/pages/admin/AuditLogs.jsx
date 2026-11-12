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
} from '@/components/ui/muiIcons';
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
  { id: 'login', label: 'Logins' },
  { id: 'create', label: 'Created' },
  { id: 'update', label: 'Updated' },
  { id: 'delete', label: 'Deleted' },
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
        badge: 'bg-secondary text-foreground border-border',
        dot: 'bg-foreground',
      };
    }
    if (act.includes('delete') || act.includes('removed') || act.includes('purged')) {
      return {
        icon: Trash2,
        label: 'Deleted',
        badge: 'bg-secondary text-foreground border-foreground/40',
        dot: 'bg-foreground',
      };
    }
    if (act.includes('restored')) {
      return {
        icon: RotateCcw,
        label: 'Restored',
        badge: 'bg-secondary text-foreground border-border',
        dot: 'bg-muted-foreground',
      };
    }
    if (act.includes('created') || act.includes('added') || act.includes('register')) {
      return {
        icon: PlusCircle,
        label: 'Created',
        badge: 'bg-primary text-primary-foreground border-primary',
        dot: 'bg-primary',
      };
    }
    return {
      icon: Edit3,
      label: 'Updated',
      badge: 'bg-muted text-foreground border-border',
      dot: 'bg-muted-foreground',
    };
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-foreground border border-border">
              <ShieldCheck size={13} className="stroke-[2.5] shrink-0" />
              System Audit Logs
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Platform Activity & Change History
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMyActionsOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border transition-all cursor-pointer ${
              filterMyActionsOnly
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-foreground hover:bg-secondary'
            }`}
          >
            <User size={13} className="shrink-0" />
            <span>{filterMyActionsOnly ? 'Showing: My Actions Only' : 'Filter: My Actions Only'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchAuditLogs(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-secondary cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-foreground shrink-0' : 'shrink-0'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Events
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.total.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">All matching logs</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="shrink-0" /> Today's Events
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.todayCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">Since 12:00 AM</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <LogIn size={12} className="shrink-0" /> Logins
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.loginCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">User sessions</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <PlusCircle size={12} className="shrink-0" /> Created
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.createdCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">New records</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Edit3 size={12} className="shrink-0" /> Updates
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.updatedCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">Edits & statuses</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Trash2 size={12} className="shrink-0" /> Deletions
          </span>
          <div className="text-xl font-black text-foreground mt-1 tabular-nums">
            {stats.deletedCount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-muted-foreground">Archived items</span>
        </div>
      </div>

      {/* ── 3. FILTER BAR ── */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, title, user..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl self-stretch sm:self-auto overflow-x-auto">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedTimeframe === t.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Group Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Filter size={11} className="shrink-0" /> Action:
          </span>
          {ACTION_GROUPS.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setSelectedActionGroup(act.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedActionGroup === act.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* Module / Entity Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
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
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={12} className="shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. AUDIT LOGS LIST ── */}
      <div className="space-y-3">
        {loading && logs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-foreground animate-spin mb-3" />
            <h3 className="text-sm font-bold text-foreground">
              Loading audit logs...
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Querying database for real-time activity events
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-sm font-bold text-foreground">
              No audit logs found
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
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
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 cursor-pointer"
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
                className="rounded-2xl border border-border bg-card p-4 shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  {/* Left: User Avatar & Activity Description */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Actor Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground font-black text-sm border border-border">
                        {log.actor?.name ? log.actor.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${design.dot}`}
                        title={design.label}
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Name */}
                        <span className="text-xs font-extrabold text-foreground">
                          {log.actor?.name || 'System / Automated'}
                        </span>

                        {/* Is You Pill */}
                        {isMe && (
                          <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                            YOU
                          </span>
                        )}

                        {/* Actor Role */}
                        {log.actor?.role && (
                          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                            {log.actor.role}
                          </span>
                        )}

                        {/* Action Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${design.badge}`}
                        >
                          <ActionIcon size={10} className="shrink-0" />
                          <span>{log.action}</span>
                        </span>

                        {/* Entity Type Tag */}
                        {log.entityType && (
                          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {log.entityType}
                          </span>
                        )}
                      </div>

                      {/* Main Title & Description */}
                      <p className="text-xs font-bold text-foreground">
                        {log.title}
                      </p>
                      {log.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {log.description}
                        </p>
                      )}

                      {/* Associated Client / Project Pills */}
                      {(log.relatedClient || log.relatedProject) && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground flex-wrap">
                          {log.relatedClient && (
                            <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-semibold text-foreground border border-border">
                              <Building2 size={11} className="text-muted-foreground shrink-0" />
                              {log.relatedClient.company || log.relatedClient.name || 'Client'}
                            </span>
                          )}
                          {log.relatedProject && (
                            <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-semibold text-foreground border border-border">
                              <Briefcase size={11} className="text-muted-foreground shrink-0" />
                              {log.relatedProject.name || 'Project'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp & Details Expander */}
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="text-right tabular-nums">
                      <div className="text-xs font-bold text-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                        title="View metadata payload"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Metadata Payload */}
                {isExpanded && log.metadata && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-1.5">
                      <Info size={12} className="text-foreground shrink-0" />
                      <span>Event Metadata Payload</span>
                    </div>
                    <pre className="rounded-xl bg-zinc-950 border border-border p-3 text-[11px] text-zinc-100 font-mono overflow-x-auto max-h-48 custom-scrollbar">
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
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{pages}</strong> ({total} total logs)
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
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
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
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

