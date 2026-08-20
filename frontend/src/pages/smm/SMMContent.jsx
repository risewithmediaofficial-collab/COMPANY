import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  Plus, Calendar as CalendarIcon, FileText, Image as ImageIcon,
  Share2, Eye, Edit3, Trash2, Megaphone, TrendingUp, X, CheckCircle2,
  Video, Layers, Clock, AlertCircle, Sparkles, ExternalLink, Bookmark, Heart, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

const NOT_POSTED_REASONS = [
  'Waiting for Client',
  'Waiting for Edit',
  'Revision Required',
  'Not Scheduled',
  'Strategy Hold',
  'Client Request',
  'Other',
];

export const SMMContent = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, posted, not_posted, scheduled, pending_approval, performance

  // Filters state
  const [filters, setFilters] = useState({
    client: '',
    project: '',
    platform: '',
    contentType: '',
    notPostedReason: '',
    campaignStatus: '',
    dateRange: 'all',
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  // Form states for creating/editing content
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    contentType: 'Reel',
    platforms: ['Instagram'],
    name: '',
    description: '',
    caption: '',
    hashtags: '',
    contentUrl: '',
    postedUrl: '',
    thumbnail: '',
    postingStatus: 'Draft',
    notPostedReason: 'Not Scheduled',
    shootDate: '',
    scheduledDate: '',
    scheduledTime: '10:00',
  });

  const [perfData, setPerfData] = useState({
    views: 0,
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    followersGained: 0,
    videoViews: 0,
    engagementRate: 0,
    plays: 0,
  });

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await smmApi.getClients();
        if (res.data?.success) setClientsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load clients list:', err);
      }
    };
    loadClients();
  }, []);

  // Fetch projects when modal client changes
  useEffect(() => {
    if (!formData.client) {
      setProjectsList([]);
      return;
    }
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await smmApi.getProjects({ client: formData.client });
        if (res.data?.success) setProjectsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [formData.client]);

  // Fetch content list
  const fetchContents = async () => {
    setLoading(true);
    try {
      const params = {
        client: filters.client || undefined,
        project: filters.project || undefined,
        platform: filters.platform || undefined,
        contentType: filters.contentType || undefined,
        notPostedReason: filters.notPostedReason || undefined,
        tab: activeTab !== 'all' && activeTab !== 'performance' ? activeTab : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const res = await smmApi.getContents(params);
      if (res.data?.success) {
        setContents(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load social media videos & content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [filters, activeTab]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  // KPIs
  const totalCount = contents.length;
  const postedCount = contents.filter((c) => c.postingStatus === 'Published').length;
  const notPostedCount = contents.filter((c) => ['Draft', 'Ready', 'Revision Required', 'Pending Approval'].includes(c.postingStatus)).length;
  const scheduledCount = contents.filter((c) => c.postingStatus === 'Scheduled').length;
  const pendingApprovalCount = contents.filter((c) => c.postingStatus === 'Pending Approval').length;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client || !formData.project) {
      toast.error('Client and Project selection are required!');
      return;
    }
    if (!formData.name) {
      toast.error('Content / Video Name is required!');
      return;
    }

    try {
      const payload = {
        ...formData,
        hashtags: formData.hashtags ? (Array.isArray(formData.hashtags) ? formData.hashtags : formData.hashtags.split(' ').map((t) => t.trim())) : [],
      };
      const res = await smmApi.createContent(payload);
      if (res.data?.success) {
        toast.success('Video record added to central database!');
        setIsCreateModalOpen(false);
        setFormData({
          client: '',
          project: '',
          contentType: 'Reel',
          platforms: ['Instagram'],
          name: '',
          description: '',
          caption: '',
          hashtags: '',
          contentUrl: '',
          postedUrl: '',
          thumbnail: '',
          postingStatus: 'Draft',
          notPostedReason: 'Not Scheduled',
          shootDate: '',
          scheduledDate: '',
          scheduledTime: '10:00',
        });
        fetchContents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create content');
    }
  };

  const handlePerfSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContent) return;
    try {
      const res = await smmApi.updateContentPerformance(selectedContent._id, { performance: perfData });
      if (res.data?.success) {
        toast.success('Performance metrics updated & score recalculated!');
        setIsPerfModalOpen(false);
        fetchContents();
      }
    } catch (err) {
      toast.error('Failed to update performance metrics');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video record?')) return;
    try {
      await smmApi.deleteContent(id);
      toast.success('Video record deleted');
      fetchContents();
    } catch (err) {
      toast.error('Failed to delete content');
    }
  };

  const handleCreateAdFromContent = (item) => {
    navigate('/smm/campaigns', {
      state: {
        sourceContent: item,
        client: item.client?._id || item.client,
        project: item.project?._id || item.project,
        platform: item.platforms?.[0] || 'Meta',
      },
    });
  };

  const openDetailModal = (item) => {
    setSelectedContent(item);
    setIsDetailModalOpen(true);
  };

  const openPerfModal = (item) => {
    setSelectedContent(item);
    setPerfData({
      views: item.performance?.views || item.performance?.videoViews || item.performance?.plays || 0,
      reach: item.performance?.reach || 0,
      impressions: item.performance?.impressions || 0,
      likes: item.performance?.likes || 0,
      comments: item.performance?.comments || 0,
      shares: item.performance?.shares || 0,
      saves: item.performance?.saves || 0,
      clicks: item.performance?.clicks || 0,
      followersGained: item.performance?.followersGained || 0,
      engagementRate: item.performance?.engagementRate || 0,
      plays: item.performance?.plays || 0,
    });
    setIsPerfModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Video className="text-primary" size={24} />
            Video & Content Database
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository connecting Content Production, Publishing SLA, Organic Performance & Ad Campaigns
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus size={16} />
          <span>Add Video / Content</span>
        </button>
      </div>

      <SMMSubNav />

      {/* ── TOP KPI STATUS CARDS (Posted vs Not Posted Dashboard) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer bg-card border p-3.5 rounded-2xl transition-all ${
            activeTab === 'all' ? 'border-primary shadow-sm bg-primary/5' : 'border-border hover:border-border/80'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Total Videos</span>
          <span className="text-2xl font-black text-foreground block mt-1">{totalCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('posted')}
          className={`cursor-pointer bg-card border p-3.5 rounded-2xl transition-all ${
            activeTab === 'posted' ? 'border-emerald-500 shadow-sm bg-emerald-500/5' : 'border-border hover:border-emerald-500/30'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Posted</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">{postedCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('not_posted')}
          className={`cursor-pointer bg-card border p-3.5 rounded-2xl transition-all ${
            activeTab === 'not_posted' ? 'border-amber-500 shadow-sm bg-amber-500/5' : 'border-border hover:border-amber-500/30'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Not Posted</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-1">{notPostedCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('scheduled')}
          className={`cursor-pointer bg-card border p-3.5 rounded-2xl transition-all ${
            activeTab === 'scheduled' ? 'border-sky-500 shadow-sm bg-sky-500/5' : 'border-border hover:border-sky-500/30'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">Scheduled</span>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block mt-1">{scheduledCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('pending_approval')}
          className={`cursor-pointer bg-card border p-3.5 rounded-2xl transition-all ${
            activeTab === 'pending_approval' ? 'border-rose-500 shadow-sm bg-rose-500/5' : 'border-border hover:border-rose-500/30'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block">Approval Pending</span>
          <span className="text-2xl font-black text-rose-500 block mt-1">{pendingApprovalCount}</span>
        </div>
      </div>

      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', notPostedReason: '', campaignStatus: '', dateRange: 'all' })} />

      {/* Sub Tabs: All Videos, Posted, Not Posted, Scheduled, Pending Approval, Performance */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All Videos', icon: Layers },
          { id: 'posted', label: 'Posted', icon: CheckCircle2 },
          { id: 'not_posted', label: 'Not Posted & Reasons', icon: AlertCircle },
          { id: 'scheduled', label: 'Scheduled', icon: CalendarIcon },
          { id: 'pending_approval', label: 'Pending Approval (SLA)', icon: Clock },
          { id: 'performance', label: 'Performance Matrix', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Table / Cards */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground animate-pulse">Loading video records...</div>
        ) : contents.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-3">
            <Video className="mx-auto text-muted-foreground/50" size={32} />
            <p>No video records match the selected filter. Click "+ Add Video / Content" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                <tr>
                  <th className="px-4 py-3">Video / Reel</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type & Platform</th>
                  <th className="px-4 py-3">Status</th>
                  {activeTab === 'not_posted' && <th className="px-4 py-3 text-amber-500">Not Posted Reason</th>}
                  {activeTab === 'pending_approval' && <th className="px-4 py-3 text-rose-500">Approval Aging</th>}
                  <th className="px-4 py-3">Organic Performance</th>
                  <th className="px-4 py-3">Ad Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {contents.map((item) => {
                  const p = item.performance || {};
                  const adv = item.advertising || {};
                  const isAdUsed = adv.usedAsAd || (item.linkedAdCampaignIds && item.linkedAdCampaignIds.length > 0);

                  return (
                    <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold shrink-0">
                            {item.contentType === 'Reel' ? <Video size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <button
                              onClick={() => openDetailModal(item)}
                              className="font-bold text-foreground hover:text-primary transition-colors text-left block"
                            >
                              {item.name}
                            </button>
                            <span className="text-[10px] text-muted-foreground block">
                              {item.actualPostedDate
                                ? `Posted: ${new Date(item.actualPostedDate).toLocaleDateString()}`
                                : item.scheduledDate
                                ? `Scheduled: ${new Date(item.scheduledDate).toLocaleDateString()}`
                                : 'Not scheduled'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-foreground block">{item.client?.company || item.client?.name || 'Unassigned'}</span>
                        <span className="text-[10px] text-muted-foreground">{item.project?.name || ''}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                            {item.contentType}
                          </span>
                          <span className="text-muted-foreground text-[11px] font-medium">
                            {item.platforms?.join(', ')}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.postingStatus === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : item.postingStatus === 'Scheduled'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                              : item.postingStatus === 'Pending Approval'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.postingStatus}
                        </span>
                      </td>

                      {activeTab === 'not_posted' && (
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {item.notPostedReason || 'Not Scheduled'}
                          </span>
                        </td>
                      )}

                      {activeTab === 'pending_approval' && (
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            (item.approvalAgingDays || 1) >= 3
                              ? 'bg-rose-500 text-white animate-pulse'
                              : (item.approvalAgingDays || 1) >= 2
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {item.approvalAgingDays || 1} days waiting {(item.approvalAgingDays || 1) >= 3 && '🔴'}
                          </span>
                        </td>
                      )}

                      {/* Organic performance */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{(p.views || p.videoViews || p.plays || 0).toLocaleString()} Views</span>
                            <span className="text-primary text-[11px] font-bold">({p.engagementRate || 0}%)</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>❤️ {p.likes || 0}</span>
                            <span>💬 {p.comments || 0}</span>
                            <span>🔄 {p.shares || 0}</span>
                            <span>💾 {p.saves || 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* Ad Status */}
                      <td className="px-4 py-3">
                        {isAdUsed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Active Ad
                            </span>
                            <span className="text-[10px] text-muted-foreground block font-medium">
                              Spent: ₹{(adv.amountSpent || 0).toLocaleString()} • Leads: {adv.leads || 0}
                            </span>
                          </div>
                        ) : item.adRecommendation === '🔥 HIGH POTENTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/30">
                            🔥 High Potential
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 font-medium">Organic Only</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isAdUsed && (
                            <button
                              onClick={() => handleCreateAdFromContent(item)}
                              title="Create Ad Campaign from this Video"
                              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg text-[11px] transition-all shadow-xs"
                            >
                              <Megaphone size={12} />
                              <span>Create Ad</span>
                            </button>
                          )}
                          <button
                            onClick={() => openPerfModal(item)}
                            title="Log / Update Performance"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                          >
                            <TrendingUp size={14} />
                          </button>
                          <button
                            onClick={() => openDetailModal(item)}
                            title="View Full Video 360"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            title="Delete Record"
                            className="p-1.5 text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
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

      {/* ── CREATE VIDEO MODAL ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add Video / Content Record</DialogTitle>
            <DialogDescription>
              Create a unified content item connected to client workflows, shoot schedules, and future ads.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-secondary/30 p-3.5 rounded-2xl border border-border/80">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Client *</label>
                <select
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '' })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                >
                  <option value="">-- Choose Client --</option>
                  {clientsList.map((c) => (
                    <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Select Project *</label>
                <select
                  required
                  disabled={!formData.client || loadingProjects}
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs disabled:opacity-50"
                >
                  <option value="">-- Choose Project --</option>
                  {projectsList.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Content / Video Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Restaurant Reel #42 - Signature Dish"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Content Type</label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                >
                  <option value="Reel">Reel (Short Video)</option>
                  <option value="Video">Long-form Video</option>
                  <option value="Short">YouTube Short</option>
                  <option value="Post">Static Post / Carousel</option>
                  <option value="Story">Story</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Publishing Status</label>
                <select
                  value={formData.postingStatus}
                  onChange={(e) => setFormData({ ...formData, postingStatus: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Revision Required">Revision Required</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              {formData.postingStatus !== 'Published' && (
                <div>
                  <label className="font-semibold text-amber-500 block mb-1">Not Posted Reason</label>
                  <select
                    value={formData.notPostedReason}
                    onChange={(e) => setFormData({ ...formData, notPostedReason: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-amber-500/40 rounded-xl outline-none text-xs"
                  >
                    {NOT_POSTED_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-foreground block mb-1">Shoot Date</label>
                <input
                  type="date"
                  value={formData.shootDate}
                  onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled / Posted Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Live Posted URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/reel/..."
                  value={formData.postedUrl}
                  onChange={(e) => setFormData({ ...formData, postedUrl: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs shadow-md shadow-primary/20"
              >
                Save Video Record
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── LOG PERFORMANCE MODAL ── */}
      <Dialog open={isPerfModalOpen} onOpenChange={setIsPerfModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Log Organic Video Performance</DialogTitle>
            <DialogDescription>
              Record views, likes, shares, and saves. The system will automatically compute virality score & ad potential.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePerfSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Total Views / Plays</label>
                <input
                  type="number"
                  value={perfData.views}
                  onChange={(e) => setPerfData({ ...perfData, views: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Reach</label>
                <input
                  type="number"
                  value={perfData.reach}
                  onChange={(e) => setPerfData({ ...perfData, reach: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="font-semibold text-foreground block mb-1">Likes</label>
                <input
                  type="number"
                  value={perfData.likes}
                  onChange={(e) => setPerfData({ ...perfData, likes: Number(e.target.value) })}
                  className="w-full h-9 px-2 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Comments</label>
                <input
                  type="number"
                  value={perfData.comments}
                  onChange={(e) => setPerfData({ ...perfData, comments: Number(e.target.value) })}
                  className="w-full h-9 px-2 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Shares</label>
                <input
                  type="number"
                  value={perfData.shares}
                  onChange={(e) => setPerfData({ ...perfData, shares: Number(e.target.value) })}
                  className="w-full h-9 px-2 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Saves</label>
                <input
                  type="number"
                  value={perfData.saves}
                  onChange={(e) => setPerfData({ ...perfData, saves: Number(e.target.value) })}
                  className="w-full h-9 px-2 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Followers Gained (+)</label>
                <input
                  type="number"
                  value={perfData.followersGained}
                  onChange={(e) => setPerfData({ ...perfData, followersGained: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Engagement Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Auto-calculated if 0"
                  value={perfData.engagementRate}
                  onChange={(e) => setPerfData({ ...perfData, engagementRate: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPerfModalOpen(false)}
                className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs shadow-md shadow-primary/20"
              >
                Save & Recalculate Score
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── VIDEO 360 DETAIL MODAL (ORGANIC + AD PERFORMANCE IN ONE PLACE) ── */}
      {selectedContent && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedContent.name}</span>
                <span className="text-xs font-black text-primary px-3 py-1 bg-primary/10 rounded-full">
                  Score: {selectedContent.performanceScore || 85} / 100
                </span>
              </DialogTitle>
              <DialogDescription>
                Unified Organic + Paid Advertising record for this content item.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-xs">
              {/* Top Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/30 p-3.5 rounded-2xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Client</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.client?.company || selectedContent.client?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Platform</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.platforms?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.postingStatus}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Recommendation</span>
                  <span className="font-extrabold text-amber-500 text-xs">{selectedContent.adRecommendation || 'Good Organic'}</span>
                </div>
              </div>

              {/* SECTION: ORGANIC METRICS */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-2 uppercase tracking-wider">
                  <TrendingUp size={15} className="text-blue-500" /> Organic Performance
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Views</span>
                    <span className="font-black text-foreground text-base">
                      {(selectedContent.performance?.views || selectedContent.performance?.videoViews || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Reach</span>
                    <span className="font-black text-foreground text-base">
                      {(selectedContent.performance?.reach || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Likes</span>
                    <span className="font-black text-foreground text-base">
                      {(selectedContent.performance?.likes || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Engagement Rate</span>
                    <span className="font-black text-indigo-500 text-base">
                      {selectedContent.performance?.engagementRate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: AD PERFORMANCE */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-2 uppercase tracking-wider">
                    <Megaphone size={15} className="text-emerald-500" /> Advertising Performance
                  </h4>
                  <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    {selectedContent.advertising?.usedAsAd ? 'Used as Ad: YES' : 'Used as Ad: NO'}
                  </span>
                </div>

                {selectedContent.advertising?.usedAsAd ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Amount Added</span>
                      <span className="font-black text-foreground text-base">
                        ₹{(selectedContent.advertising?.amountAdded || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Amount Spent</span>
                      <span className="font-black text-rose-500 text-base">
                        ₹{(selectedContent.advertising?.amountSpent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Leads Generated</span>
                      <span className="font-black text-emerald-500 text-base">
                        {selectedContent.advertising?.leads || 0}
                      </span>
                    </div>
                    <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Cost Per Lead</span>
                      <span className="font-black text-foreground text-base">
                        ₹{selectedContent.advertising?.cpl || 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border text-center space-y-2">
                    <p className="text-muted-foreground">This video has not been boosted as a paid advertisement yet.</p>
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleCreateAdFromContent(selectedContent);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90"
                    >
                      🚀 Boost / Create Ad from this Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SMMContent;
