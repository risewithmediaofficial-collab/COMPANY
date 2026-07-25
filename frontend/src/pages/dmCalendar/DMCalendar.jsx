import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  Camera,
  Radio,
  Tv,
  BarChart3,
  FileSpreadsheet,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Users2,
  Wrench,
  Download,
  Printer,
  ShieldCheck,
  TrendingUp,
  Pencil,
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Button } from '../../components/ui/button';
import {
  MetricCard,
  MetricGrid,
  PageHeader,
  PageToolbar,
  SearchField,
  SectionCard,
  StatusBadge,
} from '../../components/ui/page';
import { DataTable } from '../../components/ui/DataTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useDMDashboardSummary,
  useDMMasterCalendar,
  useVideoShoots,
  useDeleteVideoShoot,
  useRjPromotions,
  useDeleteRjPromotion,
  useVjPromotions,
  useDeleteVjPromotion,
  useDMClientPerformance,
  useDMTeamPerformance,
  useDMAuditLogs,
} from '../../hooks/useDMCalendar';
import { useClients } from '../../hooks/useClients';

import { AddEditVideoShootModal } from '../../components/modals/AddEditVideoShootModal';
import { AddEditRjPromotionModal } from '../../components/modals/AddEditRjPromotionModal';
import { AddEditVjPromotionModal } from '../../components/modals/AddEditVjPromotionModal';
import { DMEventDetailModal } from '../../components/modals/DMEventDetailModal';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const TABS = [
  { id: 'video_shoot', label: 'Video Shoot', icon: Camera },
  { id: 'rj_promotion', label: 'RJ Promotion', icon: Radio },
  { id: 'vj_promotion', label: 'VJ Promotion', icon: Tv },
  { id: 'master_calendar', label: 'Master Calendar', icon: CalendarIcon },
  { id: 'analytics', label: 'Analytics & Performance', icon: BarChart3 },
  { id: 'reports', label: 'Reports & Audit Log', icon: FileSpreadsheet },
];

const CALENDAR_VIEWS = [
  { id: 'month', label: 'Monthly' },
  { id: 'week', label: 'Weekly' },
  { id: 'day', label: 'Daily' },
  { id: 'agenda', label: 'Agenda' },
];

