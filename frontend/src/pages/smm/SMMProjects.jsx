import React, { useEffect, useState } from 'react';
import { Plus, Briefcase, Calendar, DollarSign, User, CheckSquare } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

const ALL_PLATFORMS = ['Meta Ads', 'Google Ads', 'LinkedIn', 'YouTube', 'TikTok', 'Instagram'];

export default function SMMProjects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '', client: '', platforms: ['Meta Ads'], projectManager: '', status: 'Planning',
    budget: 0, currency: 'INR', startDate: '', endDate: '', description: ''
  });

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [projRes, clientRes] = await Promise.all([
        smmApi.getProjects({ search, status: statusFilter }),
        smmApi.getClients({ limit: 100 }),
      ]);
      if (projRes.data?.success) setProjects(projRes.data.data);
      if (clientRes.data?.success) setClients(clientRes.data.data);
    } catch (err) {
      if (showLoading) toast.error('Failed to load projects');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate ? formData.startDate : null,
        endDate: formData.endDate ? formData.endDate : null,
        budget: Number(formData.budget) || 0,
      };
      if (editingProject) {
        await smmApi.updateProject(editingProject._id, payload);
        toast.success('Project updated');
      } else {
        await smmApi.createProject(payload);
        toast.success('Project created');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save project');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SMM Project?')) return;
    try {
      await smmApi.deleteProject(id);
      toast.success('Project deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const openAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '', client: clients[0]?._id || '', platforms: ['Meta Ads'], projectManager: '', status: 'Planning',
      budget: 0, currency: 'INR', startDate: '', endDate: '', description: ''
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (proj) => {
    setEditingProject(proj);
    setFormData({ ...proj, client: proj.client?._id || proj.client });
    setIsDrawerOpen(true);
  };

  const togglePlatform = (p) => {
    const current = formData.platforms || [];
    if (current.includes(p)) {
      setFormData({ ...formData, platforms: current.filter((item) => item !== p) });
    } else {
      setFormData({ ...formData, platforms: [...current, p] });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.client?.companyName || 'No Client'}</span>
        </div>
      ),
    },
    {
      key: 'platforms',
      label: 'Platforms',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.platforms?.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
      ),
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (row) => <span className="text-xs font-semibold font-mono">₹{row.budget?.toLocaleString()}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
    {
      key: 'dates',
      label: 'Timeline',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.startDate ? new Date(row.startDate).toLocaleDateString() : 'TBD'} - {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'TBD'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMM Projects"
        subtitle="Organize multi-campaign initiatives per brand client"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Add Project
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project name..." />
        </div>
        <div className="w-full sm:w-48">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select">
            <option value="">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyTitle="No SMM Projects found"
        emptyDescription="Create a project to group campaigns under a client."
      />

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingProject ? 'Edit Project' : 'Create SMM Project'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Project Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="app-input" placeholder="e.g. Q3 Growth Campaign" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Client *</label>
              <select required value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="app-select">
                <option value="">Select SMM Client</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Target Platforms</label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-xs p-2 rounded-xl border border-border cursor-pointer hover:bg-secondary">
                    <input type="checkbox" checked={formData.platforms?.includes(p)} onChange={() => togglePlatform(p)} className="rounded" />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Budget (₹) <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <input type="number" placeholder="0" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: e.target.value ? Number(e.target.value) : ''})} className="app-input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="app-select">
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Start Date <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <input type="date" value={formData.startDate ? formData.startDate.substring(0,10) : ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="app-input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  End Date <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <input type="date" value={formData.endDate ? formData.endDate.substring(0,10) : ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className="app-input" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="app-input" placeholder="Project overview and KPIs..." />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Project</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
