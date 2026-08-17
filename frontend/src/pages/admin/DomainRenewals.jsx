import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Globe2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Search,
  Server,
  ShieldCheck,
  IndianRupee,
  ExternalLink,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  Clock,
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import {
  renewalStatusOptions,
  renewalTypeOptions,
  useAddDomainRenewalProgress,
  useCreateDomainRenewal,
  useDeleteDomainRenewal,
  useDomainRenewals,
  useUpdateDomainRenewal,
} from '../../hooks/useDomainRenewals';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
import { formatINR } from '../../utils/currency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const emptyForm = {
  itemName: '',
  itemType: 'domain',
  domainName: '',
  provider: '',
  clientId: 'all',
  projectId: 'all',
  purchaseDate: '',
  expiryDate: '',
  renewalCost: '',
  status: 'active',
  notes: '',
  progressNote: '',
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const getRemainingDays = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const exp = new Date(expiryDate);
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
};

const toneByStatus = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  renewed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  expired: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const FormField = ({ label, children }) => (
  <label className="space-y-1.5 text-xs font-semibold text-foreground block">
    <span>{label}</span>
    {children}
  </label>
);

const RenewalFormDialog = ({ open, onOpenChange, record, clients, projects, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      itemName: record?.itemName || '',
      itemType: record?.itemType || 'domain',
      domainName: record?.domainName || '',
      provider: record?.provider || '',
      clientId: record?.clientId?._id || record?.clientId || 'all',
      projectId: record?.projectId?._id || record?.projectId || 'all',
      purchaseDate: record?.purchaseDate ? record.purchaseDate.slice(0, 10) : '',
      expiryDate: record?.expiryDate ? record.expiryDate.slice(0, 10) : '',
      renewalCost: record?.renewalCost || '',
      status: record?.status || 'active',
      notes: record?.notes || '',
      progressNote: '',
    });
  }, [record, open]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      clientId: form.clientId === 'all' ? undefined : form.clientId,
      projectId: form.projectId === 'all' ? undefined : form.projectId,
      purchaseDate: form.purchaseDate || undefined,
      expiryDate: form.expiryDate || undefined,
      renewalCost: form.renewalCost ? Number(form.renewalCost) : 0,
    };
    await onSave({ id: record?._id, data: payload });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-black text-foreground">
            {record ? 'Edit Domain / Renewal Asset' : 'Add Domain / Hosting Asset'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Track registrar expiration dates and prevent website downtime for clients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Asset / Domain Name *">
              <Input
                value={form.itemName}
                onChange={(e) => updateField('itemName', e.target.value)}
                placeholder="e.g. risewithmedia.com, Client AWS Hosting"
                required
                className="h-9 text-xs rounded-xl"
              />
            </FormField>

            <FormField label="Asset Type *">
              <select
                value={form.itemType}
                onChange={(e) => updateField('itemType', e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
              >
                {renewalTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Linked Client">
              <select
                value={form.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
              >
                <option value="all">None / Internal</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.company || c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Registrar / Provider">
              <Input
                value={form.provider}
                onChange={(e) => updateField('provider', e.target.value)}
                placeholder="e.g. GoDaddy, Hostinger, AWS, Namecheap"
                className="h-9 text-xs rounded-xl"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Expiry Date *">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                required
                className="h-9 text-xs rounded-xl"
              />
            </FormField>

            <FormField label="Renewal Cost (₹)">
              <Input
                type="number"
                value={form.renewalCost}
                onChange={(e) => updateField('renewalCost', e.target.value)}
                placeholder="₹ Amount"
                className="h-9 text-xs rounded-xl"
              />
            </FormField>

            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
              >
                {renewalStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Notes & Access Details">
            <Textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Auto-renewal enabled, primary billing card info..."
              rows={2}
              className="text-xs rounded-xl"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="rounded-xl text-xs font-bold">
              {saving ? 'Saving...' : record ? 'Save Changes' : 'Track Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DomainRenewals() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: renewals = [], isLoading } = useDomainRenewals();
  const createMutation = useCreateDomainRenewal();
  const updateMutation = useUpdateDomainRenewal();
  const deleteMutation = useDeleteDomainRenewal();

  const handleSave = async ({ id, data }) => {
    if (id) {
      await updateMutation.mutateAsync({ id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const filteredRenewals = useMemo(() => {
    return renewals.filter((item) => {
      const q = search.toLowerCase();
      const name = (item.itemName || '').toLowerCase();
      const client = (item.clientId?.company || item.clientId?.name || '').toLowerCase();
      const provider = (item.provider || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || client.includes(q) || provider.includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.itemType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [renewals, search, statusFilter, typeFilter]);

  // Statistics
  const total = renewals.length;
  const activeCount = renewals.filter((r) => r.status === 'active').length;
  const expiringSoonCount = renewals.filter((r) => {
    const days = getRemainingDays(r.expiryDate);
    return days !== null && days <= 30 && days >= 0 && r.status !== 'renewed';
  }).length;
  const totalCost = renewals.reduce((sum, r) => sum + (Number(r.renewalCost) || 0), 0);

  // Table Columns
  const tableColumns = [
    {
      key: 'itemName',
      label: 'Domain / Asset',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {item.itemType === 'hosting' ? <Server size={14} /> : <Globe2 size={14} />}
          </div>
          <div>
            <p className="font-bold text-foreground">{item.itemName}</p>
            <p className="text-[11px] text-muted-foreground">🏢 {item.clientId?.company || item.clientId?.name || 'Internal'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Registrar / Host',
      render: (item) => (
        <span className="font-semibold text-xs text-foreground">{item.provider || '—'}</span>
      ),
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      render: (item) => {
        const days = getRemainingDays(item.expiryDate);
        return (
          <div className="text-xs">
            <p className="font-semibold text-foreground">{formatDate(item.expiryDate)}</p>
            {days !== null && (
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                  days < 0
                    ? 'bg-rose-500/10 text-rose-600'
                    : days <= 15
                    ? 'bg-rose-500/10 text-rose-600'
                    : days <= 30
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-emerald-500/10 text-emerald-600'
                }`}
              >
                {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days remaining`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'renewalCost',
      label: 'Renewal Fee',
      render: (item) => (
        <span className="font-bold text-xs text-foreground">
          {item.renewalCost ? formatINR(item.renewalCost) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${toneByStatus[item.status] || toneByStatus.active}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedRecord(item);
              setOpenDialog(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards View
  const renderCard = (item) => {
    const days = getRemainingDays(item.expiryDate);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary uppercase tracking-wider">
            {item.itemType}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${toneByStatus[item.status] || toneByStatus.active}`}>
            {item.status}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-sm text-foreground">{item.itemName}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">🏢 {item.clientId?.company || item.clientId?.name || 'Internal'}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-semibold text-foreground">{item.provider || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires:</span>
            <span className="font-semibold text-foreground">{formatDate(item.expiryDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Cost:</span>
            <span className="font-bold text-foreground">{item.renewalCost ? formatINR(item.renewalCost) : '—'}</span>
          </div>
        </div>

        {days !== null && days <= 30 && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
            <AlertTriangle size={13} />
            <span>Expires in {days} days! Action required.</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Business & Finance', 'Domain & Hosting Renewals']}
      title="Domain & Hosting Renewals"
      subtitle="Track client domains, hosting packages, SSL certificates, recurring renewals, and expiry alerts."
      icon="🌐"
      properties={[
        { label: 'Total Tracked', value: total, icon: Globe2 },
        { label: 'Expiring Soon (30d)', value: expiringSoonCount, tone: expiringSoonCount > 0 ? 'danger' : 'neutral' },
        { label: 'Active Services', value: activeCount, tone: 'success' },
        { label: 'Total Annual Value', value: formatINR(totalCost), tone: 'info' },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedRecord(null);
            setOpenDialog(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Asset</span>
        </Button>
      }
    >
      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {['all', 'active', 'pending', 'renewed', 'expired'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {st === 'all' ? 'All Statuses' : st}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_renewals_view_v1"
        views={['table', 'cards']}
        items={filteredRenewals}
        totalCount={filteredRenewals.length}
        searchPlaceholder="Search by asset name, client, or registrar..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />

      <RenewalFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        record={selectedRecord}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Renewal Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove this asset from the renewal tracking dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
