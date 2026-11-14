import React, { Fragment, useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  Table as TableIcon,
  Edit2,
  Trash2,
  Target,
  TrendingUp,
  MessageSquarePlus,
  Clock,
  X,
} from '@/components/ui/muiIcons';
import { useAddLeadActivity, useLeadsKanban, useLeads, useUpdateLeadStage, useDeleteLead } from '../../hooks/useLeads';
import { AddLeadModal } from '../../components/modals/AddLeadModal';
import { formatINR } from '../../utils/currency';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { useDateFilter } from '../../context/DateFilterContext';

const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'won', 'lost', 'refollow_later'];

const STAGE_META = {
  new: {
    label: 'New',
    description: 'Fresh leads waiting for first touch.',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
    surface: ' bg-secondary/20',
  },
  qualified: {
    label: 'Qualified',
    description: 'Great-fit leads ready for deeper discovery.',
    badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
    surface: ' bg-secondary/25',
  },
  contacted: {
    label: 'Contacted',
    description: 'Leads touched by call, WhatsApp, or email.',
    badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
    surface: ' bg-secondary/20',
  },
  meeting_booked: {
    label: 'Meeting Booked',
    description: 'Calls and demos already on the calendar.',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    surface: ' bg-secondary/25',
  },
  proposal_sent: {
    label: 'Proposal Sent',
    description: 'Decision makers reviewing your offer.',
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    surface: ' bg-secondary/20',
  },
  negotiation: {
    label: 'Negotiation',
    description: 'Active conversations near the finish line.',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30',
    surface: ' bg-secondary/30',
  },
  won: {
    label: 'Won',
    description: 'Closed business ready for handoff.',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    surface: ' bg-secondary/30',
  },
  lost: {
    label: 'Lost',
    description: 'Archived opportunities and learnings.',
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    surface: ' bg-card',
  },
  refollow_later: {
    label: 'Refollow Later',
    description: 'Not now, but worth reconnecting with later.',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
    surface: ' bg-secondary/15',
  },
};

