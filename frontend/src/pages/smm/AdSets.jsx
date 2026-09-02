import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Layers, Target, MapPin, Users, Sliders, Play, CheckCircle, ArrowRight, Video, Sparkles, MessageCircle, FileText, Globe } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

const PLACEMENTS_LIST = ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels', 'Messenger', 'Audience Network'];

export default function AdSets() {
  const location = useLocation();
  const navigate = useNavigate();

  const [adSets, setAdSets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAdSet, setEditingAdSet] = useState(null);
  const [createdAdSetForNextStep, setCreatedAdSetForNextStep] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    campaign: '',
    status: 'Draft',
    targetAudienceText: '',
    locationText: '',
    formType: 'Instant Form',
    sourceContentIds: [],
    audience: {
      location: ['India'],
      ageMin: 18,
      ageMax: 65,
      gender: 'All',
      language: ['English'],
      detailedTargeting: { interests: [], behaviors: [], demographics: [] },
      customAudience: [],
      audienceSize: 'Broad',
    },
    placements: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels'],
    optimizationGoal: 'Leads',
    budget: 1000,
    bidStrategy: 'Lowest Cost',
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

  // If navigated from Create Campaign with location.state.campaign, auto-open drawer with prefilled data
  useEffect(() => {
    if (location.state?.campaign && campaigns.length > 0) {
      const camp = location.state.campaign;
      const vIds = camp.sourceContentIds?.map(v => v._id || v) || (camp.sourceContentId ? [camp.sourceContentId._id || camp.sourceContentId] : []);
      setEditingAdSet(null);
      setFormData({
        name: `${camp.name} - Ad Set`,
        campaign: camp._id,
        status: 'Draft',
        targetAudienceText: '',
        locationText: '',
        formType: camp.objective === 'Messages' ? 'WhatsApp' : 'Instant Form',
        sourceContentIds: vIds,
        audience: {
          location: ['India'],
          ageMin: 18,
          ageMax: 65,
          gender: 'All',
          language: ['English'],
          detailedTargeting: { interests: [], behaviors: [], demographics: [] },
          customAudience: [],
          audienceSize: 'Broad',
        },
        placements: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels'],
        optimizationGoal: camp.objective === 'Lead Generation' ? 'Leads' : 'Link Clicks',
        budget: camp.dailyBudget || 1000,
        bidStrategy: 'Lowest Cost',
      });
      setIsDrawerOpen(true);
    }
  }, [location.state, campaigns]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => String(c._id) === String(formData.campaign));
  }, [campaigns, formData.campaign]);

  const handleCampaignChange = (campaignId) => {
    const camp = campaigns.find(c => String(c._id) === String(campaignId));
    if (!camp) {
      setFormData(prev => ({ ...prev, campaign: '' }));
      return;
    }
    const vIds = camp.sourceContentIds?.map(v => v._id || v) || (camp.sourceContentId ? [camp.sourceContentId._id || camp.sourceContentId] : []);
    setFormData(prev => ({
      ...prev,
      campaign: camp._id,
      name: prev.name || `${camp.name} - Ad Set`,
      budget: camp.dailyBudget || prev.budget || 1000,
      optimizationGoal: camp.objective === 'Lead Generation' ? 'Leads' : 'Link Clicks',
      formType: camp.objective === 'Messages' ? 'WhatsApp' : prev.formType || 'Instant Form',
      sourceContentIds: vIds,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.campaign) {
      toast.error('Ad Set Name and Campaign selection are required');
      return;
    }
    try {
      if (editingAdSet) {
        await smmApi.updateAdSet(editingAdSet._id, formData);
        toast.success('Ad Set updated');
        setIsDrawerOpen(false);
        fetchData();
      } else {
        const res = await smmApi.createAdSet(formData);
        toast.success('Ad Set created successfully');
        setIsDrawerOpen(false);
        fetchData();
        if (res.data?.data) {
          setCreatedAdSetForNextStep(res.data.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Ad Set');
    }
  };

  const openAdd = () => {
    setEditingAdSet(null);
    const firstCamp = campaigns[0];
    const vIds = firstCamp?.sourceContentIds?.map(v => v._id || v) || (firstCamp?.sourceContentId ? [firstCamp.sourceContentId._id || firstCamp.sourceContentId] : []);
    setFormData({
      name: firstCamp ? `${firstCamp.name} - Ad Set` : '',
      campaign: firstCamp?._id || '',
      status: 'Draft',
      targetAudienceText: '',
      locationText: '',
      formType: 'Instant Form',
      sourceContentIds: vIds,
      audience: {
        location: ['India'],
        ageMin: 18,
        ageMax: 65,
        gender: 'All',
        language: ['English'],
        detailedTargeting: { interests: [], behaviors: [], demographics: [] },
        customAudience: [],
        audienceSize: 'Broad',
      },
      placements: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels'],
      optimizationGoal: firstCamp?.objective === 'Lead Generation' ? 'Leads' : 'Link Clicks',
      budget: firstCamp?.dailyBudget || 1000,
      bidStrategy: 'Lowest Cost',
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingAdSet(row);
    const campId = row.campaign?._id || row.campaign;
    const vIds = row.sourceContentIds?.map(v => v._id || v) || row.campaign?.sourceContentIds?.map(v => v._id || v) || [];
    setFormData({
      ...row,
      campaign: campId,
      targetAudienceText: row.targetAudienceText || '',
      locationText: row.locationText || '',
      formType: row.formType || 'Instant Form',
      sourceContentIds: vIds,
    });
    setIsDrawerOpen(true);
  };

  const togglePlacement = (p) => {
    const list = formData.placements || [];
    if (list.includes(p)) setFormData({ ...formData, placements: list.filter(item => item !== p) });
    else setFormData({ ...formData, placements: [...list, p] });
  };

  const handleLaunchAds = (adSetRow) => {
    navigate('/smm/ads', { state: { adSet: adSetRow, campaign: adSetRow.campaign } });
  };

  const columns = [
    {
      key: 'name',
      label: 'Ad Set Name & Campaign',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.name}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span>{row.campaign?.name || 'Unassigned Campaign'}</span>
            {row.formType && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                row.formType === 'WhatsApp' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
              }`}>
                {row.formType}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'audience',
      label: 'Target Audience & Location',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <span className="font-medium text-foreground block">
            {row.locationText || (row.audience?.location?.join(', ') || 'All Locations')}
          </span>
          <span className="text-muted-foreground block truncate max-w-xs">
            {row.targetAudienceText || `${row.audience?.gender || 'All'} • ${row.audience?.ageMin || 18}-${row.audience?.ageMax || 65} yrs`}
          </span>
        </div>
      ),
    },
    {
      key: 'optimizationGoal',
      label: 'Goal & Form Type',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary block w-fit">
            {row.optimizationGoal}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {row.formType === 'WhatsApp' ? '💬 WhatsApp Lead' : '📋 Instant Form'}
          </span>
        </div>
      ),
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
    {
      key: 'actions',
      label: 'Launch Ads',
      render: (row) => (
        <button
          onClick={() => handleLaunchAds(row)}
          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Play size={12} fill="currentColor" /> Run Ads
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad Sets & Audience Targeting"
        subtitle="Configure target audiences, locations, lead form destinations & campaign placement settings"
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

      {/* Create / Edit Ad Set Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAdSet ? 'Edit Ad Set' : 'Create Ad Set (Step 2 of 3)'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Campaign Selection & Auto-details */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">Parent Campaign *</label>
            <select
              required
              value={formData.campaign}
              onChange={e => handleCampaignChange(e.target.value)}
              className="app-select"
            >
              <option value="">Select Campaign</option>
              {campaigns.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.client?.company || c.client?.name || 'Client'}) • ₹{(c.lifetimeBudget || c.dailyBudget || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-inherited Campaign Information Banner */}
          {selectedCampaign && (
            <div className="p-3 bg-secondary/50 rounded-2xl border border-border space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Campaign Summary</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
                  {selectedCampaign.platform || 'Meta'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                <div>Client: <strong className="text-foreground">{selectedCampaign.client?.company || selectedCampaign.client?.name}</strong></div>
                <div>Project: <strong className="text-foreground">{selectedCampaign.project?.name || 'General'}</strong></div>
                <div>Objective: <strong className="text-foreground">{selectedCampaign.objective}</strong></div>
                <div>
                  Attached Videos: <strong className="text-purple-600 dark:text-purple-400">
                    {selectedCampaign.sourceContentIds?.length || (selectedCampaign.sourceContentId ? 1 : 0)} Videos
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="font-semibold text-foreground mb-1 block">Ad Set Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="app-input"
              placeholder="e.g. Luxury Investors - Instant Form - 25-55 Yrs"
            />
          </div>

          {/* Extra Fields: Target Audience & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block flex items-center gap-1.5">
                <Target size={14} className="text-primary" /> Target Audience *
              </label>
              <input
                type="text"
                required
                value={formData.targetAudienceText}
                onChange={e => setFormData({...formData, targetAudienceText: e.target.value})}
                className="app-input"
                placeholder="e.g. Home buyers, 28-55 yrs, High income, Investors"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-500" /> Target Location *
              </label>
              <input
                type="text"
                required
                value={formData.locationText}
                onChange={e => setFormData({...formData, locationText: e.target.value})}
                className="app-input"
                placeholder="e.g. Colombo & Western Province, Sri Lanka"
              />
            </div>
          </div>

          {/* Extra Field: Form Type (Instant Form vs WhatsApp) & Optimization Goal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-500" /> Form Type / Destination *
              </label>
              <select
                value={formData.formType}
                onChange={e => setFormData({...formData, formType: e.target.value})}
                className="app-select"
              >
                <option value="Instant Form">Instant Form (Meta Lead Gen)</option>
                <option value="WhatsApp">WhatsApp (Direct Chat Leads)</option>
                <option value="Landing Page">Landing Page Website</option>
                <option value="Instagram DM / Messenger">Instagram DM / Messenger</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">Optimization Goal</label>
              <select
                value={formData.optimizationGoal}
                onChange={e => setFormData({...formData, optimizationGoal: e.target.value})}
                className="app-select"
              >
                <option value="Leads">Leads</option>
                <option value="Conversions">Conversions</option>
                <option value="Landing Page Views">Landing Page Views</option>
                <option value="Link Clicks">Link Clicks</option>
                <option value="Purchases">Purchases</option>
              </select>
            </div>
          </div>

          {/* Detailed Demographic Targeting */}
          <div className="p-3.5 bg-secondary/30 rounded-2xl border border-border space-y-2.5">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Demographics & Age Range</h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Gender</label>
                <select
                  value={formData.audience?.gender}
                  onChange={e => setFormData({...formData, audience: {...formData.audience, gender: e.target.value}})}
                  className="app-select"
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Age Min</label>
                <input
                  type="number"
                  value={formData.audience?.ageMin}
                  onChange={e => setFormData({...formData, audience: {...formData.audience, ageMin: Number(e.target.value)}})}
                  className="app-input"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Age Max</label>
                <input
                  type="number"
                  value={formData.audience?.ageMax}
                  onChange={e => setFormData({...formData, audience: {...formData.audience, ageMax: Number(e.target.value)}})}
                  className="app-input"
                />
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="p-3.5 bg-secondary/30 rounded-2xl border border-border space-y-2">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Placements</h4>
            <div className="grid grid-cols-2 gap-2">
              {PLACEMENTS_LIST.map(p => (
                <label key={p} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-xl border border-border hover:bg-secondary">
                  <input type="checkbox" checked={formData.placements?.includes(p)} onChange={() => togglePlacement(p)} className="rounded" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Budget & Bid Strategy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">Ad Set Daily Budget (₹)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                className="app-input font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground mb-1 block">Bid Strategy</label>
              <select
                value={formData.bidStrategy}
                onChange={e => setFormData({...formData, bidStrategy: e.target.value})}
                className="app-select"
              >
                <option value="Lowest Cost">Lowest Cost</option>
                <option value="Cost Cap">Cost Cap</option>
                <option value="Bid Cap">Bid Cap</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="app-button-primary">Save Ad Set</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Post-Creation Action Modal: Ad Set Created -> Convert to Running Ads */}
      {createdAdSetForNextStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Ad Set Configured!</h3>
              <p className="text-xs text-muted-foreground">
                <strong>{createdAdSetForNextStep.name}</strong> is ready. Now convert campaign video(s) into active ads and start running!
              </p>
            </div>

            <div className="p-3 bg-secondary/50 rounded-2xl border border-border text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Target Audience:</span>
                <span className="font-semibold text-foreground">{createdAdSetForNextStep.targetAudienceText || 'Broad'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Location:</span>
                <span className="font-semibold text-foreground">{createdAdSetForNextStep.locationText || 'All'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Form Type:</span>
                <span className="font-semibold text-primary">{createdAdSetForNextStep.formType || 'Instant Form'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const set = createdAdSetForNextStep;
                  setCreatedAdSetForNextStep(null);
                  navigate('/smm/ads', { state: { adSet: set, campaign: set.campaign } });
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Play size={14} fill="currentColor" /> Convert to Ads & Start Running <ArrowRight size={14} />
              </button>
              <button
                onClick={() => setCreatedAdSetForNextStep(null)}
                className="py-2.5 px-4 bg-secondary text-foreground font-medium rounded-xl text-xs hover:bg-secondary/80"
              >
                Stay in Ad Sets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
