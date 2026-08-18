import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  MessageSquareText,
  PhoneCall,
  Plus,
  Search,
  Calendar,
  Clock,
  Phone,
  Video,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
  Building2,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../utils/cn';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import {
  useClientFollowups,
  useCreateClientFollowup,
  useDeleteClientFollowup,
  useUpdateClientFollowup,
} from '../../hooks/useClientFollowups';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
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
  open: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  waiting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cancelled: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const priorityTone = {
  low: 'bg-slate-500/10 text-slate-600',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-rose-500/10 text-rose-600',
};

const typeIcons = {
  call: Phone,
  meeting: Video,
  whatsapp: MessageCircle,
  email: Mail,
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const labelize = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const Field = ({ label, required, helper, children, className }) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label className="text-[13px] font-medium text-foreground/90 flex items-center justify-between select-none">
        <span>
          {label.replace(/\s*\*/, '')}
          {(required || label.includes('*')) && <span className="text-primary ml-1 font-bold">*</span>}
        </span>
        {helper && <span className="text-[11px] text-muted-foreground font-normal">{helper}</span>}
      </label>
    )}
    {children}
  </div>
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
      <DialogContent size="lg" className="bg-card border border-border">
        <DialogHeader>
          <DialogTitle>
            <PhoneCall size={20} className="text-primary" />
            {followup ? 'Edit Client Follow-up' : 'Log New Client Touchpoint'}
          </DialogTitle>
          <DialogDescription>
            Record communication logs, meetings, notes, and action items for this client account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Client *">
              <select
                value={form.client}
                onChange={(e) => updateField('client', e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.company || c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Related Project (Optional)">
              <select
                value={form.project}
                onChange={(e) => updateField('project', e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="">None / General</option>
                {clientProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Touchpoint Channel">
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="call">Phone Call</option>
                <option value="meeting">Video / In-Person Meeting</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="waiting">Waiting for Client</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Contact Person / Stakeholder">
              <Input
                value={form.contactPerson}
                onChange={(e) => updateField('contactPerson', e.target.value)}
                placeholder="e.g. Rahul Sharma (Marketing Head)"
                className="h-10 text-sm rounded-xl px-3.5"
              />
            </Field>

            <Field label="Discussion Subject *">
              <Input
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="e.g. August Reel Plan & Retainer Review"
                required
                className="h-10 text-sm rounded-xl px-3.5"
              />
            </Field>
          </div>

          <Field label="Meeting Summary / Core Takeaway">
            <Textarea
              value={form.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              placeholder="Brief summary of what was discussed..."
              rows={2}
              className="text-sm leading-relaxed rounded-xl p-3"
            />
          </Field>

          <Field label="Detailed Notes & Feedback">
            <Textarea
              value={form.discussionNotes}
              onChange={(e) => updateField('discussionNotes', e.target.value)}
              placeholder="Detailed notes, feedback on deliverables, client expectations..."
              rows={3}
              className="text-sm leading-relaxed rounded-xl p-3"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Meeting Date">
              <Input
                type="date"
                value={form.meetingDate}
                onChange={(e) => updateField('meetingDate', e.target.value)}
                className="h-10 text-sm rounded-xl px-3.5"
              />
            </Field>

            <Field label="Next Follow-up Date">
              <Input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) => updateField('nextFollowUpDate', e.target.value)}
                className="h-10 text-sm rounded-xl px-3.5"
              />
            </Field>

            <Field label="Next Action Item">
              <Input
                value={form.nextAction}
                onChange={(e) => updateField('nextAction', e.target.value)}
                placeholder="e.g. Send revised video draft"
                className="h-10 text-sm rounded-xl px-3.5"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-sm h-10 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl text-sm font-semibold h-10 px-6">
              {saving ? 'Saving...' : followup ? 'Save Changes' : 'Log Touchpoint'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function ClientFollowups() {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: followups = [], isLoading } = useClientFollowups();
  const createMutation = useCreateClientFollowup();
  const updateMutation = useUpdateClientFollowup();
  const deleteMutation = useDeleteClientFollowup();

  const handleSave = async ({ id, data }) => {
    if (id) {
      await updateMutation.mutateAsync({ id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const filteredFollowups = useMemo(() => {
    return followups.filter((item) => {
      const q = search.toLowerCase();
      const clientName = (item.client?.company || item.client?.name || '').toLowerCase();
      const subject = (item.subject || '').toLowerCase();
      const summary = (item.summary || '').toLowerCase();
      const matchesSearch = !q || clientName.includes(q) || subject.includes(q) || summary.includes(q);
      const matchesChannel = channelFilter === 'all' || item.type === channelFilter;
      return matchesSearch && matchesChannel;
    });
  }, [followups, search, channelFilter]);

  // Statistics properties
  const total = followups.length;
  const openCount = followups.filter((f) => f.status === 'open').length;
  const waitingCount = followups.filter((f) => f.status === 'waiting').length;
  const completedCount = followups.filter((f) => f.status === 'completed').length;

  const now = new Date();
  const upcomingCount = followups.filter((f) => {
    if (!f.nextFollowUpDate || f.status === 'completed') return false;
    const d = new Date(f.nextFollowUpDate);
    const diffDays = (d - now) / 86400000;
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  // Table Columns
  const tableColumns = [
    {
      key: 'client',
      label: 'Client / Company',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {(item.client?.company || item.client?.name || 'C').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground">{item.client?.company || item.client?.name || 'Unnamed Client'}</p>
            {item.contactPerson && <p className="text-[11px] text-muted-foreground">{item.contactPerson}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Channel',
      render: (item) => {
        const Icon = typeIcons[item.type] || PhoneCall;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground capitalize">
            <Icon size={12} className="text-muted-foreground" />
            {item.type}
          </span>
        );
      },
    },
    {
      key: 'subject',
      label: 'Subject & Notes',
      render: (item) => (
        <div className="max-w-md">
          <p className="font-bold text-foreground">{item.subject}</p>
          {item.summary && <p className="text-xs text-muted-foreground line-clamp-1">{item.summary}</p>}
        </div>
      ),
    },
    {
      key: 'nextFollowUpDate',
      label: 'Next Touchpoint',
      render: (item) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground">{formatDate(item.nextFollowUpDate)}</p>
          {item.nextAction && <p className="text-[11px] text-muted-foreground line-clamp-1">👉 {item.nextAction}</p>}
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityTone[item.priority] || priorityTone.medium}`}>
          {item.priority || 'medium'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusTone[item.status] || statusTone.open}`}>
          {labelize(item.status)}
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
              setSelectedFollowup(item);
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

  // Kanban Card Renderer
  const renderKanbanCard = (item) => {
    const Icon = typeIcons[item.type] || PhoneCall;
    return (
      <div
        onClick={() => {
          setSelectedFollowup(item);
          setOpenDialog(true);
        }}
        className="space-y-2 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary uppercase tracking-wider">
            {item.type}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityTone[item.priority] || priorityTone.medium}`}>
            {item.priority}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-xs text-foreground line-clamp-1">{item.subject}</h4>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            🏢 {item.client?.company || item.client?.name || 'Unnamed Client'}
          </p>
        </div>

        {item.nextFollowUpDate && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
            <CalendarClock size={12} className="text-primary" />
            <span>Next: {formatDate(item.nextFollowUpDate)}</span>
          </div>
        )}
      </div>
    );
  };

  const kanbanColumns = [
    { key: 'open', label: 'Open Queue' },
    { key: 'waiting', label: 'Waiting for Client' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Client Lifecycle', 'Client Follow-ups']}
      title="Client Follow-ups & Touchpoints"
      subtitle="Comprehensive CRM logs of all client calls, meetings, feedback notes, and scheduled upcoming touchpoints."
      icon="📞"
      properties={[
        { label: 'Total Logs', value: total, icon: MessageSquareText },
        { label: 'Open Queue', value: openCount, tone: openCount > 0 ? 'warning' : 'neutral' },
        { label: 'Upcoming (7d)', value: upcomingCount, tone: upcomingCount > 0 ? 'info' : 'neutral' },
        { label: 'Completed', value: completedCount, tone: 'success' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedFollowup(null);
              setOpenDialog(true);
            }}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Log Touchpoint</span>
          </Button>
        </div>
      }
    >
      {/* Channel Quick Filter Bar */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {['all', 'call', 'meeting', 'whatsapp', 'email'].map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              channelFilter === ch
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {ch === 'all' ? 'All Channels' : ch}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_followups_view_v1"
        views={['table', 'kanban']}
        items={filteredFollowups}
        totalCount={filteredFollowups.length}
        searchPlaceholder="Search by client, discussion subject, or takeaways..."
        columns={tableColumns}
        kanbanColumns={kanbanColumns}
        groupBy="status"
        renderKanbanCard={renderKanbanCard}
        onSearchChange={setSearch}
      />

      <FollowupDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        followup={selectedFollowup}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Follow-up Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This log entry will be permanently removed from the client history.
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
