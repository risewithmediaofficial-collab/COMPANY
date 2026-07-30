import React, { useEffect, useState } from 'react';
import { Plus, Play, Pause, CheckCircle, SlidersHorizontal, CheckSquare, Trash2, Edit2, Layers } from 'lucide-react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [formData, setFormData] = useState({
    name: '', client: '', project: '', objective: 'Leads', campaignType: 'New Campaign',
    status: 'Draft', platform: 'Meta', budgetType: 'Daily Budget', dailyBudget: 1000,
    lifetimeBudget: 0, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
    conversionApiEnabled: false, startDate: '', endDate: '', internalNotes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, clientRes, projRes] = await Promise.all([
        smmApi.getCampaigns({ search, status: statusFilter, platform: platformFilter }),
        api.get('/clients'),
        api.get('/projects'),
      ]);

      if (campRes.data?.success) {
        setCampaigns(campRes.data.data || []);
      }

      // Handle clients return structure safely
      if (clientRes.data) {
        const list = clientRes.data.clients || clientRes.data.data || (Array.isArray(clientRes.data) ? clientRes.data : []);
        setCrmClients(list);
      }

      // Handle projects return structure safely
      if (projRes.data) {
        const list = projRes.data.projects || projRes.data.data || (Array.isArray(projRes.data) ? projRes.data : []);
        setCrmProjects(list);
      }
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await smmApi.updateCampaign(editingCampaign._id, formData);
        toast.success('Campaign updated');
      } else {
        await smmApi.createCampaign(formData);
        toast.success('Campaign created');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save campaign');
    }
  };

  const openAdd = () => {
    setEditingCampaign(null);
    setFormData({
      name: '', client: crmClients[0]?._id || '', project: crmProjects[0]?._id || '', objective: 'Leads', campaignType: 'New Campaign',
      status: 'Draft', platform: 'Meta', budgetType: 'Daily Budget', dailyBudget: 1000,
      lifetimeBudget: 0, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
      conversionApiEnabled: false, startDate: '', endDate: '', internalNotes: ''
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (camp) => {
    setEditingCampaign(camp);
    setFormData({
      ...camp,
      client: camp.client?._id || camp.client || '',
      project: camp.project?._id || camp.project || ''
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
      label: 'Campaign Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">{row.client?.name || row.client?.company || 'No Client'} • {row.objective}</span>
            {row.pixelConnected && <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 text-[10px]">Pixel</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'project',
      label: 'CRM Project',
      render: (row) => (
        <span className="text-xs font-medium text-foreground">{row.project?.name || 'General Project'}</span>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (row) => <PlatformBadge platform={row.platform} />,
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold font-mono block">₹{(row.budgetType === 'Daily Budget' ? row.dailyBudget : row.lifetimeBudget)?.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">{row.budgetType}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Manage Meta, Google, LinkedIn & TikTok campaigns linked directly to website Clients & Projects"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
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
        emptyDescription="Create your first advertising campaign."
      />

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'New Campaign'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Campaign Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="app-input" placeholder="e.g. Summer Leads Campaign" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Select Client (from Website) *</label>
              <select required value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="app-select">
                <option value="">Select CRM Client</option>
                {Array.isArray(crmClients) && crmClients.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Select Project (from Website) *</label>
              <select required value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} className="app-select">
                <option value="">Select CRM Project</option>
                {Array.isArray(crmProjects) && crmProjects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Platform *</label>
              <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="app-select">
                <option value="Meta">Meta (FB/IG)</option>
                <option value="Google">Google Ads</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Objective</label>
              <select value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} className="app-select">
                <option value="Awareness">Awareness</option>
                <option value="Traffic">Traffic</option>
                <option value="Engagement">Engagement</option>
                <option value="Leads">Leads</option>
                <option value="App Promotion">App Promotion</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Budget Type</label>
              <select value={formData.budgetType} onChange={e => setFormData({...formData, budgetType: e.target.value})} className="app-select">
                <option value="Daily Budget">Daily Budget</option>
                <option value="Lifetime Budget">Lifetime Budget</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Budget Amount (₹)</label>
              <input type="number" value={formData.budgetType === 'Daily Budget' ? formData.dailyBudget : formData.lifetimeBudget} onChange={e => {
                const val = Number(e.target.value);
                if (formData.budgetType === 'Daily Budget') setFormData({...formData, dailyBudget: val});
                else setFormData({...formData, lifetimeBudget: val});
              }} className="app-input" />
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Tracking & Goal</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Landing Page URL</label>
                <input type="text" value={formData.landingPage} onChange={e => setFormData({...formData, landingPage: e.target.value})} className="app-input" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Campaign Goal</label>
                <input type="text" value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} className="app-input" placeholder="e.g. 500 Leads" />
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={formData.pixelConnected} onChange={e => setFormData({...formData, pixelConnected: e.target.checked})} className="rounded" />
                Pixel Connected
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={formData.conversionApiEnabled} onChange={e => setFormData({...formData, conversionApiEnabled: e.target.checked})} className="rounded" />
                Conversion API Enabled (CAPI)
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Campaign</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
