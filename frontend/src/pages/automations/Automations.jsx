import { useState, useMemo } from 'react';
import {
  Activity,
  PauseCircle,
  PlayCircle,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Pencil,
  Trash2,
  Settings,
} from 'lucide-react';
import { useAutomations, useDeleteAutomation, useToggleAutomation } from '../../hooks/useAutomations';
import { AddAutomationModal } from '../../components/modals/AddAutomationModal';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';

const Automations = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: automations = [], isLoading } = useAutomations({ search: searchTerm });
  const deleteAutomation = useDeleteAutomation();
  const toggleAutomation = useToggleAutomation();

  const activeAutomations = automations.filter((item) => item.enabled).length;
  const totalRuns = automations.reduce((sum, item) => sum + Number(item.runCount || 0), 0);

  const filteredAutomations = useMemo(() => {
    if (!searchTerm.trim()) return automations;
    const q = searchTerm.toLowerCase();
    return automations.filter((a) => {
      const name = (a.name || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      const trigger = (a.trigger || '').toLowerCase();
      const action = (a.action || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || trigger.includes(q) || action.includes(q);
    });
  }, [automations, searchTerm]);

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Automation Workflow',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <Zap size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground">{row.name}</p>
            <p className="text-[11px] text-muted-foreground">{row.description || 'Custom event workflow'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'trigger',
      label: 'When Triggered',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-lg bg-secondary text-foreground text-xs font-semibold">
          ⚡ {row.trigger}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Perform Action',
      render: (row) => (
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <ArrowRight size={11} className="text-primary" />
          <span>{row.action}</span>
        </span>
      ),
    },
    {
      key: 'enabled',
      label: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleAutomation.mutate({ id: row._id, enabled: !row.enabled })}
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
            row.enabled
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
          }`}
        >
          {row.enabled ? 'Active' : 'Paused'}
        </button>
      ),
    },
    {
      key: 'runCount',
      label: 'Executions',
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          {Number(row.runCount || 0).toLocaleString()} runs
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedAutomation(row);
              setShowModal(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(row._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Render
  const renderCard = (row) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
          Workflow
        </span>
        <button
          onClick={() => toggleAutomation.mutate({ id: row._id, enabled: !row.enabled })}
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            row.enabled
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
          }`}
        >
          {row.enabled ? 'Active' : 'Paused'}
        </button>
      </div>

      <div>
        <h4 className="font-bold text-sm text-foreground">{row.name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{row.description || 'Custom trigger rule'}</p>
      </div>

      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-semibold text-foreground">Trigger:</span>
          <span>{row.trigger}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-semibold text-foreground">Action:</span>
          <span>{row.action}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
        <span className="text-muted-foreground">{Number(row.runCount || 0).toLocaleString()} runs</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedAutomation(row);
              setShowModal(true);
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setDeleteId(row._id)}
            className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'System & Comms', 'Workflows & Automations']}
      title="Agency Workflows & Automations"
      subtitle="Configure event-driven triggers, automated notifications, WhatsApp alerts, and client follow-up sequences."
      icon="⚡"
      properties={[
        { label: 'Active Workflows', value: activeAutomations, tone: 'success', icon: PlayCircle },
        { label: 'Total Executions', value: totalRuns.toLocaleString(), tone: 'info', icon: Zap },
        { label: 'Total Rules', value: automations.length, icon: Activity },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedAutomation(null);
            setShowModal(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>New Workflow</span>
        </Button>
      }
    >
      <DatabaseView
        viewKey="rwm_automations_view_v1"
        views={['table', 'cards']}
        items={filteredAutomations}
        totalCount={filteredAutomations.length}
        searchPlaceholder="Search automations by workflow name, trigger, or action..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearchTerm}
      />

      <AddAutomationModal
        open={showModal}
        onOpenChange={setShowModal}
        automation={selectedAutomation}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Automation Workflow?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This workflow will no longer trigger automatic actions in your agency operating system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) {
                  await deleteAutomation.mutateAsync(deleteId);
                  setDeleteId(null);
                }
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
};

export default Automations;
