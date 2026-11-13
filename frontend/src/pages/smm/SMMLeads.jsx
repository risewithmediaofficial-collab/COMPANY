import React, { useState, useEffect } from 'react';
import { smmApi } from '../../api/smm';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMFilterBar } from '../../components/smm/SMMFilterBar';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  Users, UserCheck, Award, TrendingUp, Plus, Trash2, Edit3, X,
  Phone, Mail, Target, DollarSign
} from '@/components/ui/muiIcons';
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
import { SelectDropdown } from '../../components/ui/SelectDropdown';

export const SMMLeads = () => {
  const { startDate, endDate, isDateInRange } = useDateFilter();
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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const [leadsRes, statsRes] = await Promise.all([
        smmApi.getLeads(params),
        smmApi.getLeadStats(params),
      ]);

      if (leadsRes.data?.success) {
        const rawLeads = leadsRes.data.data || [];
        setLeads(rawLeads.filter((l) => isDateInRange([l.createdAt, l.date])));
      }
      if (statsRes.data?.success) setStats(statsRes.data.data || {});
    } catch (err) {
      toast.error('Failed to load leads data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, startDate, endDate, isDateInRange]);

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Target className="text-primary shrink-0" size={22} />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">SMM Leads</h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-10 inline-flex items-center gap-2 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Lead</span>
        </button>
      </div>

      <SMMSubNav />
      <SMMFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => setFilters({ client: '', project: '', platform: '', contentType: '', campaignStatus: '' })}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Leads</span>
            <Users size={15} className="text-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{stats.totalLeads || 0}</div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Qualified</span>
            <UserCheck size={15} className="text-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{stats.qualifiedLeads || 0}</div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Converted</span>
            <Award size={15} className="text-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{stats.convertedLeads || 0}</div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cost Per Lead</span>
            <DollarSign size={15} className="text-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">₹{stats.costPerLead || 0}</div>
        </div>

        <div className="bg-card rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">This Month</span>
            <TrendingUp size={15} className="text-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{stats.leadsThisMonth || 0}</div>
        </div>
      </div>

      {/* Leads Management Table */}
      <div className="bg-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-foreground">
            No leads found
          </div>
        ) : (
          <div className="responsive-table-container overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-muted/40 text-muted-foreground font-medium">
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
              <tbody className="divide-y divide-foreground/[0.05]">
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
                      <SelectDropdown
                        value={item.status}
                        onChange={(val) => handleStatusChange(item._id, val || item.status)}
                        options={[
                          { value: 'New', label: 'New' },
                          { value: 'Contacted', label: 'Contacted' },
                          { value: 'Qualified', label: 'Qualified' },
                          { value: 'Follow-up', label: 'Follow-up' },
                          { value: 'Converted', label: 'Converted' },
                          { value: 'Lost', label: 'Lost' },
                        ]}
                        placeholder="Status"
                        allowCustom={false}
                        allowDeselect={false}
                        className="w-32"
                        buttonClassName={`text-xs font-semibold px-2.5 py-1 rounded-full border border-border/50 ${
                          item.status === 'Converted'
                            ? 'bg-primary text-primary-foreground '
                            : item.status === 'Qualified'
                            ? 'bg-secondary text-foreground '
                            : item.status === 'Lost'
                            ? 'bg-card text-muted-foreground '
                            : 'bg-background text-foreground '
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary cursor-pointer transition-colors"
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ">
                <Target size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Add Social Media Lead
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Add lead form
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

          <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Client *</label>
                <SelectDropdown
                  value={formData.client}
                  onChange={(val) => setFormData({ ...formData, client: val || '', project: '', campaign: '' })}
                  options={clientsList.map((c) => {
                    const comp = c.company || c.companyName || '';
                    const name = c.name || '';
                    const display = comp && name && comp.toLowerCase() !== name.toLowerCase()
                      ? `${comp} - ${name}`
                      : (comp || name || 'Client');
                    return {
                      value: c._id,
                      label: display,
                    };
                  })}
                  placeholder="-- Choose Client --"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Project *</label>
                <SelectDropdown
                  value={formData.project}
                  onChange={(val) => setFormData({ ...formData, project: val || '' })}
                  options={projectsList.map((p) => ({
                    value: p._id,
                    label: p.name,
                  }))}
                  placeholder={!formData.client ? 'Select Client First' : '-- Choose Project --'}
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Campaign (Optional)</label>
                <SelectDropdown
                  value={formData.campaign}
                  onChange={(val) => setFormData({ ...formData, campaign: val || '' })}
                  options={[
                    { value: '', label: '-- No Linked Campaign --' },
                    ...campaignsList.map((c) => ({
                      value: c._id,
                      label: `${c.name} (${c.platform})`,
                    })),
                  ]}
                  placeholder="-- No Linked Campaign --"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Lead Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 bg-background rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm font-normal text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Source Channel</label>
                <SelectDropdown
                  value={formData.source || 'Meta Ads'}
                  onChange={(val) => setFormData({ ...formData, source: val || 'Meta Ads' })}
                  options={[
                    { value: 'Meta Ads', label: 'Meta Ads' },
                    { value: 'Google Ads', label: 'Google Ads' },
                    { value: 'LinkedIn Ads', label: 'LinkedIn Ads' },
                    { value: 'Organic Instagram', label: 'Organic Instagram' },
                    { value: 'Organic Facebook', label: 'Organic Facebook' },
                    { value: 'Website', label: 'Website Form' },
                  ]}
                  placeholder="Source Channel"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Lead Status</label>
                <SelectDropdown
                  value={formData.status || 'New'}
                  onChange={(val) => setFormData({ ...formData, status: val || 'New' })}
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Contacted', label: 'Contacted' },
                    { value: 'Qualified', label: 'Qualified' },
                    { value: 'Follow-up', label: 'Follow-up' },
                    { value: 'Converted', label: 'Converted' },
                    { value: 'Lost', label: 'Lost' },
                  ]}
                  placeholder="Lead Status"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
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
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-colors"
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
