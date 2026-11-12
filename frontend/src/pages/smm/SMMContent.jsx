import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  Plus, Calendar as CalendarIcon, FileText, Image as ImageIcon,
  Share2, Eye, Edit3, Trash2, Megaphone, TrendingUp, X, CheckCircle2,
  Video, Layers, Clock, AlertCircle, Sparkles, ExternalLink, Bookmark, Heart, MessageSquare,
  RefreshCw, Flame, Rocket
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

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
    publishedDate: new Date().toISOString().split('T')[0],
    scheduledDate: new Date().toISOString().split('T')[0],
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

  const handleFilterChange = (keyOrObj, val) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      setFilters((prev) => ({ ...prev, ...keyOrObj }));
    } else {
      setFilters((prev) => ({ ...prev, [keyOrObj]: val }));
    }
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
      const liveDate = formData.publishedDate || formData.scheduledDate || new Date().toISOString().split('T')[0];
      const payload = {
        ...formData,
        actualPostedDate: formData.postingStatus === 'Published' ? liveDate : undefined,
        scheduledDate: liveDate,
        publishedDate: liveDate,
        platforms: [formData.platforms?.[0] || 'Instagram'],
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
          publishedDate: new Date().toISOString().split('T')[0],
          scheduledDate: new Date().toISOString().split('T')[0],
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
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Video className="text-primary shrink-0" size={24} />
            Video & Content Database
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository connecting Content Production, Publishing SLA, Organic Performance & Ad Campaigns
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-colors w-full sm:w-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Video / Content</span>
        </button>
      </div>

      <SMMSubNav />

      {/* ── TOP KPI STATUS CARDS (Posted vs Not Posted Dashboard) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer bg-card border p-3 sm:p-3.5 rounded-2xl transition-colors ${
            activeTab === 'all' ? 'border-primary shadow-sm bg-secondary/40' : 'border-border hover:border-foreground/30'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Total Videos</span>
          <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums block mt-1">{totalCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('posted')}
          className={`cursor-pointer bg-card border p-3 sm:p-3.5 rounded-2xl transition-colors ${
            activeTab === 'posted' ? 'border-primary shadow-sm bg-secondary/40' : 'border-border hover:border-foreground/30'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Posted</span>
          <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums block mt-1">{postedCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('not_posted')}
          className={`cursor-pointer bg-card border p-3 sm:p-3.5 rounded-2xl transition-colors ${
            activeTab === 'not_posted' ? 'border-primary shadow-sm bg-secondary/40' : 'border-border hover:border-foreground/30'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Not Posted</span>
          <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums block mt-1">{notPostedCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('scheduled')}
          className={`cursor-pointer bg-card border p-3 sm:p-3.5 rounded-2xl transition-colors ${
            activeTab === 'scheduled' ? 'border-primary shadow-sm bg-secondary/40' : 'border-border hover:border-foreground/30'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Scheduled</span>
          <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums block mt-1">{scheduledCount}</span>
        </div>

        <div
          onClick={() => setActiveTab('pending_approval')}
          className={`cursor-pointer bg-card border p-3 sm:p-3.5 rounded-2xl transition-colors col-span-2 sm:col-span-1 ${
            activeTab === 'pending_approval' ? 'border-primary shadow-sm bg-secondary/40' : 'border-border hover:border-foreground/30'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Approval Pending</span>
          <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums block mt-1">{pendingApprovalCount}</span>
        </div>
      </div>

      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', notPostedReason: '', campaignStatus: '', dateRange: 'all' })} />

      {/* Sub Tabs: All Videos, Posted, Not Posted, Scheduled, Pending Approval, Performance */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto [touch-action:pan-x] [-webkit-overflow-scrolling:touch] custom-scrollbar">
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[38px] ${
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
          <div className="responsive-table-container overflow-x-auto [touch-action:pan-x] [-webkit-overflow-scrolling:touch]">
            <table className="min-w-[720px] w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                <tr>
                  <th className="px-4 py-3">Video / Reel</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type & Platform</th>
                  <th className="px-4 py-3">Status</th>
                  {activeTab === 'not_posted' && <th className="px-4 py-3 text-foreground">Not Posted Reason</th>}
                  {activeTab === 'pending_approval' && <th className="px-4 py-3 text-foreground">Approval Aging</th>}
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
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center font-bold shrink-0">
                            {['Reel', 'Reel / Story', 'Video', 'Short'].includes(item.contentType) ? <Video size={16} /> : <FileText size={16} />}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="font-bold text-foreground hover:underline transition-colors text-left block truncate max-w-[220px] cursor-pointer"
                            >
                              {item.name}
                            </button>
                            <span className="text-[10px] text-muted-foreground block tabular-nums">
                              {item.actualPostedDate
                                ? `Published: ${new Date(item.actualPostedDate).toLocaleDateString()}`
                                : item.scheduledDate
                                ? `Scheduled: ${new Date(item.scheduledDate).toLocaleDateString()}`
                                : `Live: ${new Date().toLocaleDateString()}`}
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
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary border border-border text-foreground">
                            {item.contentType}
                          </span>
                          <span className="text-muted-foreground text-[11px] font-medium">
                            {item.platforms?.join(', ')}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.postingStatus === 'Published'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : item.postingStatus === 'Scheduled'
                              ? 'bg-secondary text-foreground border-border'
                              : item.postingStatus === 'Pending Approval'
                              ? 'bg-card text-foreground border-foreground/40'
                              : 'bg-secondary/50 text-muted-foreground border-border'
                          }`}
                        >
                          {item.postingStatus}
                        </span>
                      </td>

                      {activeTab === 'not_posted' && (
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-secondary text-foreground border border-border">
                            {item.notPostedReason || 'Not Scheduled'}
                          </span>
                        </td>
                      )}

                      {activeTab === 'pending_approval' && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold tabular-nums border ${
                            (item.approvalAgingDays || 1) >= 3
                              ? 'bg-primary text-primary-foreground border-primary'
                              : (item.approvalAgingDays || 1) >= 2
                              ? 'bg-secondary text-foreground border-border'
                              : 'bg-card text-muted-foreground border-border'
                          }`}>
                            {(item.approvalAgingDays || 1) >= 3 && <AlertCircle size={11} className="shrink-0" />}
                            <span>{item.approvalAgingDays || 1} days waiting</span>
                          </span>
                        </td>
                      )}

                      {/* Organic performance */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 tabular-nums">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{(p.views || p.videoViews || p.plays || 0).toLocaleString()} Views</span>
                            <span className="text-muted-foreground text-[11px] font-bold">({p.engagementRate || 0}%)</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1"><Heart size={10} /> {p.likes || 0}</span>
                            <span className="inline-flex items-center gap-1"><MessageSquare size={10} /> {p.comments || 0}</span>
                            <span className="inline-flex items-center gap-1"><RefreshCw size={10} /> {p.shares || 0}</span>
                            <span className="inline-flex items-center gap-1"><Bookmark size={10} /> {p.saves || 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* Ad Status */}
                      <td className="px-4 py-3">
                        {isAdUsed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-primary-foreground">
                              Active Ad
                            </span>
                            <span className="text-[10px] text-muted-foreground block font-medium tabular-nums">
                              Spent: ₹{(adv.amountSpent || 0).toLocaleString()} • Leads: {adv.leads || 0}
                            </span>
                          </div>
                        ) : item.adRecommendation === '🔥 HIGH POTENTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-foreground bg-secondary border border-border">
                            <Flame size={10} className="shrink-0" /> High Potential
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70 font-medium">Organic Only</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isAdUsed && (
                            <button
                              onClick={() => handleCreateAdFromContent(item)}
                              title="Create Ad Campaign from this Video"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg text-[11px] transition-colors shadow-xs cursor-pointer"
                            >
                              <Megaphone size={12} />
                              <span>Create Ad</span>
                            </button>
                          )}
                          <button
                            onClick={() => openPerfModal(item)}
                            title="Log / Update Performance"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary cursor-pointer"
                          >
                            <TrendingUp size={14} />
                          </button>
                          <button
                            onClick={() => openDetailModal(item)}
                            title="View Full Video 360"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            title="Delete Record"
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary cursor-pointer"
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <Video size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Add Video / Content Record
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Create a unified content item connected to client workflows and shoot schedules
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Client *</label>
                <select
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '' })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="">-- Choose Client --</option>
                  {clientsList.map((c) => (
                    <option key={c._id} value={c._id}>{c.company || c.companyName || c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Project *</label>
                <select
                  required
                  disabled={!formData.client || loadingProjects}
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <option value="">-- Choose Project --</option>
                  {projectsList.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Content / Video Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Restaurant Reel #42 - Signature Dish"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Content Type</label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="Reel">Reel (Short Video)</option>
                  <option value="Story">Story</option>
                  <option value="Reel / Story">Reel / Story (Dual Format)</option>
                  <option value="Video">Long-form Video</option>
                  <option value="Short">YouTube Short</option>
                  <option value="Post">Static Post / Carousel</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Publishing Status</label>
                <select
                  value={formData.postingStatus}
                  onChange={(e) => setFormData({ ...formData, postingStatus: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Revision Required">Revision Required</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              {formData.postingStatus !== 'Published' ? (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Not Posted Reason</label>
                  <select
                    value={formData.notPostedReason}
                    onChange={(e) => setFormData({ ...formData, notPostedReason: e.target.value })}
                    className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                  >
                    {NOT_POSTED_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Live Status</label>
                  <div className="h-11 px-4 bg-secondary/50 border border-border text-foreground rounded-xl flex items-center font-bold text-sm shadow-2xs">
                    Published Live to Audience
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  {formData.postingStatus === 'Published' ? 'Published / Live Date' : 'Scheduled / Target Date'}
                </label>
                <input
                  type="date"
                  value={formData.publishedDate || formData.scheduledDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value, scheduledDate: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Live Posted URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/reel/..."
                  value={formData.postedUrl}
                  onChange={(e) => setFormData({ ...formData, postedUrl: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground shadow-sm cursor-pointer transition-colors"
                >
                  Save Video Record
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── LOG PERFORMANCE MODAL ── */}
      <Dialog open={isPerfModalOpen} onOpenChange={setIsPerfModalOpen}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <TrendingUp size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Log Organic Video Performance
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Record views, likes, shares, and saves to compute virality score & ad potential
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handlePerfSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Total Views / Plays</label>
                <input
                  type="number"
                  value={perfData.views}
                  onChange={(e) => setPerfData({ ...perfData, views: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Reach</label>
                <input
                  type="number"
                  value={perfData.reach}
                  onChange={(e) => setPerfData({ ...perfData, reach: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Likes</label>
                <input
                  type="number"
                  value={perfData.likes}
                  onChange={(e) => setPerfData({ ...perfData, likes: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Comments</label>
                <input
                  type="number"
                  value={perfData.comments}
                  onChange={(e) => setPerfData({ ...perfData, comments: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Shares</label>
                <input
                  type="number"
                  value={perfData.shares}
                  onChange={(e) => setPerfData({ ...perfData, shares: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Saves</label>
                <input
                  type="number"
                  value={perfData.saves}
                  onChange={(e) => setPerfData({ ...perfData, saves: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Followers Gained (+)</label>
                <input
                  type="number"
                  value={perfData.followersGained}
                  onChange={(e) => setPerfData({ ...perfData, followersGained: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Engagement Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Auto-calculated if 0"
                  value={perfData.engagementRate}
                  onChange={(e) => setPerfData({ ...perfData, engagementRate: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPerfModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground shadow-sm cursor-pointer transition-colors"
                >
                  Save & Recalculate Score
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── VIDEO 360 DETAIL MODAL (ORGANIC + AD PERFORMANCE IN ONE PLACE) ── */}
      {selectedContent && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent size="lg" className="w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
                <span className="truncate max-w-[240px] sm:max-w-none">{selectedContent.name}</span>
                <span className="text-xs font-black text-foreground px-3 py-1 bg-secondary border border-border rounded-full tabular-nums">
                  Score: {selectedContent.performanceScore || 85} / 100
                </span>
              </DialogTitle>
              <DialogDescription>
                Unified Organic + Paid Advertising record for this content item.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-xs">
              {/* Top Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-secondary/30 p-3.5 rounded-2xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Client</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.client?.company || selectedContent.client?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Platform</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.platforms?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Published Date</span>
                  <span className="font-bold text-foreground text-xs tabular-nums">
                    {selectedContent.actualPostedDate || selectedContent.scheduledDate
                      ? new Date(selectedContent.actualPostedDate || selectedContent.scheduledDate).toLocaleDateString('en-IN')
                      : 'Today (Live)'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-foreground text-xs">{selectedContent.postingStatus}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Recommendation</span>
                  <span className="font-extrabold text-foreground text-xs">{selectedContent.adRecommendation || 'Good Organic'}</span>
                </div>
              </div>

              {/* SECTION: ORGANIC METRICS */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-2 uppercase tracking-wider">
                  <TrendingUp size={15} className="text-foreground shrink-0" /> Organic Performance
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Views</span>
                    <span className="font-black text-foreground text-base tabular-nums">
                      {(selectedContent.performance?.views || selectedContent.performance?.videoViews || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Reach</span>
                    <span className="font-black text-foreground text-base tabular-nums">
                      {(selectedContent.performance?.reach || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Likes</span>
                    <span className="font-black text-foreground text-base tabular-nums">
                      {(selectedContent.performance?.likes || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block">Engagement Rate</span>
                    <span className="font-black text-foreground text-base tabular-nums">
                      {selectedContent.performance?.engagementRate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: AD PERFORMANCE */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-2 uppercase tracking-wider">
                    <Megaphone size={15} className="text-foreground shrink-0" /> Advertising Performance
                  </h4>
                  <span className="text-[10px] font-extrabold text-foreground bg-secondary border border-border px-2.5 py-0.5 rounded-full">
                    {selectedContent.advertising?.usedAsAd ? 'Used as Ad: YES' : 'Used as Ad: NO'}
                  </span>
                </div>

                {selectedContent.advertising?.usedAsAd ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Amount Added</span>
                      <span className="font-black text-foreground text-base tabular-nums">
                        ₹{(selectedContent.advertising?.amountAdded || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Amount Spent</span>
                      <span className="font-black text-foreground text-base tabular-nums">
                        ₹{(selectedContent.advertising?.amountSpent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Leads Generated</span>
                      <span className="font-black text-foreground text-base tabular-nums">
                        {selectedContent.advertising?.leads || 0}
                      </span>
                    </div>
                    <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-muted-foreground block">Cost Per Lead</span>
                      <span className="font-black text-foreground text-base tabular-nums">
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 cursor-pointer"
                    >
                      <Rocket size={13} />
                      <span>Boost / Create Ad from this Video</span>
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
