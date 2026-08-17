import { useEffect, useState, useCallback } from 'react';
import api from '../../../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Check, RotateCcw, MessageSquare, ChevronDown,
  ExternalLink, AlertCircle, X, Send, Eye, RefreshCw, BarChart2
} from 'lucide-react';
import { StatusBadge } from './PortalDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';

const TABS = [
  { id: 'review', label: 'Ready for Review', color: '#f59e0b' },
  { id: 'all',    label: 'All Content',      color: '#6366f1' },
  { id: 'done',   label: 'Done',             color: '#10b981' },
  { id: 'chart',  label: 'Content Chart',    color: '#3b82f6' },
];

const STATUSES = ['Draft','Editing','Send to Client','Revision Requested','Approved','Scheduled','Posted','Done'];
const STATUS_COLORS = {
  'Draft':'#64748b','Editing':'#3b82f6','Send to Client':'#f59e0b',
  'Revision Requested':'#ef4444','Approved':'#10b981',
  'Scheduled':'#8b5cf6','Posted':'#14b8a6','Done':'#6366f1'
};

export default function ContentReview({ dark, setPendingCount }) {
  const [tab, setTab]           = useState('review');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilt] = useState('');
  const [modal, setModal]       = useState(null);   // { type:'approve'|'revision'|'view', item }
  const [feedback, setFeedback] = useState('');
  const [acting, setActing]     = useState(false);

  const load = useCallback((t) => {
    setLoading(true);
    const view = t === 'review' ? 'review' : t === 'done' ? 'done' : '';
    const params = new URLSearchParams();
    if (view) params.set('view', view);
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    api.get(`/portal/content?${params.toString()}`)
      .then(r => {
        setItems(r.data.items || []);
        if (t === 'review') setPendingCount?.(r.data.total || 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, filterStatus]);

  useEffect(() => { if (tab !== 'chart') load(tab); }, [tab, load]);

  const handleApprove = async () => {
    if (!modal) return;
    setActing(true);
    try {
      await api.post(`/portal/content/${modal.item._id}/approve`, { feedback });
      setModal(null); setFeedback(''); load(tab);
    } catch (e) { alert(e?.response?.data?.message || 'Error') }
    setActing(false);
  };

  const handleRevision = async () => {
    if (!modal) return;
    setActing(true);
    try {
      await api.post(`/portal/content/${modal.item._id}/revision`, { feedback });
      setModal(null); setFeedback(''); load(tab);
    } catch (e) { alert(e?.response?.data?.message || 'Error') }
    setActing(false);
  };

  const txt = dark ? 'text-white' : 'text-slate-800';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const card = dark ? 'rgba(255,255,255,0.03)' : '#fff';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';
  const input = dark ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

  /* group all items by status for "all" tab */
  const grouped = STATUSES.reduce((acc, s) => {
    const g = items.filter(i => i.status === s);
    if (g.length) acc[s] = g;
    return acc;
  }, {});

  /* chart data */
  const [chartData, setChartData] = useState([]);
  useEffect(() => {
    if (tab !== 'chart') return;
    api.get('/portal/content?limit=200')
      .then(r => {
        const counts = {};
        (r.data.items || []).forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
        setChartData(Object.entries(counts).map(([status, count]) => ({ status, count })));
      }).catch(() => {});
  }, [tab]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h2 className={`text-xl font-black ${txt}`}>Content Monitoring Board</h2>
        <p className={`text-xs mt-0.5 ${sub}`}>Review, approve, and manage all your content in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? `${t.color}22` : dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
              border: `1px solid ${tab === t.id ? t.color + '60' : 'transparent'}`,
              color: tab === t.id ? t.color : dark ? '#94a3b8' : '#64748b',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & Filter (non-chart tabs) */}
      {tab !== 'chart' && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search content..."
              className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border ${input} outline-none`} />
          </div>
          {tab === 'all' && (
            <select value={filterStatus} onChange={e => setFilt(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border ${input} outline-none`}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => load(tab)}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            style={{ background: '#6366f122', border: '1px solid #6366f140', color: '#818cf8' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      )}

      {/* Chart Tab */}
      {tab === 'chart' && (
        <div className="rounded-2xl p-5" style={{ background: card, border }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-indigo-400" />
            <h3 className={`text-sm font-bold ${txt}`}>Content Pipeline Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: dark ? '#64748b' : '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: dark ? '#64748b' : '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: dark ? '#0f172a' : '#fff', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: dark ? '#fff' : '#0f172a' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {chartData.map(d => (
              <div key={d.status} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS[d.status] || '#6366f1' }} />
                <span className={`text-[10px] ${sub}`}>{d.status}: <b className={txt}>{d.count}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {tab !== 'chart' && !loading && (
        <>
          {tab === 'review' && <ContentTable items={items} dark={dark} onAction={(type, item) => { setModal({ type, item }); setFeedback(''); }} />}
          {tab === 'all' && Object.keys(grouped).length === 0 && <EmptyState dark={dark} />}
          {tab === 'all' && Object.entries(grouped).map(([status, grpItems]) => (
            <GroupedTable key={status} status={status} items={grpItems} dark={dark}
              onAction={(type, item) => { setModal({ type, item }); setFeedback(''); }} />
          ))}
          {tab === 'done' && <ContentTable items={items} dark={dark} onAction={(type, item) => { setModal({ type, item }); setFeedback(''); }} minimal />}
        </>
      )}
      {tab !== 'chart' && loading && (
        <TableSkeleton columns={8} rows={5} dark={dark} />
      )}

      {/* Modal */}
      <Dialog open={Boolean(modal)} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent size="default">
          {modal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {modal.type === 'approve' ? '✅ Approve Content'
                    : modal.type === 'revision' ? '✏️ Request Revision'
                    : '👁️ View Content Details'}
                </DialogTitle>
                <DialogDescription>
                  {modal.type === 'approve' ? 'Approve this deliverable to notify the creative production team.'
                    : modal.type === 'revision' ? 'Provide change requests or required revisions to the team.'
                    : 'Review content assets, links, and production notes.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="rounded-xl p-3.5 border border-border bg-secondary/30">
                  <p className="text-xs font-bold text-foreground">{modal.item.taskName}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                    <span className="text-[10px] text-muted-foreground">{modal.item.platform}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">{modal.item.contentType}</span>
                    <StatusBadge status={modal.item.status} dark={dark} />
                  </div>
                  {modal.item.contentUrl && (
                    <a href={modal.item.contentUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary text-xs mt-2 font-medium hover:underline">
                      <ExternalLink size={12} /> View Attached Content Asset
                    </a>
                  )}
                  {modal.item.notes && <p className="text-xs mt-2 text-muted-foreground">{modal.item.notes}</p>}
                </div>

                {modal.type !== 'view' && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      {modal.type === 'approve' ? 'Optional feedback / comments:' : 'Revision notes (required):'}
                    </label>
                    <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)}
                      placeholder={modal.type === 'approve' ? 'Looks great! Ready to go.' : 'Please change the caption and add our logo...'}
                      className="w-full rounded-xl p-3 text-xs border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition-all">
                    Cancel
                  </button>
                  {modal.type === 'approve' && (
                    <button disabled={acting} onClick={handleApprove}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50">
                      {acting ? 'Approving…' : 'Confirm Approval'}
                    </button>
                  )}
                  {modal.type === 'revision' && (
                    <button disabled={acting || !feedback.trim()} onClick={handleRevision}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all disabled:opacity-50">
                      {acting ? 'Submitting…' : 'Submit Revision Request'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentTable({ items, dark, onAction, minimal }) {
  const txt = dark ? 'text-white' : 'text-slate-800';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';
  if (!items.length) return <EmptyState dark={dark} />;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: dark ? 'rgba(99,102,241,0.08)' : '#f8fafc' }}>
              {['Task Name','Platform','Status','Date','URL','Notes','Feedback','Actions'].map(h => (
                <th key={h} className={`text-left px-4 py-3 font-semibold ${sub} whitespace-nowrap`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item._id}
                style={{ background: i % 2 === 0 ? 'transparent' : dark ? 'rgba(255,255,255,0.015)' : '#fafafa',
                  borderTop: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9' }}>
                <td className={`px-4 py-3 font-semibold max-w-[160px] truncate ${txt}`}>{item.taskName}</td>
                <td className={`px-4 py-3 ${sub}`}>{item.platform}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} dark={dark} /></td>
                <td className={`px-4 py-3 whitespace-nowrap ${sub}`}>
                  {item.datePosted ? new Date(item.datePosted).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.contentUrl
                    ? <a href={item.contentUrl} target="_blank" rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> View
                      </a>
                    : <span className={sub}>—</span>}
                </td>
                <td className={`px-4 py-3 max-w-[140px] truncate ${sub}`}>{item.notes || '—'}</td>
                <td className={`px-4 py-3 max-w-[140px] truncate ${sub}`}>{item.clientFeedback || '—'}</td>
                <td className="px-4 py-3">
                  {!minimal && (
                    <div className="flex gap-1.5">
                      <ActionBtn color="#10b981" icon={<Check size={10}/>} label="Approve"
                        onClick={() => onAction('approve', item)} />
                      <ActionBtn color="#f59e0b" icon={<RotateCcw size={10}/>} label="Revise"
                        onClick={() => onAction('revision', item)} />
                      <ActionBtn color="#6366f1" icon={<Eye size={10}/>} label="View"
                        onClick={() => onAction('view', item)} />
                    </div>
                  )}
                  {minimal && <StatusBadge status={item.status} dark={dark} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupedTable({ status, items, dark, onAction }) {
  const [open, setOpen] = useState(true);
  const txt = dark ? 'text-white' : 'text-slate-800';
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: `${STATUS_COLORS[status]}15` }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
        <span className={`text-xs font-bold ${txt}`}>{status}</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${STATUS_COLORS[status]}30`, color: STATUS_COLORS[status] }}>
          {items.length}
        </span>
        <ChevronDown size={13} className="text-slate-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : '' }} />
      </button>
      {open && <ContentTable items={items} dark={dark} onAction={onAction} />}
    </div>
  );
}

function ActionBtn({ color, icon, label, onClick }) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {icon} {label}
    </button>
  );
}

function EmptyState({ dark }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
      style={{ border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)' }}>
      <AlertCircle size={36} className="text-slate-500 mb-3" />
      <p className="text-slate-400 text-sm font-medium">No content items found</p>
    </div>
  );
}
