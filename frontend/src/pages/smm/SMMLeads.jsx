import React, { useState, useEffect } from 'react';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import {
  Users, UserCheck, Award, TrendingUp, Plus, Trash2, Edit3, X,
  Phone, Mail, Target, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

export const SMMLeads = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    leadsToday: 0,
    leadsThisMonth: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    costPerLead: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    platform: '',
    contentType: '',
    campaignStatus: '',
    dateRange: 'all',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    campaign: '',
    name: '',
    phone: '',
    email: '',
    source: 'Meta Ads',
    status: 'New',
    leadValue: 0,
    notes: '',
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await smmApi.getClients();
        if (res.data?.success) setClientsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (!formData.client) {
      setProjectsList([]);
      setCampaignsList([]);
      return;
    }
    const loadProjectsAndCampaigns = async () => {
      try {
        const [projRes, campRes] = await Promise.all([
          smmApi.getProjects({ client: formData.client }),
          smmApi.getCampaigns({ client: formData.client }),
        ]);
        if (projRes.data?.success) setProjectsList(projRes.data.data || []);
        if (campRes.data?.success) setCampaignsList(campRes.data.data || []);
      } catch (err) {
        console.error('Failed to load projects/campaigns:', err);
      }
    };
    loadProjectsAndCampaigns();
  }, [formData.client]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        client: filters.client || undefined,
        project: filters.project || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const [leadsRes, statsRes] = await Promise.all([
        smmApi.getLeads(params),
        smmApi.getLeadStats(params),
      ]);

      if (leadsRes.data?.success) setLeads(leadsRes.data.data || []);
      if (statsRes.data?.success) setStats(statsRes.data.data || {});
    } catch (err) {
      toast.error('Failed to load leads data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client || !formData.project || !formData.name) {
      toast.error('Client, Project, and Lead Name are required!');
      return;
    }
    try {
      const res = await smmApi.createLead(formData);
      if (res.data?.success) {
        toast.success('Lead recorded successfully!');
        setIsModalOpen(false);
        setFormData({
          client: '',
          project: '',
          campaign: '',
          name: '',
          phone: '',
          email: '',
          source: 'Meta Ads',
          status: 'New',
          leadValue: 0,
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record lead');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await smmApi.updateLead(id, { status });
      toast.success('Lead status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update lead status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead record?')) return;
    try {
      await smmApi.deleteLead(id);
      toast.success('Lead deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Campaign & Social Media Leads</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track leads, qualified conversions, cost per lead (CPL), and campaign performance
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all scale-[1.01]"
        >
          <Plus size={16} />
          <span>Add Lead</span>
        </button>
      </div>

      <SMMSubNav />
      <SMMFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', campaignStatus: '', dateRange: 'all' })}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <Users size={16} className="text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{stats.totalLeads || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {stats.leadsToday || 0} leads today
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Qualified Leads</span>
            <UserCheck size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{stats.qualifiedLeads || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Verified prospect intent</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Converted Leads</span>
            <Award size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{stats.convertedLeads || 0}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {stats.conversionRate || 0}% Conversion Rate
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost Per Lead</span>
            <DollarSign size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">₹{stats.costPerLead || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Ad spend / total leads</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            <TrendingUp size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{stats.leadsThisMonth || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Leads generated in 30 days</span>
        </div>
      </div>

      {/* Leads Management Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading leads data...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No lead records found for selected Client/Project filters. Click "+ Add Lead" to record one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Lead Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Campaign / Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.leadDate || item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {item.phone && <span className="flex items-center gap-1"><Phone size={10} /> {item.phone}</span>}
                        {item.email && <span className="flex items-center gap-1"><Mail size={10} /> {item.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.client?.company || item.client?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.project?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground block">{item.campaign?.name || 'Manual Lead'}</span>
                      <span className="text-[10px] text-muted-foreground">{item.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item._id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border border-border bg-background cursor-pointer ${
                          item.status === 'Converted'
                            ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
                            : item.status === 'Qualified'
                            ? 'text-blue-600 border-blue-300 bg-blue-50'
                            : item.status === 'Lost'
                            ? 'text-red-500 border-red-200 bg-red-50'
                            : 'text-foreground'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Converted">Converted</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD LEAD MODAL (SLIDE-OVER SHEET) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Record New Social Media Lead</DialogTitle>
            <DialogDescription>
              Capture new prospect information from Meta Ads, Google Ads, or organic social channels.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Client *</label>
              <select
                required
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '', campaign: '' })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs"
              >
                <option value="">-- Choose Client --</option>
                {clientsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Select Project *</label>
              <select
                required
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                disabled={!formData.client}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 text-xs"
              >
                <option value="">-- Choose Project --</option>
                {projectsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Campaign (Optional)</label>
              <select
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                disabled={!formData.client}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 text-xs"
              >
                <option value="">-- No Linked Campaign --</option>
                {campaignsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.platform})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Lead Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl font-mono text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                >
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="LinkedIn Ads">LinkedIn Ads</option>
                  <option value="Organic Instagram">Organic Instagram</option>
                  <option value="Organic Facebook">Organic Facebook</option>
                  <option value="Website">Website Form</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Lead Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90"
              >
                Record Lead
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMMLeads;
