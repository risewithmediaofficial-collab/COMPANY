import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  Plus, Calendar as CalendarIcon, FileText, Image as ImageIcon,
  Share2, Eye, Edit3, Trash2, Megaphone, TrendingUp, X, CheckCircle2,
  Video, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

export const SMMContent = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, Post, Reel, Story

  // Filters state
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
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  // Form states for creating content
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    contentType: 'Post',
    platforms: ['Instagram'],
    name: '',
    description: '',
    caption: '',
    hashtags: '',
    contentUrl: '',
    thumbnail: '',
    postingStatus: 'Draft',
    scheduledDate: '',
    scheduledTime: '10:00',
  });

  const [perfData, setPerfData] = useState({
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    videoViews: 0,
    plays: 0,
    storyViews: 0,
  });

  // Fetch initial clients for modal
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
        contentType: activeTab !== 'all' ? activeTab : (filters.contentType || undefined),
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const res = await smmApi.getContents(params);
      if (res.data?.success) {
        setContents(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load social media contents');
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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client || !formData.project) {
      toast.error('Client and Project selection are required!');
      return;
    }
    if (!formData.name) {
      toast.error('Content Name is required!');
      return;
    }

    try {
      const payload = {
        ...formData,
        hashtags: formData.hashtags ? formData.hashtags.split(' ').map((t) => t.trim()) : [],
      };
      const res = await smmApi.createContent(payload);
      if (res.data?.success) {
        toast.success('Content record created successfully!');
        setIsCreateModalOpen(false);
        setFormData({
          client: '',
          project: '',
          contentType: 'Post',
          platforms: ['Instagram'],
          name: '',
          description: '',
          caption: '',
          hashtags: '',
          contentUrl: '',
          thumbnail: '',
          postingStatus: 'Draft',
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
        toast.success('Content performance metrics updated!');
        setIsPerfModalOpen(false);
        fetchContents();
      }
    } catch (err) {
      toast.error('Failed to update performance metrics');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      await smmApi.deleteContent(id);
      toast.success('Content deleted');
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Social Media Content</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organic Posts, Reels, and Stories linked to Client and Project workflows
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all scale-[1.01]"
        >
          <Plus size={16} />
          <span>+ Add Content</span>
        </button>
      </div>

      <SMMSubNav />
      <SMMFilterBar filters={filters} onFilterChange={handleFilterChange} onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', campaignStatus: '', dateRange: 'all' })} />

      {/* Sub Tabs: All, Posts, Reels, Stories */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
        {[
          { id: 'all', label: 'All Content', icon: Layers },
          { id: 'Post', label: 'Posts', icon: FileText },
          { id: 'Reel', label: 'Reels', icon: Video },
          { id: 'Story', label: 'Stories', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Content Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading content records...</div>
        ) : contents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No content items found for selected Client/Project filters. Click "+ Add Content" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Content Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Engagement</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contents.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.client?.company || item.client?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.project?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          item.contentType === 'Post'
                            ? 'bg-blue-500/10 text-blue-600'
                            : item.contentType === 'Reel'
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {item.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">
                      {item.platforms?.join(', ') || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          item.postingStatus === 'Published'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : item.postingStatus === 'Scheduled'
                            ? 'bg-sky-500/10 text-sky-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.postingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.performance?.likes || item.performance?.reach ? (
                        <span>{item.performance.reach || 0} reach • {item.performance.likes || 0} likes</span>
                      ) : (
                        <span className="text-muted-foreground/60">No stats logged</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.postingStatus === 'Published' && (
                          <button
                            onClick={() => handleCreateAdFromContent(item)}
                            title="Create Ad Campaign from this Content"
                            className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium rounded-lg text-[11px] transition-all"
                          >
                            <Megaphone size={12} />
                            <span>Create Ad</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedContent(item);
                            setPerfData(item.performance || {});
                            setIsPerfModalOpen(true);
                          }}
                          title="Log Performance"
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                        >
                          <TrendingUp size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          title="Delete Content"
                          className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>      {/* CREATE CONTENT MODAL (SLIDE-OVER SHEET) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Create Social Media Content</DialogTitle>
            <DialogDescription>
              Draft and schedule posts, reels, or stories across client social media accounts.
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
                  onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '' })}
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

            {/* Content Type & Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Content Type *</label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                >
                  <option value="Post">Post</option>
                  <option value="Reel">Reel</option>
                  <option value="Story">Story</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Platform *</label>
                <select
                  value={formData.platforms[0] || 'Instagram'}
                  onChange={(e) => setFormData({ ...formData, platforms: [e.target.value] })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </div>
            </div>

            {/* Post / Content Name */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Post / Content Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Summer Festival Campaign Promo Reel"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs"
              />
            </div>

            {/* Caption */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Caption</label>
              <textarea
                rows={4}
                placeholder="Enter full caption here..."
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs custom-scrollbar"
              />
            </div>

            {/* Scheduled Date, Time, & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled Time</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Posting Status</label>
                <select
                  value={formData.postingStatus}
                  onChange={(e) => setFormData({ ...formData, postingStatus: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                  <option value="Cancelled">Cancelled</option>
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
                Save Content Record
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PERFORMANCE METRICS MODAL (SLIDE-OVER SHEET) */}
      <Dialog open={isPerfModalOpen && Boolean(selectedContent)} onOpenChange={setIsPerfModalOpen}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Log Organic Performance — {selectedContent?.name}</DialogTitle>
            <DialogDescription>
              Record reach, impressions, likes, and engagement metrics for this post.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePerfSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Reach</label>
                <input
                  type="number"
                  value={perfData.reach || 0}
                  onChange={(e) => setPerfData({ ...perfData, reach: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Impressions</label>
                <input
                  type="number"
                  value={perfData.impressions || 0}
                  onChange={(e) => setPerfData({ ...perfData, impressions: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Likes</label>
                <input
                  type="number"
                  value={perfData.likes || 0}
                  onChange={(e) => setPerfData({ ...perfData, likes: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Comments</label>
                <input
                  type="number"
                  value={perfData.comments || 0}
                  onChange={(e) => setPerfData({ ...perfData, comments: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPerfModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90"
              >
                Save Metrics
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMMContent;
