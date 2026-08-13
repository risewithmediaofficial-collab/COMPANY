import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, IndianRupee, Plus, Users } from 'lucide-react';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { formatINR } from '../../utils/currency';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { MetricCard, MetricGrid, PageHeader, SearchField, StatusBadge } from '../../components/ui/page';
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

const Clients = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
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

  const activeClients = clients.filter((client) => client.status === 'Active').length;
  const prospectClients = clients.filter((client) => client.status === 'Prospect').length;

  const columns = [
    {
      key: 'name',
      label: 'Client / Company',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.company || row.email || 'No company info'}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact Info',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{row.phone || 'No phone'}</div>
          <div className="text-muted-foreground">{row.email || 'No email'}</div>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      render: (row) => <span className="font-medium text-xs">{row.service || 'General'}</span>,
    },
    {
      key: 'monthlyRetainer',
      label: 'Monthly Retainer',
      render: (row) => (
        <span className="font-bold text-emerald-600">
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
    <div className="space-y-6">
      <PageHeader
        title="Client Operations"
        description="Track contacts, commercial value, and lifecycle status in one cleaner operational view."
      >
        <MetricGrid>
          <MetricCard label="Client Records" value={clients.length} helper="Visible in the current search scope" icon={Users} tone="info" />
          <MetricCard label="Active Accounts" value={activeClients} helper="Clients currently in service" icon={Building2} tone="success" />
          <MetricCard label="Prospects" value={prospectClients} helper="Warm opportunities still being nurtured" icon={Briefcase} tone="warning" />
        </MetricGrid>
        <DateRangePicker title="Filter Clients (From Date to To Date)" className="mt-4" />
        <div className="mt-5 pt-5 border-t border-border flex flex-wrap items-center gap-2">
          <SearchField
            className="w-full sm:w-auto sm:min-w-[240px]"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, phone, or company..."
          />
          <SelectDropdown
            className="w-full sm:w-auto sm:w-44"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={['Active', 'Prospect', 'Inactive', 'Churned', 'Renew']}
            allOptionLabel="All statuses"
          />
          <SelectDropdown
            className="w-full sm:w-auto sm:w-44"
            value={serviceFilter}
            onChange={(val) => setServiceFilter(val)}
            options={['Social Media', 'Website', 'Branding', 'SEO', 'Ads', 'Video Editing', 'Content Creation', 'Custom']}
            allOptionLabel="All services"
          />
          <input type="date" className="app-input h-10 text-xs w-full sm:w-auto sm:min-w-[140px]" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
          <input type="date" className="app-input h-10 text-xs w-full sm:w-auto sm:min-w-[140px]" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
          <div className="app-pill text-xs">{clients.length} clients</div>
          <Button
            size="sm"
            className="ml-auto w-full sm:w-auto"
            onClick={() => {
              setSelectedClient(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Add Client
          </Button>
        </div>
      </PageHeader>

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
        emptyDescription="Try a broader search or create a new client to start building the relationship database."
      />

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
    </div>
  );
};

export default Clients;
