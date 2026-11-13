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
} from '@/components/ui/muiIcons';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { useDateFilter } from '../../context/DateFilterContext';
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
  { value: 'Connected', label: 'Connected', color: 'bg-primary text-primary-foreground ' },
  { value: 'Follow-up Needed', label: 'Follow-up Needed', color: 'bg-secondary text-foreground ' },
  { value: 'Scheduled', label: 'Scheduled', color: 'bg-card text-foreground ' },
  { value: 'No Answer / Busy', label: 'No Answer / Busy', color: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 ' },
  { value: 'Completed', label: 'Completed', color: 'bg-foreground text-background ' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-card text-muted-foreground ' },
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
  const { startDate: globalStartDate, endDate: globalEndDate, isDateInRange } = useDateFilter();
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
      if (globalStartDate) params.startDate = globalStartDate;
      if (globalEndDate) params.endDate = globalEndDate;

      const [logsRes, statsRes] = await Promise.all([
        smmApi.getCallLogs(params),
        smmApi.getCallLogStats({
          clientId: selectedClient || undefined,
          projectId: selectedProject || undefined,
          startDate: globalStartDate || undefined,
          endDate: globalEndDate || undefined,
        }),
      ]);

      const rawLogs = logsRes.data?.data || [];
      setCallLogs(rawLogs.filter((l) => isDateInRange([l.callDate, l.createdAt])));
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
  }, [selectedClient, selectedProject, selectedStatus, selectedCallType, globalStartDate, globalEndDate, isDateInRange]);

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
        return <PhoneIncoming size={13} className="text-foreground" />;
      case 'WhatsApp Call':
        return <MessageCircle size={13} className="text-foreground" />;
      case 'Google Meet':
      case 'Zoom':
        return <Video size={13} className="text-foreground" />;
      case 'Direct Meeting':
        return <User size={13} className="text-foreground" />;
      default:
        return <PhoneOutgoing size={13} className="text-muted-foreground" />;
    }
  };

  // Helper for Status badge color
  const getStatusColor = (statusVal) => {
    const found = CALL_STATUSES.find((s) => s.value === statusVal);
    return (
      found?.color ||
      'bg-secondary text-secondary-foreground '
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <PhoneCall className="text-primary shrink-0" size={22} />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">SMM Call Logs</h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchCallLogs();
            }}
            disabled={refreshing}
            className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
            title="Refresh Call Logs"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="h-10 inline-flex items-center gap-1.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Log Call Note</span>
          </button>
        </div>
      </div>

      {/* SMM SubNav */}
      <SMMSubNav />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Calls</span>
            <span className="p-1.5 rounded-lg bg-secondary text-foreground">
              <Phone size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{stats.total}</p>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Connected</span>
            <span className="p-1.5 rounded-lg bg-secondary text-foreground">
              <CheckCircle2 size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
            {stats.connected}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Follow-up</span>
            <span className="p-1.5 rounded-lg bg-secondary text-foreground">
              <AlertTriangle size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
            {stats.followUpNeeded}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scheduled</span>
            <span className="p-1.5 rounded-lg bg-secondary text-foreground">
              <Calendar size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
            {stats.scheduled}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">No Answer</span>
            <span className="p-1.5 rounded-lg bg-secondary text-muted-foreground">
              <PhoneMissed size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
            {stats.noAnswer}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</span>
            <span className="p-1.5 rounded-lg bg-secondary text-foreground">
              <Check size={13} />
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
            {stats.completed}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Select Client
            </label>
            <SelectDropdown
              value={selectedClient}
              onChange={(val) => handleClientFilterChange(val || '')}
              options={[
                { value: '', label: `All Clients (${clients.length})` },
                ...clients.map((c) => ({
                  value: c._id,
                  label: c.companyName || c.name,
                })),
              ]}
              placeholder={`All Clients (${clients.length})`}
              allowCustom={false}
              className="w-full"
              buttonClassName="h-9 px-3 rounded-xl bg-background text-xs font-semibold border border-border/50"
            />
          </div>

          {/* Project Filter (Dynamically populated based on chosen client) */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Select Project
            </label>
            <SelectDropdown
              value={selectedProject}
              onChange={(val) => setSelectedProject(val || '')}
              options={[
                {
                  value: '',
                  label: selectedClient
                    ? `All Projects for this Client (${availableProjectsForFilter.length})`
                    : `All Projects (${availableProjectsForFilter.length})`,
                },
                ...availableProjectsForFilter.map((p) => ({
                  value: p._id,
                  label: p.name,
                })),
              ]}
              placeholder="All Projects"
              allowCustom={false}
              className="w-full"
              buttonClassName="h-9 px-3 rounded-xl bg-background text-xs font-semibold border border-border/50"
            />
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
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-background text-xs"
              />
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Status Pills & Call Type row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 ">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Status:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === 'all'
                  ? 'bg-primary text-primary-foreground '
                  : 'bg-background text-muted-foreground hover:bg-secondary'
              }`}
            >
              All ({stats.total})
            </button>
            {CALL_STATUSES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedStatus === st.value
                    ? 'bg-primary text-primary-foreground '
                    : 'bg-background text-muted-foreground hover:bg-secondary'
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
            searchQuery) && (
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
        <div className="bg-card rounded-2xl p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
          <RefreshCw size={20} className="animate-spin text-primary" />
          <span>Loading SMM call logs...</span>
        </div>
      ) : callLogs.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary">
            <PhoneCall size={24} />
          </div>
          <h3 className="text-base font-bold text-foreground">No Call Logs</h3>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer"
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
              className="bg-card rounded-2xl p-4 transition-all duration-200 space-y-3"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Client Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    <Building2 size={12} />
                    {log.clientName || 'General Client'}
                  </span>

                  {/* Project Badge */}
                  {log.projectName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold ">
                      <FolderKanban size={12} />
                      {log.projectName}
                    </span>
                  )}

                  {/* Call Type */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-muted-foreground text-[11px] font-medium ">
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
                          ? 'bg-primary text-primary-foreground '
                          : log.priority === 'High'
                          ? 'bg-secondary text-foreground '
                          : 'bg-card text-muted-foreground '
                      }`}
                    >
                      {log.priority}
                    </span>
                  )}
                </div>
              )}

              {/* Text Notes Body */}
              <div className="bg-background rounded-xl p-3 ">
                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText size={12} /> Call Summary & Notes:
                </p>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {log.notes}
                </div>
              </div>

              {/* Next Action / Follow-up alert if present */}
              {(log.nextAction || log.nextFollowUpDate) && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary/40 text-xs">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Clock size={13} />
                    <span>Next Action:</span>
                    <span className="text-muted-foreground font-normal">
                      {log.nextAction || 'Follow up with client'}
                    </span>
                  </div>
                  {log.nextFollowUpDate && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground bg-card px-2 py-0.5 rounded-md tabular-nums">
                      <Calendar size={11} />
                      Follow-up: {format(new Date(log.nextFollowUpDate), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer: Status updater & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs">
                {/* Inline Status Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">Status:</span>
                  <SelectDropdown
                    value={log.status}
                    onChange={(val) => handleInlineStatusChange(log._id, val || log.status)}
                    options={CALL_STATUSES.map((st) => ({
                      value: st.value,
                      label: st.label,
                    }))}
                    placeholder="Status"
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-32"
                    buttonClassName={`h-7 px-2.5 rounded-lg text-xs font-bold border border-border/50 ${getStatusColor(
                      log.status
                    )}`}
                  />
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
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ">
                <PhoneCall size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  {editingId ? 'Edit Call Note' : 'Log Call Note'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Call note form
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
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
                <SelectDropdown
                  value={form.clientId}
                  onChange={(val) => {
                    const cId = val;
                    const cObj = clients.find((c) => String(c._id) === String(cId));
                    setForm((prev) => ({
                      ...prev,
                      clientId: cId || '',
                      clientName: cObj ? cObj.companyName || cObj.name : '',
                      projectId: '',
                      projectName: '',
                    }));
                  }}
                  options={clients.map((c) => ({
                    value: c._id,
                    label: c.companyName || c.name,
                  }))}
                  placeholder="-- Choose Client --"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Select Project (Optional)
                </label>
                <SelectDropdown
                  value={form.projectId}
                  onChange={(val) => {
                    const pId = val;
                    const pObj = projects.find((p) => String(p._id) === String(pId));
                    setForm((prev) => ({
                      ...prev,
                      projectId: pId || '',
                      projectName: pObj ? pObj.name : '',
                    }));
                  }}
                  options={[
                    {
                      value: '',
                      label: form.clientId
                        ? '-- General Client Discussion --'
                        : '-- Select Client First / General --',
                    },
                    ...availableProjectsForForm.map((p) => ({
                      value: p._id,
                      label: p.name,
                    })),
                  ]}
                  placeholder={form.clientId ? '-- General Client Discussion --' : '-- Select Client First / General --'}
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Type
                </label>
                <SelectDropdown
                  value={form.callType}
                  onChange={(val) => setForm({ ...form, callType: val || 'Incoming' })}
                  options={CALL_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Call Type"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Purpose
                </label>
                <SelectDropdown
                  value={form.callPurpose}
                  onChange={(val) => setForm({ ...form, callPurpose: val || 'Campaign Review' })}
                  options={CALL_PURPOSES.map((p) => ({ value: p, label: p }))}
                  placeholder="Call Purpose"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Call Status *
                </label>
                <SelectDropdown
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val || 'Completed' })}
                  options={CALL_STATUSES.map((st) => ({ value: st.value, label: st.label }))}
                  placeholder="Call Status"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm font-bold rounded-xl border border-border/50"
                />
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm font-normal text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Priority
                </label>
                <SelectDropdown
                  value={form.priority}
                  onChange={(val) => setForm({ ...form, priority: val || 'Medium' })}
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                    { value: 'Urgent', label: 'Urgent' },
                  ]}
                  placeholder="Priority"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
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
                  className="w-full min-h-[110px] px-4 py-3 rounded-xl bg-background text-sm font-normal leading-relaxed text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-y"
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
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
                  className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
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
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-colors"
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
