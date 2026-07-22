import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MessageSquareText, PhoneCall, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import {
  useClientFollowups,
  useCreateClientFollowup,
  useDeleteClientFollowup,
  useUpdateClientFollowup,
} from '../../hooks/useClientFollowups';

const emptyForm = {
  client: '',
  project: '',
  type: 'call',
  status: 'open',
  priority: 'medium',
  contactPerson: '',
  subject: '',
  summary: '',
  discussionNotes: '',
  outcome: '',
  meetingDate: '',
  nextFollowUpDate: '',
  nextAction: '',
};

const statusTone = {
  open: 'warning',
  completed: 'success',
  waiting: 'info',
  cancelled: 'danger',
};

const priorityTone = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const labelize = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const Field = ({ label, children }) => (
  <label className="space-y-1.5 text-sm font-medium text-foreground">
    <span>{label}</span>
    {children}
  </label>
);

const FollowupDialog = ({ open, onOpenChange, followup, clients, projects, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const clientProjects = form.client
    ? projects.filter((project) => project.client?._id === form.client || project.client === form.client)
    : projects;

  useEffect(() => {
    if (!open) return;
    setForm({
      client: followup?.client?._id || followup?.client || '',
      project: followup?.project?._id || followup?.project || '',
      type: followup?.type || 'call',
      status: followup?.status || 'open',
      priority: followup?.priority || 'medium',
      contactPerson: followup?.contactPerson || '',
      subject: followup?.subject || '',
      summary: followup?.summary || '',
      discussionNotes: followup?.discussionNotes || '',
      outcome: followup?.outcome || '',
      meetingDate: followup?.meetingDate ? followup.meetingDate.slice(0, 10) : '',
      nextFollowUpDate: followup?.nextFollowUpDate ? followup.nextFollowUpDate.slice(0, 10) : '',
      nextAction: followup?.nextAction || '',
    });
  }, [followup, open]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      project: form.project || undefined,
      meetingDate: form.meetingDate || undefined,
      nextFollowUpDate: form.nextFollowUpDate || undefined,
    };
    await onSave({ id: followup?._id, data: payload });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{followup ? 'Edit Client Follow-up' : 'Add Client Follow-up'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Client">
            <select
              value={form.client}
              onChange={(event) => {
                updateField('client', event.target.value);
                updateField('project', '');
              }}
              className="app-input"
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.company || client.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Project">
            <select value={form.project} onChange={(event) => updateField('project', event.target.value)} className="app-input">
              <option value="">No linked project</option>
              {clientProjects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select value={form.type} onChange={(event) => updateField('type', event.target.value)} className="app-input">
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="review">Review</option>
              <option value="other">Other</option>
            </select>
            {form.type === 'other' && (
              <input
                type="text"
                placeholder="Specify type..."
                className="app-input mt-1"
                value={form.customType || ''}
                onChange={(e) => updateField('customType', e.target.value)}
              />
            )}
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className="app-input">
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="waiting">Waiting</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>

          <Field label="Contact Person">
            <Input value={form.contactPerson} onChange={(event) => updateField('contactPerson', event.target.value)} placeholder="Client contact name" />
          </Field>

          <Field label="Priority">
            <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)} className="app-input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>

          <Field label="Subject">
            <Input value={form.subject} onChange={(event) => updateField('subject', event.target.value)} placeholder="Call / meeting topic" required />
          </Field>

          <Field label="Meeting Date">
            <Input type="date" value={form.meetingDate} onChange={(event) => updateField('meetingDate', event.target.value)} />
          </Field>

          <Field label="Next Follow-up Date">
            <Input type="date" value={form.nextFollowUpDate} onChange={(event) => updateField('nextFollowUpDate', event.target.value)} />
          </Field>

          <Field label="Next Action">
            <Input value={form.nextAction} onChange={(event) => updateField('nextAction', event.target.value)} placeholder="Send proposal, schedule review..." />
          </Field>

          <Field label="What Was Spoken">
            <Textarea value={form.discussionNotes} onChange={(event) => updateField('discussionNotes', event.target.value)} placeholder="Detailed discussion points" />
          </Field>

          <Field label="Outcome / Summary">
            <Textarea value={form.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Meeting result, client requirement, blockers" />
          </Field>

          <Field label="Decision / Outcome">
            <Textarea value={form.outcome} onChange={(event) => updateField('outcome', event.target.value)} placeholder="Approved, waiting, changes requested..." />
          </Field>

          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Follow-up'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ClientFollowups = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: followups = [], isLoading } = useClientFollowups({ search: searchTerm, status: statusFilter, due: dueFilter });
  const createFollowup = useCreateClientFollowup();
  const updateFollowup = useUpdateClientFollowup();
  const deleteFollowup = useDeleteClientFollowup();

  const metrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return {
      total: followups.length,
      open: followups.filter((item) => item.status === 'open').length,
      today: followups.filter((item) => item.nextFollowUpDate && new Date(item.nextFollowUpDate) >= todayStart && new Date(item.nextFollowUpDate) <= todayEnd).length,
      completed: followups.filter((item) => item.status === 'completed').length,
    };
  }, [followups]);

  const columns = [
    {
      key: 'subject',
      label: 'Follow-up',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.subject}</div>
          <div className="mt-1 text-xs text-muted-foreground">{labelize(row.type)} - {row.contactPerson || 'No contact'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => (
        <div>
          <div className="font-medium">{row.client?.company || row.client?.name || 'Unknown'}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.project?.name || 'No project'}</div>
        </div>
      ),
    },
    {
      key: 'nextFollowUpDate',
      label: 'Next Date',
      render: (row) => formatDate(row.nextFollowUpDate),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge tone={statusTone[row.status] || 'neutral'}>{labelize(row.status)}</StatusBadge>,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <StatusBadge tone={priorityTone[row.priority] || 'neutral'}>{labelize(row.priority)}</StatusBadge>,
    },
    {
      key: 'nextAction',
      label: 'Next Action',
      render: (row) => row.nextAction || 'Not set',
    },
  ];

  const handleSave = async ({ id, data }) => {
    if (id) {
      await updateFollowup.mutateAsync({ id, data });
    } else {
      await createFollowup.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Follow-ups"
        actions={(
          <Button onClick={() => {
            setSelectedFollowup(null);
            setFormOpen(true);
          }}>
            <Plus size={16} className="mr-2" />
            Add Follow-up
          </Button>
        )}
      >
        <MetricGrid>
          <MetricCard label="Total" value={metrics.total} icon={MessageSquareText} tone="primary" />
          <MetricCard label="Open" value={metrics.open} icon={PhoneCall} tone="warning" />
          <MetricCard label="Today" value={metrics.today} icon={CalendarClock} tone="info" />
          <MetricCard label="Completed" value={metrics.completed} icon={CheckCircle2} tone="success" />
        </MetricGrid>
      </PageHeader>

      <PageToolbar>
        <SearchField value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search clients, notes, outcomes..." />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="app-input w-full sm:w-auto sm:min-w-[150px] lg:w-48">
          <option value="" onClick={() => setStatusFilter('')}>All statuses</option>
          <option value="open" onClick={() => { if (statusFilter === 'open') setStatusFilter(''); }}>Open</option>
          <option value="completed" onClick={() => { if (statusFilter === 'completed') setStatusFilter(''); }}>Completed</option>
          <option value="waiting" onClick={() => { if (statusFilter === 'waiting') setStatusFilter(''); }}>Waiting</option>
          <option value="cancelled" onClick={() => { if (statusFilter === 'cancelled') setStatusFilter(''); }}>Cancelled</option>
        </select>
        <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)} className="app-input w-full sm:w-auto sm:min-w-[150px] lg:w-48">
          <option value="" onClick={() => setDueFilter('')}>All dates</option>
          <option value="today" onClick={() => { if (dueFilter === 'today') setDueFilter(''); }}>Today</option>
          <option value="overdue" onClick={() => { if (dueFilter === 'overdue') setDueFilter(''); }}>Overdue</option>
          <option value="upcoming" onClick={() => { if (dueFilter === 'upcoming') setDueFilter(''); }}>Upcoming</option>
        </select>
      </PageToolbar>

      <DataTable
        data={followups}
        columns={columns}
        loading={isLoading}
        onRowClick={(followup) => {
          setSelectedFollowup(followup);
          setFormOpen(true);
        }}
        onEdit={(followup) => {
          setSelectedFollowup(followup);
          setFormOpen(true);
        }}
        onDelete={(id) => {
          if (window.confirm('Delete this client follow-up?')) deleteFollowup.mutate(id);
        }}
        emptyTitle="No client follow-ups"
      />

      <FollowupDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        followup={selectedFollowup}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        saving={createFollowup.isPending || updateFollowup.isPending}
      />
    </div>
  );
};

export default ClientFollowups;
