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
  X,
} from '@/components/ui/muiIcons';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
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
  active: 'bg-secondary text-foreground ',
  pending: 'bg-muted text-foreground ',
  renewed: 'bg-primary text-primary-foreground ',
  expired: 'bg-secondary text-foreground font-black',
};

const FormField = ({ label, children }) => (
  <label className="space-y-1.5 text-sm font-semibold text-foreground block text-left">
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
              <Globe2 size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {record ? 'Edit Domain / Renewal Asset' : 'Add Domain / Hosting Asset'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Domain renewal asset form
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-[10px] font-mono font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Google Form Linear Stack */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Asset / Domain Name <span className="text-foreground">*</span>
                </label>
                <Input
                  value={form.itemName}
                  onChange={(e) => updateField('itemName', e.target.value)}
                  placeholder="e.g. risewithmedia.com, Client AWS Hosting"
                  required
                  className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Asset Type <span className="text-foreground">*</span>
                </label>
                <SelectDropdown
                  value={form.itemType}
                  onChange={(val) => updateField('itemType', val)}
                  options={renewalTypeOptions}
                  allowCustom={false}
                  allowDeselect={false}
                  placeholder="Select asset type"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Linked Client</label>
                <SelectDropdown
                  value={form.clientId}
                  onChange={(val) => updateField('clientId', val)}
                  options={[
                    { value: 'all', label: 'None / Internal' },
                    ...clients.map((c) => ({ value: c._id, label: c.company || c.name })),
                  ]}
                  allowCustom={false}
                  allowDeselect={false}
                  placeholder="Select linked client"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Registrar / Hosting Provider</label>
                <Input
                  value={form.provider}
                  onChange={(e) => updateField('provider', e.target.value)}
                  placeholder="e.g. GoDaddy, Hostinger, AWS, Namecheap"
                  className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Expiry Date <span className="text-foreground">*</span>
                </label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateField('expiryDate', e.target.value)}
                  required
                  className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Renewal Cost (₹)</label>
                <Input
                  type="number"
                  value={form.renewalCost}
                  onChange={(e) => updateField('renewalCost', e.target.value)}
                  placeholder="₹ Amount"
                  className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Status</label>
                <SelectDropdown
                  value={form.status}
                  onChange={(val) => updateField('status', val)}
                  options={renewalStatusOptions}
                  allowCustom={false}
                  allowDeselect={false}
                  placeholder="Select status"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes & Access Details</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Auto-renewal enabled, primary billing card info, credentials location..."
                  rows={3}
                  className="min-h-[100px] rounded-xl bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
            <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
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
                onClick={() => onOpenChange(false)}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-primary hover:opacity-90 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
              >
                {saving ? 'Saving...' : record ? 'Save Changes' : 'Track Asset'}
              </Button>
            </div>
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

  const renewalsList = useMemo(() => {
    return Array.isArray(renewals)
      ? renewals
      : Array.isArray(renewals?.records)
      ? renewals.records
      : [];
  }, [renewals]);

  const filteredRenewals = useMemo(() => {
    return renewalsList.filter((item) => {
      const q = search.toLowerCase();
      const name = (item.itemName || '').toLowerCase();
      const client = (item.clientId?.company || item.clientId?.name || '').toLowerCase();
      const provider = (item.provider || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || client.includes(q) || provider.includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.itemType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [renewalsList, search, statusFilter, typeFilter]);

  // Statistics
  const total = renewalsList.length;
  const activeCount = renewalsList.filter((r) => r.status === 'active').length;
  const expiringSoonCount = renewalsList.filter((r) => {
    const days = getRemainingDays(r.expiryDate);
    return days !== null && days <= 30 && days >= 0 && r.status !== 'renewed';
  }).length;
  const totalCost = renewalsList.reduce((sum, r) => sum + (Number(r.renewalCost) || 0), 0);

  // Table Columns
  const tableColumns = [
    {
      key: 'itemName',
      label: 'Domain / Asset',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-secondary text-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {item.itemType === 'hosting' ? <Server size={14} /> : <Globe2 size={14} />}
          </div>
          <div>
            <p className="font-bold text-foreground">{item.itemName}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Building2 size={11} className="shrink-0" />
              <span>{item.clientId?.company || item.clientId?.name || 'Internal'}</span>
            </p>
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
          <div className="text-xs tabular-nums">
            <p className="font-semibold text-foreground">{formatDate(item.expiryDate)}</p>
            {days !== null && (
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 tabular-nums ${
                  days < 0 || days <= 15
                    ? 'bg-primary text-primary-foreground '
                    : days <= 30
                    ? 'bg-secondary text-foreground '
                    : 'bg-secondary text-muted-foreground '
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
        <span className="font-bold text-xs text-foreground tabular-nums">
          {item.renewalCost ? formatINR(item.renewalCost) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${toneByStatus[item.status] || toneByStatus.active}`}>
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
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
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
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${toneByStatus[item.status] || toneByStatus.active}`}>
            {item.status}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-sm text-foreground">{item.itemName}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Building2 size={12} className="shrink-0" />
            <span>{item.clientId?.company || item.clientId?.name || 'Internal'}</span>
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-secondary/40 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-semibold text-foreground">{item.provider || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires:</span>
            <span className="font-semibold text-foreground tabular-nums">{formatDate(item.expiryDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Cost:</span>
            <span className="font-bold text-foreground tabular-nums">{item.renewalCost ? formatINR(item.renewalCost) : '—'}</span>
          </div>
        </div>

        {days !== null && days <= 30 && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary text-foreground text-xs font-bold tabular-nums">
            <AlertTriangle size={13} className="shrink-0" />
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
      icon={Globe2}
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
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Asset</span>
        </Button>
      }
    >
      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {['all', 'active', 'pending', 'renewed', 'expired'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap shrink-0 min-h-[36px] ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground '
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {st === 'all' ? 'All Statuses' : st}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_renewals_view_v1"
        views={['cards', 'table']}
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
        <AlertDialogContent className="bg-card ">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Renewal Asset?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
