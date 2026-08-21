import React, { Fragment, useState } from 'react';
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
} from 'lucide-react';
import { useClients, useDeleteClient, useUpdateClient } from '../../hooks/useClients';
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

const Clients = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [draggingClientId, setDraggingClientId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverClientIndex, setDragOverClientIndex] = useState(null);
  const { startDate, endDate, isDateInRange } = useDateFilter();

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(serviceFilter ? { service: serviceFilter } : {}),
    ...(startDate ? { createdFrom: startDate } : {}),
    ...(endDate ? { createdTo: endDate } : {}),
  };

  const { data: rawClients = [], isLoading } = useClients(filters);
  const clients = rawClients.filter((c) => isDateInRange(c.createdAt));

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setServiceFilter('');
  };
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
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground text-xs hover:text-primary transition-colors">
            {row.name}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {row.company || row.email || 'No company specified'}
          </div>
        </div>
      ),
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
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary/80 text-[11px] font-medium text-foreground">
          {row.service || 'General Retainer'}
        </span>
      ),
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
      {/* Notion-Style Multi-View Database Engine */}
      <DatabaseView
        activeView={currentView}
        onViewChange={setCurrentView}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        totalCount={clients.length}
        filters={
          <div className="flex items-center gap-2">
            <SelectDropdown
              className="w-36 text-xs"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={['Active', 'Prospect', 'Inactive', 'Churned', 'Renew']}
              allOptionLabel="All statuses"
            />
            <SelectDropdown
              className="w-36 text-xs"
              value={serviceFilter}
              onChange={(val) => setServiceFilter(val)}
              options={['Social Media', 'Website', 'Branding', 'SEO', 'Ads', 'Video Editing', 'Content Creation', 'Custom']}
              allOptionLabel="All services"
            />
          </div>
        }
      >
        {/* Table View */}
        {currentView === 'table' && (
          <DataTable
            data={clients}
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
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid w-max min-w-full auto-cols-[minmax(280px,320px)] grid-flow-col gap-4">
              {STATUS_COLUMNS.map((status) => {
                const statusClients = clients.filter((c) => (c.status || 'Prospect') === status);
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
                    className={`flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-2xl border transition-all p-3 space-y-3 ${
                      isColActive
                        ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                        : 'border-border/80 bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                        {statusClients.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar pr-0.5 flex-1">
                      {statusClients.map((client, idx) => {
                        const isBeingDragged = draggingClientId === client._id;
                        const showDropIndicatorBefore = isColActive && dragOverClientIndex === idx && !isBeingDragged;

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
                              className={`p-3.5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing space-y-2 group shadow-sm ${
                                isBeingDragged ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40' : 'hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                  {client.name}
                                </h4>
                                {client.monthlyRetainer ? (
                                  <span className="text-[11px] font-bold text-emerald-600">
                                    {formatINR(client.monthlyRetainer)}
                                  </span>
                                ) : null}
                              </div>

                              <p className="text-[11px] text-muted-foreground truncate">
                                {client.company || client.email || 'No company'}
                              </p>

                              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                <span>{client.service || 'Retainer'}</span>
                                <span className="group-hover:text-primary flex items-center gap-0.5">
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
        )}
      </DatabaseView>

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
