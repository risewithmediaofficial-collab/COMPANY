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
import { toast } from 'sonner';
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
    () => rawReleases.filter((r) => isDateInRange(r.releaseDate || r.createdAt)),
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchReleases}
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
              New Release
            </button>
          </div>
        }
      />

      <DevelopmentSubNav />

      {/* ── Releases List ────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card rounded-2xl">
          <RefreshCcw size={16} className="animate-spin text-primary" /> Loading releases...
        </div>
      ) : releases.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-3 bg-card rounded-2xl">
          <Rocket size={32} className="mx-auto opacity-30 text-primary" />
          <p className="font-semibold text-foreground text-sm">No releases configured yet</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs inline-flex items-center gap-1.5 "
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
                className="bg-card rounded-2xl p-5 space-y-3 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-foreground bg-secondary px-2.5 py-0.5 rounded-lg ">
                        {release.version}
                      </span>
                      <h3 className="font-bold text-foreground text-base">{release.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          release.environment === 'production'
                            ? 'bg-primary text-primary-foreground '
                            : 'bg-secondary text-foreground '
                        }`}
                      >
                        {release.environment}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDeployed
                            ? 'bg-primary text-primary-foreground '
                            : 'bg-muted text-muted-foreground '
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
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all mr-2 cursor-pointer"
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
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 flex-wrap tabular-nums">
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
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card "
        >
          <DialogHeader className="px-5 py-4 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Rocket size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {editingId ? 'Edit Release' : 'Create New Release'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Configure version, target environment and release notes
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

          <form onSubmit={handleSaveRelease} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Version *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v2.4.1"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Environment</label>
                  <SelectDropdown
                    value={form.environment}
                    onChange={(val) => setForm({ ...form, environment: val || 'development' })}
                    options={[
                      { value: 'development', label: 'Development' },
                      { value: 'staging', label: 'Staging' },
                      { value: 'production', label: 'Production' },
                    ]}
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-full"
                    buttonClassName="h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Release Name *</label>
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
                <label className="block text-sm font-semibold text-foreground mb-1.5">Git Commit / Tag (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 7f8a91c or release-2.4.1"
                  value={form.commit}
                  onChange={(e) => setForm({ ...form, commit: e.target.value })}
                  className="app-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description / Release Notes</label>
                <textarea
                  rows={4}
                  placeholder="Summary of changes in this release..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                {saving ? 'Saving...' : editingId ? 'Update Release' : 'Create Release'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
