import React, { Fragment, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  IndianRupee,
  Plus,
  Users,
  Search,
  SlidersHorizontal,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Phone,
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Globe,
  Share2,
  Palette,
  Video,
  Megaphone,
  FileEdit,
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
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { getCategoryTheme, isCategoryMatch } from '../../utils/categoryColors';
import { CategoryColorLegend, BOARD_CATEGORY_DEFINITIONS } from '../../components/ui/CategoryColorLegend';
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

export const CLIENT_CATEGORY_PILLS = [
  { key: 'all', label: 'All Accounts', icon: Users },
  { key: 'web_development', label: 'Website / Dev', icon: Globe },
  { key: 'social_media', label: 'Social Media', icon: Share2 },
  { key: 'branding', label: 'Branding & Design', icon: Palette },
  { key: 'seo', label: 'SEO & Search', icon: Sparkles },
  { key: 'paid_ads', label: 'Paid Ads', icon: Megaphone },
  { key: 'video_content', label: 'Video Production', icon: Video },
  { key: 'content', label: 'Content Creation', icon: FileEdit },
  { key: 'other', label: 'Custom Retainer', icon: Briefcase },
];

export const CLIENT_SORT_OPTIONS = [
  { value: 'name_asc', label: '🏢 Company Name: A to Z' },
  { value: 'name_desc', label: '🏢 Company Name: Z to A' },
  { value: 'retainer_desc', label: '💰 Retainer: High to Low' },
  { value: 'retainer_asc', label: '💰 Retainer: Low to High' },
  { value: 'status_active', label: '📊 Status: Active First' },
  { value: 'service_asc', label: '📁 Service: A to Z' },
  { value: 'newest', label: '🕒 Recently Added' },
  { value: 'oldest', label: '🕒 Oldest Added' },
];

const Clients = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: clients.length };
    clients.forEach((c) => {
      const serviceTarget = [c.service, ...(Array.isArray(c.services) ? c.services : [])].filter(Boolean).join(' ');
      CLIENT_CATEGORY_PILLS.forEach((pill) => {
        if (pill.key !== 'all' && isCategoryMatch(serviceTarget, pill.key, c.company || c.name)) {
          counts[pill.key] = (counts[pill.key] || 0) + 1;
        }
      });
      BOARD_CATEGORY_DEFINITIONS.forEach((def) => {
        if (counts[def.key] === undefined && isCategoryMatch(serviceTarget, def.key, c.company || c.name)) {
          counts[def.key] = (counts[def.key] || 0) + 1;
        }
      });
    });
    return counts;
  }, [clients]);

  const activeCategoryPills = useMemo(() => {
    return CLIENT_CATEGORY_PILLS.map((pill) => ({
      ...pill,
      count: pill.key === 'all' ? clients.length : (categoryCounts[pill.key] || 0),
    }));
  }, [clients, categoryCounts]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (statusFilter) count++;
    if (serviceFilter) count++;
    if (searchTerm) count++;
    return count;
  }, [categoryFilter, statusFilter, serviceFilter, searchTerm]);

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('');
    setServiceFilter('');
    setSearchTerm('');
    setSortBy('name_asc');
  };

  const displayedClients = useMemo(() => {
    let result = [...clients];

    // Category Filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((c) => {
        const serviceTarget = [c.service, ...(Array.isArray(c.services) ? c.services : [])].filter(Boolean).join(' ');
        return isCategoryMatch(serviceTarget, categoryFilter, c.company || c.name);
      });
    }

    // Status Filter
    if (statusFilter) {
      result = result.filter((c) => (c.status || 'Prospect') === statusFilter);
    }

    // Service Dropdown Filter
    if (serviceFilter) {
      result = result.filter((c) => (c.service || '').toLowerCase().includes(serviceFilter.toLowerCase()));
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.service || '').toLowerCase().includes(q)
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
        return (b.monthlyRetainer || 0) - (a.monthlyRetainer || 0);
      }
      if (sortBy === 'retainer_asc') {
        return (a.monthlyRetainer || 0) - (b.monthlyRetainer || 0);
      }
      if (sortBy === 'status_active') {
        const order = { Active: 1, Renew: 2, Prospect: 3, Inactive: 4, Churned: 5 };
        const orderA = order[a.status] || 99;
        const orderB = order[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.company || a.name || '').localeCompare(b.company || b.name || '');
      }
      if (sortBy === 'service_asc') {
        return (a.service || '').localeCompare(b.service || '');
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
  }, [clients, categoryFilter, statusFilter, serviceFilter, searchTerm, sortBy]);

  const deleteClientMutation = useDeleteClient();
  const updateClientMutation = useUpdateClient();

  const activeClients = clients.filter((client) => client.status === 'Active').length;
  const prospectClients = clients.filter((client) => client.status === 'Prospect').length;
  const totalMrr = clients
    .filter((c) => c.status === 'Active')
    .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0);

  const columns = [
    {
      key: 'name',
      label: 'Client / Company',
      render: (row) => {
        const theme = getCategoryTheme(row.service);
        const CatIcon = theme.icon || Building2;
        return (
          <div className="min-w-0 flex items-start gap-2.5">
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${theme.badgeClass}`}>
              <CatIcon size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs hover:text-primary transition-colors cursor-pointer">
                {row.name}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                {row.company || row.email || 'No company specified'}
              </div>
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
          <div className="text-muted-foreground">{row.email || '—'}</div>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Primary Service',
      render: (row) => {
        const theme = getCategoryTheme(row.service);
        const CatIcon = theme.icon || Briefcase;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${theme.badgeClass}`}>
            <CatIcon size={11} />
            <span>{row.service || 'General Retainer'}</span>
          </span>
        );
      },
    },
    {
      key: 'monthlyRetainer',
      label: 'Monthly Retainer',
      render: (row) => (
        <span className="font-bold text-xs text-emerald-600">
          {row.monthlyRetainer ? formatINR(row.monthlyRetainer) : '—'}
        </span>
      ),
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
            setShowAddModal(true);
          }}
          className="bg-primary text-primary-foreground font-bold shadow-sm"
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
                {/* Category Dropdown Filter */}
                <SelectDropdown
                  className="w-44 text-xs"
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val || 'all')}
                  options={CLIENT_CATEGORY_PILLS.map((p) => ({ value: p.key, label: p.label }))}
                  allOptionLabel="All Categories"
                />
                <SelectDropdown
                  className="w-40 text-xs"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={['Active', 'Prospect', 'Inactive', 'Churned', 'Renew']}
                  allOptionLabel="All Statuses"
                />
                <SelectDropdown
                  className="w-44 text-xs"
                  value={serviceFilter}
                  onChange={(val) => setServiceFilter(val)}
                  options={['Social Media', 'Website', 'Branding', 'SEO', 'Ads', 'Video Editing', 'Content Creation', 'Custom']}
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

          {/* Board View (Kanban by Client Status) */}
          {(currentView === 'board' || currentView === 'kanban') && (
            <div className="space-y-3.5 w-full">
              {/* Category Color Definition Guide */}
              <CategoryColorLegend
                selectedCategory={categoryFilter}
                onSelectCategory={setCategoryFilter}
                title="Client Service Color Code Index"
                description="Card left-border accent indicates client service retainer (click any color pill to filter)"
              />

              <div ref={clientsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                {STATUS_COLUMNS.map((status) => {
                  const statusClients = displayedClients.filter((c) => (c.status || 'Prospect') === status);
                  const isColActive = dragOverStatus === status;

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
                      className={`flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-2xl border transition-all p-3 space-y-3 w-full ${
                        isColActive
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border/80 bg-secondary/15'
                      }`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-card border border-border text-foreground shadow-xs">
                          {statusClients.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar pr-0.5 flex-1">
                        {statusClients.map((client, idx) => {
                          const isBeingDragged = draggingClientId === client._id;
                          const showDropIndicatorBefore = isColActive && dragOverClientIndex === idx && !isBeingDragged;
                          const theme = getCategoryTheme(client.service);
                          const CatIcon = theme.icon || Briefcase;

                          return (
                            <React.Fragment key={client._id}>
                              {showDropIndicatorBefore && (
                                <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
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
                                className={`p-3.5 bg-card rounded-xl border border-border hover:border-primary/40 border-l-[4px] ${theme.accentBorder} transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shadow-xs ${
                                  isBeingDragged ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40' : 'hover:shadow-md hover:-translate-y-0.5'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                    {client.name}
                                  </h4>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {client.monthlyRetainer ? (
                                      <span className="text-[11px] font-black text-emerald-600">
                                        {formatINR(client.monthlyRetainer)}
                                      </span>
                                    ) : null}
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

                                <p className="text-[11px] text-muted-foreground truncate">
                                  {client.company || client.email || 'No company specified'}
                                </p>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${theme.badgeClass}`}>
                                    <CatIcon size={10} />
                                    <span>{client.service || 'Retainer'}</span>
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} className="text-muted-foreground/70 shrink-0" />
                                    <span>
                                      {client.createdAt
                                        ? new Date(client.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
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
                          <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
                        )}

                        {statusClients.length === 0 && (
                          <div className={`p-8 text-center text-xs border border-dashed rounded-xl transition-all ${
                            isColActive ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/60 text-muted-foreground'
                          }`}>
                            {isColActive ? `Drop here to set status to ${status}` : `No ${status} clients`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </DatabaseView>
      </div>

      <AddClientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        client={selectedClient}
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
