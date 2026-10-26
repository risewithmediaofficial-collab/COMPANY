import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Film,
  Plus,
  Search,
  Filter,
  RefreshCcw,
  FileText,
  Camera,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Calendar,
  Building,
  User,
  Trash2,
  Sparkles,
  MapPin,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { contentProductionApi } from '../../api/contentProduction';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { CreateContentModal } from './CreateContentModal';
import { PageHeader } from '../../components/ui/page';

const STAGE_THEMES = {
  Scriptwriting: {
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    dot: 'bg-indigo-500',
    icon: FileText,
  },
  Videography: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    dot: 'bg-blue-500',
    icon: Camera,
  },
  'Video Editing': {
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
    dot: 'bg-purple-500',
    icon: Film,
  },
  SMM: {
    badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
    dot: 'bg-pink-500',
    icon: Share2,
  },
  Published: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  Completed: {
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    dot: 'bg-teal-500',
    icon: CheckCircle2,
  },
};

const STATUS_THEMES = {
  Draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  'In Progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
  Editing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
  Review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
  'Revision Required': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  Scheduled: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  Published: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25',
  Completed: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
};

const PRIORITY_THEMES = {
  Low: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  Medium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  High: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  Urgent: 'text-rose-500 bg-rose-500/10 border-rose-500/20 font-bold',
};

