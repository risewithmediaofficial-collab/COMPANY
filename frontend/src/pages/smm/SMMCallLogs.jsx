import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  Trash2,
  Edit2,
  RefreshCw,
  FolderKanban,
  Building2,
  MessageCircle,
  Video,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

const CALL_TYPES = [
  'Outgoing',
  'Incoming',
  'WhatsApp Call',
  'Google Meet',
  'Zoom',
  'Direct Meeting',
];

const CALL_PURPOSES = [
  'Strategy & Planning',
  'Performance Review',
  'Content / Creative Approval',
  'Lead Discussion',
  'Monthly Review',
  'Issue / Escalation',
  'General Update',
  'Other',
];

const CALL_STATUSES = [
  { value: 'Connected', label: 'Connected', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'Follow-up Needed', label: 'Follow-up Needed', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'Scheduled', label: 'Scheduled', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'No Answer / Busy', label: 'No Answer / Busy', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'Completed', label: 'Completed', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
];

const initialForm = {
  clientId: '',
  clientName: '',
  projectId: '',
  projectName: '',
  callDate: format(new Date(), 'yyyy-MM-dd'),
  callTime: format(new Date(), 'HH:mm'),
  callType: 'Outgoing',
  callPurpose: 'General Update',
  status: 'Connected',
  spokenWith: '',
  contactNumber: '',
  duration: '',
  notes: '',
  nextAction: '',
  nextFollowUpDate: '',
  priority: 'Medium',
};

export default function SMMCallLogs() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = ['superAdmin', 'admin'].includes(user?.role);

  // Data states
  const [callLogs, setCallLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    followUpNeeded: 0,
    scheduled: 0,
    noAnswer: 0,
    completed: 0,
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCallType, setSelectedCallType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // Load clients and projects
  useEffect(() => {
    fetchClientsAndProjects();
  }, []);

  const fetchClientsAndProjects = async () => {
    try {
      const [clientRes, projRes] = await Promise.all([
        smmApi.getClients(),
        smmApi.getProjects(),
      ]);

      const clientData = clientRes.data?.data || clientRes.data || [];
      const projData = projRes.data?.data || projRes.data || [];
      setClients(Array.isArray(clientData) ? clientData : []);
      setProjects(Array.isArray(projData) ? projData : []);
    } catch (err) {
      console.error('Error fetching clients/projects:', err);
    }
  };

  // Fetch call logs & stats
  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedClient) params.clientId = selectedClient;
      if (selectedProject) params.projectId = selectedProject;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedCallType !== 'all') params.callType = selectedCallType;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }

      const [logsRes, statsRes] = await Promise.all([
        smmApi.getCallLogs(params),
        smmApi.getCallLogStats({
          clientId: selectedClient || undefined,
          projectId: selectedProject || undefined,
        }),
      ]);

      setCallLogs(logsRes.data?.data || []);
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching SMM call logs:', err);
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, [selectedClient, selectedProject, selectedStatus, selectedCallType, dateFilter]);

  // Handle client selection in filter (resets project filter if incompatible)
  const handleClientFilterChange = (clientId) => {
    setSelectedClient(clientId);
    setSelectedProject('');
  };

  // Projects filtered for selected client in the filter bar
  const availableProjectsForFilter = useMemo(() => {
    if (!selectedClient) return projects;
    return projects.filter((p) => {
      const pClientId = p.client?._id || p.client;
      return String(pClientId) === String(selectedClient);
    });
  }, [projects, selectedClient]);

  // Projects filtered for the modal form based on form.clientId
  const availableProjectsForForm = useMemo(() => {
    if (!form.clientId) return projects;
    return projects.filter((p) => {
      const pClientId = p.client?._id || p.client;
      return String(pClientId) === String(form.clientId);
    });
  }, [projects, form.clientId]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedClient('');
    setSelectedProject('');
    setSelectedStatus('all');
    setSelectedCallType('all');
    setSearchQuery('');
    setDateFilter('');
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      clientId: selectedClient || '',
      projectId: selectedProject || '',
      callDate: format(new Date(), 'yyyy-MM-dd'),
      callTime: format(new Date(), 'HH:mm'),
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (log) => {
    setEditingId(log._id);
    setForm({
      clientId: log.clientId || '',
      clientName: log.clientName || '',
      projectId: log.projectId || '',
      projectName: log.projectName || '',
      callDate: log.callDate ? format(new Date(log.callDate), 'yyyy-MM-dd') : '',
      callTime: log.callTime || '',
      callType: log.callType || 'Outgoing',
      callPurpose: log.callPurpose || 'General Update',
      status: log.status || 'Connected',
      spokenWith: log.spokenWith || '',
      contactNumber: log.contactNumber || '',
      duration: log.duration || '',
      notes: log.notes || '',
      nextAction: log.nextAction || '',
      nextFollowUpDate: log.nextFollowUpDate
        ? format(new Date(log.nextFollowUpDate), 'yyyy-MM-dd')
        : '',
      priority: log.priority || 'Medium',
    });
    setIsModalOpen(true);
  };

  // Submit create or edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.notes.trim()) {
      toast.error('Please enter call notes');
      return;
    }

    try {
      setSubmitting(true);
      // Auto-find names if possible
      const chosenClient = clients.find(
        (c) => String(c._id) === String(form.clientId)
      );
      const chosenProject = projects.find(
        (p) => String(p._id) === String(form.projectId)
      );

      const payload = {
        ...form,
        clientName: chosenClient ? chosenClient.companyName || chosenClient.name : form.clientName,
        projectName: chosenProject ? chosenProject.name : form.projectName,
      };

      if (editingId) {
        await smmApi.updateCallLog(editingId, payload);
        toast.success('Call log updated successfully');
      } else {
        await smmApi.createCallLog(payload);
        toast.success('Call note logged successfully');
      }

      setIsModalOpen(false);
      fetchCallLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save call log');
    } finally {
      setSubmitting(false);
    }
  };

  // Fast inline status update
  const handleInlineStatusChange = async (logId, newStatus) => {
    try {
      await smmApi.updateCallLogStatus(logId, { status: newStatus });
      setCallLogs((prev) =>
        prev.map((l) => (l._id === logId ? { ...l, status: newStatus } : l))
      );
      toast.success(`Status updated to "${newStatus}"`);
      // Refresh stats
      smmApi.getCallLogStats().then((res) => {
        if (res.data?.data) setStats(res.data.data);
      });
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Delete call log
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this call log?')) return;
    try {
      await smmApi.deleteCallLog(logId);
      toast.success('Call log deleted');
      setCallLogs((prev) => prev.filter((l) => l._id !== logId));
      fetchCallLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete call log');
    }
  };

  // Helper for Call Type icon
  const getCallTypeIcon = (type) => {
    switch (type) {
      case 'Incoming':
        return <PhoneIncoming size={13} className="text-emerald-500" />;
      case 'WhatsApp Call':
        return <MessageCircle size={13} className="text-emerald-500" />;
      case 'Google Meet':
      case 'Zoom':
        return <Video size={13} className="text-blue-500" />;
      case 'Direct Meeting':
        return <User size={13} className="text-purple-500" />;
      default:
        return <PhoneOutgoing size={13} className="text-sky-500" />;
    }
  };

  // Helper for Status badge color
  const getStatusColor = (statusVal) => {
    const found = CALL_STATUSES.find((s) => s.value === statusVal);
    return (
      found?.color ||
      'bg-secondary text-secondary-foreground border-border'
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SMM SubNav */}
      <SMMSubNav />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <PhoneCall size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">SMM Call Logs</h1>
              <p className="text-xs text-muted-foreground">
                Record and manage client & project call notes, track discussion outcomes, and update status in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchCallLogs();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            title="Refresh Call Logs"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus size={15} />
            <span>Log Call Note</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total Calls</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Phone size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-foreground mt-1.5">{stats.total}</p>
          <span className="text-[10px] text-muted-foreground">Across all clients</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Connected</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {stats.connected}
          </p>
          <span className="text-[10px] text-muted-foreground">Successful contacts</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Follow-up Needed</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            {stats.followUpNeeded}
          </p>
          <span className="text-[10px] text-muted-foreground">Requires action</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Scheduled</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5">
            {stats.scheduled}
          </p>
          <span className="text-[10px] text-muted-foreground">Upcoming calls</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">No Answer / Busy</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <PhoneMissed size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5">
            {stats.noAnswer}
          </p>
          <span className="text-[10px] text-muted-foreground">Callback required</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Completed</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Check size={13} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 mt-1.5">
            {stats.completed}
          </p>
          <span className="text-[10px] text-muted-foreground">Resolved / Finalized</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Select Client
            </label>
            <div className="relative">
              <select
                value={selectedClient}
                onChange={(e) => handleClientFilterChange(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-xl border border-border bg-background text-xs font-semibold appearance-none cursor-pointer"
              >
                <option value="">All Clients ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Filter (Dynamically populated based on chosen client) */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Select Project
            </label>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-xl border border-border bg-background text-xs font-semibold appearance-none cursor-pointer"
              >
                <option value="">
                  {selectedClient ? 'All Projects for this Client' : 'All Projects'} (
                  {availableProjectsForFilter.length})
                </option>
                {availableProjectsForFilter.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Search Call Notes / Person
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search notes, person, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCallLogs()}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-xs"
              />
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Filter by Call Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
            />
          </div>
        </div>

        {/* Status Pills & Call Type row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Status:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                selectedStatus === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              All ({stats.total})
            </button>
            {CALL_STATUSES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedStatus === st.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {(selectedClient ||
            selectedProject ||
            selectedStatus !== 'all' ||
            selectedCallType !== 'all' ||
            searchQuery ||
            dateFilter) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Call Logs Feed / Grid */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
          <RefreshCw size={20} className="animate-spin text-primary" />
          <span>Loading SMM call logs...</span>
        </div>
      ) : callLogs.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary">
            <PhoneCall size={28} />
          </div>
          <h3 className="text-base font-bold text-foreground">No Call Logs Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {selectedClient || selectedProject || selectedStatus !== 'all' || searchQuery
              ? 'No call notes match the selected filters. Try broadening your filter options or search terms.'
              : 'Start logging phone, WhatsApp, and meeting notes for your SMM clients and projects.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus size={14} />
            Log Call Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {callLogs.map((log) => (
            <div
              key={log._id}
              className="bg-card border border-border rounded-2xl p-4 shadow-2xs hover:border-primary/40 transition-all duration-200 space-y-3"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Client Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    <Building2 size={12} />
                    {log.clientName || 'General Client'}
                  </span>

                  {/* Project Badge */}
                  {log.projectName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
                      <FolderKanban size={12} />
                      {log.projectName}
                    </span>
                  )}

                  {/* Call Type */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-muted-foreground text-[11px] font-medium border border-border">
                    {getCallTypeIcon(log.callType)}
                    {log.callType}
                  </span>

                  {/* Purpose */}
                  {log.callPurpose && (
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[11px] font-medium">
                      {log.callPurpose}
                    </span>
                  )}
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground self-start sm:self-auto">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {log.callDate ? format(new Date(log.callDate), 'dd MMM yyyy') : 'No Date'}
                  </span>
                  {log.callTime && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Clock size={11} />
                      {log.callTime}
                    </span>
                  )}
                  {log.duration && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">
                      {log.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact details */}
              {(log.spokenWith || log.contactNumber) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-xl">
                  {log.spokenWith && (
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <User size={12} className="text-primary" />
                      Spoken With: <strong className="text-foreground">{log.spokenWith}</strong>
                    </span>
                  )}
                  {log.contactNumber && (
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Phone size={11} />
                      <a
                        href={`tel:${log.contactNumber}`}
                        className="text-primary hover:underline"
                      >
                        {log.contactNumber}
                      </a>
                    </span>
                  )}
                  {log.priority && (
                    <span
                      className={`ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        log.priority === 'Urgent'
                          ? 'bg-rose-500/20 text-rose-600'
                          : log.priority === 'High'
                          ? 'bg-amber-500/20 text-amber-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {log.priority}
                    </span>
                  )}
                </div>
              )}

              {/* Text Notes Body */}
              <div className="bg-background/80 rounded-xl p-3 border border-border/80">
                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText size={12} /> Call Summary & Notes:
                </p>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {log.notes}
                </div>
              </div>

              {/* Next Action / Follow-up alert if present */}
              {(log.nextAction || log.nextFollowUpDate) && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <Clock size={13} />
                    <span>Next Action:</span>
                    <span className="text-foreground font-normal">
                      {log.nextAction || 'Follow up with client'}
                    </span>
                  </div>
                  {log.nextFollowUpDate && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Calendar size={11} />
                      Follow-up: {format(new Date(log.nextFollowUpDate), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer: Status updater & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                {/* Inline Status Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">Status:</span>
                  <div className="relative">
                    <select
                      value={log.status}
                      onChange={(e) => handleInlineStatusChange(log._id, e.target.value)}
                      className={`h-7 px-2.5 pr-7 rounded-lg text-xs font-bold border appearance-none cursor-pointer ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {CALL_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Creator info & action buttons */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {log.loggedBy && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>Logged by:</span>
                      <strong className="text-foreground font-medium">
                        {log.loggedBy.name || 'Team'}
                      </strong>
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(log)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      title="Edit Call Note"
                    >
                      <Edit2 size={13} />
                    </button>
                    {(isAdmin || String(log.loggedBy?._id) === String(user?._id)) && (
                      <button
                        onClick={() => handleDeleteLog(log._id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        title="Delete Call Log"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log / Edit Call Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <PhoneCall size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  {editingId ? 'Edit SMM Call Note' : 'Log New SMM Call Note'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Record client discussion notes, set call status, and schedule action items
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

          <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Select Client *
                </label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const cObj = clients.find((c) => String(c._id) === String(cId));
                    setForm((prev) => ({
                      ...prev,
                      clientId: cId,
                      clientName: cObj ? cObj.companyName || cObj.name : '',
                      projectId: '',
                      projectName: '',
                    }));
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Select Project (Optional)
                </label>
                <select
                  value={form.projectId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const pObj = projects.find((p) => String(p._id) === String(pId));
                    setForm((prev) => ({
                      ...prev,
                      projectId: pId,
                      projectName: pObj ? pObj.name : '',
                    }));
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="">
                    {form.clientId
                      ? '-- General Client Discussion --'
                      : '-- Select Client First / General --'}
                  </option>
                  {availableProjectsForForm.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Type
                </label>
                <select
                  value={form.callType}
                  onChange={(e) => setForm({ ...form, callType: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  {CALL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Purpose
                </label>
                <select
                  value={form.callPurpose}
                  onChange={(e) => setForm({ ...form, callPurpose: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  {CALL_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  {CALL_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Spoken With
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Owner)"
                  value={form.spokenWith}
                  onChange={(e) => setForm({ ...form, spokenWith: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15 mins"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.callDate}
                  onChange={(e) => setForm({ ...form, callDate: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Time
                </label>
                <input
                  type="time"
                  value={form.callTime}
                  onChange={(e) => setForm({ ...form, callTime: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Notes / Summary (Text Format) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write detailed call summary, client feedback, campaign decisions, ad budget discussions, or next action points..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full min-h-[110px] p-3.5 rounded-xl border border-border bg-background text-sm leading-relaxed text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Next Action Required
                </label>
                <input
                  type="text"
                  placeholder="e.g. Share new reel creatives by Thursday"
                  value={form.nextAction}
                  onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
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
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Call Note' : 'Save Call Note'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
