import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
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
  Rocket,
  PlusCircle,
  CheckCircle2,
  Clock,
  RefreshCcw,
  GitCommit,
  Layers,
  Trash2,
  Edit3,
  Calendar,
  X,
} from '@/components/ui/muiIcons';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentReleases() {
  const { isDateInRange } = useDateFilter();
  const [rawReleases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    version: '',
    name: '',
    description: '',
    environment: 'staging',
    status: 'planned',
    commit: '',
  });

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.getReleases();
      if (res.data?.success) {
        setReleases(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load releases:', err);
      toast.error('Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const releases = useMemo(
    () => rawReleases.filter((r) => isDateInRange([r.releaseDate, r.createdAt])),
    [rawReleases, isDateInRange]
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      version: 'v1.0.0',
      name: '',
      description: '',
      environment: 'staging',
      status: 'planned',
      commit: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (release) => {
    setEditingId(release._id);
    setForm({
      version: release.version,
      name: release.name,
      description: release.description || '',
      environment: release.environment || 'staging',
      status: release.status || 'planned',
      commit: release.commit || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveRelease = async (e) => {
    e.preventDefault();
    if (!form.version || !form.name) {
      toast.error('Version and Name are required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await devApi.updateRelease(editingId, form);
        toast.success('Release updated');
      } else {
        await devApi.createRelease(form);
        toast.success('Release created');
      }
      setIsModalOpen(false);
      fetchReleases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save release');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDeployed = async (releaseId) => {
    try {
      await devApi.updateRelease(releaseId, {
        status: 'deployed',
        deploymentDate: new Date(),
      });
      toast.success('Release marked as Deployed to environment!');
      fetchReleases();
    } catch (err) {
      toast.error('Failed to mark deployed');
    }
  };

  const handleDeleteRelease = async (id) => {
    if (!window.confirm('Are you sure you want to delete this release?')) return;
    try {
      await devApi.deleteRelease(id);
      toast.success('Release deleted');
      fetchReleases();
    } catch (err) {
      toast.error('Failed to delete release');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Releases & Deployments"
        subtitle="Manage versions, track deployments across environments, and review bundled features"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchReleases}
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
              New Release
            </button>
          </div>
        }
      />

      <DevelopmentSubNav />

      {/* ── Releases List ────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card border border-border rounded-2xl">
          <RefreshCcw size={16} className="animate-spin text-primary" /> Loading releases...
        </div>
      ) : releases.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-3 bg-card border border-border rounded-2xl">
          <Rocket size={32} className="mx-auto opacity-30 text-primary" />
          <p className="font-semibold text-foreground text-sm">No releases configured yet</p>
          <p className="text-muted-foreground">Create a release version to associate completed CRM tasks with deployment environments.</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md"
          >
            <PlusCircle size={14} /> Create First Release
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => {
            const isDeployed = release.status === 'deployed';

            return (
              <div
                key={release._id}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-foreground bg-secondary px-2.5 py-0.5 rounded-lg border border-border">
                        {release.version}
                      </span>
                      <h3 className="font-bold text-foreground text-base">{release.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          release.environment === 'production'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-foreground border-border'
                        }`}
                      >
                        {release.environment}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isDeployed
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {release.status}
                      </span>
                    </div>

                    {release.description && (
                      <p className="text-xs text-muted-foreground mt-1">{release.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!isDeployed && (
                      <button
                        onClick={() => handleMarkDeployed(release._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-xs mr-2 cursor-pointer"
                      >
                        <Rocket size={12} /> Mark Deployed
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(release)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Edit release"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteRelease(release._id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Delete release"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Release details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2 flex-wrap tabular-nums">
                  {release.commit && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <GitCommit size={12} /> {release.commit}
                    </span>
                  )}
                  {release.deploymentDate && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock size={12} /> Deployed: {format(new Date(release.deploymentDate), 'dd MMM yyyy, HH:mm')}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px]">
                    <Layers size={12} /> {release.taskCount || 0} associated tasks
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Release Side Drawer ────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          variant="side"
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl"
        >
          <DialogHeader className="px-5 py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
                <Rocket size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  {editingId ? 'Edit Release' : 'Create New Release'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Configure version, target environment &amp; release notes
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSaveRelease} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1.5">Version *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v2.4.1"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="app-input w-full font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1.5">Environment</label>
                  <select
                    value={form.environment}
                    onChange={(e) => setForm({ ...form, environment: e.target.value })}
                    className="app-select w-full"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">Release Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Feature Release & Performance Boost"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="app-input w-full"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">Git Commit / Tag (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 7f8a91c or release-2.4.1"
                  value={form.commit}
                  onChange={(e) => setForm({ ...form, commit: e.target.value })}
                  className="app-input w-full font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">Description / Release Notes</label>
                <textarea
                  rows={4}
                  placeholder="Summary of changes in this release..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-foreground"
                />
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-border bg-card">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="app-button-secondary text-xs min-h-[38px] px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="app-button-primary text-xs flex items-center gap-1.5 min-h-[38px] px-4"
              >
                <CheckCircle2 size={13} />
                {saving ? 'Saving...' : editingId ? 'Update Release' : 'Create Release'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
