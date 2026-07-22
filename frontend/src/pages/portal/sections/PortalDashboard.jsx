import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api';
import { motion } from 'framer-motion';
import {
  FileCheck, BarChart3, CheckCircle2, Clock, FolderKanban,
  Receipt, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight,
  Layers, Star, Activity, Calendar, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../../../context/SocketContext';
import { exportProposalToPDF } from '../../../utils/pdfExport';
import { useEodReports } from '../../../hooks/useEodReports';
import { EODDetailModal } from '../../../components/modals/EODDetailModal';
import { CardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';

const KPICard = ({ label, value, icon: Icon, color, sub, dark }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rounded-2xl p-4 flex flex-col gap-3"
    style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
      border: dark ? `1px solid ${color}25` : '1px solid rgba(0,0,0,0.07)',
      boxShadow: dark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)',
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium" style={{ color: dark ? '#94a3b8' : '#64748b' }}>{label}</span>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-black" style={{ color: dark ? '#fff' : '#0f172a' }}>{value}</p>
    {sub && <p className="text-[11px]" style={{ color: dark ? '#64748b' : '#94a3b8' }}>{sub}</p>}
  </motion.div>
);

export default function PortalDashboard({ dark, user, setPendingCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEod, setSelectedEod] = useState(null);
  const [showEodDetail, setShowEodDetail] = useState(false);

  const socket = useSocket();
  const { data: eodData, refetch: refetchEod } = useEodReports(7);
  const eodReports = eodData?.records || [];

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
      refetchEod();
    };

    socket.on('clientUpdated', handleUpdate);
    socket.on('portalUpdated', handleUpdate);
    socket.on('eodSubmitted', handleUpdate);

    return () => {
      socket.off('clientUpdated', handleUpdate);
      socket.off('portalUpdated', handleUpdate);
      socket.off('eodSubmitted', handleUpdate);
    };
  }, [socket, refetchEod]);

  const txt = dark ? 'text-white' : 'text-slate-800';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';

  if (loading) return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-32 w-full rounded-2xl bg-muted/60 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} dark={dark} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <TableSkeleton columns={3} rows={5} dark={dark} />
        </div>
        <div className="space-y-4">
          <div className="h-44 w-full bg-muted/60 rounded-2xl" />
          <div className="h-44 w-full bg-muted/60 rounded-2xl" />
        </div>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const client = data?.client || {};

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)' }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back 👋</p>
            <h2 className="text-white text-2xl font-black mb-1">{client.name || user?.name || 'Client'}</h2>
            <p className="text-indigo-200 text-sm">{client.company || ''}</p>
            <Link
              to="/calendar"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-950/20 transition-all hover:bg-indigo-50"
            >
              <Calendar size={16} />
              Content Calendar
            </Link>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-white/80 text-xs mb-1">Onboarding Progress</div>
            <div className="text-white text-3xl font-black">{onboardingPct}%</div>
            <div className="w-32 h-1.5 rounded-full bg-white/20 mt-1">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${onboardingPct}%` }} />
            </div>
          </div>
        </div>
        <p className="relative text-indigo-100 text-xs mt-4 max-w-xl">
          Welcome to your client portal. Here you can review content, approve posts, track campaign performance, access reports, and communicate with your team — all in one place.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Pending Review" value={stats.pendingApproval ?? 0} icon={Clock} color="#f59e0b" dark={dark}
          sub="Awaiting your approval" />
        <KPICard label="Total Content" value={stats.totalContent ?? 0} icon={Layers} color="#6366f1" dark={dark}
          sub="All content items" />
        <KPICard label="Approved" value={stats.approvedContent ?? 0} icon={CheckCircle2} color="#10b981" dark={dark}
          sub="Client approved" />
        <KPICard label="Completed" value={stats.doneContent ?? 0} icon={Star} color="#8b5cf6" dark={dark}
          sub="Fully done" />
        <KPICard label="Active Projects" value={stats.activeProjects ?? 0} icon={FolderKanban} color="#3b82f6" dark={dark}
          sub="In progress" />
        <KPICard label="Open Invoices" value={stats.openInvoices ?? 0} icon={Receipt} color="#ec4899" dark={dark}
          sub="Awaiting payment" />
      </div>

      {/* Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left Column: Recent Activity & EOD Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-5" style={{ background: card, border }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-indigo-400" />
              <h3 className={`text-sm font-bold ${txt}`}>Recent Content Activity</h3>
            </div>
            {(data?.recentContent || []).length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={32} className="mx-auto text-slate-500 mb-2" />
                <p className={`text-xs ${sub}`}>No recent content</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.recentContent || []).slice(0, 6).map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                    <StatusDot status={item.status} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${txt}`}>{item.taskName}</p>
                      <p className={`text-[10px] ${sub}`}>{item.platform} · {item.contentType}</p>
                    </div>
                    <StatusBadge status={item.status} dark={dark} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Team EOD Reports Widget */}
          <div className="rounded-2xl p-5" style={{ background: card, border }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h3 className={`text-sm font-bold ${txt}`}>Daily Team Work & EOD Reports</h3>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${dark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {eodReports.length} Reports
              </span>
            </div>

            {eodReports.length === 0 ? (
              <div className="text-center py-6">
                <FileText size={28} className="mx-auto text-slate-500 mb-2 opacity-50" />
                <p className={`text-xs ${sub}`}>No daily team EOD reports yet for your projects</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eodReports.slice(0, 4).map((item) => (
                  <div
                    key={item._id}
                    onClick={() => { setSelectedEod(item); setShowEodDetail(true); }}
                    className="p-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                          {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <span className={`text-xs font-bold truncate ${txt}`}>{item.user?.name || 'Team Member'}</span>
                      </div>
                      <span className={`text-[10px] ${sub}`}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-2 ${sub}`}>{item.eodReport?.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Onboarding checklist */}
          <div className="rounded-2xl p-4" style={{ background: card, border }}>
            <h3 className={`text-sm font-bold mb-3 ${txt}`}>Onboarding Status</h3>
            <div className="space-y-2">
              {onboardingSteps.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black`}
                    style={{ background: s.done ? '#10b981' : dark ? '#1e293b' : '#e2e8f0' }}>
                    {s.done ? '✓' : ''}
                  </div>
                  <span className={`text-xs ${s.done ? (dark ? 'text-white' : 'text-slate-700') : sub}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Projects */}
          <div className="rounded-2xl p-4" style={{ background: card, border }}>
            <h3 className={`text-sm font-bold mb-3 ${txt}`}>Active Projects</h3>
            {(data?.activeProjects || []).length === 0
              ? <p className={`text-xs ${sub}`}>No active projects</p>
              : (data?.activeProjects || []).map(p => (
                <div key={p._id} className="mb-3 last:mb-0">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-xs font-medium ${txt}`}>{p.name}</span>
                      {p.dueDate && (
                        <p className={`mt-1 text-[10px] ${sub}`}>
                          Due {new Date(p.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-400">{p.progress || 0}%</span>
                      {p.proposalText?.trim() && (
                        <button
                          type="button"
                          onClick={() => handleProposalDownload(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-[10px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                        >
                          <FileCheck size={12} />
                          Proposal PDF
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: dark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <EODDetailModal open={showEodDetail} onOpenChange={setShowEodDetail} record={selectedEod} />
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

export function StatusBadge({ status, dark }) {
  const map = {
    'Draft':              { bg: '#64748b20', color: '#94a3b8', label: 'Draft' },
    'Editing':            { bg: '#3b82f620', color: '#60a5fa', label: 'Editing' },
    'Send to Client':     { bg: '#f59e0b20', color: '#fbbf24', label: 'For Review' },
    'Revision Requested': { bg: '#ef444420', color: '#f87171', label: 'Revision' },
    'Approved':           { bg: '#10b98120', color: '#34d399', label: 'Approved' },
    'Scheduled':          { bg: '#8b5cf620', color: '#a78bfa', label: 'Scheduled' },
    'Posted':             { bg: '#14b8a620', color: '#2dd4bf', label: 'Posted' },
    'Done':               { bg: '#6366f120', color: '#818cf8', label: 'Done' },
  };
  const s = map[status] || { bg: '#64748b20', color: '#94a3b8', label: status };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
