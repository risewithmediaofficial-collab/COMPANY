import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ListChecks,
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
  Maximize2,
  Minimize2,
  ChevronDown,
  SlidersHorizontal,
  Filter,
} from '@/components/ui/muiIcons';
import { useClients, useDeleteClient, useUpdateClient } from '../../hooks/useClients';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { getProjectCategoryMeta } from '../../utils/projectCategories';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
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
    dotColor: 'bg-primary',
    accentBorder: '',
    badgeClass: 'bg-primary text-primary-foreground ',
    surface: ' bg-secondary/30',
    emptyMsg: 'No active clients yet',
  },
  Prospect: {
    label: 'Prospect',
    icon: Sparkles,
    dotColor: 'bg-foreground/70',
    accentBorder: '',
    badgeClass: 'bg-secondary text-foreground ',
    surface: ' bg-secondary/25',
    emptyMsg: 'No prospects in pipeline',
  },
  Renew: {
    label: 'Renew',
    icon: RotateCcw,
    dotColor: 'bg-foreground/60',
    accentBorder: '',
    badgeClass: 'bg-secondary text-foreground ',
    surface: ' bg-secondary/20',
    emptyMsg: 'No renewals pending',
  },
  Inactive: {
    label: 'Inactive',
    icon: Clock,
    dotColor: 'bg-muted-foreground',
    accentBorder: '',
    badgeClass: 'bg-muted text-muted-foreground ',
    surface: ' bg-secondary/15',
    emptyMsg: 'No inactive accounts',
  },
  Churned: {
    label: 'Churned',
    icon: UserX,
    dotColor: 'bg-muted-foreground/60',
    accentBorder: '',
    badgeClass: 'bg-background text-muted-foreground ',
    surface: ' bg-card',
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
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'tasks_desc', label: 'Tasks Available: High to Low' },
  { value: 'tasks_asc', label: 'Tasks Available: Low to High' },
  { value: 'status_active', label: 'Status: Active First' },
  { value: 'newest', label: 'Recently Added' },
  { value: 'oldest', label: 'Oldest Added' },
];

