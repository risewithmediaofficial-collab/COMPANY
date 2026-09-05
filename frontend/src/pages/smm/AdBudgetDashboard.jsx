import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { PageHeader } from '../../components/ui/page';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  DollarSign, TrendingUp, TrendingDown, PlusCircle, Download,
  AlertTriangle, CheckCircle, Trash2, ChevronDown, BarChart3,
  Megaphone, Users, PhoneCall, MessageSquare, Zap, FileText,
  Calendar, Filter, RefreshCcw, IndianRupee, Target, PlayCircle, FolderKanban
} from 'lucide-react';

// ─── Helper: format currency ──────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtN = (n) => Number(n || 0).toLocaleString('en-IN');
const pct = (spent, added) => (added > 0 ? Math.min(100, Math.round((spent / added) * 100)) : 0);

const ALERT_COLOR = (p) => {
  if (p >= 90) return { bar: 'bg-rose-500', badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: '🔴' };
  if (p >= 75) return { bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: '🟡' };
  return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: '🟢' };
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color = 'primary', testId }) => (
  <div
    id={testId}
    className="bg-card border border-border rounded-2xl p-4 space-y-3 hover:shadow-lg hover:shadow-primary/5 transition-all"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-${color}/10`}>
        <Icon size={16} className={`text-${color}`} />
      </div>
    </div>
    <p className="text-2xl font-black text-foreground">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground font-medium">{sub}</p>}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdBudgetDashboard() {
  // ── Filter State ─────────────────────────────────────────────────
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [adsList, setAdsList] = useState([]);

  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterAd, setFilterAd] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // ── Data State ───────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [spendLogs, setSpendLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Drawer State ─────────────────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerProjects, setDrawerProjects] = useState([]);
  const [drawerAds, setDrawerAds] = useState([]);
  const [form, setForm] = useState({
    client: '',
    project: '',
    campaign: '',
    ad: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    amountAdded: '',
    amountSpent: '',
    leadsGenerated: '',
    messages: '',
    calls: '',
    clicks: '',
    impressions: '',
    revenue: '',
    notes: '',
  });

  // ── Load initial filter lists ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, campRes, adRes] = await Promise.all([
          smmApi.getClients(),
          smmApi.getCampaigns({ limit: 200 }),
          api.get('/clients'),
        ]);
        if (cRes.data?.success) setClientsList(cRes.data.data || []);
        if (campRes.data?.success) setCampaignsList(campRes.data.data || []);
        // Merge CRM clients if needed
        const crmClients = adRes.data?.clients || adRes.data?.data || (Array.isArray(adRes.data) ? adRes.data : []);
        setClientsList(prev => {
          const ids = new Set(prev.map(c => String(c._id)));
          const merged = [...prev];
          crmClients.forEach(c => { if (!ids.has(String(c._id))) merged.push(c); });
          return merged;
        });
      } catch (err) {
        console.error('Failed to load filter data:', err);
      }
    };
    load();
  }, []);

  // ── Filter projects by client ─────────────────────────────────────
  useEffect(() => {
    if (!filterClient) { setProjectsList([]); setFilterProject(''); return; }
    const load = async () => {
      try {
        const res = await api.get('/projects', { params: { client: filterClient } });
        const list = res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setProjectsList(list);
        setFilterProject('');
      } catch (err) {
        setProjectsList([]);
      }
    };
    load();
  }, [filterClient]);

  // ── Filtered campaigns list based on selected client & project ────
  const filteredCampaigns = useMemo(() => {
    let list = campaignsList;
    if (filterClient) {
      list = list.filter(c => {
        const cid = c.client?._id || c.client;
        return String(cid) === String(filterClient);
      });
    }
    if (filterProject) {
      list = list.filter(c => {
        const pid = c.project?._id || c.project;
        return String(pid) === String(filterProject);
      });
    }
    return list;
  }, [campaignsList, filterClient, filterProject]);

  // ── Fetch Ads when campaign filter changes ────────────────────────
  useEffect(() => {
    if (!filterCampaign) {
      setAdsList([]);
      setFilterAd('');
      return;
    }
    const loadAds = async () => {
      try {
        const res = await smmApi.getAds({ campaign: filterCampaign, limit: 100 });
        if (res.data?.success) setAdsList(res.data.data || []);
      } catch (err) {
        setAdsList([]);
      }
    };
    loadAds();
  }, [filterCampaign]);

  // ── Fetch summary and logs ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClient) params.client = filterClient;
      if (filterProject) params.project = filterProject;
      if (filterCampaign) params.campaign = filterCampaign;
      if (filterAd) params.ad = filterAd;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const [sumRes, logsRes] = await Promise.all([
        smmApi.getAdSpendSummary(params),
        smmApi.getAdSpendLogs({ ...params, limit: 200 }),
      ]);

      if (sumRes.data?.success) setSummary(sumRes.data.data);
      if (logsRes.data?.success) setSpendLogs(logsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterProject, filterCampaign, filterAd, filterStartDate, filterEndDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Delete spend log ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this spend log? Campaign balance will be recalculated.')) return;
    try {
      await smmApi.deleteAdSpendLog(id);
      toast.success('Log deleted and campaign balance updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  // ── Drawer: Client change handler ─────────────────────────────────
  const handleDrawerClientChange = async (clientId) => {
    setForm(prev => ({ ...prev, client: clientId, project: '', campaign: '', ad: '' }));
    if (!clientId) {
      setDrawerProjects([]);
      setDrawerAds([]);
      return;
    }
    try {
      const res = await api.get('/projects', { params: { client: clientId } });
      const list = res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setDrawerProjects(list);
    } catch (e) {
      setDrawerProjects([]);
    }
  };

  // ── Drawer: Campaign change handler ───────────────────────────────
  const handleDrawerCampaignChange = async (campaignId) => {
    const selectedCamp = campaignsList.find(c => String(c._id) === String(campaignId));
    setForm(prev => ({
      ...prev,
      campaign: campaignId,
      ad: '',
      client: selectedCamp?.client?._id || selectedCamp?.client || prev.client,
      project: selectedCamp?.project?._id || selectedCamp?.project || prev.project,
    }));
    if (!campaignId) {
      setDrawerAds([]);
      return;
    }
    try {
      const res = await smmApi.getAds({ campaign: campaignId, limit: 100 });
      if (res.data?.success) setDrawerAds(res.data.data || []);
    } catch (e) {
      setDrawerAds([]);
    }
  };

  // ── Log budget entry ──────────────────────────────────────────────
  const openLogDrawer = () => {
    const defaultCamp = filterCampaign || (filteredCampaigns[0]?._id || '');
    const selectedCamp = campaignsList.find(c => String(c._id) === String(defaultCamp));
    const initClient = filterClient || selectedCamp?.client?._id || selectedCamp?.client || '';
    const initProj = filterProject || selectedCamp?.project?._id || selectedCamp?.project || '';

    setForm({
      client: initClient,
      project: initProj,
      campaign: defaultCamp,
      ad: filterAd || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      amountAdded: '',
      amountSpent: '',
      leadsGenerated: '',
      messages: '',
      calls: '',
      clicks: '',
      impressions: '',
      revenue: '',
      notes: '',
    });

    if (initClient) {
      api.get('/projects', { params: { client: initClient } }).then(res => {
        setDrawerProjects(res.data?.projects || res.data?.data || []);
      }).catch(() => setDrawerProjects([]));
    }
    if (defaultCamp) {
      smmApi.getAds({ campaign: defaultCamp, limit: 100 }).then(res => {
        if (res.data?.success) setDrawerAds(res.data.data || []);
      }).catch(() => setDrawerAds([]));
    }

    setIsDrawerOpen(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!form.campaign) { toast.error('Please select a campaign'); return; }
    setSaving(true);
    try {
      await smmApi.addAdSpendLog({
        client: form.client || undefined,
        project: form.project || undefined,
        campaign: form.campaign,
        ad: form.ad || undefined,
        date: form.date,
        amountAdded: Number(form.amountAdded) || 0,
        amountSpent: Number(form.amountSpent) || 0,
        leadsGenerated: Number(form.leadsGenerated) || 0,
        messages: Number(form.messages) || 0,
        calls: Number(form.calls) || 0,
        clicks: Number(form.clicks) || 0,
        impressions: Number(form.impressions) || 0,
        revenue: Number(form.revenue) || 0,
        notes: form.notes,
      });
      toast.success('Budget entry logged and campaign balance updated!');
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget entry');
    } finally {
      setSaving(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filterClient) params.client = filterClient;
      if (filterProject) params.project = filterProject;
      if (filterCampaign) params.campaign = filterCampaign;
      if (filterAd) params.ad = filterAd;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await smmApi.exportAdSpendReport(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-budget-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully!');
    } catch (err) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // ── Derived totals ────────────────────────────────────────────────
  const totals = summary?.totals || {};
  const perCampaign = summary?.perCampaign || [];

  const totalMonthlyBudget = useMemo(() => {
    if (perCampaign.length > 0) {
      return perCampaign.reduce((acc, c) => acc + (c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.totalAdded || 0), 0);
    }
    return campaignsList.reduce((acc, c) => acc + (c.lifetimeBudget || (c.dailyBudget ? c.dailyBudget * 30 : 0) || c.amountAdded || 0), 0);
  }, [perCampaign, campaignsList]);

  const totalDailyBudget = useMemo(() => {
    if (perCampaign.length > 0) {
      return perCampaign.reduce((acc, c) => acc + (c.dailyBudget || 0), 0);
    }
    return campaignsList.reduce((acc, c) => acc + (c.dailyBudget || 0), 0);
  }, [perCampaign, campaignsList]);

  const selectedDrawerCamp = useMemo(() => {
    return campaignsList.find(c => String(c._id) === String(form.campaign));
  }, [campaignsList, form.campaign]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ad Budget Dashboard"
        subtitle="Track Amount Added vs Amount Spent, log notes by Client → Project → Campaign → Ad, and generate reports"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="export-csv-btn"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border text-foreground font-semibold rounded-xl text-sm hover:bg-secondary/80 disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              id="log-budget-entry-btn"
              onClick={openLogDrawer}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:opacity-90"
            >
              <PlusCircle size={16} />
              Log Budget Entry
            </button>
          </div>
        }
      />

      <SMMSubNav />

      {/* ── Filter Bar (Client → Project → Campaign → Ad → Date Range) ─── */}
      <div
        id="budget-filter-bar"
        className="bg-card border border-border rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter Budget View (Client → Project → Campaign → Ad)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Client */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Client</label>
            <select
              id="filter-client"
              value={filterClient}
              onChange={e => { setFilterClient(e.target.value); setFilterCampaign(''); setFilterAd(''); }}
              className="app-select w-full"
            >
              <option value="">All Clients</option>
              {clientsList.map(c => {
                const comp = c.company || c.companyName || '';
                const name = c.name || '';
                const display = comp && name && comp.toLowerCase() !== name.toLowerCase()
                  ? `${comp} - ${name}`
                  : (comp || name || 'Client');
                return (
                  <option key={c._id} value={c._id}>{display}</option>
                );
              })}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Project</label>
            <select
              id="filter-project"
              value={filterProject}
              onChange={e => { setFilterProject(e.target.value); setFilterCampaign(''); setFilterAd(''); }}
              className="app-select w-full"
              disabled={!filterClient}
            >
              <option value="">All Projects</option>
              {projectsList.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Campaign */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Campaign</label>
            <select
              id="filter-campaign"
              value={filterCampaign}
              onChange={e => { setFilterCampaign(e.target.value); setFilterAd(''); }}
              className="app-select w-full"
            >
              <option value="">All Campaigns</option>
              {filteredCampaigns.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Ad */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Ad</label>
            <select
              id="filter-ad"
              value={filterAd}
              onChange={e => setFilterAd(e.target.value)}
              className="app-select w-full"
              disabled={!filterCampaign}
            >
              <option value="">All Ads</option>
              {adsList.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">From Date</label>
            <input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="app-input w-full"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">To Date</label>
            <input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="app-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            id="reset-filters-btn"
            onClick={() => { setFilterClient(''); setFilterProject(''); setFilterCampaign(''); setFilterAd(''); setFilterStartDate(''); setFilterEndDate(''); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw size={12} /> Reset Filters
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          testId="kpi-monthly-budget"
          icon={Calendar}
          label="Monthly Budget"
          value={fmt(totalMonthlyBudget)}
          sub="Total monthly allocation"
          color="blue-500"
        />
        <KPICard
          testId="kpi-daily-budget"
          icon={TrendingUp}
          label="Daily Budget"
          value={fmt(totalDailyBudget)}
          sub="Daily run-rate cap"
          color="purple-500"
        />
        <KPICard
          testId="kpi-total-added"
          icon={IndianRupee}
          label="Total Deposited"
          value={fmt(totals.totalAdded)}
          sub="Funds deposited for ads"
          color="amber-500"
        />
        <KPICard
          testId="kpi-total-spent"
          icon={TrendingDown}
          label="Total Spent"
          value={fmt(totals.totalSpent)}
          sub="Actual spend recorded"
          color="rose-500"
        />
        <KPICard
          testId="kpi-remaining"
          icon={DollarSign}
          label="Balance Amount"
          value={fmt(totals.remaining)}
          sub="Available balance to run ads"
          color="emerald-500"
        />
      </div>

      {/* ── Per-Campaign Budget Table ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="font-bold text-foreground text-sm">Campaign Budget Breakdown</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{perCampaign.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <RefreshCcw size={16} className="animate-spin" /> Loading budget data...
          </div>
        ) : perCampaign.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <DollarSign size={32} className="opacity-30" />
            <p className="text-sm font-medium">No budget data yet. Log your first entry!</p>
            <button onClick={openLogDrawer} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
              <PlusCircle size={13} /> Log Budget Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" id="campaign-budget-table">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Monthly Budget</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Daily Budget</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Deposited</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Spent</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Balance</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground w-28">Spend %</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground max-w-xs">Notes / Observations</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perCampaign.map((camp) => {
                  const spendP = pct(camp.totalSpent, camp.totalAdded);
                  const alert = ALERT_COLOR(spendP);
                  const campMonthly = camp.lifetimeBudget || (camp.dailyBudget ? camp.dailyBudget * 30 : 0) || camp.totalAdded || 0;
                  return (
                    <tr key={camp.campaignId} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-semibold text-foreground block">{camp.campaignName || 'Unknown Campaign'}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{camp.platform}</span>
                            {camp.objective && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{camp.objective}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-foreground">{fmt(campMonthly)}</td>
                      <td className="px-3 py-3 text-right font-mono text-foreground">{fmt(camp.dailyBudget || 0)}</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-blue-500">{fmt(camp.totalAdded)}</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-rose-500">{fmt(camp.totalSpent)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-500">{fmt(camp.remaining)}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold px-1.5 py-0.5 rounded border text-[9px] ${alert.badge}`}>
                              {alert.icon} {spendP}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${alert.bar}`}
                              style={{ width: `${spendP}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground max-w-xs truncate">
                        {camp.internalNotes || <span className="italic opacity-40">No notes noted</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          camp.status === 'Paused' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-secondary text-muted-foreground border-border'
                        }`}>
                          {camp.status || 'Draft'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Spend Log History ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h3 className="font-bold text-foreground text-sm">Spend Log History</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{spendLogs.length}</span>
          </div>
          <button
            onClick={openLogDrawer}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <PlusCircle size={13} /> Add Entry
          </button>
        </div>

        {spendLogs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Calendar size={28} className="opacity-30" />
            <p className="text-sm font-medium">No spend logs yet for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" id="spend-log-table">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Client / Campaign</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Ad</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Added</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Spent</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Balance</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Leads</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground max-w-xs">Notes / Observations</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Flag</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spendLogs.map((log) => (
                  <tr key={log._id} className={`hover:bg-secondary/20 transition-colors ${log.isAnomaly ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {log.date ? format(new Date(log.date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-foreground">{log.campaign?.name || '—'}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {log.client?.company || log.client?.name || ''} {log.campaign?.platform ? `• ${log.campaign.platform}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {log.ad?.name ? (
                        <div className="flex items-center gap-1.5">
                          <PlayCircle size={12} className="text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate max-w-[120px]" title={log.ad.name}>
                            {log.ad.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground opacity-50 italic">All Campaign Ads</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-blue-500">{fmt(log.amountAdded)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-rose-500">{fmt(log.amountSpent)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-500">
                      {fmt(log.balance ?? Math.max(0, (log.amountAdded || 0) - (log.amountSpent || 0)))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-muted-foreground">{fmtN(log.leadsGenerated)}</td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <span className="text-foreground block max-w-[220px] font-medium" title={log.notes}>
                        {log.notes || <span className="italic opacity-40 font-normal">No notes</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {log.isAnomaly ? (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          title={log.anomalyReason}
                        >
                          ⚠️ Spike
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(log._id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Log Budget Entry Drawer (Client → Project → Campaign → Ad) ─── */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Log Budget Entry"
        subtitle="Record Amount Added, Amount Spent, and notes for Client → Project → Campaign → Ad"
      >
        <form onSubmit={handleSaveLog} className="space-y-4 text-xs" id="budget-log-form">
          {/* Hierarchy Selection */}
          <div className="p-3.5 bg-secondary/30 border border-border rounded-2xl space-y-3">
            <h4 className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={13} className="text-primary" /> Target Selection (Client → Project → Campaign → Ad)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Client selection */}
              <div>
                <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
                  <Users size={12} className="text-muted-foreground" /> Client
                </label>
                <select
                  id="log-client-select"
                  value={form.client}
                  onChange={e => handleDrawerClientChange(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">Select Client (Optional)</option>
                  {clientsList.map(c => {
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

              {/* Project selection */}
              <div>
                <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
                  <FolderKanban size={12} className="text-muted-foreground" /> Project
                </label>
                <select
                  id="log-project-select"
                  value={form.project}
                  onChange={e => setForm({ ...form, project: e.target.value })}
                  className="app-select w-full"
                  disabled={!form.client && drawerProjects.length === 0}
                >
                  <option value="">Select Project (Optional)</option>
                  {drawerProjects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Campaign selection */}
              <div>
                <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
                  <Megaphone size={12} className="text-primary" /> Campaign *
                </label>
                <select
                  id="log-campaign-select"
                  required
                  value={form.campaign}
                  onChange={e => handleDrawerCampaignChange(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">Select Campaign *</option>
                  {(form.client
                    ? campaignsList.filter(c => String(c.client?._id || c.client) === String(form.client))
                    : campaignsList
                  ).map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.client?.company && c.client?.name ? `${c.client.company} - ${c.client.name}` : (c.client?.company || c.client?.name || 'Client')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ad selection */}
              <div>
                <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
                  <PlayCircle size={12} className="text-primary" /> Specific Ad (Optional)
                </label>
                <select
                  id="log-ad-select"
                  value={form.ad}
                  onChange={e => setForm({ ...form, ad: e.target.value })}
                  className="app-select w-full"
                  disabled={!form.campaign}
                >
                  <option value="">All Campaign Ads (Default)</option>
                  {drawerAds.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
              <Calendar size={13} className="text-muted-foreground" /> Date *
            </label>
            <input
              id="log-date"
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="app-input w-full"
            />
          </div>

          {/* Selected Campaign Baseline Info */}
          {selectedDrawerCamp && (
            <div className="p-3 bg-secondary/60 rounded-2xl border border-border text-xs space-y-1.5">
              <span className="font-bold text-foreground block">Budget Baseline</span>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Monthly Budget:</span>
                  <strong className="text-foreground">
                    {fmt(selectedDrawerCamp.monthlyBudget || selectedDrawerCamp.lifetimeBudget || (selectedDrawerCamp.dailyBudget ? selectedDrawerCamp.dailyBudget * 30 : 0) || selectedDrawerCamp.amountAdded || 0)}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Daily Budget:</span>
                  <strong className="text-foreground">{fmt(selectedDrawerCamp.dailyBudget || 0)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Balance:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {fmt(selectedDrawerCamp.remainingBalance ?? Math.max(0, (selectedDrawerCamp.amountAdded || 0) - (selectedDrawerCamp.amountSpent || 0)))}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Budget amounts */}
          <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
            <h4 className="font-bold text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee size={13} /> Budget Amounts
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">Deposited (₹)</label>
                <input
                  id="log-amount-added"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.amountAdded}
                  onChange={e => setForm({ ...form, amountAdded: e.target.value })}
                  className="app-input font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-rose-500 block mb-1">Amount Spent (₹) *</label>
                <input
                  id="log-amount-spent"
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={form.amountSpent}
                  onChange={e => setForm({ ...form, amountSpent: e.target.value })}
                  className="app-input font-bold"
                />
              </div>
            </div>
            {(Number(form.amountAdded) > 0 || Number(form.amountSpent) > 0) && (
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Balance Amount (Deposited - Spent):</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {fmt(Math.max(0, Number(form.amountAdded || 0) - Number(form.amountSpent || 0)))}
                </span>
              </div>
            )}
          </div>

          {/* Collapsible Optional Metrics */}
          <details className="text-xs text-muted-foreground p-3 bg-secondary/30 rounded-2xl border border-border">
            <summary className="cursor-pointer font-semibold hover:text-foreground text-[11px]">
              Optional Additional Metrics (Leads, Calls, Clicks)
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Leads Generated</label>
                <input
                  id="log-leads"
                  type="number" min="0" placeholder="0"
                  value={form.leadsGenerated}
                  onChange={e => setForm({ ...form, leadsGenerated: e.target.value })}
                  className="app-input"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Messages</label>
                <input
                  id="log-messages"
                  type="number" min="0" placeholder="0"
                  value={form.messages}
                  onChange={e => setForm({ ...form, messages: e.target.value })}
                  className="app-input"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Calls</label>
                <input
                  id="log-calls"
                  type="number" min="0" placeholder="0"
                  value={form.calls}
                  onChange={e => setForm({ ...form, calls: e.target.value })}
                  className="app-input"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Clicks</label>
                <input
                  id="log-clicks"
                  type="number" min="0" placeholder="0"
                  value={form.clicks}
                  onChange={e => setForm({ ...form, clicks: e.target.value })}
                  className="app-input"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Impressions</label>
                <input
                  id="log-impressions"
                  type="number" min="0" placeholder="0"
                  value={form.impressions}
                  onChange={e => setForm({ ...form, impressions: e.target.value })}
                  className="app-input"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Revenue (₹)</label>
                <input
                  id="log-revenue"
                  type="number" min="0" placeholder="0"
                  value={form.revenue}
                  onChange={e => setForm({ ...form, revenue: e.target.value })}
                  className="app-input"
                />
              </div>
            </div>
          </details>

          {/* Notes */}
          <div>
            <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-muted-foreground" /> Budget Notes & Observations
            </label>
            <textarea
              id="log-notes"
              rows={3}
              placeholder="e.g. Scaled budget for top-performing video ad, added ₹5,000, target audience expanded..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 bg-background border border-border rounded-xl outline-none text-xs resize-none focus:border-primary transition-colors"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="app-button-secondary"
            >
              Cancel
            </button>
            <button
              id="save-budget-entry-btn"
              type="submit"
              disabled={saving}
              className="app-button-primary disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Budget Entry'}
            </button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
