import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import {
  Zap,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3,
  RefreshCcw,
  Clock,
  ArrowRight,
  Target,
  X,
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DevelopmentSprints() {
  const { isDateInRange } = useDateFilter();
  const [rawSprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    goal: '',
    status: 'planning',
  });

  const fetchSprints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.getSprints();
      if (res.data?.success) {
        setSprints(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load sprints:', err);
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const sprints = useMemo(
    () => rawSprints.filter((s) => isDateInRange([s.startDate, s.endDate, s.createdAt])),
    [rawSprints, isDateInRange]
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: `Sprint ${sprints.length + 1}`,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      goal: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sprint) => {
    setEditingId(sprint._id);
    setForm({
      name: sprint.name,
      startDate: sprint.startDate ? format(new Date(sprint.startDate), 'yyyy-MM-dd') : '',
      endDate: sprint.endDate ? format(new Date(sprint.endDate), 'yyyy-MM-dd') : '',
      goal: sprint.goal || '',
      status: sprint.status || 'planning',
    });
    setIsModalOpen(true);
  };

  const handleSaveSprint = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('Please fill in sprint name and dates');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await devApi.updateSprint(editingId, form);
        toast.success('Sprint updated');
      } else {
        await devApi.createSprint(form);
        toast.success('Sprint created');
      }
      setIsModalOpen(false);
      fetchSprints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save sprint');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSprint = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sprint? Associated tasks will be unlinked.')) return;
    try {
      await devApi.deleteSprint(id);
      toast.success('Sprint deleted');
      fetchSprints();
    } catch (err) {
      toast.error('Failed to delete sprint');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Development Sprints"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSprints}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-3.5 bg-secondary text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-colors cursor-pointer"
            >
              <PlusCircle size={14} />
              Create Sprint
            </button>
          </div>
        }
      />

      <DevelopmentSubNav />

      {/* ── Sprint Cards Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
          <RefreshCcw size={16} className="animate-spin text-foreground" /> Loading sprints...
        </div>
      ) : sprints.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-3 bg-card rounded-2xl">
          <Zap size={32} className="mx-auto opacity-30 text-muted-foreground" />
          <p className="font-semibold text-foreground text-sm">No sprints created yet</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} /> Create First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 tabular-nums">
          {sprints.map((sprint) => {
            const total = sprint.totalTasks || 0;
            const completed = sprint.completedTasks || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isActive = sprint.status === 'active';

            return (
              <div
                key={sprint._id}
                className={`bg-card rounded-2xl p-5 space-y-4 relative ${
                  isActive ? ' ring-1 ring-ring/20' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-base">{sprint.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sprint.status === 'active'
                            ? 'bg-primary text-primary-foreground '
                            : sprint.status === 'completed'
                            ? 'bg-secondary text-foreground '
                            : 'bg-muted text-muted-foreground '
                        }`}
                      >
                        {sprint.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar size={12} />
                      <span>
                        {sprint.startDate ? format(new Date(sprint.startDate), 'dd MMM yyyy') : '—'} →{' '}
                        {sprint.endDate ? format(new Date(sprint.endDate), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(sprint)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Edit sprint"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSprint(sprint._id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Delete sprint"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Goal */}
                {sprint.goal && (
                  <p className="text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-xl flex items-start gap-1.5">
                    <Target size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground">{sprint.goal}</span>
                  </p>
                )}

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Completion Progress</span>
                    <span className="font-bold text-foreground font-mono">{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 ">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block">TASKS</span>
                    <span className="font-mono font-bold text-foreground">{total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-foreground font-bold block">DONE</span>
                    <span className="font-mono font-bold text-foreground">{completed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block">LEFT</span>
                    <span className="font-mono font-bold text-muted-foreground">{sprint.remainingTasks || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Sprint Side Drawer ─────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          variant="side"
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card "
        >
          <DialogHeader className="px-5 py-4 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Zap size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {editingId ? 'Edit Sprint' : 'Create New Sprint'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Define sprint dates, status and engineering objectives
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSaveSprint} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Sprint Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 14"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="app-input w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="app-input w-full cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="app-input w-full cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Sprint Status</label>
                <SelectDropdown
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val || 'planning' })}
                  options={[
                    { value: 'planning', label: 'Planning' },
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-10 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Sprint Goal</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Complete CRM Development Module, Payment gateway migration..."
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  className="w-full min-h-[96px] px-4 py-3 bg-secondary/75 rounded-xl text-sm font-normal text-foreground outline-none focus:bg-background focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 bg-card">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={15} />
                {saving ? 'Saving...' : editingId ? 'Update Sprint' : 'Create Sprint'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