const STATUS_COLORS = {
  Scheduled: 'bg-blue-500 text-white border-blue-600',
  'In Progress': 'bg-orange-500 text-white border-orange-600',
  Completed: 'bg-emerald-500 text-white border-emerald-600',
  Cancelled: 'bg-rose-500 text-white border-rose-600',
  Postponed: 'bg-slate-500 text-white border-slate-600',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const DMCalendar = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'superAdmin';
  const isManager = user?.role === 'manager';

  // Role Access Guard: Only Admin and Manager
  if (!isAdmin && !isManager) {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState('video_shoot');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Master Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');

  // Modals state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState(null);

  const [showRjModal, setShowRjModal] = useState(false);
  const [selectedRj, setSelectedRj] = useState(null);

  const [showVjModal, setShowVjModal] = useState(false);
  const [selectedVj, setSelectedVj] = useState(null);

  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEventItem, setSelectedEventItem] = useState(null);

  // Delete dialog states
  const [deleteShootId, setDeleteShootId] = useState(null);
  const [deleteRjId, setDeleteRjId] = useState(null);
  const [deleteVjId, setDeleteVjId] = useState(null);

  // Data Queries
  const { data: clients = [] } = useClients();
  const { data: summary = {} } = useDMDashboardSummary();

  const { data: videoShoots = [] } = useVideoShoots({ search, status: statusFilter, client: clientFilter !== 'all' ? clientFilter : undefined });
  const { data: rjPromotions = [] } = useRjPromotions({ search, status: statusFilter, client: clientFilter !== 'all' ? clientFilter : undefined });
  const { data: vjPromotions = [] } = useVjPromotions({ search, status: statusFilter, platform: platformFilter !== 'all' ? platformFilter : undefined, client: clientFilter !== 'all' ? clientFilter : undefined });

  const { data: masterEvents = [] } = useDMMasterCalendar({
    start: startOfMonth(subMonths(currentDate, 1)).toISOString(),
    end: endOfMonth(addMonths(currentDate, 1)).toISOString(),
    client: clientFilter !== 'all' ? clientFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const { data: clientPerf = [] } = useDMClientPerformance();
  const { data: teamPerf = [] } = useDMTeamPerformance();
  const { data: auditLogs = [] } = useDMAuditLogs();

  const deleteShoot = useDeleteVideoShoot();
  const deleteRj = useDeleteRjPromotion();
  const deleteVj = useDeleteVjPromotion();

  // Navigation handlers for Calendar
  const handlePrev = () => {
    if (calendarView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (calendarView === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    if (calendarView === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else if (calendarView === 'week') {
      const startDate = startOfWeek(currentDate);
      const endDate = endOfWeek(currentDate);
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      return [currentDate];
    }
  }, [currentDate, calendarView]);

  // Export handlers
  const handleExportCSV = (dataList, filename) => {
    if (!dataList || !dataList.length) return;
    const keys = Object.keys(dataList[0]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [keys.join(','), ...dataList.map((row) => keys.map((k) => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="📅 Digital Marketing Calendar"
        description="Complete management system for Video Shoots, RJ Promotions, VJ Promotions, Equipment & Team Allocations."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'video_shoot' && (
              <Button size="sm" onClick={() => { setSelectedShoot(null); setShowVideoModal(true); }}>
                <Plus size={16} className="mr-1" /> Schedule Video Shoot
              </Button>
            )}
            {activeTab === 'rj_promotion' && (
              <Button size="sm" onClick={() => { setSelectedRj(null); setShowRjModal(true); }}>
                <Plus size={16} className="mr-1" /> Schedule RJ Promotion
              </Button>
            )}
            {activeTab === 'vj_promotion' && (
              <Button size="sm" onClick={() => { setSelectedVj(null); setShowVjModal(true); }}>
                <Plus size={16} className="mr-1" /> Schedule VJ Promotion
              </Button>
            )}
          </div>
        }
      />

      {/* Top Nav Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: VIDEO SHOOT */}
      {activeTab === 'video_shoot' && (
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <MetricGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Today's Shoots" value={summary.videoShoots?.todayShoots || 0} helper="Shoots scheduled today" icon={Camera} tone="info" />
            <MetricCard label="Upcoming Shoots" value={summary.videoShoots?.upcomingShoots || 0} helper="Future scheduled shoots" icon={CalendarIcon} tone="primary" />
            <MetricCard label="Contents Completion" value={`${summary.videoShoots?.contentCompletionPct || 0}%`} helper={`${summary.videoShoots?.totalContentsCompleted || 0} / ${summary.videoShoots?.totalContentsPlanned || 0} Planned`} icon={CheckCircle2} tone="success" />
            <MetricCard label="Outstanding Expenses" value={currency.format(summary.videoShoots?.outstandingAmount || 0)} helper={`Total Exp: ${currency.format(summary.videoShoots?.totalExpenses || 0)}`} icon={IndianRupee} tone="danger" />
          </MetricGrid>

          {/* Filters & Actions */}
          <SectionCard title="Video Shoot Schedule" description="List of all recorded video production activities.">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <SearchField value={search} onChange={setSearch} placeholder="Search title, location, notes..." />
                
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">All Clients</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>{c.company || c.name}</option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Postponed">Postponed</option>
                </select>
              </div>
            </div>

            {/* Video Shoots Table */}
            <DataTable
              data={videoShoots}
              columns={[
                {
                  key: 'client',
                  label: 'Client / Shoot Title',
                  render: (row) => (
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">{row.shootTitle}</div>
                      <div className="text-xs text-muted-foreground">{row.client?.company || row.client?.name || 'No Client'}</div>
                    </div>
                  ),
                },
                {
                  key: 'date',
                  label: 'Date & Time',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">{row.shootDate ? new Date(row.shootDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                      <div className="text-muted-foreground">
                        {row.startTime ? new Date(row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ({row.duration || 0}h)
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'progress',
                  label: 'Contents / Reels',
                  render: (row) => (
                    <div className="text-xs space-y-1 w-36">
                      <div className="flex justify-between text-[11px]">
                        <span>Contents:</span>
                        <span className="font-bold text-primary">{row.completedContents || 0}/{row.plannedContents || 0} ({row.contentsCompletionPct || 0}%)</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Reels:</span>
                        <span className="font-bold text-emerald-500">{row.completedReels || 0}/{row.plannedReels || 0} ({row.reelsCompletionPct || 0}%)</span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'team',
                  label: 'Assigned Crew',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(row.assignedTeam || []).map((t, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                          {t.name || t.user?.name || 'Member'} ({t.role})
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'finance',
                  label: 'Financials',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">Total: {currency.format(row.totalAmount || 0)}</div>
                      <div className="text-rose-500 font-bold">Balance: {currency.format(row.balanceAmount || 0)}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <StatusBadge tone={row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'warning' : row.status === 'Cancelled' ? 'danger' : 'info'}>
                      {row.status}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedEventItem({ activityType: 'video_shoot', item: row }); setShowEventDetailModal(true); }}>
                        <Eye size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedShoot(row); setShowVideoModal(true); }}>
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setDeleteShootId(row._id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyTitle="No Video Shoots Scheduled"
              emptyDescription="Click Schedule Video Shoot to record your first production schedule."
            />
          </SectionCard>
        </div>
      )}

      {/* TAB 2: RJ PROMOTION */}
      {activeTab === 'rj_promotion' && (
        <div className="space-y-6">
          <MetricGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Promotions" value={summary.rjPromotions?.totalPromotions || 0} helper="All RJ talk spots" icon={Radio} tone="info" />
            <MetricCard label="Total Broadcast Hours" value={`${summary.rjPromotions?.totalHours || 0} hrs`} helper="Combined airtime spoken" icon={Clock} tone="primary" />
            <MetricCard label="Total RJ Revenue" value={currency.format(summary.rjPromotions?.totalRevenue || 0)} helper={`Paid: ${currency.format(summary.rjPromotions?.paid || 0)}`} icon={IndianRupee} tone="success" />
            <MetricCard label="Pending Balance" value={currency.format(summary.rjPromotions?.balance || 0)} helper="Outstanding fee" icon={AlertCircle} tone="danger" />
          </MetricGrid>

          <SectionCard title="RJ Promotion Schedule" description="Radio Jockey broadcasting and talk show campaigns.">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <SearchField value={search} onChange={setSearch} placeholder="Search RJ promotion title or details..." />
            </div>

            <DataTable
              data={rjPromotions}
              columns={[
                {
                  key: 'title',
                  label: 'Client / Promotion Title',
                  render: (row) => (
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">{row.promotionTitle}</div>
                      <div className="text-xs text-muted-foreground">{row.client?.company || row.client?.name || 'No Client'}</div>
                    </div>
                  ),
                },
                {
                  key: 'date',
                  label: 'Date & Time',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">{row.promotionDate ? new Date(row.promotionDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                      <div className="text-muted-foreground">{row.durationSpoken || 0} Hours Spoken</div>
                    </div>
                  ),
                },
                {
                  key: 'team',
                  label: 'RJ Team',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      {(row.rjMembers || []).map((m, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                          {m.name || m.user?.name || 'RJ'} ({m.role})
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'finance',
                  label: 'Financials',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">Total: {currency.format(row.totalAmount || 0)}</div>
                      <div className="text-rose-500 font-bold">Balance: {currency.format(row.balanceAmount || 0)}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <StatusBadge tone={row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'warning' : 'info'}>
                      {row.status}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedEventItem({ activityType: 'rj_promotion', item: row }); setShowEventDetailModal(true); }}>
                        <Eye size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedRj(row); setShowRjModal(true); }}>
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setDeleteRjId(row._id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyTitle="No RJ Promotions Scheduled"
              emptyDescription="Click Schedule RJ Promotion to add broadcasting talk spots."
            />
          </SectionCard>
        </div>
      )}

      {/* TAB 3: VJ PROMOTION */}
      {activeTab === 'vj_promotion' && (
        <div className="space-y-6">
          <MetricGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total VJ Campaigns" value={summary.vjPromotions?.totalPromotions || 0} helper="All VJ & Live Hosting" icon={Tv} tone="info" />
            <MetricCard label="Total VJ Hours" value={`${summary.vjPromotions?.totalHours || 0} hrs`} helper="Combined airtime / streaming" icon={Clock} tone="primary" />
            <MetricCard label="Total VJ Revenue" value={currency.format(summary.vjPromotions?.totalRevenue || 0)} helper={`Paid: ${currency.format(summary.vjPromotions?.paid || 0)}`} icon={IndianRupee} tone="success" />
            <MetricCard label="Pending Balance" value={currency.format(summary.vjPromotions?.balance || 0)} helper="Outstanding fee" icon={AlertCircle} tone="danger" />
          </MetricGrid>

          <SectionCard title="VJ Promotion Schedule" description="Video Jockey, Live Stream Hosting, TV, and Event Campaigns.">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <SearchField value={search} onChange={setSearch} placeholder="Search VJ promotion title..." />
                
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="all">All Platforms</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="YouTube">YouTube</option>
                  <option value="TV">TV</option>
                  <option value="Live Event">Live Event</option>
                  <option value="Campaign">Campaign</option>
                </select>
              </div>
            </div>

            <DataTable
              data={vjPromotions}
              columns={[
                {
                  key: 'title',
                  label: 'Client / Platform',
                  render: (row) => (
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">{row.promotionTitle}</div>
                      <div className="text-xs text-muted-foreground">{row.client?.company || row.client?.name} • <span className="font-semibold text-purple-600">{row.platform}</span></div>
                    </div>
                  ),
                },
                {
                  key: 'date',
                  label: 'Date & Duration',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">{row.promotionDate ? new Date(row.promotionDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                      <div className="text-muted-foreground">{row.duration || 0} Hours Scheduled</div>
                    </div>
                  ),
                },
                {
                  key: 'team',
                  label: 'VJ Members',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      {(row.vjMembers || []).map((m, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-semibold">
                          {m.name || m.user?.name || 'VJ'} ({m.role})
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'finance',
                  label: 'Financials',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">Total: {currency.format(row.totalAmount || 0)}</div>
                      <div className="text-rose-500 font-bold">Balance: {currency.format(row.balanceAmount || 0)}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => (
                    <StatusBadge tone={row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'warning' : 'info'}>
                      {row.status}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedEventItem({ activityType: 'vj_promotion', item: row }); setShowEventDetailModal(true); }}>
                        <Eye size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedVj(row); setShowVjModal(true); }}>
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setDeleteVjId(row._id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyTitle="No VJ Promotions Scheduled"
              emptyDescription="Click Schedule VJ Promotion to record Instagram/YouTube lives or TV spots."
            />
          </SectionCard>
        </div>
      )}

      {/* TAB 4: MASTER CALENDAR */}
      {activeTab === 'master_calendar' && (
        <div className="space-y-6">
          <SectionCard title="Master Digital Marketing Calendar" description="Combined interactive calendar view for Video Shoots, RJ Promotions, and VJ Promotions.">
            {/* Calendar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-card/60 p-4 rounded-2xl border border-border/40">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-bold text-foreground min-w-[160px] text-center">
                  {format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
                </h3>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
              </div>

              {/* View Selector */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                {CALENDAR_VIEWS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setCalendarView(v.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      calendarView === v.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pb-4">
              <span className="text-muted-foreground">Legend:</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-500" /> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-orange-500" /> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-500" /> Cancelled</span>
            </div>

            {/* Calendar Grid View */}
            {calendarView === 'month' || calendarView === 'week' ? (
              <div className="grid grid-cols-7 gap-px bg-border rounded-2xl overflow-hidden border border-border/60">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="bg-muted/80 p-2.5 text-center text-xs font-bold text-foreground">
                    {d}
                  </div>
                ))}

                {calendarDays.map((day, idx) => {
                  const dayEvents = masterEvents.filter((ev) => isSameDay(new Date(ev.date), day));
                  const isCurrMonth = isSameMonth(day, currentDate);
                  const isTodayDay = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-1.5 transition-colors ${
                        isCurrMonth ? 'bg-background' : 'bg-muted/20 text-muted-foreground'
                      } ${isTodayDay ? 'ring-2 ring-primary ring-inset' : ''}`}
                    >
                      <div className="text-right text-[11px] font-bold p-1 text-muted-foreground">
                        {format(day, 'd')}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => { setSelectedEventItem(ev); setShowEventDetailModal(true); }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-transform hover:scale-[1.02] shadow-sm border ${
                              STATUS_COLORS[ev.status] || 'bg-primary text-primary-foreground'
                            }`}
                          >
                            <div className="truncate">{ev.title}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Agenda / Daily List View */
              <div className="space-y-3">
                {masterEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => { setSelectedEventItem(ev); setShowEventDetailModal(true); }}
                    className="p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-foreground">{ev.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Date: {new Date(ev.date).toLocaleDateString('en-IN')}</span>
                        <span>• Status: {ev.status}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">View Details</Button>
                  </div>
                ))}
                {masterEvents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">No activity events for this period.</div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* TAB 5: ANALYTICS & PERFORMANCE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Client-wise Activity Distribution" description="Total Shoots & Promotions logged per client.">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientPerf.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="client.company" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="totalShoots" name="Video Shoots" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rjPromotionsCount" name="RJ Spots" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="vjPromotionsCount" name="VJ Spots" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Team Member Utilization" description="Working hours and activity volume per team member.">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerf.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="employee.name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="workingHours" name="Working Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completedTasks" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Client Performance Table */}
          <SectionCard title="Client Performance Breakdown" description="Comprehensive tracking of shoot progress, reels, expenses, and pending balances by client.">
            <DataTable
              data={clientPerf}
              columns={[
                { key: 'client', label: 'Client', render: (row) => row.client?.company || row.client?.name },
                { key: 'shoots', label: 'Video Shoots', render: (row) => row.totalShoots },
                { key: 'contents', label: 'Contents (Done/Planned)', render: (row) => `${row.contentsCompleted} / ${row.contentsPlanned}` },
                { key: 'reels', label: 'Reels (Done/Planned)', render: (row) => `${row.reelsCompleted} / ${row.reelsPlanned}` },
                { key: 'rj', label: 'RJ Spots', render: (row) => row.rjPromotionsCount },
                { key: 'vj', label: 'VJ Spots', render: (row) => row.vjPromotionsCount },
                { key: 'expenses', label: 'Total Expenses', render: (row) => currency.format(row.totalExpenses) },
                { key: 'pending', label: 'Pending Balance', render: (row) => <span className="font-bold text-rose-500">{currency.format(row.pendingAmount)}</span> },
              ]}
              emptyTitle="No Client Performance Data"
            />
          </SectionCard>

          {/* Team Performance Table */}
          <SectionCard title="Team Performance & Utilization" description="Working hours and completed/pending activities allocated per employee.">
            <DataTable
              data={teamPerf}
              columns={[
                { key: 'employee', label: 'Employee', render: (row) => <span className="font-bold">{row.employee?.name}</span> },
                { key: 'role', label: 'Role', render: (row) => row.employee?.role },
                { key: 'shoots', label: 'Video Shoots', render: (row) => row.totalShoots },
                { key: 'rj', label: 'RJ Activities', render: (row) => row.rjActivities },
                { key: 'vj', label: 'VJ Activities', render: (row) => row.vjActivities },
                { key: 'hours', label: 'Working Hours', render: (row) => <span className="font-bold text-emerald-500">{row.workingHours} hrs</span> },
                { key: 'status', label: 'Completed / Pending', render: (row) => `${row.completedTasks} Done / ${row.pendingTasks} Pending` },
              ]}
              emptyTitle="No Team Performance Data"
            />
          </SectionCard>
        </div>
      )}

      {/* TAB 6: REPORTS & AUDIT LOG */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <SectionCard
            title="Digital Marketing Management Reports"
            description="Generate and export management reports for Video Shoots, RJ Promotions, and VJ Promotions."
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExportCSV(videoShoots, 'DM_Video_Shoots_Report')}>
                  <Download size={14} className="mr-1" /> Export Shoots CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV(rjPromotions, 'DM_RJ_Promotions_Report')}>
                  <Download size={14} className="mr-1" /> Export RJ CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer size={14} className="mr-1" /> Print Report
                </Button>
              </div>
            }
          >
            <div className="p-4 bg-muted/40 rounded-2xl border border-border/40 text-xs font-semibold text-foreground space-y-2">
              <p>Reports are generated in real-time based on active filters across all video shoots, RJ broadcasting spots, and VJ live sessions.</p>
            </div>
          </SectionCard>

          {/* Audit Logs */}
          <SectionCard title="DM Calendar Audit Trail" description="Detailed activity history for all creations, modifications, deletions, and time-tracking operations.">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log._id} className="p-3.5 rounded-2xl border border-border/40 bg-card flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {log.title}
                    </div>
                    <div className="text-muted-foreground mt-0.5">{log.details}</div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <div>By: <span className="font-semibold text-foreground">{log.actor?.name || 'User'}</span></div>
                    <div>{new Date(log.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No audit logs recorded yet.</p> : null}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!deleteShootId} onOpenChange={(open) => !open && setDeleteShootId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video Shoot</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this Video Shoot schedule? This action will be logged in the audit trail.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteShootId) { await deleteShoot.mutateAsync(deleteShootId); setDeleteShootId(null); } }}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRjId} onOpenChange={(open) => !open && setDeleteRjId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RJ Promotion</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this RJ promotion?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteRjId) { await deleteRj.mutateAsync(deleteRjId); setDeleteRjId(null); } }}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteVjId} onOpenChange={(open) => !open && setDeleteVjId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VJ Promotion</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this VJ promotion?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteVjId) { await deleteVj.mutateAsync(deleteVjId); setDeleteVjId(null); } }}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <AddEditVideoShootModal open={showVideoModal} onOpenChange={setShowVideoModal} shoot={selectedShoot} />
      <AddEditRjPromotionModal open={showRjModal} onOpenChange={setShowRjModal} promotion={selectedRj} />
      <AddEditVjPromotionModal open={showVjModal} onOpenChange={setShowVjModal} promotion={selectedVj} />
      <DMEventDetailModal
        open={showEventDetailModal}
        onOpenChange={setShowEventDetailModal}
        eventItem={selectedEventItem}
        onEdit={(item) => {
          if (item.plannedContents !== undefined) { setSelectedShoot(item); setShowVideoModal(true); }
          else if (item.platform) { setSelectedVj(item); setShowVjModal(true); }
          else { setSelectedRj(item); setShowRjModal(true); }
        }}
        onDelete={(item) => {
          if (item.plannedContents !== undefined) setDeleteShootId(item._id);
          else if (item.platform) setDeleteVjId(item._id);
          else setDeleteRjId(item._id);
        }}
      />
    </div>
  );
};

export default DMCalendar;