const PRIORITY_META = {
  low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  medium: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
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
  if (date < today) return 'text-foreground underline decoration-border';
  if (date.getTime() === today.getTime()) return 'text-foreground';
  return 'text-muted-foreground';
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
      <DialogContent
        size="lg"
        noPadding
        hideCloseButton
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-2xl max-h-[90vh]"
      >
        {/* Pinned Header */}
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Add Follow-up Note
              </DialogTitle>
              <DialogDescription className="sr-only">
                Record what happened with {lead?.name || 'this lead'} and set the next action.
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
          {/* Scrollable Body */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Activity Type
              </label>
              <SelectDropdown
                value={form.type}
                onChange={(val) => updateField('type', val)}
                options={[
                  { value: 'follow_up', label: 'Follow-up' },
                  { value: 'call', label: 'Call' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'Email' },
                  { value: 'meeting', label: 'Meeting' },
                  { value: 'proposal', label: 'Proposal' },
                  { value: 'refollow', label: 'Refollow' },
                  { value: 'note', label: 'Note' },
                ]}
                allowCustom={false}
                allowDeselect={false}
                placeholder="Select activity type"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Outcome
              </label>
              <Input
                value={form.outcome}
                onChange={(event) => updateField('outcome', event.target.value)}
                placeholder="Interested, no response, call later..."
                className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Next Follow-up Date
              </label>
              <Input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(event) => updateField('nextFollowUpDate', event.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 cursor-pointer "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Refollow Date
              </label>
              <Input
                type="date"
                value={form.refollowDate}
                onChange={(event) => updateField('refollowDate', event.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                className="h-11 rounded-xl bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 cursor-pointer "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Move Stage
              </label>
              <SelectDropdown
                value={form.stage}
                onChange={(val) => updateField('stage', val)}
                options={[
                  { value: '', label: 'Keep current stage' },
                  ...PIPELINE_STAGES.map((stage) => ({
                    value: stage,
                    label: STAGE_META[stage]?.label || stage,
                  })),
                ]}
                allowCustom={false}
                allowDeselect={false}
                placeholder="Select stage"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Note Summary <span className="text-foreground">*</span>
              </label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Write the call/message summary and what to remember..."
                required
                className="rounded-xl bg-background p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
              Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="h-11 px-5 rounded-xl hover:bg-muted font-semibold text-sm cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
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
  const [view, setView] = useState('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [deleteLeadId, setDeleteLeadId] = useState(null);
  const [draggingLeadId, setDraggingLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [dragOverLeadIndex, setDragOverLeadIndex] = useState(null);
  const leadsBoardRef = useRef(null);

  // Smooth side auto-scroll while dragging leads
  useAutoScrollOnDrag(leadsBoardRef, Boolean(draggingLeadId));

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
  const hasSearch = Boolean(searchTerm?.trim()?.length > 0);
  const allKanbanLeads = PIPELINE_STAGES.flatMap((stage) => kanbanData[stage] || []);
  const totalPipelineValue = allKanbanLeads.reduce((sum, lead) => {
    if (['lost'].includes(lead.stage)) return sum;
    return sum + (Number(lead.value) || 0);
  }, 0);
  const pipelineValue = formatINR(totalPipelineValue);

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

  const { isDateInRange } = useDateFilter();

  const isLeadInDate = useCallback(
    (lead) => {
      if (!lead) return false;
      if (isDateInRange(lead.createdAt)) return true;
      if (lead.followUpDate && isDateInRange(lead.followUpDate)) return true;
      return false;
    },
    [isDateInRange]
  );

  const filteredListLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (!isLeadInDate(lead)) return false;
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
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [leads, selectedFollowUpDate, selectedTodayFollowedOnly, todayStart, todayEnd, isLeadInDate]);

  const filteredKanbanData = useMemo(() => {
    const filtered = {};
    PIPELINE_STAGES.forEach((stage) => {
      filtered[stage] = (kanbanData[stage] || []).filter((lead) => {
        if (!isLeadInDate(lead)) return false;
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
  }, [kanbanData, selectedFollowUpDate, selectedTodayFollowedOnly, todayStart, todayEnd, isLeadInDate]);

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

  const handleDrop = async (e, stage, dropIdx = null) => {
    e.preventDefault();
    e.stopPropagation();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      await updateStageMutation.mutateAsync({ id: leadId, stage });
    }
    setDraggingLeadId(null);
    setDragOverStage(null);
    setDragOverLeadIndex(null);
    dragLeadRef.current = false;
  };

  const renderKanban = () => {
    return (
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Leads Board</h2>
          </div>
          <div className="rounded-full bg-card px-4 py-2 text-xs font-medium text-muted-foreground tabular-nums">
            {activeLeads} active leads across {PIPELINE_STAGES.length} stages
          </div>
        </div>

        <div ref={leadsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar responsive-table-container">
          <div className="grid w-max min-w-full auto-cols-[minmax(260px,320px)] grid-flow-col gap-4 sm:gap-5 pr-1">
            {PIPELINE_STAGES.map((stage) => {
              const stageInfo = STAGE_META[stage];
              const stageLeads = filteredKanbanData[stage] || [];
              const isColActive = dragOverStage === stage;

              return (
                <section
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      if (dragOverStage === stage) setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-[28px] bg-card transition-all ${stageInfo.surface} ${
                    isColActive ? 'ring-2 ring-primary/40 bg-primary/5 ' : ''
                  }`}
                >
                  <div className="px-4 py-4 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold">{stageInfo.label}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${stageInfo.badge}`}>
                            {stageLeads.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex min-h-0 flex-1 flex-col gap-3 p-4 overflow-y-auto max-h-[calc(100vh-370px)] custom-scrollbar pr-1"
                  >
                    {stageLeads.length > 0 ? (
                      <>
                        {stageLeads.map((lead, idx) => {
                        const leadValue = getLeadValue(lead);
                        const isBeingDragged = draggingLeadId === lead._id;
                        const showDropIndicatorBefore = isColActive && dragOverLeadIndex === idx && !isBeingDragged;

                        return (
                          <React.Fragment key={lead._id}>
                            {showDropIndicatorBefore && (
                              <div className="h-1.5 rounded-full bg-primary my-1 " />
                            )}
                            <article
                              draggable
                              onDragStart={(e) => {
                                dragLeadRef.current = true;
                                setDraggingLeadId(lead._id);
                                e.dataTransfer.setData('leadId', lead._id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                setTimeout(() => { dragLeadRef.current = false; }, 50);
                                setDraggingLeadId(null);
                                setDragOverStage(null);
                                setDragOverLeadIndex(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverStage(stage);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                setDragOverLeadIndex(e.clientY < midY ? idx : idx + 1);
                              }}
                              onDrop={(e) => handleDrop(e, stage, idx)}
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
                              className={`group cursor-grab rounded-2xl bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing ${
                                isBeingDragged ? 'opacity-30 scale-95 ring-1 ring-primary/40' : ''
                              }`}
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
                                {lead.createdAt && (
                                  <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1 tabular-nums">
                                    <Clock size={10} className="shrink-0" />
                                    {new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
                                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  aria-label={`Delete ${lead.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-foreground">{lead.name}</h4>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 size={12} className="shrink-0" />
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
                                  <Mail size={12} className="shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-2 tabular-nums">
                                  <Phone size={12} className="shrink-0" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground shrink-0">
                                  {lead.assignedTo?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-foreground">
                                    {lead.assignedTo?.name || 'Unassigned'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">Owner</p>
                                </div>
                              </div>
                              <div className="text-right tabular-nums">
                                <p className="text-[11px] font-semibold text-foreground">
                                  {leadValue || 'No value set'}
                                </p>
                                <p className={`text-[11px] font-semibold ${getFollowUpTone(lead.followUpDate || lead.expectedCloseDate)}`}>
                                  {formatDate(lead.followUpDate || lead.expectedCloseDate)}
                                </p>
                              </div>
                            </div>
                          </article>
                        </React.Fragment>
                      );
                    })}
                    {isColActive && dragOverLeadIndex >= stageLeads.length && (
                      <div className="h-1.5 rounded-full bg-primary my-1 " />
                    )}
                    </>
                  ) : (
                    <div className={`flex flex-1 items-center justify-center rounded-[24px] p-6 text-center transition-all ${
                      isColActive ? ' bg-primary/10 text-primary font-semibold' : ' bg-background/80 text-muted-foreground'
                    }`}>
                      <div>
                        <p className="text-sm font-semibold">{isColActive ? `Drop here to move to ${stageInfo.label}` : `No leads in ${stageInfo.label.toLowerCase()}`}</p>
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
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Growth & Sales', 'CRM & Leads']}
      title="Sales Pipeline & Lead Management"
      icon={Target}
      properties={[
        { label: 'Active Leads', value: activeLeads, tone: 'neutral', icon: Target },
        { label: 'Pipeline Value', value: pipelineValue, tone: 'neutral', icon: TrendingUp },
        { label: 'Today Follow-ups', value: followUpToday, tone: 'neutral', icon: Calendar },
        { label: 'Overdue Follow-ups', value: overdueFollowUps, tone: 'neutral', icon: ClipboardList },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedLead(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 cursor-pointer"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Lead</span>
        </Button>
      }
    >
      <DatabaseView
        views={[
          { id: 'kanban', label: 'Board', icon: LayoutGrid },
          { id: 'list', label: 'Table', icon: TableIcon },
        ]}
        activeView={view}
        onViewChange={setView}
        searchQuery={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search leads, companies, phone numbers..."
        totalCount={filteredListLeads.length}
        filters={
          <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
            <button
              onClick={() => {
                setFollowUpFilter(followUpFilter === 'today' ? '' : 'today');
                setView('list');
              }}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                followUpFilter === 'today'
                  ? ' bg-primary text-primary-foreground'
                  : ' bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Today ({followUpToday})
            </button>
            <button
              onClick={() => {
                setFollowUpFilter(followUpFilter === 'overdue' ? '' : 'overdue');
                setView('list');
              }}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                followUpFilter === 'overdue'
                  ? ' bg-primary text-primary-foreground'
                  : ' bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Overdue ({overdueFollowUps})
            </button>
            <button
              onClick={() => {
                setFollowUpFilter(followUpFilter === 'refollow' ? '' : 'refollow');
                setView('list');
              }}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                followUpFilter === 'refollow'
                  ? ' bg-primary text-primary-foreground'
                  : ' bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Refollow ({refollowLeads})
            </button>
          </div>
        }
      >
      {isLoading ? (
        <TableSkeleton columns={5} rows={6} dark={false} />
      ) : (
        view === 'kanban' ? renderKanban() : (
          <div className="overflow-hidden rounded-[28px] bg-card ">
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
              <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] responsive-table-container [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Lead Name</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Company</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Email</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Interest</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Value</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Follow-up</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Created</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Stage</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6">Owner</th>
                      <th className="sticky top-0 z-10 bg-card px-4 py-4 font-semibold sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.05]">
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
                            <div className="mt-1 text-xs text-muted-foreground tabular-nums">{lead.phone || 'No phone added'}</div>
                          </td>
                          <td className="px-4 py-4 sm:px-6">{lead.company || 'Independent lead'}</td>
                          <td className="px-4 py-4 sm:px-6">{lead.email || 'No email added'}</td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="max-w-[180px] truncate">{lead.serviceInterest || 'Not noted'}</div>
                            {lead.decisionMaker ? (
                              <div className="mt-1 text-xs text-muted-foreground">DM: {lead.decisionMaker}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 sm:px-6 tabular-nums">
                            <div className="font-semibold text-foreground">{getLeadValue(lead) || 'No value'}</div>
                            <div className="mt-1 text-xs text-muted-foreground">Deal value</div>
                          </td>
                          <td className="px-4 py-4 sm:px-6 tabular-nums">
                            <span className={`text-xs font-semibold ${getFollowUpTone(lead.followUpDate || lead.expectedCloseDate)}`}>
                              {formatDate(lead.followUpDate || lead.expectedCloseDate)}
                            </span>
                            {lead.refollowDate ? (
                              <div className="mt-1 text-xs text-muted-foreground">Refollow {formatDate(lead.refollowDate)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 sm:px-6 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageInfo.badge}`}>
                              {lead.status || stageInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground shrink-0">
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
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
      </DatabaseView>

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
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
    </WorkspacePage>
  );
};

export default Leads;