export const ContentProduction = () => {
  const navigate = useNavigate();

  // Active view tab: 'all', 'scriptwriter', 'videographer', 'videoEditor', 'smm'
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Data states
  const [contents, setContents] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries for clients and users
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClient) params.client = selectedClient;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;
      if (search.trim()) params.search = search.trim();

      // If viewing a stage-specific tab, filter by stage unless explicitly set
      if (activeTab === 'scriptwriter') params.stage = 'Scriptwriting';
      else if (activeTab === 'videographer') params.stage = 'Videography';
      else if (activeTab === 'videoEditor') params.stage = 'Video Editing';
      else if (activeTab === 'smm') params.stage = 'SMM';
      else if (selectedStage) params.stage = selectedStage;

      const res = await contentProductionApi.list(params);
      if (res.data?.success) {
        setContents(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load content production list:', err);
      toast.error('Failed to load content production records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedClient, selectedStage, selectedStatus, selectedPriority, search]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this content production record?')) return;
    try {
      await contentProductionApi.delete(id);
      toast.success('Content record deleted');
      setContents((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const tabs = [
    { id: 'all', label: 'Central List (All)', icon: Film, count: summary.total || contents.length },
    { id: 'scriptwriter', label: 'Scriptwriter Hub', icon: FileText, count: summary.scriptwriting || 0 },
    { id: 'videographer', label: 'Videographer Hub', icon: Camera, count: summary.videography || 0 },
    { id: 'videoEditor', label: 'Video Editor Suite', icon: Film, count: summary.videoEditing || 0 },
    { id: 'smm', label: 'SMM & Publishing', icon: Share2, count: summary.smm || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Content Production"
        subtitle="End-to-end studio pipeline connecting Scriptwriters, Videographers, Video Editors, and SMM"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchContents}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md shadow-primary/25 hover:opacity-95 transition-all min-h-[38px]"
            >
              <Plus size={15} />
              Create Content
            </button>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total In Pipeline
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.total || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">All active productions</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-indigo-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={13} />
            Scriptwriting
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.scriptwriting || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Drafts & Approvals</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-blue-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={13} />
            Videography
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.videography || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Shoots scheduled</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-purple-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Film size={13} />
            Video Editing
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.videoEditing || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">In editing & review</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-pink-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
            <Share2 size={13} />
            SMM & Publish
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.smm || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Scheduling posts</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-emerald-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Live / Published
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{summary.published || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Successfully released</div>
        </div>
      </div>

      {/* Tabs & View Switcher */}
      <div className="flex items-center gap-2 border-b border-border/80 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Content ID, Title, Client, Script..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Editing">Editing</option>
            <option value="Review">Review</option>
            <option value="Revision Required">Revision Required</option>
            <option value="Approved">Approved</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
            <option value="Urgent">Urgent Priority</option>
          </select>

          {(selectedClient || selectedStatus || selectedPriority || search) && (
            <button
              onClick={() => {
                setSelectedClient('');
                setSelectedStatus('');
                setSelectedPriority('');
                setSearch('');
              }}
              className="text-xs font-semibold text-rose-500 hover:underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content List / Table */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RefreshCcw size={24} className="animate-spin text-primary" />
            <span className="text-xs font-semibold">Loading content production records…</span>
          </div>
        ) : contents.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Film size={28} />
            </div>
            <h4 className="text-sm font-bold text-foreground">No content records found</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create your first multi-stage production record to link Scriptwriting, Shooting, Editing, and SMM.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 shadow-sm"
            >
              <Plus size={14} />
              Create Content
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Content ID & Title</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Assigned Member</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Drive Links</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contents.map((item) => {
                  const stageTheme = STAGE_THEMES[item.currentStage] || STAGE_THEMES.Scriptwriting;
                  const StageIcon = stageTheme.icon;
                  const statusClass = STATUS_THEMES[item.overallStatus] || STATUS_THEMES.Pending;
                  const priorityClass = PRIORITY_THEMES[item.priority] || PRIORITY_THEMES.Medium;

                  // Collect drive links
                  const rawFootage = item.videographer?.rawFootageDriveLink || item.videoEditor?.rawFootageDriveLink;
                  const finalVideo = item.videoEditor?.finalVideoDriveLink || item.smm?.finalCreativeDriveLink;
                  const publishedUrl = item.smm?.publishedPostUrl;

                  return (
                    <tr
                      key={item._id}
                      onClick={() => navigate(`/content-production/${item._id}`)}
                      className="hover:bg-muted/30 transition-all cursor-pointer group"
                    >
                      {/* Content ID & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-primary group-hover:underline">
                              {item.contentId}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] border font-bold ${priorityClass}`}>
                              {item.priority}
                            </span>
                          </div>
                          <span className="font-bold text-foreground text-xs line-clamp-1 max-w-xs">
                            {item.title}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground truncate max-w-[140px]">
                            {item.client?.name || item.client?.company || item.clientName || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stageTheme.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${stageTheme.dot}`} />
                          <StageIcon size={12} />
                          {item.currentStage}
                        </span>
                      </td>

                      {/* Assigned Member */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.assignedTo?.name ? item.assignedTo.name.charAt(0) : <User size={12} />}
                          </div>
                          <span className="truncate max-w-[110px] text-muted-foreground group-hover:text-foreground">
                            {item.assignedTo?.name || item.assignedPersonName || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusClass}`}
                        >
                          {item.overallStatus}
                        </span>
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar size={12} />
                          <span>
                            {item.deadline
                              ? new Date(item.deadline).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Drive Links */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {rawFootage && (
                            <a
                              href={rawFootage}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Raw Footage"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                            >
                              <Camera size={13} />
                            </a>
                          )}
                          {finalVideo && (
                            <a
                              href={finalVideo}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Final Video"
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all"
                            >
                              <Film size={13} />
                            </a>
                          )}
                          {publishedUrl && (
                            <a
                              href={publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Published Post"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          {!rawFootage && !finalVideo && !publishedUrl && (
                            <span className="text-[10px] text-muted-foreground/60">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/content-production/${item._id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                            title="View Full Production Studio"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(item._id, e)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                            title="Delete Record"
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

      {/* Create Content Modal */}
      <CreateContentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        clients={clients}
        users={users}
        onCreated={(newContent) => {
          setContents((prev) => [newContent, ...prev]);
          navigate(`/content-production/${newContent._id}`);
        }}
      />
    </div>
  );
};

export default ContentProduction;