const AVATAR_PALETTES = [
  'bg-secondary text-foreground ',
  'bg-muted text-foreground ',
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
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'

  const secondaryFiltersCount = useMemo(() => {
    let count = 0;
    if (serviceFilter) count++;
    if (sortBy && sortBy !== 'name_asc') count++;
    return count;
  }, [serviceFilter, sortBy]);
  const [draggingClientId, setDraggingClientId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverClientIndex, setDragOverClientIndex] = useState(null);
  const [expandedClientIds, setExpandedClientIds] = useState({});
  const clientsBoardRef = useRef(null);

  const toggleClientExpand = (e, clientId) => {
    e.stopPropagation();
    setExpandedClientIds((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  // Smooth side auto-scroll while dragging clients
  useAutoScrollOnDrag(clientsBoardRef, Boolean(draggingClientId));

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(serviceFilter ? { service: serviceFilter } : {}),
  };

  const { data: rawClients = [], isLoading } = useClients(filters);
  const clients = rawClients;

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
      if (sortBy === 'tasks_desc') {
        return (b.totalTasks || 0) - (a.totalTasks || 0);
      }
      if (sortBy === 'tasks_asc') {
        return (a.totalTasks || 0) - (b.totalTasks || 0);
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
  const totalClientTasks = clients.reduce((sum, c) => sum + (c.totalTasks || 0), 0);

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
            <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs ${avatarClass}`}>
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
      label: 'Project Type',
      render: (row) => {
        const typeLabels = [
          ...(Array.isArray(row.projectTypes) ? row.projectTypes.map((pt) => getProjectCategoryMeta(pt).shortLabel) : []),
          row.service,
          ...(Array.isArray(row.services) ? row.services : []),
        ].filter(Boolean);
        const unique = Array.from(new Set(typeLabels));
        if (unique.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const first = unique[0];
        const Icon = getServiceIcon(first);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary text-secondary-foreground ">
              <Icon size={11} className="text-muted-foreground shrink-0" />
              <span>{first}</span>
            </span>
            {unique.length > 1 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-secondary/60 text-muted-foreground ">
                +{unique.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'tasksAvailable',
      label: 'Tasks Available',
      render: (row) => {
        const total = row.totalTasks || 0;
        const completed = row.completedTasks || 0;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div className="w-32 space-y-1 tabular-nums">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-foreground">{total} {total === 1 ? 'task' : 'tasks'}</span>
              <span className="text-[10px] text-muted-foreground">{completed} done</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
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
      key: 'timeline',
      label: 'Start & End Date',
      render: (row) => {
        const startDate = row.projectStartDate || row.contractStartDate || row.createdAt;
        const endDate = row.projectEndDate || row.contractEndDate;
        return (
          <div className="text-[11px] space-y-0.5 whitespace-nowrap tabular-nums">
            <div className="text-muted-foreground">
              Start: <span className="font-medium text-foreground">{startDate ? new Date(startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="text-muted-foreground">
              End: <span className="font-medium text-foreground">{endDate ? new Date(endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</span>
            </div>
          </div>
        );
      },
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
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
        >
          <Plus size={15} className="mr-1 stroke-[2.5]" />
          Add Client
        </Button>
      }
      properties={
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg text-foreground font-semibold tabular-nums">
            <Users size={13} className="text-muted-foreground shrink-0" />
            <span>Total Accounts: {clients.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card text-foreground rounded-lg font-semibold tabular-nums">
            <Building2 size={13} className="text-muted-foreground shrink-0" />
            <span>Active Projects: {activeClients}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg text-foreground font-semibold tabular-nums">
            <ListChecks size={13} className="text-muted-foreground shrink-0" />
            <span>Tasks Available: {totalClientTasks}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card text-foreground rounded-lg font-semibold tabular-nums">
            <Briefcase size={13} className="text-muted-foreground shrink-0" />
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
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                {/* Primary Filters Group */}
                <div className="flex items-center gap-2 flex-wrap min-w-0 w-full sm:w-auto">
                  <SelectDropdown
                    className="w-full sm:w-40 text-xs"
                    buttonClassName="h-9"
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={['Active', 'Prospect', 'Renew', 'Inactive', 'Churned']}
                    allOptionLabel="All Statuses"
                  />

                  {/* More Filters Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowMoreFilters((prev) => !prev)}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      showMoreFilters || secondaryFiltersCount > 0
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-card border border-border/50 text-foreground hover:bg-secondary/60'
                    }`}
                    title="Toggle additional dropdown filters"
                  >
                    <SlidersHorizontal size={13} className="shrink-0" />
                    <span>More Filters</span>
                    {secondaryFiltersCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground tabular-nums">
                        {secondaryFiltersCount}
                      </span>
                    )}
                    <ChevronDown
                      size={13}
                      className={`text-muted-foreground transition-transform duration-200 ${showMoreFilters ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Reset Button */}
                  {activeFiltersCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAllFilters}
                      className="h-9 px-2.5 text-xs text-foreground bg-secondary hover:bg-muted flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer tabular-nums"
                      title="Clear all active filters"
                    >
                      <RotateCcw size={12} />
                      <span>Reset ({activeFiltersCount})</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Collapsible Secondary Filters Row */}
              {showMoreFilters && (
                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-secondary/30 border border-border/40 animate-in fade-in slide-in-from-top-1 duration-150 w-full">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0 mr-1">
                    <Filter size={13} />
                    <span className="text-[11px] uppercase tracking-wider font-bold">Filters</span>
                  </div>

                  <SelectDropdown
                    className="w-full sm:w-48 text-xs"
                    buttonClassName="h-8.5 bg-background text-xs"
                    value={serviceFilter}
                    onChange={(val) => setServiceFilter(val)}
                    options={SERVICE_FILTER_OPTIONS}
                    allOptionLabel="All Services"
                  />

                  {/* Sorting Filter Dropdown */}
                  <SelectDropdown
                    className="w-full sm:w-52 text-xs font-semibold"
                    buttonClassName="h-8.5 bg-background text-xs"
                    value={sortBy}
                    onChange={(val) => setSortBy(val || 'name_asc')}
                    options={CLIENT_SORT_OPTIONS}
                  />
                </div>
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
              emptyDescription=""
            />
          )}

          {/* Board View (Clean, Modern Kanban by Client Status - matching Tasks board design) */}
          {(currentView === 'board' || currentView === 'kanban') && (
            <div ref={clientsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory responsive-table-container">
              <div className="grid w-max min-w-full auto-cols-[minmax(270px,85vw)] sm:auto-cols-[minmax(315px,360px)] grid-flow-col gap-4">
                {STATUS_COLUMNS.map((status) => {
                  const statusClients = displayedClients.filter((c) => (c.status || 'Prospect') === status);
                  const isColActive = dragOverStatus === status;
                  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.Prospect;
                  const ColIcon = conf.icon;

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
                      className={`flex flex-col min-h-[520px] max-h-[calc(100vh-270px)] rounded-2xl ${conf.surface} transition-all p-3.5 space-y-3 snap-center sm:snap-align-none ${
                        isColActive
                          ? ' bg-primary/10 ring-2 ring-primary/30'
                          : ''
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${conf.dotColor}`} />
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${conf.badgeClass}`}>
                            {statusClients.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setInitialStatus(status);
                              setShowAddModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-card border-transparent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title={`Add client to ${status}`}
                          >
                            <Plus size={14} />
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
                          const startDateVal = client.projectStartDate || client.contractStartDate || client.createdAt;
                          const endDateVal = client.projectEndDate || client.contractEndDate;
                          const totalTasks = client.totalTasks || 0;
                          const completedTasks = client.completedTasks || 0;
                          const clientProjectTypes = [
                            ...(Array.isArray(client.projectTypes)
                              ? client.projectTypes.map((pt) => getProjectCategoryMeta(pt).shortLabel)
                              : []),
                            client.service,
                            ...(Array.isArray(client.services) ? client.services : []),
                          ].filter(Boolean);
                          const uniqueTypes = Array.from(new Set(clientProjectTypes));
                          const isExpanded = Boolean(expandedClientIds[client._id]);
                          const primaryCategory = uniqueTypes[0] || client.industry || client.tier || 'Client';
                          const PrimaryCatIcon = getServiceIcon(primaryCategory);

                          return (
                            <React.Fragment key={client._id}>
                              {showDropIndicatorBefore && (
                                <div className="h-1.5 rounded-full bg-primary my-1.5 " />
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
                                className={`p-3.5 bg-card rounded-2xl transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2.5 group hover:-translate-y-0.5 active:scale-[0.98] ${conf.accentBorder} ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 ring-2 ring-primary/30'
                                    : ''
                                }`}
                              >
                                {/* Compact Initial Row: Name + Enlarge Button */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4
                                      className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate"
                                      title={displayName}
                                    >
                                      {displayName}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isExpanded && (
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
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleClientExpand(e, client._id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[10px] font-semibold transition-colors cursor-pointer"
                                      title={isExpanded ? 'Collapse card' : 'Enlarge card'}
                                      aria-label={isExpanded ? 'Collapse card' : 'Enlarge card'}
                                    >
                                      {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                                      <span>{isExpanded ? 'Less' : 'Enlarge'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Compact Initial Row 2: Category + Tasks */}
                                <div className="flex items-center justify-between gap-2 flex-wrap tabular-nums">
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-secondary/90 text-secondary-foreground truncate max-w-[165px]"
                                    title={primaryCategory}
                                  >
                                    <PrimaryCatIcon size={11} className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">{primaryCategory}</span>
                                  </span>

                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-secondary text-foreground">
                                    <ListChecks size={12} className="shrink-0 text-muted-foreground" />
                                    <span>{totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}</span>
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="space-y-2.5 pt-2">
                                    {/* Contact Person + Quick Icons + Tier */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {contactPerson ? (
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary/80 text-foreground max-w-[160px] truncate">
                                            <div
                                              className={`w-5 h-5 rounded-full font-bold flex items-center justify-center shrink-0 text-[9px] ${avatarClass}`}
                                            >
                                              {initials}
                                            </div>
                                            <span className="truncate text-[11px] font-semibold">{contactPerson}</span>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary/50 text-muted-foreground ">
                                            <Users size={11} className="text-muted-foreground/70" />
                                            <span>Direct Account</span>
                                          </div>
                                        )}
                                        {client.tier && (
                                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground shrink-0">
                                            {client.tier}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {client.phone && (
                                          <a
                                            href={`tel:${client.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Call ${client.phone}`}
                                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <Phone size={13} />
                                          </a>
                                        )}
                                        {client.email && (
                                          <a
                                            href={`mailto:${client.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Email ${client.email}`}
                                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <Mail size={13} />
                                          </a>
                                        )}
                                        {client.website && (
                                          <a
                                            href={client.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Visit Website"
                                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <Globe size={13} />
                                          </a>
                                        )}
                                        {client.driveLink && (
                                          <a
                                            href={client.driveLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Google Drive Assets"
                                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <FolderOpen size={13} />
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Start Date & End Date */}
                                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-background text-[11px] tabular-nums">
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block font-medium">Start Date</span>
                                        <span className="font-bold text-foreground">
                                          {startDateVal
                                            ? new Date(startDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                            : '—'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block font-medium">End Date</span>
                                        <span className="font-bold text-foreground">
                                          {endDateVal
                                            ? new Date(endDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'Ongoing'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Extra Project Type Tags & Completion */}
                                    {uniqueTypes.length > 1 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {uniqueTypes.slice(1).map((srv, sIdx) => {
                                          const Icon = getServiceIcon(srv);
                                          return (
                                            <span
                                              key={sIdx}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-secondary/90 text-secondary-foreground truncate max-w-[160px]"
                                              title={srv}
                                            >
                                              <Icon size={11} className="shrink-0 text-muted-foreground" />
                                              <span className="truncate">{srv}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Card Footer */}
                                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground tabular-nums">
                                      <div className="flex items-center gap-2.5">
                                        <span className="flex items-center gap-1">
                                          <Briefcase size={11} className="text-muted-foreground/70 shrink-0" />
                                          <span>
                                            {client.projectCount || 0} {(client.projectCount || 0) === 1 ? 'project' : 'projects'}
                                          </span>
                                        </span>
                                        {totalTasks > 0 && (
                                          <span>· {completedTasks}/{totalTasks} done</span>
                                        )}
                                      </div>
                                      <span className="group-hover:text-foreground flex items-center gap-1 font-bold text-xs transition-colors">
                                        Open <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* Drop indicator at the bottom of the column */}
                        {isColActive && dragOverClientIndex >= statusClients.length && (
                          <div className="h-1.5 rounded-full bg-primary my-1.5 " />
                        )}

                        {/* Column Empty State */}
                        {statusClients.length === 0 && (
                          <div
                            className={`p-6 text-center text-xs rounded-2xl flex flex-col items-center justify-center gap-2 transition-all min-h-[140px] ${
                              isColActive
                                ? ' bg-primary/10 text-primary font-semibold'
                                : ' bg-card/40 text-muted-foreground'
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
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
