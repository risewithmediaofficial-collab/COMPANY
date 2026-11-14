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
} from '@/components/ui/muiIcons';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
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
import { SelectDropdown } from '../../components/ui/SelectDropdown';
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
  open: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold',
  waiting: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  cancelled: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
};

const priorityTone = {
  low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  medium: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold',
  urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold',
};

const typeIcons = {
  call: Phone,
  meeting: Video,
  whatsapp: MessageCircle,
  email: Mail,
};

const channelColors = {
  call: 'bg-secondary text-foreground ',
  meeting: 'bg-secondary text-foreground ',
  whatsapp: 'bg-secondary text-foreground ',
  email: 'bg-secondary text-foreground ',
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
          {(required || label.includes('*')) && <span className="text-foreground ml-1 font-bold">*</span>}
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
      <DialogContent variant="side" size="md" noPadding className="flex flex-col min-h-0 bg-card p-0 overflow-hidden">
        {/* Monochrome Header */}
        <div className="bg-secondary/40 px-4 sm:px-6 py-4 pr-20 sm:pr-28 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground leading-snug truncate">{followup.subject || 'Untitled Follow-up'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                  <Building2 size={11} className="shrink-0" />
                  <span className="truncate">
                    {followup.client?.company || followup.client?.name || 'Unknown Client'}
                    {followup.contactPerson && ` · ${followup.contactPerson}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusTone[followup.status] || statusTone.open}`}>
                {labelize(followup.status)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${priorityTone[followup.priority] || priorityTone.medium}`}>
                {labelize(followup.priority)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Channel + Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channel</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${channelColors[followup.type] || 'bg-secondary text-foreground'}`}>
                <Icon size={13} className="shrink-0" />
                {labelize(followup.type)}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meeting Date</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{formatDate(followup.meetingDate)}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Follow-up</p>
              <p className={`text-sm font-semibold tabular-nums ${followup.nextFollowUpDate ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatDate(followup.nextFollowUpDate)}
              </p>
            </div>
          </div>

          {/* Project */}
          {followup.project && (
            <div className="rounded-xl bg-secondary/20 px-4 py-2.5 flex items-center gap-2.5">
              <ClipboardList size={14} className="text-foreground shrink-0" />
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
              <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-xl px-4 py-3 ">
                {followup.summary}
              </p>
            </div>
          )}

          {/* Discussion Notes */}
          {followup.discussionNotes && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Detailed Notes & Feedback</p>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-xl px-4 py-3 whitespace-pre-wrap">
                {followup.discussionNotes}
              </p>
            </div>
          )}

          {/* Outcome */}
          {followup.outcome && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Outcome</p>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-xl px-4 py-3">
                {followup.outcome}
              </p>
            </div>
          )}

          {/* Next Action */}
          {followup.nextAction && (
            <div className="rounded-xl bg-secondary/40 px-4 py-3 flex items-center gap-2.5">
              <ArrowRight size={14} className="text-foreground shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Action Item</p>
                <p className="text-sm font-semibold text-foreground">{followup.nextAction}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 flex items-center justify-between bg-secondary/10">
          <button
            onClick={() => { onDelete && onDelete(followup._id); onOpenChange(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 sm:gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
              <PhoneCall size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {followup ? 'Edit Client Follow-up' : 'Log New Client Touchpoint'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Record communication logs, meetings, notes, and action items for this client account
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Google Form Linear Stack */}
          <div className="space-y-5 p-4 sm:p-6 md:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Client *</label>
              <SelectDropdown
                value={form.client}
                onChange={(val) => updateField('client', val || '')}
                options={clients.map((c) => ({
                  value: c._id,
                  label: c.company || c.name,
                }))}
                placeholder="Select client"
                allowCustom={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Related Project (Optional)</label>
              <SelectDropdown
                value={form.project}
                onChange={(val) => updateField('project', val || '')}
                options={[
                  { value: '', label: 'None / General' },
                  ...clientProjects.map((p) => ({
                    value: p._id,
                    label: p.name,
                  })),
                ]}
                placeholder="None / General"
                allowCustom={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Touchpoint Channel</label>
              <SelectDropdown
                value={form.type || 'call'}
                onChange={(val) => updateField('type', val || 'call')}
                options={[
                  { value: 'call', label: 'Phone Call' },
                  { value: 'meeting', label: 'Video / In-Person Meeting' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'Email' },
                ]}
                placeholder="Channel"
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Status</label>
              <SelectDropdown
                value={form.status || 'open'}
                onChange={(val) => updateField('status', val || 'open')}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'waiting', label: 'Waiting for Client' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                placeholder="Status"
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Priority</label>
              <SelectDropdown
                value={form.priority || 'medium'}
                onChange={(val) => updateField('priority', val || 'medium')}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                placeholder="Priority"
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Contact Person / Stakeholder</label>
              <Input
                value={form.contactPerson}
                onChange={(e) => updateField('contactPerson', e.target.value)}
                placeholder="e.g. Rahul Sharma (Marketing Head)"
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Discussion Subject *</label>
              <Input
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="e.g. August Reel Plan & Retainer Review"
                required
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Meeting Summary / Core Takeaway</label>
              <Textarea
                value={form.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Brief summary of what was discussed..."
                rows={2}
                className="text-sm leading-relaxed rounded-xl p-3.5 min-h-[80px] resize-y"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Detailed Notes & Feedback</label>
              <Textarea
                value={form.discussionNotes}
                onChange={(e) => updateField('discussionNotes', e.target.value)}
                placeholder="Detailed notes, feedback on deliverables, client expectations..."
                rows={3}
                className="text-sm leading-relaxed rounded-xl p-3.5 min-h-[100px] resize-y"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Outcome</label>
              <Input
                value={form.outcome}
                onChange={(e) => updateField('outcome', e.target.value)}
                placeholder="e.g. Client approved Q3 content plan"
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Meeting Date</label>
              <Input
                type="date"
                value={form.meetingDate}
                onChange={(e) => updateField('meetingDate', e.target.value)}
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Next Follow-up Date</label>
              <Input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) => updateField('nextFollowUpDate', e.target.value)}
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Next Action Item</label>
              <Input
                value={form.nextAction}
                onChange={(e) => updateField('nextAction', e.target.value)}
                placeholder="e.g. Send revised video draft"
                className="h-11 text-sm rounded-xl px-4"
              />
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 bg-card px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 z-10 select-none">
            <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                ESC
              </kbd>
              <span>to close</span>
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-all flex-1 sm:flex-initial"
              >
                {saving ? 'Saving...' : followup ? 'Save Changes' : 'Log Touchpoint'}
              </Button>
            </div>
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
          <div className="h-7 w-7 rounded-lg bg-secondary text-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {(item.client?.company || item.client?.name || 'C').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground group-hover:underline transition-colors">{item.client?.company || item.client?.name || 'Unnamed Client'}</p>
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
            <Icon size={12} className="shrink-0" />
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
          <p className="font-bold text-foreground hover:underline transition-colors">{item.subject}</p>
          {item.summary && <p className="text-xs text-muted-foreground line-clamp-1">{item.summary}</p>}
        </div>
      ),
    },
    {
      key: 'nextFollowUpDate',
      label: 'Next Touchpoint',
      render: (item) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground tabular-nums">{formatDate(item.nextFollowUpDate)}</p>
          {item.nextAction && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 line-clamp-1">
              <ArrowRight size={10} className="shrink-0" />
              <span className="truncate">{item.nextAction}</span>
            </p>
          )}
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
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusTone[item.status] || statusTone.open}`}>
          {labelize(item.status)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
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
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1 truncate">
            <Building2 size={11} className="shrink-0" />
            <span className="truncate">{item.client?.company || item.client?.name || 'Unnamed Client'}</span>
          </p>
        </div>

        {item.summary && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{item.summary}</p>
        )}

        {item.nextFollowUpDate && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1.5 tabular-nums">
            <CalendarClock size={12} className="text-foreground shrink-0" />
            <span>Next: {formatDate(item.nextFollowUpDate)}</span>
          </div>
        )}

        {item.nextAction && (
          <p className="text-[11px] text-foreground font-medium flex items-center gap-1">
            <ArrowRight size={11} className="shrink-0" />
            <span className="truncate">{item.nextAction}</span>
          </p>
        )}

        {/* Quick edit in card */}
        <div className="flex items-center justify-end pt-1 ">
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
      icon={PhoneCall}
      properties={[
        { label: 'Total Logs', value: total, icon: MessageSquareText },
        { label: 'Open Queue', value: openCount, tone: 'neutral' },
        { label: 'Upcoming (7d)', value: upcomingCount, tone: 'neutral' },
        { label: 'Completed', value: completedCount, tone: 'neutral' },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedFollowup(null);
              setOpenDialog(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 cursor-pointer"
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
                ? 'bg-primary text-primary-foreground '
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
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
        <AlertDialogContent className="bg-card ">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Follow-up Record?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
