import React, { useEffect, useState } from 'react';
import { Plus, Layers, Target, MapPin, Users, Sliders } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

const PLACEMENTS_LIST = ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels', 'Messenger', 'Audience Network'];

export default function AdSets() {
  const [adSets, setAdSets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAdSet, setEditingAdSet] = useState(null);

  const [formData, setFormData] = useState({
    name: '', campaign: '', status: 'Draft',
    audience: {
      location: ['India'], ageMin: 18, ageMax: 65, gender: 'All', language: ['English', 'Hindi'],
      detailedTargeting: { interests: [], behaviors: [], demographics: [] },
      customAudience: [], audienceSize: 'Broad'
    },
    placements: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels'],
    optimizationGoal: 'Leads', budget: 500, bidStrategy: 'Lowest Cost'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adSetRes, campRes] = await Promise.all([
        smmApi.getAdSets({ search, status: statusFilter }),
        smmApi.getCampaigns({ limit: 100 }),
      ]);
      if (adSetRes.data?.success) setAdSets(adSetRes.data.data || []);
      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load Ad Sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAdSet) {
        await smmApi.updateAdSet(editingAdSet._id, formData);
        toast.success('Ad Set updated');
      } else {
        await smmApi.createAdSet(formData);
        toast.success('Ad Set created');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save Ad Set');
    }
  };

  const openAdd = () => {
    setEditingAdSet(null);
    setFormData({
      name: '', campaign: campaigns[0]?._id || '', status: 'Draft',
      audience: {
        location: ['India'], ageMin: 18, ageMax: 65, gender: 'All', language: ['English'],
        detailedTargeting: { interests: [], behaviors: [], demographics: [] },
        customAudience: [], audienceSize: 'Broad'
      },
      placements: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels'],
      optimizationGoal: 'Leads', budget: 500, bidStrategy: 'Lowest Cost'
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingAdSet(row);
    setFormData({ ...row, campaign: row.campaign?._id || row.campaign });
    setIsDrawerOpen(true);
  };

  const togglePlacement = (p) => {
    const list = formData.placements || [];
    if (list.includes(p)) setFormData({ ...formData, placements: list.filter(item => item !== p) });
    else setFormData({ ...formData, placements: [...list, p] });
  };

  const columns = [
    {
      key: 'name',
      label: 'Ad Set Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.campaign?.name || 'Unassigned Campaign'}</span>
        </div>
      ),
    },
    {
      key: 'audience',
      label: 'Audience & Placements',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <span className="font-medium text-foreground block">{row.audience?.gender || 'All'} • {row.audience?.ageMin || 18}-{row.audience?.ageMax || 65} yrs</span>
          <span className="text-muted-foreground">{row.placements?.length || 0} Placements</span>
        </div>
      ),
    },
    {
      key: 'optimizationGoal',
      label: 'Optimization Goal',
      render: (row) => <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">{row.optimizationGoal}</span>,
    },
    {
      key: 'budget',
      label: 'Daily Budget',
      render: (row) => <span className="text-xs font-mono font-semibold">₹{row.budget?.toLocaleString()}</span>,
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
        title="Ad Sets"
        subtitle="Manage detailed audience targeting, placements, optimization goals & bidding"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Create Ad Set
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Ad Sets..." />
        </div>
        <div className="w-full sm:w-48">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
      </div>

      <DataTable
        data={adSets}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={async (id) => {
          if (!window.confirm('Delete Ad Set?')) return;
          await smmApi.deleteAdSet(id);
          fetchData();
        }}
        emptyTitle="No Ad Sets found"
        emptyDescription="Create an Ad Set within a campaign."
      />

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAdSet ? 'Edit Ad Set' : 'Create Ad Set'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Ad Set Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="app-input" placeholder="e.g. India - 25-45 - Interest: Fitness" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Campaign *</label>
              <select required value={formData.campaign} onChange={e => setFormData({...formData, campaign: e.target.value})} className="app-select">
                <option value="">Select Campaign</option>
                {campaigns.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Optimization Goal</label>
              <select value={formData.optimizationGoal} onChange={e => setFormData({...formData, optimizationGoal: e.target.value})} className="app-select">
                <option value="Conversions">Conversions</option>
                <option value="Leads">Leads</option>
                <option value="Landing Page Views">Landing Page Views</option>
                <option value="Link Clicks">Link Clicks</option>
                <option value="Purchases">Purchases</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Audience Targeting</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Gender</label>
                <select value={formData.audience?.gender} onChange={e => setFormData({...formData, audience: {...formData.audience, gender: e.target.value}})} className="app-select text-xs">
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Age Min</label>
                <input type="number" value={formData.audience?.ageMin} onChange={e => setFormData({...formData, audience: {...formData.audience, ageMin: Number(e.target.value)}})} className="app-input text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Age Max</label>
                <input type="number" value={formData.audience?.ageMax} onChange={e => setFormData({...formData, audience: {...formData.audience, ageMax: Number(e.target.value)}})} className="app-input text-xs" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Placements</h4>
            <div className="grid grid-cols-2 gap-2">
              {PLACEMENTS_LIST.map(p => (
                <label key={p} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-xl border border-border hover:bg-secondary">
                  <input type="checkbox" checked={formData.placements?.includes(p)} onChange={() => togglePlacement(p)} className="rounded" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Budget (₹)</label>
              <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} className="app-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Bid Strategy</label>
              <select value={formData.bidStrategy} onChange={e => setFormData({...formData, bidStrategy: e.target.value})} className="app-select">
                <option value="Lowest Cost">Lowest Cost</option>
                <option value="Cost Cap">Cost Cap</option>
                <option value="Bid Cap">Bid Cap</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Ad Set</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
