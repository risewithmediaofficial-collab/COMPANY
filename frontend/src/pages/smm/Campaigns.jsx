import React, { useEffect, useState } from 'react';
import { Plus, Play, Pause, CheckCircle, SlidersHorizontal, CheckSquare, Trash2, Edit2, Layers, Calendar, Target, DollarSign, TrendingUp, AlertTriangle, Video, Sparkles } from 'lucide-react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDailyLogDrawerOpen, setIsDailyLogDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [activeCampaignForLog, setActiveCampaignForLog] = useState(null);

  const [formData, setFormData] = useState({
    name: '', client: '', project: '', sourceContentId: '', objective: 'Leads', campaignType: 'New Campaign',
    status: 'Draft', platform: 'Meta', budgetType: 'Lifetime Budget', dailyBudget: 1000,
    lifetimeBudget: 30000, amountAdded: 30000, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
    conversionApiEnabled: false, startDate: '', endDate: '', internalNotes: ''
  });

  const [dailyLogForm, setDailyLogForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amountAdded: 0,
    spend: 0,
    leads: 0,
    messages: 0,
    calls: 0,
    revenue: 0,
    clicks: 0,
    impressions: 0,
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, clientRes, projRes, videosRes] = await Promise.all([
        smmApi.getCampaigns({ search, status: statusFilter, platform: platformFilter }),
        api.get('/clients'),
        api.get('/projects'),
        smmApi.getContents({ limit: 100 }),
      ]);

      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
      if (clientRes.data) setCrmClients(clientRes.data.clients || clientRes.data.data || (Array.isArray(clientRes.data) ? clientRes.data : []));
      if (projRes.data) setCrmProjects(projRes.data.projects || projRes.data.data || (Array.isArray(projRes.data) ? projRes.data : []));
      if (videosRes.data?.success) setVideoList(videosRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load campaigns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, platformFilter]);

  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return;
    try {
      await smmApi.bulkUpdateCampaignStatus({ ids: selectedIds, status });
      toast.success(`Updated ${selectedIds.length} campaigns to ${status}`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  const handleSelectVideoForCampaign = (videoId) => {
    const video = videoList.find((v) => v._id === videoId);
    if (!video) {
      setFormData((prev) => ({ ...prev, sourceContentId: '' }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      sourceContentId: video._id,
      name: prev.name || `${video.name} - Ad Campaign`,
      client: video.client?._id || video.client || prev.client,
      project: video.project?._id || video.project || prev.project,
      platform: video.platforms?.[0] === 'Instagram' || video.platforms?.[0] === 'Facebook' ? 'Meta' : video.platforms?.[0] || 'Meta',
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await smmApi.updateCampaign(editingCampaign._id, formData);
        toast.success('Campaign updated');
      } else {
        await smmApi.createCampaign(formData);
        toast.success('Campaign created and added to ledger');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save campaign');
    }
  };

  const openDailyLog = (camp) => {
    setActiveCampaignForLog(camp);
    setDailyLogForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      amountAdded: 0,
      spend: 0,
      leads: 0,
      messages: 0,
      calls: 0,
      revenue: 0,
      clicks: 0,
      impressions: 0,
      notes: '',
    });
    setIsDailyLogDrawerOpen(true);
  };

  const handleAddDailyLog = async (e) => {
    e.preventDefault();
    try {
      const res = await smmApi.addDailyLog(activeCampaignForLog._id, dailyLogForm);
      if (res.data?.success) {
        toast.success('Daily lead & spend log saved! Campaign money balance updated.');
        setActiveCampaignForLog(res.data.data);
        setDailyLogForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          amountAdded: 0,
          spend: 0,
          leads: 0,
          messages: 0,
          calls: 0,
          revenue: 0,
          clicks: 0,
          impressions: 0,
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to add daily log entry');
    }
  };

  const openAdd = () => {
    setEditingCampaign(null);
    setFormData({
      name: '', client: crmClients[0]?._id || '', project: crmProjects[0]?._id || '', sourceContentId: '', objective: 'Leads', campaignType: 'New Campaign',
      status: 'Draft', platform: 'Meta', budgetType: 'Lifetime Budget', dailyBudget: 1000,
      lifetimeBudget: 30000, amountAdded: 30000, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
      conversionApiEnabled: false, startDate: '', endDate: '', internalNotes: ''
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (camp) => {
    setEditingCampaign(camp);
    setFormData({
      ...camp,
      client: camp.client?._id || camp.client || '',
      project: camp.project?._id || camp.project || '',
      sourceContentId: camp.sourceContentId?._id || camp.sourceContentId || '',
    });
    setIsDrawerOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === campaigns.length) setSelectedIds([]);
    else setSelectedIds(campaigns.map(c => c._id));
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === campaigns.length} onChange={toggleSelectAll} className="rounded" />
      ),
      render: (row) => (
        <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelectOne(row._id)} className="rounded" />
      ),
    },
    {
      key: 'name',
      label: 'Campaign Name & Client',
      render: (row) => (
        <div>
          <span className="font-bold text-foreground block">{row.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">{row.client?.name || row.client?.company || 'No Client'} • {row.objective}</span>
            {row.sourceContentId && (
              <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                🎥 Video Ad
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'moneyLedger',
      label: 'Money Ledger (Added / Spent / Remaining)',
      render: (row) => {
        const added = row.amountAdded || row.lifetimeBudget || (row.dailyBudget * 30) || 0;
        const spent = row.amountSpent || row.performance?.spend || 0;
        const remaining = Math.max(0, added - spent);
        const percent = added > 0 ? Math.min(100, Math.round((spent / added) * 100)) : 0;

        return (
          <div className="w-56 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-blue-500">Added: ₹{added.toLocaleString()}</span>
              <span className="text-rose-500">Spent: ₹{spent.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${percent >= 90 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-500 font-bold">Bal: ₹{remaining.toLocaleString()}</span>
              <span className="text-muted-foreground font-mono">{percent}%</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'leads',
      label: 'Leads & CPL',
      render: (row) => (
        <div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[10px] text-muted-foreground font-mono">₹{row.performance?.costPerLead || 0} / Lead</span>
        </div>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (row) => <PlatformBadge platform={row.platform} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
    {
      key: 'dailyLog',
      label: 'Daily Log',
      render: (row) => (
        <button
          onClick={() => openDailyLog(row)}
          className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold flex items-center gap-1 border border-primary/20"
        >
          <Calendar size={13} /> Log Spend/Leads
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns & Money Ledger"
        subtitle="Manage campaign budgets, track Amount Added vs Amount Spent, budget alerts, and log daily lead entries"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Create Campaign
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." />
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="app-select w-36">
            <option value="">All Networks</option>
            <option value="Meta">Meta</option>
            <option value="Google">Google</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select w-36">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-xl border border-border">
            <span className="text-xs font-bold text-foreground">{selectedIds.length} Selected</span>
            <button onClick={() => handleBulkStatus('Active')} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-500/20">Set Active</button>
            <button onClick={() => handleBulkStatus('Paused')} className="px-2.5 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-500/20">Pause</button>
          </div>
        )}
      </div>

      <DataTable
        data={campaigns}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={async (id) => {
          if (!window.confirm('Delete campaign?')) return;
          await smmApi.deleteCampaign(id);
          fetchData();
        }}
        emptyTitle="No campaigns found"
      />

      {/* Log Spend & Leads Drawer */}
      <SMMDrawer
        isOpen={isDailyLogDrawerOpen}
        onClose={() => setIsDailyLogDrawerOpen(false)}
        title={`Log Daily Spend & Leads — ${activeCampaignForLog?.name}`}
      >
        <form onSubmit={handleAddDailyLog} className="space-y-4 text-xs">
          <div className="p-3.5 bg-secondary/40 border border-border rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Campaign Money Summary</span>
            <div className="flex items-center justify-between font-bold text-xs pt-1">
              <span className="text-blue-500">Added: ₹{(activeCampaignForLog?.amountAdded || 0).toLocaleString()}</span>
              <span className="text-rose-500">Spent: ₹{(activeCampaignForLog?.amountSpent || 0).toLocaleString()}</span>
              <span className="text-emerald-500">Balance: ₹{(activeCampaignForLog?.remainingBalance || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Date</label>
              <input
                type="date"
                required
                value={dailyLogForm.date}
                onChange={e => setDailyLogForm({...dailyLogForm, date: e.target.value})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-blue-500 block mb-1">Add Funds to Campaign (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={dailyLogForm.amountAdded}
                onChange={e => setDailyLogForm({...dailyLogForm, amountAdded: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-rose-500 block mb-1">Today's Spend (₹) *</label>
              <input
                type="number"
                required
                value={dailyLogForm.spend}
                onChange={e => setDailyLogForm({...dailyLogForm, spend: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-emerald-500 block mb-1">Leads Generated</label>
              <input
                type="number"
                value={dailyLogForm.leads}
                onChange={e => setDailyLogForm({...dailyLogForm, leads: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Budget scaled up today due to high conversion rate..."
              value={dailyLogForm.notes}
              onChange={e => setDailyLogForm({...dailyLogForm, notes: e.target.value})}
              className="w-full p-2.5 bg-background border border-border rounded-xl outline-none"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button type="button" onClick={() => setIsDailyLogDrawerOpen(false)} className="px-4 py-2 bg-secondary text-foreground rounded-xl">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-xs">Save Ledger Entry</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Create / Edit Campaign Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Creative Source: Link to Video Database */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
            <label className="font-bold text-purple-600 dark:text-purple-400 block flex items-center gap-1.5">
              <Sparkles size={14} /> Connect to Video / Reel from Database
            </label>
            <select
              value={formData.sourceContentId}
              onChange={e => handleSelectVideoForCampaign(e.target.value)}
              className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
            >
              <option value="">-- Or Create General Ad Campaign --</option>
              {videoList.map(v => (
                <option key={v._id} value={v._id}>
                  {v.name} ({v.contentType}) {v.adRecommendation === '🔥 HIGH POTENTIAL' ? '🔥 HIGH POTENTIAL' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="app-input"
              placeholder="e.g. August Restaurant Lead Campaign"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Client *</label>
              <select
                required
                value={formData.client}
                onChange={e => setFormData({...formData, client: e.target.value})}
                className="app-select"
              >
                <option value="">Select Client</option>
                {crmClients.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Project *</label>
              <select
                required
                value={formData.project}
                onChange={e => setFormData({...formData, project: e.target.value})}
                className="app-select"
              >
                <option value="">Select Project</option>
                {crmProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Platform *</label>
              <select
                value={formData.platform}
                onChange={e => setFormData({...formData, platform: e.target.value})}
                className="app-select"
              >
                <option value="Meta">Meta Ads (IG & FB)</option>
                <option value="Google">Google Ads</option>
                <option value="LinkedIn">LinkedIn Ads</option>
                <option value="YouTube">YouTube Ads</option>
                <option value="TikTok">TikTok Ads</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Objective</label>
              <select
                value={formData.objective}
                onChange={e => setFormData({...formData, objective: e.target.value})}
                className="app-select"
              >
                <option value="Leads">Lead Generation</option>
                <option value="Sales">Conversions / Sales</option>
                <option value="Traffic">Website Traffic</option>
                <option value="Engagement">Engagement</option>
                <option value="Messages">Direct Messages</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-3.5 rounded-2xl border border-border">
            <div>
              <label className="font-semibold text-foreground block mb-1">Total Campaign Budget (₹) *</label>
              <input
                type="number"
                required
                value={formData.lifetimeBudget}
                onChange={e => setFormData({...formData, lifetimeBudget: Number(e.target.value), amountAdded: Number(e.target.value)})}
                className="app-input font-bold text-foreground"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Daily Budget (₹)</label>
              <input
                type="number"
                value={formData.dailyBudget}
                onChange={e => setFormData({...formData, dailyBudget: Number(e.target.value)})}
                className="app-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="app-input"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="app-input"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="app-button-primary">Save Campaign</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
