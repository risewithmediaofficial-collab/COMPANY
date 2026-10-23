import React, { useState, useEffect, useCallback } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentSprints() {
  const [sprints, setSprints] = useState([]);
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
        subtitle="Manage sprint cadences, assign existing CRM tasks, and track iteration goals"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSprints}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md shadow-primary/25 hover:opacity-95 transition-all min-h-[38px]"
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
          <RefreshCcw size={16} className="animate-spin text-primary" /> Loading sprints...
        </div>
      ) : sprints.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-3 bg-card border border-border rounded-2xl">
          <Zap size={32} className="mx-auto opacity-30 text-amber-500" />
          <p className="font-semibold text-foreground text-sm">No sprints created yet</p>
          <p className="text-muted-foreground">Plan your first sprint and add existing CRM tasks to track sprint velocity.</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <PlusCircle size={14} /> Create First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => {
            const total = sprint.totalTasks || 0;
            const completed = sprint.completedTasks || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isActive = sprint.status === 'active';

            return (
              <div
                key={sprint._id}
                className={`bg-card border rounded-2xl p-5 shadow-xs space-y-4 relative ${
                  isActive ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-border'
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
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : sprint.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-secondary text-muted-foreground border border-border'
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
                      className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors"
                      title="Edit sprint"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSprint(sprint._id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                      title="Delete sprint"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Goal */}
                {sprint.goal && (
                  <p className="text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-xl border border-border">
                    🎯 <span className="font-medium text-foreground">{sprint.goal}</span>
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
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block">TASKS</span>
                    <span className="font-mono font-bold text-foreground">{total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">DONE</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{completed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">LEFT</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{sprint.remainingTasks || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Sprint Modal ───────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-[calc(100vw-24px)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                {editingId ? 'Edit Sprint' : 'Create New Sprint'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSprint} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 14"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="app-input w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="app-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Sprint Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="app-select w-full"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Sprint Goal</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Complete CRM Development Module, Payment gateway migration..."
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  className="w-full p-2.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="app-button-secondary text-xs min-h-[38px] px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="app-button-primary text-xs flex items-center gap-1 min-h-[38px] px-4"
                >
                  <CheckCircle2 size={13} />
                  {saving ? 'Saving...' : editingId ? 'Update Sprint' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
