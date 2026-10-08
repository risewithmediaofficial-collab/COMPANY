import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  IndianRupee,
  Plus,
  Users,
  FolderOpen,
  ArrowRight,
  Phone,
  Mail,
  Edit2,
  Calendar,
  RotateCcw,
  Sparkles,
  Globe,
  Share2,
  Palette,
  Video,
  Megaphone,
  FileEdit,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react';
import { useClients, useDeleteClient, useUpdateClient } from '../../hooks/useClients';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { formatINR } from '../../utils/currency';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const clientStatusTone = {
  Active: 'success',
  Prospect: 'warning',
  Churned: 'danger',
  Inactive: 'neutral',
  Renew: 'primary',
};

const STATUS_COLUMNS = ['Active', 'Prospect', 'Renew', 'Inactive', 'Churned'];

const STATUS_CONFIG = {
  Active: {
    label: 'Active',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    emptyMsg: 'No active clients yet',
  },
  Prospect: {
    label: 'Prospect',
    icon: Sparkles,
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    emptyMsg: 'No prospects in pipeline',
  },
  Renew: {
    label: 'Renew',
    icon: RotateCcw,
    dotColor: 'bg-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    emptyMsg: 'No renewals pending',
  },
  Inactive: {
    label: 'Inactive',
    icon: Clock,
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
    emptyMsg: 'No inactive accounts',
  },
  Churned: {
    label: 'Churned',
    icon: UserX,
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    emptyMsg: 'No churned accounts',
  },
};

export const SERVICE_FILTER_OPTIONS = [
  'Website Development',
  'Social Media Marketing',
  'Video Production',
  'Branding & Design',
  'Paid Ads / Meta & Google',
  'SEO & Search Optimization',
  'Content Writing',
  'Lead Generation',
  'Custom Retainer',
];

export const CLIENT_SORT_OPTIONS = [
  { value: 'name_asc', label: '🏢 Company Name: A to Z' },
  { value: 'name_desc', label: '🏢 Company Name: Z to A' },
  { value: 'retainer_desc', label: '💰 Retainer: High to Low' },
  { value: 'retainer_asc', label: '💰 Retainer: Low to High' },
  { value: 'status_active', label: '📊 Status: Active First' },
  { value: 'newest', label: '🕒 Recently Added' },
  { value: 'oldest', label: '🕒 Oldest Added' },
];

const AVATAR_PALETTES = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
];

const getCompanyInitials = (name, company) => {
  const target = (company || name || 'Client').trim();
  const words = target.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
};

const getAvatarStyle = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

const getServiceIcon = (serviceName = '') => {
  const s = serviceName.toLowerCase();
  if (s.includes('web') || s.includes('site') || s.includes('dev')) return Globe;
  if (s.includes('social') || s.includes('smm') || s.includes('insta')) return Share2;
  if (s.includes('video') || s.includes('shoot') || s.includes('reel') || s.includes('film')) return Video;
  if (s.includes('brand') || s.includes('design') || s.includes('logo')) return Palette;
  if (s.includes('ad') || s.includes('marketing') || s.includes('ppc')) return Megaphone;
  if (s.includes('seo') || s.includes('search')) return Sparkles;
  if (s.includes('content') || s.includes('script') || s.includes('writ')) return FileEdit;
  return Briefcase;
};

