import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  Megaphone, Plus, Calendar, DollarSign, Layers, PlayCircle, PauseCircle,
  StopCircle, CheckCircle, TrendingUp, Trash2, Edit3, X, ExternalLink,
  Info, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

export const Campaigns = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all'); // all, Running, Paused, Stopped, Completed

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    platform: '',
    contentType: '',
    campaignStatus: '',
    dateRange: 'all',
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Form states
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [publishedContents, setPublishedContents] = useState([]);

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    name: '',
    platform: 'Meta',
    adSource: 'Manual Ad',
    sourceContentId: '',
    adDescription: '',
    creativeUrl: '',
    landingPageUrl: '',
    cta: 'Learn More',
    adCopy: '',
    objective: 'Lead Generation',
    status: 'Running',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: '',
    endTime: '23:59',
    budgetType: 'Daily Budget',
    dailyBudget: 1000,
    lifetimeBudget: 15000,
  });

  const [spendFormData, setSpendFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amountSpent: 0,
    leadsGenerated: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    notes: '',
  });

  // Check if navigate passed state from "Create Ad" button on content table
  useEffect(() => {
    if (location.state?.sourceContent) {
      const src = location.state.sourceContent;
      setFormData((prev) => ({
        ...prev,
        client: location.state.client || src.client?._id || src.client || '',
        project: location.state.project || src.project?._id || src.project || '',
        platform: location.state.platform || 'Meta',
        adSource: 'Existing Posted Content',
        sourceContentId: src._id,
        name: `Ad: ${src.name}`,
      }));
      setIsCreateModalOpen(true);
    }
  }, [location.state]);

  // Load clients and published content list for easy video/post dropdown selection
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [clientsRes, contentRes] = await Promise.all([
          smmApi.getClients(),
          smmApi.getPublishedContentForAd(),
        ]);
        if (clientsRes.data?.success) setClientsList(clientsRes.data.data || []);
        if (contentRes.data?.success) setPublishedContents(contentRes.data.data || []);
      } catch (err) {
        console.error('Failed to load initial ad data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Load projects & client-filtered contents when client selection changes in modal
  useEffect(() => {
    if (!formData.client) {
      setProjectsList([]);
      return;
    }
    const loadProjectsAndContents = async () => {
      try {
        const [projRes, pubRes] = await Promise.all([
          smmApi.getProjects({ client: formData.client }),
          smmApi.getPublishedContentForAd({ client: formData.client }),
        ]);
        if (projRes.data?.success) setProjectsList(projRes.data.data || []);
        if (pubRes.data?.success) setPublishedContents(pubRes.data.data || []);
      } catch (err) {
        console.error('Failed to load client projects/content:', err);
      }
    };
    loadProjectsAndContents();
  }, [formData.client]);

  // Calculate duration in days
  const calculatedDuration = React.useMemo(() => {
    if (formData.startDate && formData.endDate) {
      const diffMs = new Date(formData.endDate) - new Date(formData.startDate);
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    return 30; // default 30 days
  }, [formData.startDate, formData.endDate]);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = {
        client: filters.client || undefined,
        project: filters.project || undefined,
        platform: filters.platform || undefined,
        status: statusTab !== 'all' ? statusTab : (filters.campaignStatus || undefined),
      };
      const res = await smmApi.getCampaigns(params);
      if (res.data?.success) setCampaigns(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load ad campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filters, statusTab]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client || !formData.project || !formData.name) {
      toast.error('Client, Project, and Campaign Name are required!');
      return;
    }

    if (formData.adSource === 'Existing Posted Content' && !formData.sourceContentId) {
      toast.error('Please select an existing published post to link!');
      return;
    }

    try {
      const res = await smmApi.createCampaign(formData);
      if (res.data?.success) {
        toast.success('Ad Campaign created successfully!');
        setIsCreateModalOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    }
  };

  const handleAddSpendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      const res = await smmApi.addAdSpendLog({
        campaign: selectedCampaign._id,
        ...spendFormData,
      });
      if (res.data?.success) {
        toast.success('Daily ad spend and metrics logged!');
        setIsSpendModalOpen(false);
        setSpendFormData({
          date: new Date().toISOString().split('T')[0],
          amountSpent: 0,
          leadsGenerated: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          notes: '',
        });
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to log daily spend');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await smmApi.deleteCampaign(id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paid Ad Campaigns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure ad spend, daily budgets, remaining balances, and lead campaigns linked to Client & Project
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all scale-[1.01]"
        >
          <Plus size={16} />
          <span>Create Ad Campaign</span>
        </button>
      </div>

      <SMMSubNav />
      <SMMFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', campaignStatus: '', dateRange: 'all' })}
      />

      {/* Campaign Lifecycle Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
        {[
          { id: 'all', label: 'All Campaigns', icon: Layers },
          { id: 'Running', label: 'Running', icon: PlayCircle },
          { id: 'Paused', label: 'Paused', icon: PauseCircle },
          { id: 'Stopped', label: 'Stopped', icon: StopCircle },
          { id: 'Completed', label: 'Completed', icon: CheckCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-secondary text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Campaigns Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading campaigns data...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No ad campaigns found for selected Client/Project filters. Click "+ Create Ad Campaign" to build one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Client & Project</th>
                  <th className="px-4 py-3">Platform & Objective</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Daily / Lifetime Budget</th>
                  <th className="px-4 py-3">Amount Spent</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((item) => {
                  const isExceeded = item.remainingBalance <= 0 && item.amountSpent > 0;
                  return (
                    <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground block">{item.name}</span>
                        {item.adSource === 'Existing Posted Content' && item.sourceContentId && (
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <FileText size={10} /> Linked: {item.sourceContentId.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground block">{item.client?.company || item.client?.name || 'N/A'}</span>
                        <span className="text-muted-foreground">{item.project?.name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground block">{item.platform}</span>
                        <span className="text-muted-foreground">{item.objective}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            item.status === 'Running'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : item.status === 'Paused'
                              ? 'bg-amber-500/10 text-amber-600'
                              : item.status === 'Completed'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {item.budgetType === 'Daily Budget' ? (
                          <span>₹{item.dailyBudget?.toLocaleString()}/day</span>
                        ) : (
                          <span>₹{item.lifetimeBudget?.toLocaleString()} lifetime</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        ₹{(item.amountSpent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {isExceeded ? (
                          <span className="text-red-500 font-bold">Budget Exceeded</span>
                        ) : (
                          <span className="text-emerald-600">₹{(item.remainingBalance || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCampaign(item);
                              setIsSpendModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-secondary/80 font-medium rounded-lg text-[11px] transition-all"
                          >
                            <TrendingUp size={12} /> Log Spend
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(item._id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 size={14} />
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

      {/* CREATE AD CAMPAIGN MODAL (SLIDE-OVER SHEET) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent size="lg">
                  <DialogHeader>
                    <DialogTitle>Create Paid Advertisement Campaign</DialogTitle>
                    <DialogDescription>
                      Launch Meta Ads, Google Ads, or LinkedIn sponsored campaigns with daily budget and goals.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    {/* Client & Project Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-secondary/30 p-3.5 rounded-2xl border border-border/80">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Select Client *</label>
                        <select
                          required
                          value={formData.client}
                          onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '', sourceContentId: '' })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs"
                        >
                          <option value="">-- Choose Client --</option>
                          {clientsList.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.companyName || c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Select Project *</label>
                        <select
                          required
                          value={formData.project}
                          onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                          disabled={!formData.client || loadingProjects}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 text-xs"
                        >
                          <option value="">-- Choose Project --</option>
                          {projectsList.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Campaign Name & Platform */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Campaign Name *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Q4 Festive Offer Lead Gen"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Ad Platform *</label>
                        <select
                          value={formData.platform}
                          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        >
                          <option value="Meta Ads">Meta Ads (Instagram / FB)</option>
                          <option value="Google Ads">Google Ads</option>
                          <option value="LinkedIn Ads">LinkedIn Ads</option>
                          <option value="YouTube Ads">YouTube Ads</option>
                          <option value="X Ads">X Ads</option>
                        </select>
                      </div>
                    </div>

                    {/* Objective & Budget */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Campaign Objective</label>
                        <select
                          value={formData.objective}
                          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        >
                          <option value="Lead Generation">Lead Generation</option>
                          <option value="Brand Awareness">Brand Awareness</option>
                          <option value="Traffic">Traffic / Clicks</option>
                          <option value="Conversions">Conversions / Sales</option>
                          <option value="Engagement">Engagement</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Daily Budget (₹) *</label>
                        <input
                          required
                          type="number"
                          placeholder="1000"
                          value={formData.dailyBudget}
                          onChange={(e) => setFormData({ ...formData, dailyBudget: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Total Budget (₹)</label>
                        <input
                          type="number"
                          placeholder="30000"
                          value={formData.totalBudget}
                          onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Dates & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Start Date *</label>
                        <input
                          required
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">End Date</label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Initial Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        >
                          <option value="Running">Running</option>
                          <option value="Paused">Paused</option>
                          <option value="Draft">Draft</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 border border-border rounded-xl font-semibold text-xs hover:bg-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90"
                      >
                        Create Campaign
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* LOG DAILY SPEND MODAL (SLIDE-OVER SHEET) */}
              <Dialog open={isSpendModalOpen && Boolean(selectedCampaign)} onOpenChange={setIsSpendModalOpen}>
                <DialogContent size="default">
                  <DialogHeader>
                    <DialogTitle>Log Daily Ad Spend — {selectedCampaign?.name}</DialogTitle>
                    <DialogDescription>
                      Record daily ad cost, impressions, clicks, and lead generation totals.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleAddSpendSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Date *</label>
                        <input
                          type="date"
                          required
                          value={spendFormData.date}
                          onChange={(e) => setSpendFormData({ ...spendFormData, date: e.target.value })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Amount Spent (₹) *</label>
                        <input
                          type="number"
                          required
                          value={spendFormData.amountSpent}
                          onChange={(e) => setSpendFormData({ ...spendFormData, amountSpent: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Leads Generated</label>
                        <input
                          type="number"
                          value={spendFormData.leadsGenerated}
                          onChange={(e) => setSpendFormData({ ...spendFormData, leadsGenerated: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Clicks</label>
                        <input
                          type="number"
                          value={spendFormData.clicks}
                          onChange={(e) => setSpendFormData({ ...spendFormData, clicks: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Impressions</label>
                        <input
                          type="number"
                          value={spendFormData.impressions}
                          onChange={(e) => setSpendFormData({ ...spendFormData, impressions: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Reach</label>
                        <input
                          type="number"
                          value={spendFormData.reach}
                          onChange={(e) => setSpendFormData({ ...spendFormData, reach: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setIsSpendModalOpen(false)}
                        className="px-4 py-2 border border-border rounded-xl font-semibold text-xs hover:bg-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90"
                      >
                        Save Spend Log
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
    </div>
  );
};
