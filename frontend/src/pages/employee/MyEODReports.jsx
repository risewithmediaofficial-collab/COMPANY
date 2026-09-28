import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useEodReports } from '../../hooks/useEodReports';
import { EODDetailModal } from '../../components/modals/EODDetailModal';
import api from '../../api';
import { toast } from 'sonner';
import {
  FileText,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Filter,
  BarChart3,
  RefreshCw,
  Search,
  Eye,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

// ── Main Page Component ──────────────────────────────────────────────────────
const MyEODReports = () => {
  const { user } = useSelector((state) => state.auth);
  const now = new Date();

  // Filters
  const [rangeType, setRangeType] = useState('monthly'); // weekly | monthly | custom
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Compute days for fetching
  const days = useMemo(() => {
    if (rangeType === 'monthly') return 31;
    if (rangeType === 'weekly') return 7;
    if (rangeType === 'custom' && customFrom && customTo) {
      const diff = Math.ceil(
        (new Date(customTo) - new Date(customFrom)) / (1000 * 60 * 60 * 24)
      );
      return Math.max(diff + 1, 1);
    }
    return 30;
  }, [rangeType, customFrom, customTo]);

  const queryParams = useMemo(() => {
    return { mine: 'true' };
  }, []);

  const { data, isLoading, refetch } = useEodReports(days <= 365 ? days : 365, queryParams);

  // Filter records based on current range selection
  const records = useMemo(() => {
    let all = data?.records || [];

    if (rangeType === 'monthly') {
      all = all.filter((r) => {
        const d = new Date(r.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    } else if (rangeType === 'weekly') {
      const today = new Date();
      const day = today.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + diffToMon);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      all = all.filter((r) => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd;
      });
    } else if (rangeType === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      all = all.filter((r) => {
        const d = new Date(r.date);
        return d >= from && d <= to;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(
        (r) =>
          (r.eodReport?.summary || '').toLowerCase().includes(q) ||
          (r.eodReport?.tasksCompleted || []).some((t) =>
            t.toLowerCase().includes(q)
          ) ||
          (r.eodReport?.blockers || '').toLowerCase().includes(q)
      );
    }

    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, rangeType, month, year, customFrom, customTo, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalTasks = records.reduce(
      (sum, r) => sum + (r.eodReport?.tasksCompleted?.length || 0),
      0
    );
    const totalHours = records.reduce(
      (sum, r) => sum + (r.totalHours || 0),
      0
    );
    const withBlockers = records.filter((r) => r.eodReport?.blockers).length;
    return { totalReports: records.length, totalTasks, totalHours, withBlockers };
  }, [records]);

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (rangeType === 'weekly') {
        params.range = 'weekly';
      } else if (rangeType === 'monthly') {
        // Calculate from/to for the selected month
        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 0);
        params.from = from.toISOString().split('T')[0];
        params.to = to.toISOString().split('T')[0];
      } else if (rangeType === 'custom' && customFrom && customTo) {
        params.from = customFrom;
        params.to = customTo;
      } else {
        params.range = 'weekly';
      }

      const response = await api.get('/attendance/eod-reports/export', {
        params,
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Extract filename from content-disposition or build one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `EOD_Report_${rangeType}.docx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully!');
    } catch (err) {
      console.error('Export error:', err);
      if (err.response?.status === 404) {
        toast.error('No EOD reports found for the selected date range.');
      } else {
        toast.error('Failed to export report. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">
                My EOD Reports
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                View and export your End of Day reports as Word documents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw
              size={15}
              className={isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}
            />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:opacity-90 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Export as DOCX</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Range type tabs */}
          <div className="flex items-center gap-1 bg-secondary/40 rounded-xl p-1">
            {[
              { id: 'weekly', label: 'This Week' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'custom', label: 'Custom Range' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRangeType(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  rangeType === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Monthly selector */}
          {rangeType === 'monthly' && (
            <div className="flex items-center gap-1 bg-secondary/30 border border-border rounded-xl px-2 py-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-foreground w-28 text-center">
                {MONTHS[month - 1]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Custom date pickers */}
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo || undefined}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                />
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Reports Submitted',
            value: stats.totalReports,
            icon: FileText,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
            border: 'border-indigo-200 dark:border-indigo-800',
          },
          {
            label: 'Tasks Completed',
            value: stats.totalTasks,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            border: 'border-emerald-200 dark:border-emerald-800',
          },
          {
            label: 'Total Hours',
            value: `${stats.totalHours.toFixed(1)}h`,
            icon: Clock,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            border: 'border-blue-200 dark:border-blue-800',
          },
          {
            label: 'Days with Blockers',
            value: stats.withBlockers,
            icon: AlertCircle,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200 dark:border-amber-800',
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`${card.bg} border ${card.border} rounded-2xl p-4 shadow-xs`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon size={18} className={card.color} />
              <span className={`text-2xl font-black ${card.color}`}>
                {card.value}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Reports List ── */}
      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw size={28} className="mx-auto animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground font-semibold">Loading your reports…</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center bg-card border border-border rounded-2xl">
          <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-semibold">
            No EOD reports found for this period.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Submit your daily report from the Dashboard to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const eod = record.eodReport || {};
            const tasks = eod.tasksCompleted || [];
            const dateStr = formatDate(record.date);
            const submittedTime = eod.submittedAt ? formatTime(eod.submittedAt) : '';
            const hours = record.totalHours ? `${record.totalHours.toFixed(1)}h` : '—';
            const status = (record.status || 'present').replace(/_/g, ' ');

            return (
              <div
                key={record._id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-secondary/20 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center">
                      <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{dateStr}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="capitalize font-semibold">{status}</span>
                        <span>•</span>
                        <span>{hours} worked</span>
                        {submittedTime && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} /> {submittedTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Eye size={13} />
                    View
                  </button>
                </div>

                {/* Card Body */}
                <div className="px-5 py-3.5 space-y-2.5">
                  {/* Summary */}
                  {eod.summary && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Summary
                      </p>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                        {eod.summary}
                      </p>
                    </div>
                  )}

                  {/* Tasks */}
                  {tasks.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                        Tasks Completed ({tasks.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tasks.slice(0, 5).map((task, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                          >
                            <CheckCircle2 size={10} />
                            <span className="max-w-[200px] truncate">{task}</span>
                          </span>
                        ))}
                        {tasks.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-muted-foreground bg-secondary/40 rounded-lg">
                            +{tasks.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Blockers */}
                  {eod.blockers && (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5">
                      <AlertCircle
                        size={14}
                        className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                          Blockers
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-2 mt-0.5">
                          {eod.blockers}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer Stats ── */}
      {!isLoading && records.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <span className="text-xs text-muted-foreground">
            Showing <strong>{records.length}</strong> reports
            {rangeType === 'monthly' && ` for ${MONTHS[month - 1]} ${year}`}
            {rangeType === 'weekly' && ' for this week'}
          </span>
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            Download Word Report
          </button>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <EODDetailModal
        open={!!selectedRecord}
        onOpenChange={(val) => {
          if (!val) setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

export default MyEODReports;
