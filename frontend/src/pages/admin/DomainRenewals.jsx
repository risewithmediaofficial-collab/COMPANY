import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Globe2, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
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
import { DataTable } from '../../components/ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, SectionCard, StatusBadge } from '../../components/ui/page';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';

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

const toneByStatus = {
  active: 'success',
  pending: 'warning',
  renewed: 'info',
  expired: 'danger',
};

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
  }, [open, record]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      id: record?._id,
      data: {
        itemName: form.itemName.trim(),
        itemType: form.itemType,
        domainName: form.domainName.trim(),
        provider: form.provider.trim(),
        clientId: form.clientId === 'all' ? null : form.clientId,
        projectId: form.projectId === 'all' ? null : form.projectId,
        purchaseDate: form.purchaseDate || null,
        expiryDate: form.expiryDate,
        renewalCost: Number(form.renewalCost) || 0,
        status: form.status,
        notes: form.notes.trim(),
        progressNote: form.progressNote.trim(),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Renewal Record' : 'Add Renewal Record'}</DialogTitle>
          <DialogDescription>
            Track what was purchased, when it expires, and any progress or renewal notes the team should remember.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium md:col-span-2">
            <span>Item name</span>
            <Input value={form.itemName} onChange={(event) => updateField('itemName', event.target.value)} placeholder="Example: acme.com renewal" required />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Type</span>
            <select value={form.itemType} onChange={(event) => updateField('itemType', event.target.value)} className="app-input">
              {renewalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Status</span>
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className="app-input">
              {renewalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Domain / item</span>
            <Input value={form.domainName} onChange={(event) => updateField('domainName', event.target.value)} placeholder="acme.com" />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Provider</span>
            <Input value={form.provider} onChange={(event) => updateField('provider', event.target.value)} placeholder="GoDaddy, Hostinger, Google..." />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Client</span>
            <select value={form.clientId} onChange={(event) => updateField('clientId', event.target.value)} className="app-input">
              <option value="all">No client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.company || client.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Project</span>
            <select value={form.projectId} onChange={(event) => updateField('projectId', event.target.value)} className="app-input">
              <option value="all">No project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Purchase date</span>
            <Input type="date" value={form.purchaseDate} onChange={(event) => updateField('purchaseDate', event.target.value)} />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Expiry date</span>
            <Input type="date" value={form.expiryDate} onChange={(event) => updateField('expiryDate', event.target.value)} required />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Renewal cost</span>
            <Input type="number" min="0" value={form.renewalCost} onChange={(event) => updateField('renewalCost', event.target.value)} placeholder="0" />
          </label>

          <label className="space-y-1.5 text-sm font-medium md:col-span-2">
            <span>Notes</span>
            <Textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Purchase details, renewal owner, account reminders..." />
          </label>

          <label className="space-y-1.5 text-sm font-medium md:col-span-2">
            <span>Initial progress note</span>
            <Textarea value={form.progressNote} onChange={(event) => updateField('progressNote', event.target.value)} placeholder="Optional: record what happened on this date." />
          </label>

          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : record ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ProgressDialog = ({ open, onOpenChange, record, onSubmit, saving }) => {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (!open) return;
    setNote('');
    setStatus(record?.status || 'active');
  }, [open, record]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({ note: note.trim(), status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Renewal Progress</DialogTitle>
          <DialogDescription>
            Save today&apos;s update so the team can track renewal follow-up and ownership.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="app-input">
              {renewalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Progress note</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Renewal invoice requested, waiting for OTP, payment completed..." />
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !note.trim()}>
              {saving ? 'Saving...' : 'Add Progress'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DomainRenewals = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { isDateInRange } = useDateFilter();
  const { data, isLoading } = useDomainRenewals({ search, status, itemType });
  const createRecord = useCreateDomainRenewal();
  const updateRecord = useUpdateDomainRenewal();
  const addProgress = useAddDomainRenewalProgress();
  const deleteRecord = useDeleteDomainRenewal();

  const records = useMemo(
    () => (data?.records || []).filter((r) => isDateInRange(r.expiryDate || r.purchaseDate || r.createdAt)),
    [data, isDateInRange],
  );
  const metrics = data?.metrics || { total: 0, expired: 0, expiringSoon: 0, renewed: 0 };

  const columns = useMemo(() => ([
    {
      key: 'itemName',
      label: 'Item',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.itemName}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.domainName || row.provider || 'No domain/provider added'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client / Project',
      render: (row) => `${row.clientId?.company || row.clientId?.name || 'No client'}${row.projectId?.name ? ` • ${row.projectId.name}` : ''}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge tone={toneByStatus[row.status] || 'neutral'}>{row.status}</StatusBadge>,
    },
    {
      key: 'purchaseDate',
      label: 'Bought',
      render: (row) => formatDate(row.purchaseDate),
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{formatDate(row.expiryDate)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {row.daysUntilExpiry < 0 ? 'Expired' : `${row.daysUntilExpiry} days left`}
          </div>
        </div>
      ),
    },
  ]), []);

  const handleSave = async ({ id, data: payload }) => {
    if (id) {
      await updateRecord.mutateAsync({ id, data: payload });
      return;
    }
    await createRecord.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewal Tracker"
        description="Store purchase dates, expiry dates, progress notes, and get reminder coverage during the last seven days before expiry."
        actions={(
          <Button onClick={() => { setSelectedRecord(null); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Add Renewal
          </Button>
        )}
      >
        <MetricGrid>
          <MetricCard label="Tracked Items" value={metrics.total} helper="All visible renewal records" icon={Globe2} tone="primary" />
          <MetricCard label="Expiring in 7 Days" value={metrics.expiringSoon} helper="Daily reminders will be sent" icon={CalendarClock} tone="warning" />
          <MetricCard label="Expired" value={metrics.expired} helper="Needs immediate attention" icon={ShieldAlert} tone={metrics.expired > 0 ? 'danger' : 'neutral'} />
          <MetricCard label="Renewed" value={metrics.renewed} helper="Already processed" icon={RefreshCw} tone="success" />
        </MetricGrid>

        <DateRangePicker title="Domain Renewals Date Filter (From Date to To Date)" className="mt-4" />
      </PageHeader>

      <PageToolbar>
        <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, domain, provider, or notes..." />
        <select value={itemType} onChange={(event) => setItemType(event.target.value)} className="app-input w-full sm:w-auto sm:min-w-[150px] lg:w-52">
          <option value="all" onClick={() => setItemType('all')}>All types</option>
          {renewalTypeOptions.map((option) => (
            <option key={option.value} value={option.value} onClick={() => { if (itemType === option.value) setItemType('all'); }}>{option.label}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="app-input w-full sm:w-auto sm:min-w-[150px] lg:w-52">
          <option value="all" onClick={() => setStatus('all')}>All statuses</option>
          {renewalStatusOptions.map((option) => (
            <option key={option.value} value={option.value} onClick={() => { if (status === option.value) setStatus('all'); }}>{option.label}</option>
          ))}
        </select>
      </PageToolbar>

      <SectionCard
        title="Renewal Records"
        description="Open a record to edit expiry details or add dated progress notes for the team."
        action={<span className="app-pill">{records.length} records</span>}
      >
        <DataTable
          data={records}
          columns={columns}
          loading={isLoading}
          onView={(row) => {
            setSelectedRecord(row);
            setProgressOpen(true);
          }}
          onEdit={(row) => {
            setSelectedRecord(row);
            setFormOpen(true);
          }}
          onDelete={(id) => {
            if (window.confirm('Delete this renewal record?')) {
              deleteRecord.mutate(id);
            }
          }}
          emptyTitle="No renewal records yet"
          emptyDescription="Add domains, hosting plans, subscriptions, and anything else that has a purchase and expiry cycle."
          emptyAction={(
            <Button onClick={() => { setSelectedRecord(null); setFormOpen(true); }}>
              <Plus size={16} className="mr-2" />
              Add First Record
            </Button>
          )}
        />
      </SectionCard>

      {selectedRecord ? (
        <SectionCard
          title={`${selectedRecord.itemName} progress`}
          description="Latest notes for this renewal record."
        >
          <div className="space-y-3">
            {(selectedRecord.progressNotes || []).length ? (
              selectedRecord.progressNotes.slice().reverse().map((entry) => (
                <div key={entry._id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge tone={toneByStatus[entry.status] || 'neutral'}>{entry.status}</StatusBadge>
                    <p className="text-xs text-muted-foreground">
                      {entry.createdBy?.name || 'Team'} • {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{entry.note}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                No progress notes saved yet for this record.
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}

      <RenewalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={selectedRecord}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        saving={createRecord.isPending || updateRecord.isPending}
      />

      <ProgressDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        record={selectedRecord}
        saving={addProgress.isPending}
        onSubmit={(payload) => addProgress.mutateAsync({ id: selectedRecord._id, data: payload })}
      />
    </div>
  );
};

export default DomainRenewals;
