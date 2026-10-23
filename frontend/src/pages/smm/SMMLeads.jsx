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
  DialogClose,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

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

  const handleFilterChange = (keyOrObj, val) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      setFilters((prev) => ({ ...prev, ...keyOrObj }));
    } else {
      setFilters((prev) => ({ ...prev, [keyOrObj]: val }));
    }
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
          <div className="responsive-table-container overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
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

      {/* ADD LEAD MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                <Target size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Record New Social Media Lead
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Capture new prospect information from Meta Ads, Google Ads, or organic social channels
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Client *</label>
                <select
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value, project: '', campaign: '' })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground shadow-2xs cursor-pointer"
                >
                  <option value="">-- Choose Client --</option>
                  {clientsList.map((c) => {
                    const comp = c.company || c.companyName || '';
                    const name = c.name || '';
                    const display = comp && name && comp.toLowerCase() !== name.toLowerCase()
                      ? `${comp} - ${name}`
                      : (comp || name || 'Client');
                    return (
                      <option key={c._id} value={c._id}>
                        {display}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Project *</label>
                <select
                  required
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  disabled={!formData.client}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 text-sm text-foreground shadow-2xs cursor-pointer"
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
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Campaign (Optional)</label>
                <select
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  disabled={!formData.client}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 text-sm text-foreground shadow-2xs cursor-pointer"
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
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Lead Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl font-mono text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Source Channel</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
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
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Lead Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none shadow-2xs cursor-pointer"
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

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
                >
                  Record Lead
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMMLeads;
