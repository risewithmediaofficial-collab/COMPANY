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
  Eye,
  X,
  ClipboardList,
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
import { useDateFilter } from '../../context/DateFilterContext';

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

const channelColors = {
  call: 'bg-blue-500/10 text-blue-600',
  meeting: 'bg-violet-500/10 text-violet-600',
  whatsapp: 'bg-emerald-500/10 text-emerald-600',
  email: 'bg-amber-500/10 text-amber-600',
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const labelize = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const Field = ({ label, required, helper, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
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

// ─── View-Only Modal for Follow-up Details ─────────────────────────────────
const FollowupViewModal = ({ open, onOpenChange, followup, onEdit, onDelete }) => {
  if (!followup) return null;
  const Icon = typeIcons[followup.type] || PhoneCall;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="bg-card border border-border p-0 overflow-hidden">
        {/* Colored header stripe */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground leading-snug truncate">{followup.subject || 'Untitled Follow-up'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  🏢 {followup.client?.company || followup.client?.name || 'Unknown Client'}
                  {followup.contactPerson && ` · ${followup.contactPerson}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusTone[followup.status] || statusTone.open}`}>
                {labelize(followup.status)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${priorityTone[followup.priority] || priorityTone.medium}`}>
                {labelize(followup.priority)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Channel + Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channel</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${channelColors[followup.type] || 'bg-secondary text-foreground'}`}>
                <Icon size={13} />
                {labelize(followup.type)}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meeting Date</p>
              <p className="text-sm font-semibold text-foreground">{formatDate(followup.meetingDate)}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Follow-up</p>
              <p className={`text-sm font-semibold ${followup.nextFollowUpDate ? 'text-primary' : 'text-muted-foreground'}`}>
                {formatDate(followup.nextFollowUpDate)}
              </p>
            </div>
          </div>

          {/* Project */}
          {followup.project && (
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-2.5 flex items-center gap-2.5">
              <ClipboardList size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Related Project</p>
                <p className="text-xs font-semibold text-foreground">{followup.project?.name || followup.project}</p>
              </div>
            </div>
          )}

          {/* Summary */}
          {followup.summary && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meeting Summary</p>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-xl px-4 py-3 border border-border/60">
                {followup.summary}
              </p>
            </div>
          )}

          {/* Discussion Notes */}
          {followup.discussionNotes && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Detailed Notes & Feedback</p>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-xl px-4 py-3 border border-border/60 whitespace-pre-wrap">
                {followup.discussionNotes}
              </p>
            </div>
          )}

          {/* Outcome */}
          {followup.outcome && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Outcome</p>
              <p className="text-sm text-foreground leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
                {followup.outcome}
              </p>
            </div>
          )}

          {/* Next Action */}
          {followup.nextAction && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2.5">
              <ArrowRight size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Next Action Item</p>
                <p className="text-sm font-semibold text-foreground">{followup.nextAction}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-secondary/10">
          <button
            onClick={() => { onDelete && onDelete(followup._id); onOpenChange(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-9" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" className="rounded-xl text-xs h-9 gap-1.5" onClick={() => { onEdit && onEdit(followup); onOpenChange(false); }}>
              <Pencil size={13} /> Edit Follow-up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit / Create Follow-up Dialog ────────────────────────────────────────
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
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall size={20} className="text-primary" />
            {followup ? 'Edit Client Follow-up' : 'Log New Client Touchpoint'}
          </DialogTitle>
          <DialogDescription>
            Record communication logs, meetings, notes, and action items for this client account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
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

          <Field label="Outcome">
            <Input
              value={form.outcome}
              onChange={(e) => updateField('outcome', e.target.value)}
              placeholder="e.g. Client approved Q3 content plan"
              className="h-10 text-sm rounded-xl px-3.5"
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
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [viewFollowup, setViewFollowup] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { isDateInRange, filterByDateRange } = useDateFilter();

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
      // Date filter: check meetingDate or createdAt
      const dateToCheck = item.meetingDate || item.nextFollowUpDate || item.createdAt;
      const matchesDate = isDateInRange(dateToCheck);
      return matchesSearch && matchesChannel && matchesDate;
    });
  }, [followups, search, channelFilter, isDateInRange]);

  // Statistics
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

  const openViewModal = (item) => {
    setViewFollowup(item);
    setViewOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedFollowup(item);
    setOpenDialog(true);
  };

  // Table Columns
  const tableColumns = [
    {
      key: 'client',
      label: 'Client / Company',
      render: (item) => (
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => openViewModal(item)}
        >
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {(item.client?.company || item.client?.name || 'C').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{item.client?.company || item.client?.name || 'Unnamed Client'}</p>
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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${channelColors[item.type] || 'bg-secondary text-foreground'}`}>
            <Icon size={12} />
            {item.type}
          </span>
        );
      },
    },
    {
      key: 'subject',
      label: 'Subject & Notes',
      render: (item) => (
        <div className="max-w-md cursor-pointer" onClick={() => openViewModal(item)}>
          <p className="font-bold text-foreground hover:text-primary transition-colors">{item.subject}</p>
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
      key: 'createdAt',
      label: 'Created Date',
      render: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openViewModal(item)}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
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
        onClick={() => openViewModal(item)}
        className="space-y-2 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${channelColors[item.type] || 'bg-secondary text-foreground'}`}>
            {item.type}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityTone[item.priority] || priorityTone.medium}`}>
            {item.priority}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-xs text-foreground line-clamp-2">{item.subject}</h4>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            🏢 {item.client?.company || item.client?.name || 'Unnamed Client'}
          </p>
        </div>

        {item.summary && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{item.summary}</p>
        )}

        {item.nextFollowUpDate && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
            <CalendarClock size={12} className="text-primary" />
            <span>Next: {formatDate(item.nextFollowUpDate)}</span>
          </div>
        )}

        {item.nextAction && (
          <p className="text-[11px] text-primary/80 font-medium">👉 {item.nextAction}</p>
        )}

        {/* Quick edit in card */}
        <div className="flex items-center justify-end pt-1 border-t border-border/30">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Quick Edit"
          >
            <Pencil size={11} />
          </button>
        </div>
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
        viewKey="rwm_followups_view_v2"
        views={['kanban', 'table']}
        items={filteredFollowups}
        totalCount={filteredFollowups.length}
        searchPlaceholder="Search by client, discussion subject, or takeaways..."
        columns={tableColumns}
        kanbanColumns={kanbanColumns}
        groupBy="status"
        renderKanbanCard={renderKanbanCard}
        onSearchChange={setSearch}
        onStatusChange={(followupId, newStatus) => {
          updateMutation.mutate({ id: followupId, status: newStatus });
        }}
      />

      {/* View-Only Modal */}
      <FollowupViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        followup={viewFollowup}
        onEdit={(item) => { openEditModal(item); }}
        onDelete={(id) => setDeleteId(id)}
      />

      {/* Edit / Create Dialog */}
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
