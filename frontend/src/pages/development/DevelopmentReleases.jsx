import React, { useState, useEffect, useCallback } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentReleases() {
  const [releases, setReleases] = useState([]);
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
                      <span className="font-mono font-black text-sm text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg border border-primary/20">
                        {release.version}
                      </span>
                      <h3 className="font-bold text-foreground text-base">{release.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          release.environment === 'production'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {release.environment}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDeployed
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
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
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs mr-2"
                      >
                        <Rocket size={12} /> Mark Deployed
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(release)}
                      className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors"
                      title="Edit release"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteRelease(release._id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                      title="Delete release"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Release details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2 flex-wrap">
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

      {/* ── Create / Edit Release Modal ──────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-[calc(100vw-24px)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Rocket size={16} className="text-primary" />
                {editingId ? 'Edit Release' : 'Create New Release'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRelease} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Version *</label>
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
                  <label className="font-semibold text-foreground block mb-1">Environment</label>
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
                <label className="font-semibold text-foreground block mb-1">Release Name *</label>
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
                <label className="font-semibold text-foreground block mb-1">Git Commit / Tag (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 7f8a91c or release-2.4.1"
                  value={form.commit}
                  onChange={(e) => setForm({ ...form, commit: e.target.value })}
                  className="app-input w-full font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Description / Release Notes</label>
                <textarea
                  rows={3}
                  placeholder="Summary of changes in this release..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  {saving ? 'Saving...' : editingId ? 'Update Release' : 'Create Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
