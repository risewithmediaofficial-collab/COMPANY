import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useEodReports } from '../../hooks/useEodReports';
import { EODDetailModal } from '../../components/modals/EODDetailModal';
import { useDateFilter } from '../../context/DateFilterContext';
import api from '../../api';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
  Filter,
  BarChart3,
  RefreshCw,
  Search,
  Eye,
} from '@/components/ui/muiIcons';

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
  const { startDate: globalStartDate, endDate: globalEndDate, period: globalPeriod, isDateInRange } = useDateFilter();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);

  const queryParams = useMemo(() => {
    const p = { mine: 'true' };
    if (globalStartDate) p.startDate = globalStartDate;
    if (globalEndDate) p.endDate = globalEndDate;
    return p;
  }, [globalStartDate, globalEndDate]);

  const { data, isLoading, refetch } = useEodReports((globalStartDate || globalEndDate) ? 'all' : 365, queryParams);

  // Filter records based on global date filter + search
  const records = useMemo(() => {
    let all = (data?.records || []).filter((r) => isDateInRange(r.date));

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
  }, [data, isDateInRange, searchQuery]);

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
      if (globalStartDate && globalEndDate) {
        params.from = globalStartDate;
        params.to = globalEndDate;
      } else if (globalStartDate) {
        params.from = globalStartDate;
        params.to = new Date().toISOString().split('T')[0];
      } else if (globalEndDate) {
        params.from = '2020-01-01';
        params.to = globalEndDate;
      } else {
        params.range = 'monthly';
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
      let filename = `EOD_Report_${globalPeriod || 'all'}.docx`;
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

  return (
    <div className="space-y-5">
      {/* ── Page Header & Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            My EOD Reports
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-card outline-none focus:ring-2 focus:ring-brand/40 text-foreground"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-card hover:bg-secondary transition-colors cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw
              size={15}
              className={isLoading ? 'animate-spin text-foreground' : 'text-muted-foreground'}
            />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            className="h-10 flex items-center gap-2 px-4 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
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

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Reports Submitted',
            value: stats.totalReports,
            icon: FileText,
          },
          {
            label: 'Tasks Completed',
            value: stats.totalTasks,
            icon: CheckCircle2,
          },
          {
            label: 'Total Hours',
            value: `${stats.totalHours.toFixed(1)}h`,
            icon: Clock,
          },
          {
            label: 'Days with Blockers',
            value: stats.withBlockers,
            icon: AlertCircle,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-2xl p-4 "
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon size={18} className="text-muted-foreground shrink-0" />
              <span className="text-2xl font-black text-foreground tabular-nums">
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
          <RefreshCw size={28} className="mx-auto animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-semibold">Loading your reports…</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl">
          <FileText size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-foreground font-semibold">
            No EOD reports found
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
                className="bg-card rounded-2xl overflow-hidden transition-all duration-200 group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-secondary/20 ">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Calendar size={16} className="text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground tabular-nums">{dateStr}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary rounded-lg border-transparent transition-colors cursor-pointer"
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
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 tabular-nums">
                        Tasks Completed ({tasks.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tasks.slice(0, 5).map((task, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-secondary text-foreground rounded-lg"
                          >
                            <CheckCircle2 size={10} className="shrink-0" />
                            <span className="max-w-[200px] truncate">{task}</span>
                          </span>
                        ))}
                        {tasks.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-muted-foreground bg-secondary/40 rounded-lg tabular-nums">
                            +{tasks.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Blockers */}
                  {eod.blockers && (
                    <div className="flex items-start gap-2 bg-muted rounded-xl p-2.5">
                      <AlertCircle
                        size={14}
                        className="text-foreground mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                          Blockers
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
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
        <div className="bg-card rounded-2xl p-4 flex items-center justify-between ">
          <span className="text-xs text-muted-foreground tabular-nums">
            Showing <strong className="text-foreground">{records.length}</strong> reports
            {(globalStartDate || globalEndDate) && ` (${globalStartDate || '...'} to ${globalEndDate || '...'})`}
          </span>
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
