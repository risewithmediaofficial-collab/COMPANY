import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { PageHeader } from '../../components/ui/page';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  DollarSign, PlusCircle, Download,
  Trash2, Edit3, Calendar, Filter, RefreshCcw,
  IndianRupee, Building2, FileText, Search,
  CheckCircle2, Clock, Plus, X, ChevronRight, ChevronDown,
  AlertCircle, ArrowRight
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

// ─── Helper: format date to yyyy-MM-dd safely without timezone drift ──────────
const toDateStr = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

// ─── Helper: calculate next day string (e.g. '2026-09-06' -> '2026-09-07') ───
const getNextDateStr = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {
    console.error('Error calculating next date:', e);
  }
  return '';
};

// ─── Helper: format display date (e.g. '01 Sep 2026') ────────────────────────
const formatDisplayDate = (d, includeYear = true) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return format(dt, includeYear ? 'dd MMM yyyy' : 'dd MMM');
  } catch {
    return '—';
  }
};

// ─── Factory for an empty deposit entry ───────────────────────────────────────
const createDepositEntry = (fromDate = '', toDate = '', depositDate = '') => ({
  fromDate,
  toDate,
  depositDate: depositDate || fromDate || toDateStr(new Date()),
  amount: '',
  notes: '',
});

// ─── KPI Card Component ───────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color = 'primary', testId }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
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

  // ── Expanded rows state (for deposit breakdown in table) ──────────
  const [expandedRows, setExpandedRows] = useState({});

  // ── Drawer State (Add / Edit) ─────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Form State ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    client: '',
    fromDate: '',
    toDate: '',
    monthlyBudget: '',
    deposits: [createDepositEntry()],
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

        crmList.forEach(c => {
          if (c?._id && !ids.has(String(c._id))) {
            ids.add(String(c._id));
            merged.push(c);
          }
        });

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

  // ── Fetch Budgets and Summary ─────────────────────────────────────
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

  // ── Derived KPI Totals ─────────────────────────────────────────────
  const derivedTotals = useMemo(() => {
    if (summary) {
      return {
        totalMonthly: summary.totalMonthlyBudget || 0,
        totalDeposited: summary.totalAmountDeposited || 0,
        totalBalance: summary.totalBalance || 0,
        totalClients: summary.totalClients || 0,
      };
    }
    const totalMonthly = budgets.reduce((acc, b) => acc + (Number(b.monthlyBudget) || 0), 0);
    const totalDeposited = budgets.reduce((acc, b) => acc + (Number(b.amountDeposited) || 0), 0);
    const totalBalance = budgets.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
    return {
      totalMonthly,
      totalDeposited,
      totalBalance,
      totalClients: new Set(budgets.map(b => String(b.client?._id || b.client))).size,
    };
  }, [summary, budgets]);

  // ── Open Create Drawer ────────────────────────────────────────────
  const handleOpenCreateDrawer = () => {
    setEditingId(null);
    setForm({
      client: filterClient || (clientsList[0]?._id ? String(clientsList[0]._id) : ''),
      fromDate: '',
      toDate: '',
      monthlyBudget: '',
      deposits: [createDepositEntry()],
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  // ── Open Edit Drawer ──────────────────────────────────────────────
  const handleOpenEditDrawer = (budget) => {
    setEditingId(budget._id);
    const fromDate = toDateStr(budget.fromDate);
    const toDate = toDateStr(budget.toDate);

    const deposits = (budget.deposits && budget.deposits.length > 0)
      ? budget.deposits.map(d => ({
          fromDate: toDateStr(d.fromDate),
          toDate: toDateStr(d.toDate),
          depositDate: toDateStr(d.depositDate) || toDateStr(d.fromDate) || toDateStr(new Date()),
          amount: d.amount !== undefined ? String(d.amount) : '',
          notes: d.notes || '',
        }))
      : [createDepositEntry(fromDate, toDate, fromDate)];

    setForm({
      client: budget.client?._id || budget.client || '',
      fromDate,
      toDate,
      monthlyBudget: budget.monthlyBudget !== undefined ? String(budget.monthlyBudget) : '',
      deposits,
      notes: budget.notes || '',
    });
    setIsDrawerOpen(true);
  };

  // ── Handle Period Change (From Date / To Date) ────────────────────
  const handlePeriodChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };

      // If user sets fromDate and deposit #1 has no fromDate, sync deposit #1
      if (field === 'fromDate' && value && prev.deposits.length === 1 && !prev.deposits[0].fromDate) {
        updated.deposits = [
          {
            ...prev.deposits[0],
            fromDate: value,
            depositDate: prev.deposits[0].depositDate || value,
          }
        ];
      }

      return updated;
    });
  };

  // ── Handle Adding a New Deposit Entry ─────────────────────────────
  // If previous deposit has toDate e.g. 6th, next fromDate starts from 7th automatically!
  const handleAddDeposit = () => {
    const lastDeposit = form.deposits[form.deposits.length - 1];
    let nextFromDate = '';

    if (lastDeposit) {
      const refDate = lastDeposit.toDate || lastDeposit.depositDate || lastDeposit.fromDate;
      if (refDate) {
        nextFromDate = getNextDateStr(refDate);
      }
    }

    // Fallback to monthly fromDate if no reference date found
    if (!nextFromDate && form.fromDate) {
      nextFromDate = form.fromDate;
    }

    const newEntry = createDepositEntry(nextFromDate, '', nextFromDate);

    setForm(prev => ({
      ...prev,
      deposits: [...prev.deposits, newEntry],
    }));
  };

  // ── Handle Removing a Deposit Entry ───────────────────────────────
  const handleRemoveDeposit = (index) => {
    setForm(prev => ({
      ...prev,
      deposits: prev.deposits.filter((_, i) => i !== index),
    }));
  };

  // ── Handle Deposit Field Change ───────────────────────────────────
  const handleDepositChange = (index, field, value) => {
    setForm(prev => {
      const updated = prev.deposits.map((d, i) => {
        if (i !== index) return d;
        const entry = { ...d, [field]: value };

        // If fromDate changes and depositDate is not explicitly different, sync depositDate
        if (field === 'fromDate' && value && !d.depositDate) {
          entry.depositDate = value;
        }
        return entry;
      });
      return { ...prev, deposits: updated };
    });
  };

  // ── Live Totals for Drawer Preview ────────────────────────────────
  const isPeriodSelected = Boolean(form.fromDate && form.toDate);
  const liveMonthly = Number(form.monthlyBudget) || 0;
  const liveDeposited = form.deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const liveBalance = liveMonthly - liveDeposited;

  // ── Save Budget Entry (Add or Update) ─────────────────────────────
  const handleSaveBudget = async (e) => {
    e.preventDefault();

    if (!form.client) {
      toast.error('Please select a client');
      return;
    }
    if (!form.fromDate || !form.toDate) {
      toast.error('Please select From Date and To Date for the monthly budget period');
      return;
    }
    if (new Date(form.fromDate) > new Date(form.toDate)) {
      toast.error('From Date cannot be later than To Date');
      return;
    }
    if (!form.monthlyBudget || Number(form.monthlyBudget) < 0) {
      toast.error('Please enter a valid monthly budget amount');
      return;
    }

    // Validate each deposit entry
    for (let i = 0; i < form.deposits.length; i++) {
      const d = form.deposits[i];
      if (!d.depositDate) {
        toast.error(`Please select the date deposited for Deposit #${i + 1}`);
        return;
      }
      if (!d.amount || Number(d.amount) <= 0) {
        toast.error(`Please enter a valid deposit amount for Deposit #${i + 1}`);
        return;
      }
      if (d.fromDate && d.toDate && new Date(d.fromDate) > new Date(d.toDate)) {
        toast.error(`Deposit #${i + 1}: From Date cannot be later than To Date`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        client: form.client,
        fromDate: form.fromDate,
        toDate: form.toDate,
        monthlyBudget: Number(form.monthlyBudget) || 0,
        deposits: form.deposits.map(d => ({
          fromDate: d.fromDate || null,
          toDate: d.toDate || null,
          depositDate: d.depositDate,
          amount: Number(d.amount) || 0,
          notes: d.notes || '',
        })),
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

  // ── Toggle row deposits breakdown ─────────────────────────────────
  const toggleExpanded = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        title="Client Ad Budget"
        subtitle="Manage client monthly ad budgets, period date ranges, deposited amounts, and balance tracking"
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

      {/* ── KPI Summary Cards (Daily Budget removed) ────────────────── */}
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
          testId="kpi-total-clients"
          icon={Building2}
          label="Active Clients"
          value={derivedTotals.totalClients}
          sub="Clients with budget ledgers"
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
          {/* Client Filter */}
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

      {/* ── Client Budget Ledger Table (Daily budget removed) ───────── */}
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
            <p className="text-xs text-muted-foreground">Add a client monthly budget with date range and deposited amounts</p>
            <button
              onClick={handleOpenCreateDrawer}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-95"
            >
              <PlusCircle size={14} /> Add Budget
            </button>
          </div>
        ) : (
          <div className="responsive-table-container overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]" id="budget-ledger-table">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Client</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Budget Period</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Monthly Budget</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Amount Deposited</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Balance</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Deposits</th>
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
                  const deposited = Number(b.amountDeposited) || 0;
                  const balance = b.balance !== undefined ? Number(b.balance) : (monthly - deposited);
                  const deposits = b.deposits || [];
                  const isExpanded = expandedRows[b._id];

                  return (
                    <React.Fragment key={b._id}>
                      <tr className="hover:bg-secondary/20 transition-colors">
                        {/* Client */}
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

                        {/* Budget Period */}
                        <td className="px-3 py-3.5 text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary/70" />
                            <span className="font-semibold text-foreground">
                              {formatDisplayDate(b.fromDate, false)}
                              <span className="text-muted-foreground mx-1">→</span>
                              {formatDisplayDate(b.toDate, true)}
                            </span>
                          </div>
                        </td>

                        {/* Monthly Budget */}
                        <td className="px-3 py-3.5 text-right font-black text-foreground font-mono text-[13px]">
                          {fmt(monthly)}
                        </td>

                        {/* Amount Deposited */}
                        <td className="px-3 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400 font-mono text-[13px]">
                          {fmt(deposited)}
                        </td>

                        {/* Balance Amount */}
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

                        {/* Deposits Count Badge & Toggle */}
                        <td className="px-3 py-3.5 text-center">
                          {deposits.length > 0 ? (
                            <button
                              onClick={() => toggleExpanded(b._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-bold hover:bg-amber-500/20 transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              {deposits.length} deposit{deposits.length !== 1 ? 's' : ''}
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40 italic text-[11px]">No deposits</span>
                          )}
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

                      {/* Expanded deposit breakdown cards */}
                      {isExpanded && deposits.length > 0 && (
                        <tr className="bg-secondary/15">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <IndianRupee size={12} className="text-amber-500" />
                                Individual Deposit Tranches ({deposits.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {deposits.map((dep, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                        Tranche #{idx + 1}
                                      </span>
                                      <span className="text-[13px] font-black text-amber-600 dark:text-amber-400 font-mono">
                                        {fmt(dep.amount)}
                                      </span>
                                    </div>

                                    {/* Period (From - To) */}
                                    {(dep.fromDate || dep.toDate) && (
                                      <div className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                                        <Calendar size={11} className="text-primary/70" />
                                        <span>
                                          {formatDisplayDate(dep.fromDate, false)}
                                          <span className="text-muted-foreground mx-1">→</span>
                                          {formatDisplayDate(dep.toDate, true)}
                                        </span>
                                      </div>
                                    )}

                                    {/* Date deposited */}
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock size={10} className="text-muted-foreground/70" />
                                      <span>Deposited: {formatDisplayDate(dep.depositDate, true)}</span>
                                    </div>

                                    {/* Note */}
                                    {dep.notes && (
                                      <p className="text-[10px] text-muted-foreground italic border-t border-border pt-1 truncate" title={dep.notes}>
                                        {dep.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
        subtitle="Select dates first, enter monthly budget, and add multiple deposit tranches"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs" id="budget-entry-form">

          {/* ── Step 1: Client Selection ───────────────────────────────── */}
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

          {/* ── Step 2: Monthly Budget Period & Amount ─────────────────── */}
          <div className="p-3.5 bg-secondary/30 border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-500" /> 1. Monthly Budget Period
              </h4>
              <span className="text-[10px] text-muted-foreground">Select dates first</span>
            </div>

            {/* From Date & To Date selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">
                  From Date *
                </label>
                <input
                  id="log-from-date"
                  type="date"
                  required
                  value={form.fromDate}
                  onChange={e => handlePeriodChange('fromDate', e.target.value)}
                  className="app-input w-full"
                />
              </div>
              <div>
                <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">
                  To Date *
                </label>
                <input
                  id="log-to-date"
                  type="date"
                  required
                  min={form.fromDate || undefined}
                  value={form.toDate}
                  onChange={e => handlePeriodChange('toDate', e.target.value)}
                  className="app-input w-full"
                />
              </div>
            </div>

            {/* Monthly Budget Amount (Enabled only after From & To Date are chosen) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-blue-600 dark:text-blue-400">
                  Monthly Budget Amount (₹) *
                </label>
                {!isPeriodSelected && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle size={10} /> Select From & To Date first
                  </span>
                )}
              </div>
              <input
                id="log-monthly-budget"
                type="number"
                min="0"
                required
                disabled={!isPeriodSelected}
                placeholder={isPeriodSelected ? "e.g. 50000" : "Please select From and To Date above first"}
                value={form.monthlyBudget}
                onChange={e => setForm({ ...form, monthlyBudget: e.target.value })}
                className={`app-input font-bold font-mono w-full ${
                  !isPeriodSelected ? 'opacity-50 cursor-not-allowed bg-secondary/50' : ''
                }`}
              />
            </div>
          </div>

          {/* ── Step 3: Deposit Entries (Multiple with + Option) ──────── */}
          <div className="p-3.5 bg-secondary/30 border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee size={13} className="text-amber-500" /> 2. Amount Deposited
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold">
                    {form.deposits.length} tranche{form.deposits.length !== 1 ? 's' : ''}
                  </span>
                </h4>
              </div>
              {/* Plus Option to add multiple deposits */}
              <button
                type="button"
                id="add-deposit-btn"
                onClick={handleAddDeposit}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700 transition-all shadow-sm"
                title="Add another deposit tranche"
              >
                <Plus size={13} /> Add Deposit
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Select date range & date deposited. Each new tranche automatically continues from the next day (e.g. 1st–6th → 7th).
            </p>

            <div className="space-y-3">
              {form.deposits.map((dep, idx) => {
                // Determine min fromDate for entry idx > 0
                const prevDep = idx > 0 ? form.deposits[idx - 1] : null;
                const minFromDate = prevDep ? getNextDateStr(prevDep.toDate || prevDep.depositDate) : form.fromDate;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-card border border-border rounded-xl space-y-2.5 relative shadow-sm"
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        Deposit #{idx + 1}
                      </span>
                      {form.deposits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDeposit(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                          title="Remove this deposit"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Deposit Date Range (e.g. 1st to 6th, then next 7th onwards) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-muted-foreground block mb-1 text-[10px] uppercase tracking-wider">
                          Period: From Date
                        </label>
                        <input
                          type="date"
                          min={minFromDate || undefined}
                          value={dep.fromDate}
                          onChange={e => handleDepositChange(idx, 'fromDate', e.target.value)}
                          className="app-input w-full text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-muted-foreground block mb-1 text-[10px] uppercase tracking-wider">
                          Period: To Date
                        </label>
                        <input
                          type="date"
                          min={dep.fromDate || minFromDate || undefined}
                          value={dep.toDate}
                          onChange={e => handleDepositChange(idx, 'toDate', e.target.value)}
                          className="app-input w-full text-xs"
                        />
                      </div>
                    </div>

                    {/* Date Deposited & Amount */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-amber-600 dark:text-amber-400 block mb-1 text-[11px] flex items-center gap-1">
                          <Clock size={11} /> Date of Deposit *
                        </label>
                        <input
                          type="date"
                          required
                          value={dep.depositDate}
                          onChange={e => handleDepositChange(idx, 'depositDate', e.target.value)}
                          className="app-input w-full text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-amber-600 dark:text-amber-400 block mb-1 text-[11px] flex items-center gap-1">
                          <IndianRupee size={11} /> Amount Deposited (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="e.g. 15000"
                          value={dep.amount}
                          onChange={e => handleDepositChange(idx, 'amount', e.target.value)}
                          className="app-input font-bold font-mono w-full text-xs"
                        />
                      </div>
                    </div>

                    {/* Notes / Remarks for this deposit */}
                    <div>
                      <input
                        type="text"
                        placeholder="Optional remarks (e.g. Bank transfer, Ref #12345)"
                        value={dep.notes}
                        onChange={e => handleDepositChange(idx, 'notes', e.target.value)}
                        className="app-input w-full text-[11px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plus Button to add another deposit */}
            <button
              type="button"
              id="add-another-deposit-btn"
              onClick={handleAddDeposit}
              className="w-full py-2.5 border-2 border-dashed border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Another Deposit Tranche
            </button>
          </div>

          {/* ── Live Dynamic Balance Summary ──────────────────────────── */}
          <div
            id="live-balance-preview"
            className="p-3.5 bg-card rounded-xl border border-border text-xs space-y-2 shadow-sm"
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign size={11} className="text-primary" /> Live Balance Summary
            </p>
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>Monthly Budget:</span>
              <span className="font-bold text-foreground font-mono">{fmt(liveMonthly)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>Total Deposited ({form.deposits.length} {form.deposits.length === 1 ? 'entry' : 'entries'}):</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{fmt(liveDeposited)}</span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="font-bold text-foreground">
                Balance Amount <span className="text-[10px] text-muted-foreground font-normal">(Monthly - Deposited)</span>:
              </span>
              <span
                className={`font-black font-mono text-sm px-2.5 py-0.5 rounded-md ${
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

          {/* ── General Notes / Remarks ────────────────────────────────── */}
          <div>
            <label className="font-semibold text-foreground block mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-muted-foreground" /> Budget Notes / Remarks
            </label>
            <textarea
              id="log-notes"
              rows={2}
              placeholder="e.g. Client ad campaign for festival promotion with phased tranche deposits..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 bg-background border border-border rounded-xl outline-none text-xs resize-none focus:border-primary transition-colors"
            />
          </div>

          {/* ── Drawer Actions ─────────────────────────────────────────── */}
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
