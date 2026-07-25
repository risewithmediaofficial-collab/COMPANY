import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Target,
  TrendingUp,
  MessageSquarePlus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAddLeadActivity, useLeadsKanban, useLeads, useUpdateLeadStage, useDeleteLead } from '../../hooks/useLeads';
import { AddLeadModal } from '../../components/modals/AddLeadModal';
import { formatINR } from '../../utils/currency';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'won', 'lost', 'refollow_later'];

const STAGE_META = {
  new: {
    label: 'New',
    description: 'Fresh leads waiting for first touch.',
    badge: 'bg-sky-500/10 text-sky-700',
    surface: 'border-sky-200/70 bg-sky-500/[0.03]',
  },
  qualified: {
    label: 'Qualified',
    description: 'Great-fit leads ready for deeper discovery.',
    badge: 'bg-emerald-500/10 text-emerald-700',
    surface: 'border-emerald-200/70 bg-emerald-500/[0.03]',
  },
  contacted: {
    label: 'Contacted',
    description: 'Leads touched by call, WhatsApp, or email.',
    badge: 'bg-blue-500/10 text-blue-700',
    surface: 'border-blue-200/70 bg-blue-500/[0.03]',
  },
  meeting_booked: {
    label: 'Meeting Booked',
    description: 'Calls and demos already on the calendar.',
    badge: 'bg-violet-500/10 text-violet-700',
    surface: 'border-violet-200/70 bg-violet-500/[0.03]',
  },
  proposal_sent: {
    label: 'Proposal Sent',
    description: 'Decision makers reviewing your offer.',
    badge: 'bg-amber-500/10 text-amber-700',
    surface: 'border-amber-200/70 bg-amber-500/[0.03]',
  },
  negotiation: {
    label: 'Negotiation',
    description: 'Active conversations near the finish line.',
    badge: 'bg-rose-500/10 text-rose-700',
    surface: 'border-rose-200/70 bg-rose-500/[0.03]',
  },
  won: {
    label: 'Won',
    description: 'Closed business ready for handoff.',
    badge: 'bg-teal-500/10 text-teal-700',
    surface: 'border-teal-200/70 bg-teal-500/[0.03]',
  },
  lost: {
    label: 'Lost',
    description: 'Archived opportunities and learnings.',
    badge: 'bg-slate-500/10 text-slate-700',
    surface: 'border-slate-200/70 bg-slate-500/[0.03]',
  },
  refollow_later: {
    label: 'Refollow Later',
    description: 'Not now, but worth reconnecting with later.',
    badge: 'bg-orange-500/10 text-orange-700',
    surface: 'border-orange-200/70 bg-orange-500/[0.03]',
  },
};

const PRIORITY_META = {
  low: 'bg-slate-500/10 text-slate-600',
  medium: 'bg-blue-500/10 text-blue-700',
  high: 'bg-amber-500/10 text-amber-700',
  urgent: 'bg-destructive/10 text-destructive',
};

const formatDate = (value) => {
  if (!value) return 'No follow-up date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No follow-up date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getFollowUpTone = (value) => {
  if (!value) return 'text-muted-foreground';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  if (date < today) return 'text-destructive';
  if (date.getTime() === today.getTime()) return 'text-amber-700';
  return 'text-emerald-700';
};

const getLeadValue = (lead) => {
  const amount = lead?.budget ?? lead?.value;
  if (!amount) return null;
  return formatINR(amount);
};

