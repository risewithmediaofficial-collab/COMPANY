import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, IndianRupee, Plus, Users } from 'lucide-react';
import { useClients, useDeleteClient } from '../../hooks/useClients';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { MetricCard, MetricGrid, PageHeader, SearchField, StatusBadge } from '../../components/ui/page';
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
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(serviceFilter ? { service: serviceFilter } : {}),
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdTo ? { createdTo } : {}),
  };

  const { data: clients = [], isLoading } = useClients(filters);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setServiceFilter('');
    setCreatedFrom('');
    setCreatedTo('');
  };
  const deleteClientMutation = useDeleteClient();

  const activeClients = clients.filter((client) => client.status === 'Active').length;
  const prospectClients = clients.filter((client) => client.status === 'Prospect').length;

  const columns = [
    {
      key: 'name',
      label: 'Contact',
      render: (row) => (
        <div className="min-w-0">
          <Link to={`/clients/${row._id}`} className="font-semibold transition-colors hover:text-primary">
            {row.name}
          </Link>
          <div className="mt-1 text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <span className="font-medium text-foreground">{row.company || 'Independent client'}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.phone || 'Not added',
    },
    {
      key: 'industry',
      label: 'Type / Sector',
      render: (row) => row.industry || 'Not set',
    },
    {
      key: 'services',
      label: 'Requirements',
      render: (row) => (
        <div className="flex max-w-[240px] flex-wrap gap-1">
          {(row.services || []).slice(0, 3).map((service) => (
            <span key={service} className="app-pill">{service}</span>
          ))}
          {(row.services || []).length > 3 ? (
            <span className="app-pill">+{row.services.length - 3}</span>
          ) : null}
          {(!row.services || row.services.length === 0) ? 'Not set' : null}
        </div>
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