const Clients = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialStatus, setInitialStatus] = useState('Active');
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [draggingClientId, setDraggingClientId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverClientIndex, setDragOverClientIndex] = useState(null);
  const clientsBoardRef = useRef(null);

  // Smooth side auto-scroll while dragging clients
  useAutoScrollOnDrag(clientsBoardRef, Boolean(draggingClientId));
  const { startDate, endDate, isDateInRange } = useDateFilter();

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(serviceFilter ? { service: serviceFilter } : {}),
    ...(startDate ? { createdFrom: startDate } : {}),
    ...(endDate ? { createdTo: endDate } : {}),
  };

  const { data: rawClients = [], isLoading } = useClients(filters);
  const clients = rawClients.filter((c) => isDateInRange([c.createdAt, c.updatedAt, c.onboardingDate]));

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (serviceFilter) count++;
    if (searchTerm) count++;
    return count;
  }, [statusFilter, serviceFilter, searchTerm]);

  const clearAllFilters = () => {
    setStatusFilter('');
    setServiceFilter('');
    setSearchTerm('');
    setSortBy('name_asc');
  };

  const displayedClients = useMemo(() => {
    let result = [...clients];

    // Status Filter
    if (statusFilter) {
      result = result.filter((c) => (c.status || 'Prospect') === statusFilter);
    }

    // Service Dropdown Filter
    if (serviceFilter) {
      const sf = serviceFilter.toLowerCase().trim();
      result = result.filter((c) => {
        const clientServices = [
          c.service,
          ...(Array.isArray(c.services) ? c.services : []),
        ].filter(Boolean);
        return clientServices.some(
          (srv) => srv.toLowerCase().includes(sf) || sf.includes(srv.toLowerCase())
        );
      });
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.service || '').toLowerCase().includes(q) ||
          (Array.isArray(c.services) && c.services.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        const nameA = (a.company || a.name || '').toLowerCase();
        const nameB = (b.company || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = (a.company || a.name || '').toLowerCase();
        const nameB = (b.company || b.name || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'retainer_desc') {
        const valA = a.monthlyRetainer || a.contractValue || 0;
        const valB = b.monthlyRetainer || b.contractValue || 0;
        return valB - valA;
      }
      if (sortBy === 'retainer_asc') {
        const valA = a.monthlyRetainer || a.contractValue || 0;
        const valB = b.monthlyRetainer || b.contractValue || 0;
        return valA - valB;
      }
      if (sortBy === 'status_active') {
        const order = { Active: 1, Renew: 2, Prospect: 3, Inactive: 4, Churned: 5 };
        const orderA = order[a.status] || 99;
        const orderB = order[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.company || a.name || '').localeCompare(b.company || b.name || '');
      }
      if (sortBy === 'oldest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      // default: newest
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [clients, statusFilter, serviceFilter, searchTerm, sortBy]);

  const deleteClientMutation = useDeleteClient();
  const updateClientMutation = useUpdateClient();

  const activeClients = clients.filter((client) => client.status === 'Active').length;
  const prospectClients = clients.filter((client) => client.status === 'Prospect').length;
  const totalMrr = clients
    .filter((c) => c.status === 'Active')
    .reduce((sum, c) => sum + (c.monthlyRetainer || c.contractValue || 0), 0);

  const columns = [
    {
      key: 'name',
      label: 'Client / Company',
      render: (row) => {
        const displayName = row.company || row.name || 'Untitled Client';
        const contactPerson = row.company ? row.name : null;
        const initials = getCompanyInitials(row.name, row.company);
        const avatarClass = getAvatarStyle(displayName);

        return (
          <div className="min-w-0 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs border ${avatarClass}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs hover:text-primary transition-colors cursor-pointer truncate">
                {displayName}
              </div>
              {contactPerson && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {contactPerson}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'contact',
      label: 'Contact Info',
      render: (row) => (
        <div className="text-[11px] space-y-0.5">
          <div className="font-medium text-foreground">{row.phone || '—'}</div>
          <div className="text-muted-foreground truncate max-w-[180px]">{row.email || '—'}</div>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Services',
      render: (row) => {
        const servicesList = [row.service, ...(Array.isArray(row.services) ? row.services : [])].filter(Boolean);
        const unique = Array.from(new Set(servicesList));
        if (unique.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const first = unique[0];
        const Icon = getServiceIcon(first);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary text-secondary-foreground border border-border/80">
              <Icon size={11} className="text-muted-foreground shrink-0" />
              <span>{first}</span>
            </span>
            {unique.length > 1 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-secondary/60 text-muted-foreground border border-border/60">
                +{unique.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'monthlyRetainer',
      label: 'Monthly Retainer',
      render: (row) => {
        const val = row.monthlyRetainer || row.contractValue;
        return (
          <span className="font-bold text-xs text-emerald-600">
            {val ? formatINR(val) : '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={clientStatusTone[row.status] || 'neutral'}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
        </div>
      ),
    },
  ];

  const handleDeleteClient = async () => {
    if (deleteClientId) {
      await deleteClientMutation.mutateAsync(deleteClientId);
      setDeleteClientId(null);
    }
  };

  return (
    <WorkspacePage
      title="Clients 360"
      subtitle="Universal client database, retainer values, projects, and relationship health."
      icon={Users}
      breadcrumbs={[{ name: 'Clients', path: '/clients' }, { name: 'Directory' }]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedClient(null);
            setInitialStatus('Active');
            setShowAddModal(true);
          }}
          className="bg-primary text-primary-foreground font-bold shadow-sm cursor-pointer"
        >
          <Plus size={15} className="mr-1.5 stroke-[2.5]" />
          Add Client
        </Button>
      }
      properties={
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg border border-border/80 text-foreground font-semibold">
            <Users size={13} className="text-primary" />
            <span>Total Accounts: {clients.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg font-semibold">
            <Building2 size={13} />
            <span>Active Retainers: {activeClients}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg border border-border/80 text-foreground font-semibold">
            <IndianRupee size={13} className="text-emerald-600" />
            <span>MRR: {formatINR(totalMrr)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg font-semibold">
            <Briefcase size={13} />
            <span>Prospects: {prospectClients}</span>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        {/* Database View Engine */}
        <DatabaseView
          activeView={currentView}
          onViewChange={setCurrentView}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          totalCount={displayedClients.length}
          filters={
            <div className="flex items-center justify-between gap-3 w-full flex-wrap">
              {/* Dropdown Filters Group */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <SelectDropdown
                  className="w-40 text-xs"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={['Active', 'Prospect', 'Renew', 'Inactive', 'Churned']}
                  allOptionLabel="All Statuses"
                />
                <SelectDropdown
                  className="w-48 text-xs"
                  value={serviceFilter}
                  onChange={(val) => setServiceFilter(val)}
                  options={SERVICE_FILTER_OPTIONS}
                  allOptionLabel="All Services"
                />
                {/* Sorting Filter Dropdown */}
                <SelectDropdown
                  className="w-52 text-xs font-semibold"
                  value={sortBy}
                  onChange={(val) => setSortBy(val || 'name_asc')}
                  options={CLIENT_SORT_OPTIONS}
                />
              </div>

              {/* Reset Button */}
              {activeFiltersCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer"
                  title="Clear all active filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset ({activeFiltersCount})</span>
                </Button>
              )}
            </div>
          }
        >
          {/* Table View */}
          {currentView === 'table' && (
            <DataTable
              data={displayedClients}
              columns={columns}
              loading={isLoading}
              onRowClick={(client) => navigate(`/clients/${client._id}`)}
              onEdit={(client) => {
                setSelectedClient(client);
                setShowAddModal(true);
              }}
              onDelete={(id) => setDeleteClientId(id)}
              emptyTitle="No clients found"
              emptyDescription="Try adjusting your filter or create a new client to start building the relationship database."
            />
          )}

          {/* Board View (Clean, Modern Kanban by Client Status) */}
          {(currentView === 'board' || currentView === 'kanban') && (
            <div ref={clientsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 min-w-[1100px] lg:min-w-0 w-full">
                {STATUS_COLUMNS.map((status) => {
                  const statusClients = displayedClients.filter((c) => (c.status || 'Prospect') === status);
                  const isColActive = dragOverStatus === status;
                  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.Prospect;
                  const ColIcon = conf.icon;

                  const colTotalRetainer = statusClients.reduce(
                    (sum, c) => sum + (c.monthlyRetainer || c.contractValue || 0),
                    0
                  );

                  return (
                    <div
                      key={status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverStatus !== status) setDragOverStatus(status);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          if (dragOverStatus === status) setDragOverStatus(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const clientId = e.dataTransfer.getData('clientId');
                        if (clientId) {
                          updateClientMutation.mutate({ id: clientId, data: { status } });
                        }
                        setDraggingClientId(null);
                        setDragOverStatus(null);
                        setDragOverClientIndex(null);
                      }}
                      className={`flex flex-col min-h-[520px] max-h-[calc(100vh-270px)] rounded-2xl border transition-all p-3 space-y-3 w-full ${
                        isColActive
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border/70 bg-secondary/25'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${conf.dotColor} ring-4 ring-current/15`} />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                            {status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeClass}`}>
                            {statusClients.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {colTotalRetainer > 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {formatINR(colTotalRetainer)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setInitialStatus(status);
                              setShowAddModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-card border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title={`Add client to ${status}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] custom-scrollbar pr-0.5 flex-1">
                        {statusClients.map((client, idx) => {
                          const isBeingDragged = draggingClientId === client._id;
                          const showDropIndicatorBefore = isColActive && dragOverClientIndex === idx && !isBeingDragged;

                          const displayName = client.company || client.name || 'Untitled Client';
                          const contactPerson = client.company ? client.name : null;
                          const initials = getCompanyInitials(client.name, client.company);
                          const avatarClass = getAvatarStyle(displayName);
                          const retainerValue = client.monthlyRetainer || client.contractValue;
                          const clientServices = [
                            client.service,
                            ...(Array.isArray(client.services) ? client.services : []),
                          ].filter(Boolean);
                          const uniqueServices = Array.from(new Set(clientServices));

                          return (
                            <React.Fragment key={client._id}>
                              {showDropIndicatorBefore && (
                                <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1.5 shadow-xs" />
                              )}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  setDraggingClientId(client._id);
                                  e.dataTransfer.setData('clientId', client._id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setDraggingClientId(null);
                                  setDragOverStatus(null);
                                  setDragOverClientIndex(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  setDragOverStatus(status);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const midY = rect.top + rect.height / 2;
                                  setDragOverClientIndex(e.clientY < midY ? idx : idx + 1);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const clientId = e.dataTransfer.getData('clientId');
                                  if (clientId) {
                                    updateClientMutation.mutate({ id: clientId, data: { status } });
                                  }
                                  setDraggingClientId(null);
                                  setDragOverStatus(null);
                                  setDragOverClientIndex(null);
                                }}
                                onClick={() => navigate(`/clients/${client._id}`)}
                                className={`p-3.5 bg-card rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-200 cursor-grab active:cursor-grabbing space-y-3 group shadow-xs relative overflow-hidden ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 border-dashed border-primary ring-2 ring-primary/30'
                                    : 'hover:shadow-md hover:-translate-y-0.5'
                                }`}
                              >
                                {/* Top: Avatar + Company / Client Name + Quick Edit */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs border ${avatarClass}`}
                                    >
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                        {displayName}
                                      </h4>
                                      {contactPerson && (
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                                          <Users size={10} className="shrink-0 text-muted-foreground/60" />
                                          <span className="truncate">{contactPerson}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClient(client);
                                        setShowAddModal(true);
                                      }}
                                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                      title="Edit Client"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Financial Retainer / Value Badge + Contact Links */}
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  {retainerValue ? (
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <IndianRupee size={11} className="stroke-[2.5]" />
                                      <span>{formatINR(retainerValue)}</span>
                                      <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">
                                        {client.budgetType === 'overall' ? 'total' : '/mo'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground/80 font-medium px-2 py-0.5 rounded-md bg-secondary/40 border border-border/40">
                                      No retainer set
                                    </div>
                                  )}

                                  {/* Direct Quick Actions */}
                                  <div className="flex items-center gap-0.5">
                                    {client.phone && (
                                      <a
                                        href={`tel:${client.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Call ${client.phone}`}
                                        className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-emerald-600 transition-colors"
                                      >
                                        <Phone size={12} />
                                      </a>
                                    )}
                                    {client.email && (
                                      <a
                                        href={`mailto:${client.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Email ${client.email}`}
                                        className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                                      >
                                        <Mail size={12} />
                                      </a>
                                    )}
                                    {client.driveLink && (
                                      <a
                                        href={client.driveLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Google Drive Assets"
                                        className="p-1 rounded-md hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
                                      >
                                        <FolderOpen size={12} />
                                      </a>
                                    )}
                                    {client.website && (
                                      <a
                                        href={client.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Visit Website"
                                        className="p-1 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                                      >
                                        <Globe size={12} />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Clean Services Chips */}
                                {uniqueServices.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                    {uniqueServices.slice(0, 2).map((srv, sIdx) => {
                                      const Icon = getServiceIcon(srv);
                                      return (
                                        <span
                                          key={sIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/80 text-secondary-foreground border border-border/70 truncate max-w-[150px]"
                                          title={srv}
                                        >
                                          <Icon size={10} className="shrink-0 text-muted-foreground" />
                                          <span className="truncate">{srv}</span>
                                        </span>
                                      );
                                    })}
                                    {uniqueServices.length > 2 && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-secondary/60 text-muted-foreground border border-border/60">
                                        +{uniqueServices.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Card Footer: Date & Open indicator */}
                                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} className="text-muted-foreground/70 shrink-0" />
                                    <span>
                                      {client.createdAt
                                        ? new Date(client.createdAt).toLocaleDateString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })
                                        : 'Active'}
                                    </span>
                                  </span>
                                  <span className="group-hover:text-primary flex items-center gap-0.5 font-bold transition-colors">
                                    Open <ArrowRight size={10} />
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* Drop indicator at the bottom of the column */}
                        {isColActive && dragOverClientIndex >= statusClients.length && (
                          <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1.5 shadow-xs" />
                        )}

                        {/* Column Empty State */}
                        {statusClients.length === 0 && (
                          <div
                            className={`p-6 text-center text-xs border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all min-h-[140px] ${
                              isColActive
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border/70 bg-card/40 text-muted-foreground'
                            }`}
                          >
                            {isColActive ? (
                              <span>Drop client here to move to {status}</span>
                            ) : (
                              <>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${conf.badgeClass}`}>
                                  <ColIcon size={14} />
                                </div>
                                <p className="font-medium text-muted-foreground">{conf.emptyMsg}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClient(null);
                                    setInitialStatus(status);
                                    setShowAddModal(true);
                                  }}
                                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={11} /> Add {status} Client
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DatabaseView>
      </div>

      <AddClientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        client={selectedClient}
        initialStatus={initialStatus}
      />

      <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Clients;
