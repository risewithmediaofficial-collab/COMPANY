import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { PageHeader } from '../../components/ui/page';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  DollarSign, TrendingUp, PlusCircle, Download,
  Trash2, Edit3, Calendar, Filter, RefreshCcw,
  IndianRupee, Building2, User, FileText, Search,
  CheckCircle2, Clock
} from 'lucide-react';

// ─── Helper: Currency Formatter ───────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Helper: Format Client Display (Company Name - Client Name) ───────────────
const getClientDisplay = (c) => {
  if (!c) return 'Client';
  const comp = c.company || c.companyName || '';
  const name = c.name || c.clientName || c.primaryContact || '';
  if (comp && name && comp.toLowerCase() !== name.toLowerCase()) {
    return `${comp} - ${name}`;
  }
  return comp || name || 'Client';
};

// ─── KPI Card Component ───────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color = 'primary', testId }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  const badgeStyle = colorMap[color] || 'bg-primary/10 text-primary border-primary/20';

  return (
    <div
      id={testId}
      className="bg-card border border-border rounded-2xl p-4 space-y-3 hover:shadow-lg hover:shadow-primary/5 transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${badgeStyle}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground font-medium">{sub}</p>}
    </div>
  );
};

// ─── Main AdBudgetDashboard Component ─────────────────────────────────────────
export default function AdBudgetDashboard() {
  // ── Client List State ─────────────────────────────────────────────
  const [clientsList, setClientsList] = useState([]);

  // ── Filters State ─────────────────────────────────────────────────
  const [filterClient, setFilterClient] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data State ────────────────────────────────────────────────────
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Drawer State (Add / Edit) ─────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dailyManual, setDailyManual] = useState(false);
  const [form, setForm] = useState({
    client: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    monthlyBudget: '',
    dailyBudget: '',
    amountDeposited: '',
    notes: '',
  });

  // ── Load Clients List (CRM Clients + SMM Clients merged) ──────────
  useEffect(() => {
    const loadClients = async () => {
      try {
        const [smmRes, crmRes] = await Promise.all([
          smmApi.getClients().catch(() => ({ data: { data: [] } })),
          api.get('/clients').catch(() => ({ data: { clients: [] } })),
        ]);

        const smmList = smmRes.data?.data || [];
        const crmList = crmRes.data?.clients || crmRes.data?.data || (Array.isArray(crmRes.data) ? crmRes.data : []);

        const ids = new Set();
        const merged = [];

        // Add CRM clients first
        crmList.forEach(c => {
          if (c?._id && !ids.has(String(c._id))) {
            ids.add(String(c._id));
            merged.push(c);
          }
        });

        // Merge SMM clients
        smmList.forEach(c => {
          if (c?._id && !ids.has(String(c._id))) {
            ids.add(String(c._id));
            merged.push(c);
          }
        });

        setClientsList(merged);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    };
    loadClients();
  }, []);

  // ── Fetch Budgets and KPI Summary ─────────────────────────────────
  const fetchBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClient) params.client = filterClient;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [listRes, sumRes] = await Promise.all([
        smmApi.getBudgets(params).catch(() => ({ data: { data: [] } })),
        smmApi.getBudgetSummary(params).catch(() => ({ data: { data: null } })),
      ]);

      if (listRes.data?.success) {
        setBudgets(listRes.data.data || []);
      } else {
        setBudgets([]);
      }

      if (sumRes.data?.success) {
        setSummary(sumRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load budget data:', err);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterStartDate, filterEndDate, searchQuery]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // ── Derived KPI Totals (fallback to local calculation if needed) ───
  const derivedTotals = useMemo(() => {
    if (summary) {
      return {
        totalMonthly: summary.totalMonthlyBudget || 0,
        totalDaily: summary.totalDailyBudget || 0,
        totalDeposited: summary.totalAmountDeposited || 0,
        totalBalance: summary.totalBalance || 0,
        totalClients: summary.totalClients || 0,
      };
    }
    const totalMonthly = budgets.reduce((acc, b) => acc + (Number(b.monthlyBudget) || 0), 0);
    const totalDaily = budgets.reduce((acc, b) => acc + (Number(b.dailyBudget) || 0), 0);
    const totalDeposited = budgets.reduce((acc, b) => acc + (Number(b.amountDeposited) || 0), 0);
    const totalBalance = budgets.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
    return {
      totalMonthly,
      totalDaily,
      totalDeposited,
      totalBalance,
      totalClients: new Set(budgets.map(b => String(b.client?._id || b.client))).size,
    };
  }, [summary, budgets]);

  // ── Open Create Drawer ────────────────────────────────────────────
  const handleOpenCreateDrawer = () => {
    setEditingId(null);
    setDailyManual(false);
    setForm({
      client: filterClient || (clientsList[0]?._id ? String(clientsList[0]._id) : ''),
      date: format(new Date(), 'yyyy-MM-dd'),
      monthlyBudget: '',
      dailyBudget: '',
      amountDeposited: '',
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  // ── Open Edit Drawer ──────────────────────────────────────────────
  const handleOpenEditDrawer = (budget) => {
    setEditingId(budget._id);
    setDailyManual(true);
    setForm({
      client: budget.client?._id || budget.client || '',
      date: budget.date ? format(new Date(budget.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      monthlyBudget: budget.monthlyBudget !== undefined ? String(budget.monthlyBudget) : '',
      dailyBudget: budget.dailyBudget !== undefined ? String(budget.dailyBudget) : '',
      amountDeposited: budget.amountDeposited !== undefined ? String(budget.amountDeposited) : '',
      notes: budget.notes || '',
    });
    setIsDrawerOpen(true);
  };

  // ── Handle Monthly Budget Change & Auto-Calculate Daily ───────────
  const handleMonthlyBudgetChange = (value) => {
    const monthlyNum = Number(value) || 0;
    const newDaily = monthlyNum > 0 ? String(Math.round(monthlyNum / 30)) : '';
    setForm(prev => ({
      ...prev,
      monthlyBudget: value,
      dailyBudget: !dailyManual ? newDaily : prev.dailyBudget,
    }));
  };

  // ── Live Calculated Balance for Drawer ────────────────────────────
  const liveMonthly = Number(form.monthlyBudget) || 0;
  const liveDeposited = Number(form.amountDeposited) || 0;
  const liveBalance = liveMonthly - liveDeposited;

  // ── Save Budget Entry (Add or Update) ─────────────────────────────
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!form.client) {
      toast.error('Please select a client');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client: form.client,
        date: form.date,
        monthlyBudget: Number(form.monthlyBudget) || 0,
        dailyBudget: form.dailyBudget !== '' ? Number(form.dailyBudget) : Math.round((Number(form.monthlyBudget) || 0) / 30),
        amountDeposited: Number(form.amountDeposited) || 0,
        notes: form.notes,
      };

      if (editingId) {
        await smmApi.updateBudget(editingId, payload);
        toast.success('Budget entry updated successfully');
      } else {
        await smmApi.addBudget(payload);
        toast.success('Budget entry added successfully');
      }

      setIsDrawerOpen(false);
      fetchBudgetData();
    } catch (err) {
      console.error('Failed to save budget:', err);
      toast.error(err.response?.data?.message || 'Failed to save budget entry');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Budget Entry ───────────────────────────────────────────
  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client budget entry?')) return;
    try {
      await smmApi.deleteBudget(id);
      toast.success('Budget entry deleted successfully');
      fetchBudgetData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete budget entry');
    }
  };

  // ── Export CSV Report ─────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filterClient) params.client = filterClient;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await smmApi.exportBudgetReport(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smm-client-budget-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Budget report exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export budget report');
    } finally {
      setExporting(false);
    }
  };

  // ── Reset Filters ─────────────────────────────────────────────────
  const handleResetFilters = () => {
    setFilterClient('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Client Ad Budget"
        subtitle="Manage client ad budgets, deposits, daily allocations, and balance tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="export-csv-btn"
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border text-foreground font-semibold rounded-xl text-sm hover:bg-secondary/80 disabled:opacity-60 transition-all shadow-sm"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              id="log-budget-entry-btn"
              onClick={handleOpenCreateDrawer}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
            >
              <PlusCircle size={16} />
              Add Budget
            </button>
          </div>
        }
      />

      <SMMSubNav />

      {/* ── KPI Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          testId="kpi-monthly-budget"
          icon={Calendar}
          label="Monthly Budget"
          value={fmt(derivedTotals.totalMonthly)}
          sub="Total allocated monthly budget"
          color="blue"
        />
        <KPICard
          testId="kpi-daily-budget"
          icon={TrendingUp}
          label="Daily Budget"
          value={fmt(derivedTotals.totalDaily)}
          sub="Combined daily run-rate cap"
          color="purple"
        />
        <KPICard
          testId="kpi-total-added"
          icon={IndianRupee}
          label="Amount Deposited"
          value={fmt(derivedTotals.totalDeposited)}
          sub="Total client funds deposited"
          color="amber"
        />
        <KPICard
          testId="kpi-remaining"
          icon={DollarSign}
          label="Balance Amount"
          value={fmt(derivedTotals.totalBalance)}
          sub="Monthly budget less deposited"
          color="emerald"
        />
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div
        id="budget-filter-bar"
        className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Filter Client Budgets
            </span>
          </div>
          {(filterClient || filterStartDate || filterEndDate || searchQuery) && (
            <button
              id="reset-filters-btn"
              onClick={handleResetFilters}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 transition-colors"
            >
              <RefreshCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Client Filter (Company Name - Client Name) */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Client
            </label>
            <select
              id="filter-client"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="app-select w-full"
            >
              <option value="">All Clients</option>
              {clientsList.map(c => (
                <option key={c._id} value={c._id}>
                  {getClientDisplay(c)}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              From Date
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="app-input w-full"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              To Date
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="app-input w-full"
            />
          </div>

          {/* Search */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Search
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="filter-search"
                type="text"
                placeholder="Search company, client, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="app-input w-full pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Client Budget Ledger Table ───────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            <h3 className="font-bold text-foreground text-sm">Client Budget Ledger</h3>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
              {budgets.length} entries
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCcw size={18} className="animate-spin text-primary" /> Loading client budget data...
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <IndianRupee size={36} className="opacity-30 text-primary" />
            <p className="text-sm font-medium text-foreground">No budget records found</p>
            <p className="text-xs text-muted-foreground">Add a client budget with monthly allocation and deposited amount</p>
            <button
              onClick={handleOpenCreateDrawer}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-95"
            >
              <PlusCircle size={14} /> Add Budget
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" id="budget-ledger-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Client</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Monthly Budget</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Daily Budget</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Amount Deposited</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Balance Amount</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground max-w-xs">Notes</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {budgets.map((b) => {
                  const clientObj = b.client;
                  const comp = b.companyName || clientObj?.company || clientObj?.companyName || '';
                  const name = b.clientName || clientObj?.name || clientObj?.primaryContact || '';
                  const monthly = Number(b.monthlyBudget) || 0;
                  const daily = Number(b.dailyBudget) || 0;
                  const deposited = Number(b.amountDeposited) || 0;
                  // Balance formula: Monthly Budget - Amount Deposited
                  const balance = b.balance !== undefined ? Number(b.balance) : (monthly - deposited);

                  return (
                    <tr key={b._id} className="hover:bg-secondary/20 transition-colors">
                      {/* Client (Company Name - Client Name) */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          {comp || name || 'Client'}
                        </div>
                        {comp && name && comp.toLowerCase() !== name.toLowerCase() && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                            {name}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3.5 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-muted-foreground/70" />
                          <span>{b.date ? format(new Date(b.date), 'dd MMM yyyy') : '—'}</span>
                        </div>
                      </td>

                      {/* Monthly Budget */}
                      <td className="px-3 py-3.5 text-right font-black text-foreground font-mono text-[13px]">
                        {fmt(monthly)}
                      </td>

                      {/* Daily Budget */}
                      <td className="px-3 py-3.5 text-right font-bold text-purple-600 dark:text-purple-400 font-mono text-[13px]">
                        {fmt(daily)}
                      </td>

                      {/* Amount Deposited */}
                      <td className="px-3 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400 font-mono text-[13px]">
                        {fmt(deposited)}
                      </td>

                      {/* Balance Amount (Monthly - Deposited) */}
                      <td className="px-3 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-black font-mono text-[13px] ${
                            balance > 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : balance === 0
                              ? 'bg-secondary text-muted-foreground'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {fmt(balance)}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-3.5 text-muted-foreground max-w-xs truncate" title={b.notes}>
                        {b.notes || <span className="text-muted-foreground/40 italic">No notes</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditDrawer(b)}
                            title="Edit budget entry"
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(b._id)}
                            title="Delete budget entry"
                            className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Budget Drawer ─────────────────────────────────── */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingId ? 'Edit Client Budget' : 'Add Client Budget'}
        subtitle="Manage client monthly budget, daily allocation, and deposited balance"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs" id="budget-entry-form">
          {/* Client Selection (Company Name - Client Name) */}
          <div>
            <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-primary" /> Client *
            </label>
            <select
              id="log-client-select"
              required
              value={form.client}
              onChange={e => setForm({ ...form, client: e.target.value })}
              className="app-select w-full font-medium"
            >
              <option value="">Select Client (Company Name - Client Name) *</option>
              {clientsList.map(c => (
                <option key={c._id} value={c._id}>
                  {getClientDisplay(c)}
                </option>
              ))}
            </select>
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

          {/* Budget Amounts Section */}
          <div className="p-3.5 bg-secondary/30 border border-border rounded-2xl space-y-3">
            <h4 className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee size={13} className="text-primary" /> Budget Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monthly Budget */}
              <div>
                <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">
                  Monthly Budget (₹) *
                </label>
                <input
                  id="log-monthly-budget"
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 50000"
                  value={form.monthlyBudget}
                  onChange={e => handleMonthlyBudgetChange(e.target.value)}
                  className="app-input font-bold font-mono"
                />
              </div>

              {/* Daily Budget (Auto: Monthly / 30) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-purple-600 dark:text-purple-400">
                    Daily Budget (₹)
                  </label>
                  <span className="text-[10px] text-muted-foreground">(Monthly ÷ 30)</span>
                </div>
                <input
                  id="log-daily-budget"
                  type="number"
                  min="0"
                  placeholder="e.g. 1667"
                  value={form.dailyBudget}
                  onChange={e => {
                    setDailyManual(true);
                    setForm({ ...form, dailyBudget: e.target.value });
                  }}
                  className="app-input font-bold font-mono"
                />
              </div>
            </div>

            {/* Amount Deposited */}
            <div>
              <label className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                Amount Deposited (₹) *
              </label>
              <input
                id="log-amount-added"
                type="number"
                min="0"
                required
                placeholder="e.g. 20000"
                value={form.amountDeposited}
                onChange={e => setForm({ ...form, amountDeposited: e.target.value })}
                className="app-input font-bold font-mono"
              />
            </div>

            {/* Live Dynamic Balance Summary */}
            <div
              id="live-balance-preview"
              className="p-3 bg-card rounded-xl border border-border text-xs space-y-2"
            >
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Monthly Budget:</span>
                <span className="font-bold text-foreground font-mono">{fmt(liveMonthly)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Amount Deposited:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{fmt(liveDeposited)}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-bold text-foreground">
                  Balance Amount <span className="text-[10px] text-muted-foreground font-normal">(Monthly - Deposited)</span>:
                </span>
                <span
                  className={`font-black font-mono text-sm px-2 py-0.5 rounded-md ${
                    liveBalance > 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : liveBalance === 0
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {fmt(liveBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-muted-foreground" /> Notes / Remarks
            </label>
            <textarea
              id="log-notes"
              rows={3}
              placeholder="e.g. Initial client deposit received via bank transfer for September ad cycle..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 bg-background border border-border rounded-xl outline-none text-xs resize-none focus:border-primary transition-colors"
            />
          </div>

          {/* Drawer Actions */}
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
              className="app-button-primary disabled:opacity-60 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {saving ? 'Saving...' : editingId ? 'Update Budget' : 'Save Budget Entry'}
            </button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