const LeadActivityDialog = ({ open, onOpenChange, lead, onSave, saving }) => {
  const [form, setForm] = useState({
    type: 'follow_up',
    description: '',
    outcome: '',
    nextFollowUpDate: '',
    refollowDate: '',
    stage: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        type: 'follow_up',
        description: '',
        outcome: '',
        nextFollowUpDate: lead?.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
        refollowDate: lead?.refollowDate ? new Date(lead.refollowDate).toISOString().split('T')[0] : '',
        stage: '',
      });
    }
  }, [lead, open]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      id: lead._id,
      data: {
        ...form,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        refollowDate: form.refollowDate || undefined,
        stage: form.stage || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Follow-up Note</DialogTitle>
          <DialogDescription>
            Record what happened with {lead?.name || 'this lead'} and set the next action.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Activity Type
              <select value={form.type} onChange={(event) => updateField('type', event.target.value)} className="app-input">
                <option value="follow_up">Follow-up</option>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="proposal">Proposal</option>
                <option value="refollow">Refollow</option>
                <option value="note">Note</option>
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Outcome
              <Input
                value={form.outcome}
                onChange={(event) => updateField('outcome', event.target.value)}
                placeholder="Interested, no response, call later..."
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Next Follow-up
              <Input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(event) => updateField('nextFollowUpDate', event.target.value)}
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Refollow Date
              <Input
                type="date"
                value={form.refollowDate}
                onChange={(event) => updateField('refollowDate', event.target.value)}
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium md:col-span-2">
              Move Stage
              <select value={form.stage} onChange={(event) => updateField('stage', event.target.value)} className="app-input">
                <option value="">Keep current stage</option>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{STAGE_META[stage]?.label || stage}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1.5 text-sm font-medium">
            Note
            <Textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Write the call/message summary and what to remember..."
              required
            />
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Leads = () => {
  const navigate = useNavigate();
  const dragLeadRef = useRef(false);
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [deleteLeadId, setDeleteLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [followUpFilter, setFollowUpFilter] = useState('');
  const [activityLead, setActivityLead] = useState(null);

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    if (searchParams.get('search')) setView('list');
  }, [searchParams]);

  const [selectedFollowUpDate, setSelectedFollowUpDate] = useState(null);
  const [selectedTodayFollowedOnly, setSelectedTodayFollowedOnly] = useState(false);

  // Queries
  const kanbanQuery = useLeadsKanban();
  const listQuery = useLeads({ search: searchTerm, followUp: followUpFilter });
  const updateStageMutation = useUpdateLeadStage();
  const deleteLeadMutation = useDeleteLead();
  const addActivityMutation = useAddLeadActivity();

  const isLoading = view === 'kanban' ? kanbanQuery.isLoading : listQuery.isLoading;
  const leads = listQuery.data || [];
  const kanbanData = kanbanQuery.data || {};
  const totalLeads = PIPELINE_STAGES.reduce((sum, stage) => sum + (kanbanData[stage]?.length || 0), 0);
  const activeLeads = totalLeads - (kanbanData.won?.length || 0) - (kanbanData.lost?.length || 0);
  const proposalLeads = (kanbanData.proposal_sent?.length || 0) + (kanbanData.negotiation?.length || 0);
  const hasSearch = searchTerm.trim().length > 0;
  const allKanbanLeads = PIPELINE_STAGES.flatMap((stage) => kanbanData[stage] || []);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const followUpToday = allKanbanLeads.filter((lead) => {
    if (!lead.followUpDate && !lead.expectedCloseDate) return false;
    const date = new Date(lead.followUpDate || lead.expectedCloseDate);
    return date >= todayStart && date <= todayEnd;
  }).length;

  const overdueFollowUps = allKanbanLeads.filter((lead) => {
    if (!lead.followUpDate && !lead.expectedCloseDate) return false;
    const date = new Date(lead.followUpDate || lead.expectedCloseDate);
    return date < todayStart && !['won', 'lost'].includes(lead.stage);
  }).length;

  const refollowLeads = (kanbanData.refollow_later?.length || 0) + allKanbanLeads.filter((lead) => lead.refollowDate && lead.stage !== 'refollow_later').length;

  const todayFollowed = allKanbanLeads.filter((lead) => {
    const hasActivityToday = lead.activities?.some((act) => {
      const d = new Date(act.createdAt || act.date);
      return d >= todayStart && d <= todayEnd;
    });
    const hasCallLogToday = lead.callLogs?.some((log) => {
      const d = new Date(log.calledAt);
      return d >= todayStart && d <= todayEnd;
    });
    const isLastContactToday = lead.lastContactDate && (new Date(lead.lastContactDate) >= todayStart && new Date(lead.lastContactDate) <= todayEnd);
    return hasActivityToday || hasCallLogToday || isLastContactToday;
  }).length;

  const upcomingFollowUpDates = allKanbanLeads
    .map((lead) => lead.followUpDate ? new Date(lead.followUpDate) : null)
    .filter((d) => d && d >= todayStart)
    .sort((a, b) => a - b);

  const nextFollowUpDateObj = upcomingFollowUpDates[0] || null;
  const nextFollowUpDateStr = nextFollowUpDateObj
    ? nextFollowUpDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'None';

  const nextFollowUpLeadsCount = nextFollowUpDateObj
    ? allKanbanLeads.filter((lead) => {
        if (!lead.followUpDate) return false;
        const d = new Date(lead.followUpDate);
        return d.toDateString() === nextFollowUpDateObj.toDateString();
      }).length
    : 0;

  const followUpPending = allKanbanLeads.filter((lead) => {
    if (!lead.followUpDate) return false;
    const date = new Date(lead.followUpDate);
    return date < todayStart && !['won', 'lost'].includes(lead.stage);
  }).length;

  const pipelineHighlights = [
    {
      label: 'Total leads',
      value: totalLeads,
      helper: 'Every opportunity in your funnel',
      icon: Target,
      tone: 'from-sky-500/10 to-sky-500/5 text-sky-700 hover:scale-[1.02] transition-transform cursor-pointer',
      onClick: () => {
        setSelectedFollowUpDate(null);
        setSelectedTodayFollowedOnly(false);
        setFollowUpFilter('');
      }
    },
    {
      label: 'Today followed',
      value: todayFollowed,
      helper: 'Leads touched today',
      icon: TrendingUp,
      tone: selectedTodayFollowedOnly ? 'from-emerald-500/20 to-emerald-500/10 text-emerald-800 ring-2 ring-emerald-500 scale-[1.02] cursor-pointer' : 'from-emerald-500/10 to-emerald-500/5 text-emerald-700 hover:scale-[1.02] transition-transform cursor-pointer',
      onClick: () => {
        setSelectedTodayFollowedOnly(!selectedTodayFollowedOnly);
        setSelectedFollowUpDate(null);
        setFollowUpFilter('');
      }
    },
    {
      label: 'Next Followup Date',
      value: nextFollowUpDateStr,
      helper: nextFollowUpDateObj ? `${nextFollowUpLeadsCount} leads scheduled` : 'No upcoming follow-ups',
      icon: Calendar,
      tone: selectedFollowUpDate ? 'from-violet-500/20 to-violet-500/10 text-violet-800 ring-2 ring-violet-500 scale-[1.02] cursor-pointer' : 'from-violet-500/10 to-violet-500/5 text-violet-700 hover:scale-[1.02] transition-transform cursor-pointer',
      onClick: () => {
        if (nextFollowUpDateObj) {
          const dateStr = nextFollowUpDateObj.toISOString().split('T')[0];
          setSelectedFollowUpDate(selectedFollowUpDate === dateStr ? null : dateStr);
          setSelectedTodayFollowedOnly(false);
          setFollowUpFilter('');
        }
      }
    },
    {
      label: 'Followup Pending',
      value: followUpPending,
      helper: 'Overdue follow-ups',
      icon: ClipboardList,
      tone: followUpFilter === 'overdue' ? 'from-rose-500/20 to-rose-500/10 text-rose-800 ring-2 ring-rose-500 scale-[1.02] cursor-pointer' : 'from-rose-500/10 to-rose-500/5 text-rose-700 hover:scale-[1.02] transition-transform cursor-pointer',
      onClick: () => {
        setFollowUpFilter(followUpFilter === 'overdue' ? '' : 'overdue');
        setSelectedFollowUpDate(null);
        setSelectedTodayFollowedOnly(false);
      }
    },
  ];

  const filteredListLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedFollowUpDate) {
        if (!lead.followUpDate) return false;
        const d = new Date(lead.followUpDate).toISOString().split('T')[0];
        return d === selectedFollowUpDate;
      }
      if (selectedTodayFollowedOnly) {
        const hasActivityToday = lead.activities?.some((act) => {
          const d = new Date(act.createdAt || act.date);
          return d >= todayStart && d <= todayEnd;
        });
        const hasCallLogToday = lead.callLogs?.some((log) => {
          const d = new Date(log.calledAt);
          return d >= todayStart && d <= todayEnd;
        });
        const isLastContactToday = lead.lastContactDate && (new Date(lead.lastContactDate) >= todayStart && new Date(lead.lastContactDate) <= todayEnd);
        return hasActivityToday || hasCallLogToday || isLastContactToday;
      }
      return true;
    });
  }, [leads, selectedFollowUpDate, selectedTodayFollowedOnly, todayStart, todayEnd]);

  const filteredKanbanData = useMemo(() => {
    if (!selectedFollowUpDate && !selectedTodayFollowedOnly) return kanbanData;
    const filtered = {};
    PIPELINE_STAGES.forEach((stage) => {
      filtered[stage] = (kanbanData[stage] || []).filter((lead) => {
        if (selectedFollowUpDate) {
          if (!lead.followUpDate) return false;
          const d = new Date(lead.followUpDate).toISOString().split('T')[0];
          return d === selectedFollowUpDate;
        }
        if (selectedTodayFollowedOnly) {
          const hasActivityToday = lead.activities?.some((act) => {
            const d = new Date(act.createdAt || act.date);
            return d >= todayStart && d <= todayEnd;
          });
          const hasCallLogToday = lead.callLogs?.some((log) => {
            const d = new Date(log.calledAt);
            return d >= todayStart && d <= todayEnd;
          });
          const isLastContactToday = lead.lastContactDate && (new Date(lead.lastContactDate) >= todayStart && new Date(lead.lastContactDate) <= todayEnd);
          return hasActivityToday || hasCallLogToday || isLastContactToday;
        }
        return true;
      });
    });
    return filtered;
  }, [kanbanData, selectedFollowUpDate, selectedTodayFollowedOnly, todayStart, todayEnd]);

  const handleDeleteLead = async () => {
    if (deleteLeadId) {
      await deleteLeadMutation.mutateAsync(deleteLeadId);
      setDeleteLeadId(null);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (value.trim()) {
      setView('list');
    }
  };

  const handleModalChange = (open) => {
    setShowAddModal(open);
    if (!open) setSelectedLead(null);
  };

  const handleDrop = async (e, stage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      await updateStageMutation.mutateAsync({ id: leadId, stage });
    }
  };

  const renderKanban = () => {
    return (
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pipeline Board</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag leads between stages to keep the funnel current.
            </p>
          </div>
          <div className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            {activeLeads} active leads across {PIPELINE_STAGES.length} stages
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-4">
          <div className="grid w-max min-w-full auto-cols-[minmax(280px,320px)] grid-flow-col gap-5 pr-1">
            {PIPELINE_STAGES.map((stage) => {
              const stageInfo = STAGE_META[stage];
              const stageLeads = filteredKanbanData[stage] || [];

              return (
                <section
                  key={stage}
                  className={`flex min-h-[520px] flex-col rounded-[28px] border bg-card/90 shadow-sm backdrop-blur-sm ${stageInfo.surface}`}
                >
                  <div className="border-b border-border/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold">{stageInfo.label}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageInfo.badge}`}>
                            {stageLeads.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex min-h-0 flex-1 flex-col gap-3 p-4"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    {stageLeads.length > 0 ? (
                      stageLeads.map((lead) => {
                        const leadValue = getLeadValue(lead);

                        return (
                          <motion.article
                            layoutId={lead._id}
                            key={lead._id}
                            draggable
                            onDragStart={(e) => {
                              dragLeadRef.current = true;
                              e.dataTransfer.setData('leadId', lead._id);
                            }}
                            onDragEnd={() => { dragLeadRef.current = false; }}
                            onClick={() => {
                              if (!dragLeadRef.current) navigate(`/crm/leads/${lead._id}`);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate(`/crm/leads/${lead._id}`);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className="group cursor-pointer rounded-2xl border border-border/80 bg-background/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${PRIORITY_META[lead.priority] || PRIORITY_META.medium}`}>
                                  {lead.priority || 'medium'}
                                </span>
                                {lead.source && (
                                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                    {lead.source}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActivityLead(lead); }}
                                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  aria-label={`Add follow-up note for ${lead.name}`}
                                >
                                  <MessageSquarePlus size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLead(lead);
                                    setShowAddModal(true);
                                  }}
                                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  aria-label={`Edit ${lead.name}`}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteLeadId(lead._id); }}
                                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${lead.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-foreground">{lead.name}</h4>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 size={12} />
                                {lead.company || 'Independent lead'}
                              </p>
                              {lead.serviceInterest ? (
                                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                  Needs: {lead.serviceInterest}
                                </p>
                              ) : null}
                            </div>

                            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                              {lead.email && (
                                <div className="flex items-center gap-2">
                                  <Mail size={12} />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone size={12} />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                  {lead.assignedTo?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-foreground">
                                    {lead.assignedTo?.name || 'Unassigned'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">Owner</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-semibold text-foreground">
                                  {leadValue || 'No value set'}
                                </p>
                                <p className={`text-[11px] font-semibold ${getFollowUpTone(lead.followUpDate || lead.expectedCloseDate)}`}>
                                  {formatDate(lead.followUpDate || lead.expectedCloseDate)}
                                </p>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-border bg-background/80 p-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-foreground">No leads in {stageInfo.label.toLowerCase()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-background via-background to-secondary/70 shadow-sm">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                CRM Pipeline
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="inline-flex items-center rounded-2xl border border-border bg-card p-1 shadow-sm">
                <button
                  onClick={() => setView('kanban')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    view === 'kanban'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <LayoutGrid size={16} />
                  Board
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    view === 'list'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <List size={16} />
                  List
                </button>
              </div>

              <Button
                onClick={() => {
                  setSelectedLead(null);
                  setShowAddModal(true);
                }}
                className="w-full justify-center sm:w-auto"
              >
                <Plus size={18} className="mr-2" />
                Add Lead
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pipelineHighlights.map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className={`rounded-[24px] border border-border/80 bg-gradient-to-br px-4 py-4 shadow-sm ${item.tone}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-background/80 p-3">
                    <item.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[26px] border border-border/80 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads, companies, phone numbers..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm shadow-inner outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setFollowUpFilter(followUpFilter === 'today' ? '' : 'today');
                    setView('list');
                  }}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    followUpFilter === 'today'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  Today {followUpToday}
                </button>
                <button
                  onClick={() => {
                    setFollowUpFilter(followUpFilter === 'overdue' ? '' : 'overdue');
                    setView('list');
                  }}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    followUpFilter === 'overdue'
                      ? 'border-destructive bg-destructive text-destructive-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  Overdue {overdueFollowUps}
                </button>
                <button
                  onClick={() => {
                    setFollowUpFilter(followUpFilter === 'refollow' ? '' : 'refollow');
                    setView('list');
                  }}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    followUpFilter === 'refollow'
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  Refollow {refollowLeads}
                </button>
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                  {view === 'kanban' ? 'Board view active' : 'List view active'}
                </div>
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                  {hasSearch ? `${filteredListLeads.length} matching leads` : `${totalLeads} total leads`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <TableSkeleton columns={5} rows={6} dark={false} />
      ) : (
        view === 'kanban' ? renderKanban() : (
          <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
            {filteredListLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="rounded-full bg-secondary p-4 text-muted-foreground">
                  <Search size={22} />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-foreground">
                  {hasSearch ? 'No matching leads found' : 'No leads yet'}
                </h2>
              </div>
            ) : (
              <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Lead Name</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Company</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Email</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Interest</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Value</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Follow-up</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Stage</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6">Owner</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4 font-semibold sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredListLeads.map((lead) => {
                      const stageInfo = STAGE_META[lead.stage] || STAGE_META.new;

                      return (
                        <tr 
                          key={lead._id} 
                          className="group cursor-pointer transition-colors hover:bg-secondary/20"
                          onClick={() => navigate(`/crm/leads/${lead._id}`)}
                        >
                          <td className="px-4 py-4 sm:px-6">
                            <div className="font-semibold text-foreground">{lead.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{lead.phone || 'No phone added'}</div>
                          </td>
                          <td className="px-4 py-4 sm:px-6">{lead.company || 'Independent lead'}</td>
                          <td className="px-4 py-4 sm:px-6">{lead.email || 'No email added'}</td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="max-w-[180px] truncate">{lead.serviceInterest || 'Not noted'}</div>
                            {lead.decisionMaker ? (
                              <div className="mt-1 text-xs text-muted-foreground">DM: {lead.decisionMaker}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="font-semibold text-foreground">{getLeadValue(lead) || 'No value'}</div>
                            <div className="mt-1 text-xs text-muted-foreground">Deal value</div>
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <span className={`text-xs font-semibold ${getFollowUpTone(lead.followUpDate || lead.expectedCloseDate)}`}>
                              {formatDate(lead.followUpDate || lead.expectedCloseDate)}
                            </span>
                            {lead.refollowDate ? (
                              <div className="mt-1 text-xs text-orange-700">Refollow {formatDate(lead.refollowDate)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageInfo.badge}`}>
                              {lead.status || stageInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {lead.assignedTo?.name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-xs text-foreground">{lead.assignedTo?.name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right sm:px-6">
                            <div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityLead(lead);
                                }}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                aria-label={`Add follow-up note for ${lead.name}`}
                              >
                                <MessageSquarePlus size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLead(lead);
                                  setShowAddModal(true);
                                }}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                aria-label={`Edit ${lead.name}`}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteLeadId(lead._id);
                                }}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${lead.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      <AddLeadModal
        open={showAddModal}
        onOpenChange={handleModalChange}
        lead={selectedLead}
      />

      <LeadActivityDialog
        open={!!activityLead}
        onOpenChange={(open) => !open && setActivityLead(null)}
        lead={activityLead}
        onSave={(payload) => addActivityMutation.mutateAsync(payload)}
        saving={addActivityMutation.isPending}
      />

      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead}
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

export default Leads;
