import { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  Plus, Edit2, Trash2, X, Save, BarChart3, FileText,
  RefreshCw, ChevronDown, Search, TrendingUp, ShieldCheck,
  CheckCircle2, XCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { getAssetUrl } from '../../utils/assetUrl';
import { formatINR } from '../../utils/currency';

const STATUSES = ['Draft','Editing','Send to Client','Revision Requested','Approved','Scheduled','Posted','Done'];
const PLATFORMS = ['Instagram','Facebook','LinkedIn','Twitter','TikTok','YouTube','Blog','Email','Other'];
const CONTENT_TYPES = ['Reel','Post','Story','Carousel','Video','Blog','Email','Ad','Other'];
const PRIORITIES = ['low','medium','high','urgent'];
const MONTHS_LIST = Array.from({length:12},(_,i)=> String(i+1).padStart(2,'0'));
const YEARS = [2023,2024,2025,2026];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS = {
  'Draft':'#64748b','Editing':'#3b82f6','Send to Client':'#f59e0b',
  'Revision Requested':'#ef4444','Approved':'#10b981',
  'Scheduled':'#8b5cf6','Posted':'#14b8a6','Done':'#6366f1'
};

const emptyContent = {
  clientId:'', taskName:'', status:'Draft', platform:'Instagram',
  contentType:'Post', priority:'medium', contentUrl:'', notes:'',
  datePosted:'', scheduledFor:'', thumbnail:''
};

const emptyReport = {
  clientId:'', month:'', year: new Date().getFullYear().toString(),
  adSpend:'', optIns:'', callsBooked:'', newClients:'', cashCollected:'', totalRevenue:'', notes:'',
  showToClient: false
};

export default function PortalManager() {
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('content');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [contentItems, setContentItems] = useState([]);
  const [reportEntries, setReportEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentModal, setContentModal] = useState(null);   // null | 'create' | item-object
  const [reportModal, setReportModal] = useState(null);
  const [contentForm, setContentForm] = useState(emptyContent);
  const [reportForm, setReportForm] = useState(emptyReport);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [accessRequests, setAccessRequests] = useState([]);

  // Load clients list
  useEffect(() => {
    api.get('/clients').then(r => {
      const list = r.data.clients || r.data.data || [];
      setClients(list);
      if (list.length) setSelectedClient(list[0]._id);
    }).catch(() => {});
  }, []);

  const loadContent = useCallback(() => {
    if (!selectedClient) return;
    setLoading(true);
    api.get(`/portal/content?limit=200`, {
      headers: { 'x-client-override': selectedClient }
    }).catch(() => {})
    // Note: admin can't use the client-only endpoint directly.
    // We fetch via tasks or list all content for this client using a direct query param if supported.
    // Since the portal/content endpoint requires client role, managers need to use a different approach.
    // We'll use a workaround via the internal content endpoint:
    api.get('/tasks', { params: { clientId: selectedClient, limit: 100 } })
      .then(() => {})
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch content items directly from the content endpoint (works for admin via override)
    api.get(`/portal/content?limit=200`)
      .then(r => setContentItems(r.data.items || []))
      .catch(() => setContentItems([]))
      .finally(() => setLoading(false));
  }, [selectedClient]);

  const loadReports = useCallback(() => {
    if (!selectedClient) return;
    api.get(`/portal/reporting?clientId=${selectedClient}`)
      .then(r => setReportEntries(r.data.entries || []))
      .catch(() => setReportEntries([]));
  }, [selectedClient]);

  const loadRequests = useCallback(() => {
    api.get('/access-requests')
      .then(r => setAccessRequests(r.data.requests || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'content') loadContent();
    if (tab === 'reports') loadReports();
    if (tab === 'requests') loadRequests();
  }, [tab, selectedClient, loadContent, loadReports, loadRequests]);

  // ── Content CRUD ──────────────────────────────────────────────────────────
  const openCreateContent = () => {
    setContentForm({ ...emptyContent, clientId: selectedClient });
    setContentModal('create');
  };

  const openEditContent = (item) => {
    setContentForm({
      clientId: item.client?._id || item.client || selectedClient,
      taskName: item.taskName || '',
      status: item.status || 'Draft',
      platform: item.platform || 'Instagram',
      contentType: item.contentType || 'Post',
      priority: item.priority || 'medium',
      contentUrl: item.contentUrl || '',
      notes: item.notes || '',
      datePosted: item.datePosted ? item.datePosted.split('T')[0] : '',
      scheduledFor: item.scheduledFor ? item.scheduledFor.split('T')[0] : '',
      thumbnail: item.thumbnail || '',
    });
    setContentModal(item);
  };

  const saveContent = async () => {
    if (!contentForm.taskName.trim()) return toast.error('Task name is required');
    setSaving(true);
    try {
      if (contentModal === 'create') {
        await api.post('/portal/content', contentForm);
        toast.success('Content item created');
      } else {
        await api.put(`/portal/content/${contentModal._id}`, contentForm);
        toast.success('Content item updated');
      }
      setContentModal(null);
      loadContent();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const deleteContent = async (id) => {
    if (!window.confirm('Delete this content item?')) return;
    try {
      await api.delete(`/portal/content/${id}`);
      toast.success('Deleted');
      loadContent();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  // ── Report CRUD ───────────────────────────────────────────────────────────
  const openCreateReport = () => {
    setReportForm({ ...emptyReport, clientId: selectedClient, showToClient: false });
    setReportModal('create');
  };

  const openEditReport = (entry) => {
    const [year, monthNum] = (entry.month || '').split('-');
    setReportForm({
      clientId: entry.client?._id || entry.client || selectedClient,
      year: year || new Date().getFullYear().toString(),
      month: monthNum || '01',
      adSpend: entry.adSpend ?? '',
      optIns: entry.optIns ?? '',
      callsBooked: entry.callsBooked ?? '',
      newClients: entry.newClients ?? '',
      cashCollected: entry.cashCollected ?? '',
      totalRevenue: entry.totalRevenue ?? '',
      notes: entry.notes || '',
      showToClient: entry.showToClient ?? false,
    });
    setReportModal(entry);
  };

  const saveReport = async () => {
    const monthStr = `${reportForm.year}-${reportForm.month}`;
    const payload = {
      clientId: reportForm.clientId || selectedClient,
      month: monthStr,
      date: `${monthStr}-01`,
      adSpend: Number(reportForm.adSpend) || 0,
      optIns: Number(reportForm.optIns) || 0,
      callsBooked: Number(reportForm.callsBooked) || 0,
      newClients: Number(reportForm.newClients) || 0,
      cashCollected: Number(reportForm.cashCollected) || 0,
      totalRevenue: Number(reportForm.totalRevenue) || 0,
      notes: reportForm.notes,
      showToClient: !!reportForm.showToClient,
    };
    setSaving(true);
    try {
      if (reportModal === 'create') {
        await api.post('/portal/reporting', payload);
        toast.success('Reporting entry created');
      } else {
        await api.put(`/portal/reporting/${reportModal._id}`, payload);
        toast.success('Reporting entry updated');
      }
      setReportModal(null);
      loadReports();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this reporting entry?')) return;
    try {
      await api.delete(`/portal/reporting/${id}`);
      toast.success('Deleted');
      loadReports();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleProcessRequest = async (requestId, status) => {
    try {
      await api.put(`/access-requests/${requestId}`, { status });
      toast.success(`Request ${status}`);
      loadRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const filtered = contentItems.filter(i =>
    !search || i.taskName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Portal Manager</h1>
          <p className="text-slate-400 text-xs mt-0.5">Manage client portal content items and reporting data</p>
        </div>

        {/* Client selector */}
        <div className="flex items-center gap-3">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white outline-none">
            <option value="">Select client…</option>
            {clients.map(c => <option key={c._id} value={c._id}>{c.name} — {c.company}</option>)}
          </select>
          <button onClick={() => tab === 'content' ? loadContent() : loadReports()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id:'content', label:'Content Items', icon: FileText, color:'#6366f1' },
          { id:'reports', label:'Reporting Entries', icon: BarChart3, color:'#10b981' },
          { id:'requests', label:'Access Requests', icon: ShieldCheck, color:'#f59e0b' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.id ? `${t.color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t.id ? t.color + '60' : 'transparent'}`,
              color: tab === t.id ? t.color : '#94a3b8',
            }}>
            <t.icon size={12} className="inline mr-1.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {tab === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none" />
            </div>
            <button onClick={openCreateContent} disabled={!selectedClient}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={13} /> Add Content Item
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/07">
            {loading ? (
              <TableSkeleton columns={7} rows={5} dark={true} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No content items. Add one above.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5">
                      {['Task Name','Platform','Type','Status','Priority','Date','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={item._id} style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3 font-semibold text-white max-w-[200px] truncate">{item.taskName}</td>
                        <td className="px-4 py-3 text-slate-400">{item.platform}</td>
                        <td className="px-4 py-3 text-slate-400">{item.contentType}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: `${STATUS_COLORS[item.status]}20`, color: STATUS_COLORS[item.status] }}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{item.priority}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {item.datePosted ? new Date(item.datePosted).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEditContent(item)}
                              className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => deleteContent(item._id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateReport} disabled={!selectedClient}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <Plus size={13} /> Add Monthly Entry
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/07">
            {reportEntries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No reporting entries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5">
                      {['Month','Ad Spend','Opt-Ins','Calls','New Clients','Cash Collected','Revenue','Show to Client','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportEntries.map(entry => {
                      const [y, m] = (entry.month || '').split('-');
                      return (
                        <tr key={entry._id} style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3 font-bold text-white">
                            {MONTH_NAMES[parseInt(m||1)-1]} {y}
                          </td>
                          <td className="px-4 py-3 text-amber-400">{formatINR(entry.adSpend || 0)}</td>
                          <td className="px-4 py-3 text-white">{entry.optIns||0}</td>
                          <td className="px-4 py-3 text-white">{entry.callsBooked||0}</td>
                          <td className="px-4 py-3 text-white">{entry.newClients||0}</td>
                          <td className="px-4 py-3 text-emerald-400">{formatINR(entry.cashCollected || 0)}</td>
                          <td className="px-4 py-3 text-pink-400">{formatINR(entry.totalRevenue || 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.showToClient ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {entry.showToClient ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEditReport(entry)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                                <Edit2 size={11} />
                              </button>
                              <button onClick={() => deleteReport(entry._id)}
                                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/07 overflow-hidden">
            {accessRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No access requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 font-semibold">
                      <th className="text-left px-6 py-4">Requester</th>
                      <th className="text-left px-6 py-4">Project</th>
                      <th className="text-left px-6 py-4">Reason</th>
                      <th className="text-left px-6 py-4">Status</th>
                      <th className="text-left px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {accessRequests.map((request) => (
                      <tr key={request._id} className="hover:bg-white/02 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                              {request.requester?.avatar ? <img src={getAssetUrl(request.requester.avatar)} alt="" className="rounded-full" /> : request.requester?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white">{request.requester?.name}</p>
                              <p className="text-[10px] text-slate-400">{request.requester?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{request.project?.name}</td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{request.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            request.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleProcessRequest(request._id, 'approved')}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"
                                title="Approve"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleProcessRequest(request._id, 'rejected')}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                title="Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-slate-500 italic text-[10px]">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Modal */}
      <AnimatePresence>
        {contentModal && (
          <Modal title={contentModal === 'create' ? 'Add Content Item' : 'Edit Content Item'}
            onClose={() => setContentModal(null)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Task Name *" span={2}>
                <input value={contentForm.taskName} onChange={e => setContentForm(f => ({...f, taskName: e.target.value}))}
                  placeholder="e.g. Q2 Brand Reel" className="modal-input" />
              </FormField>
              <FormField label="Client *">
                <select value={contentForm.clientId} onChange={e => setContentForm(f => ({...f, clientId: e.target.value}))}
                  className="modal-input">
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={contentForm.status} onChange={e => setContentForm(f => ({...f, status: e.target.value}))}
                  className="modal-input">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Platform">
                <select value={contentForm.platform} onChange={e => setContentForm(f => ({...f, platform: e.target.value}))}
                  className="modal-input">
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
                {contentForm.platform === 'Other' && (
                  <input
                    placeholder="Specify platform..."
                    value={contentForm.customPlatform || ''}
                    onChange={e => setContentForm(f => ({...f, customPlatform: e.target.value}))}
                    className="modal-input mt-1"
                  />
                )}
              </FormField>
              <FormField label="Content Type">
                <select value={contentForm.contentType} onChange={e => setContentForm(f => ({...f, contentType: e.target.value}))}
                  className="modal-input">
                  {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                {contentForm.contentType === 'Other' && (
                  <input
                    placeholder="Specify content type..."
                    value={contentForm.customContentType || ''}
                    onChange={e => setContentForm(f => ({...f, customContentType: e.target.value}))}
                    className="modal-input mt-1"
                  />
                )}
              </FormField>
              <FormField label="Priority">
                <select value={contentForm.priority} onChange={e => setContentForm(f => ({...f, priority: e.target.value}))}
                  className="modal-input">
                  {PRIORITIES.map(p => <option key={p} className="capitalize">{p}</option>)}
                </select>
              </FormField>
              <FormField label="Date Posted">
                <input type="date" value={contentForm.datePosted} onChange={e => setContentForm(f => ({...f, datePosted: e.target.value}))}
                  className="modal-input" />
              </FormField>
              <FormField label="Scheduled For">
                <input type="date" value={contentForm.scheduledFor} onChange={e => setContentForm(f => ({...f, scheduledFor: e.target.value}))}
                  className="modal-input" />
              </FormField>
              <FormField label="Content URL" span={2}>
                <input value={contentForm.contentUrl} onChange={e => setContentForm(f => ({...f, contentUrl: e.target.value}))}
                  placeholder="https://drive.google.com/…" className="modal-input" />
              </FormField>
              <FormField label="Notes" span={2}>
                <textarea rows={2} value={contentForm.notes} onChange={e => setContentForm(f => ({...f, notes: e.target.value}))}
                  className="modal-input resize-none" placeholder="Internal or client-facing notes…" />
              </FormField>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveContent} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setContentModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all">
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportModal && (
          <Modal title={reportModal === 'create' ? 'Add Monthly Report Entry' : 'Edit Report Entry'}
            onClose={() => setReportModal(null)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Client *" span={2}>
                <select value={reportForm.clientId} onChange={e => setReportForm(f => ({...f, clientId: e.target.value}))}
                  className="modal-input">
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Year">
                <select value={reportForm.year} onChange={e => setReportForm(f => ({...f, year: e.target.value}))}
                  className="modal-input">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormField>
              <FormField label="Month">
                <select value={reportForm.month} onChange={e => setReportForm(f => ({...f, month: e.target.value}))}
                  className="modal-input">
                  {MONTHS_LIST.map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
                </select>
              </FormField>
              {[
                {key:'adSpend',label:'Ad Spend (₹)'},
                {key:'optIns',label:'Opt-Ins'},
                {key:'callsBooked',label:'Calls Booked'},
                {key:'newClients',label:'New Clients'},
                {key:'cashCollected',label:'Cash Collected (₹)'},
                {key:'totalRevenue',label:'Contracted Revenue (₹)'},
              ].map(f => (
                <FormField key={f.key} label={f.label}>
                  <input type="number" min="0" value={reportForm[f.key]}
                    onChange={e => setReportForm(prev => ({...prev, [f.key]: e.target.value}))}
                    placeholder="0" className="modal-input" />
                </FormField>
              ))}
              <div className="col-span-2 flex items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  id="showToClient"
                  checked={reportForm.showToClient || false}
                  onChange={(e) => setReportForm((f) => ({ ...f, showToClient: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 h-4 w-4"
                />
                <label htmlFor="showToClient" className="text-xs text-slate-300 select-none cursor-pointer">
                  Show to Client (Visible in Client Portal reports dashboard)
                </label>
              </div>
              <FormField label="Notes" span={2}>
                <textarea rows={2} value={reportForm.notes} onChange={e => setReportForm(f => ({...f, notes: e.target.value}))}
                  className="modal-input resize-none" placeholder="Optional notes for this month…" />
              </FormField>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveReport} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button onClick={() => setReportModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all">
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style>{`
        .modal-input {
          width: 100%; padding: 8px 12px; border-radius: 10px; font-size: 12px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; outline: none;
        }
        .modal-input::placeholder { color: #64748b; }
        select option { background: #1e293b; color: white; }
        .border-white\\/07 { border-color: rgba(255,255,255,0.07); }
      `}</style>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)' }}>
      <motion.div initial={{ scale:0.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:20 }}
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background:'#0f172a', border:'1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function FormField({ label, children, span }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="text-[10px] font-semibold text-slate-400 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
