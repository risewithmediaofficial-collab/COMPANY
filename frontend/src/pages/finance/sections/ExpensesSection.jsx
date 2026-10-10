import { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Building,
  Check,
  AlertCircle,
  CalendarCheck,
  Calendar,
  ArrowUpDown,
  X,
  Edit2,
  Trash2,
  User,
  Users,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useModuleExpenses,
  usePayVendorBill,
  useUpdateModuleExpense,
  useDeleteModuleExpense,
  useSubscriptions,
  useUpdateSubscription,
  useDeleteSubscription,
  usePostSubscriptionRenewal,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';

export default function ExpensesSection({ onQuickAdd }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'payees' | 'subscriptions'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [payeeSearch, setPayeeSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)

  // Payee / Vendor Ledger State
  const [selectedPayeeForLedger, setSelectedPayeeForLedger] = useState(null);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'office',
    vendor: '',
    costType: 'agency_overhead',
    paymentStatus: 'paid',
    date: '',
    notes: '',
  });

  // Edit Subscription State
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    serviceName: '',
    vendor: '',
    frequency: 'monthly',
    expectedAmount: '',
    nextRenewalDate: '',
    costClassification: 'software',
    notes: '',
  });

  const { data: expenses = [] } = useModuleExpenses({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    startDate: fromDate || undefined,
    endDate: toDate || undefined,
    sortOrder: dateSort,
  });

  const { data: subscriptions = [] } = useSubscriptions();

  const payVendorBill = usePayVendorBill();
  const updateExpense = useUpdateModuleExpense();
  const deleteExpense = useDeleteModuleExpense();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const postRenewal = usePostSubscriptionRenewal();

  const handleStartEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      title: exp.title || '',
      amount: exp.amount || '',
      category: exp.category || 'office',
      vendor: exp.vendor || '',
      costType: exp.costType || 'agency_overhead',
      paymentStatus: exp.paymentStatus || 'paid',
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : '',
      notes: exp.notes || '',
    });
  };

  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      await updateExpense.mutateAsync({
        id: editingExpense._id,
        data: {
          ...expenseForm,
          amount: Number(expenseForm.amount),
        },
      });
      setEditingExpense(null);
    } catch (_) {}
  };

  const handleDeleteExpense = async (exp) => {
    if (window.confirm(`Are you sure you want to delete expense "${exp.title}"?`)) {
      try {
        await deleteExpense.mutateAsync(exp._id);
      } catch (_) {}
    }
  };

  const handleStartEditSubscription = (sub) => {
    setEditingSubscription(sub);
    setSubscriptionForm({
      serviceName: sub.serviceName || '',
      vendor: sub.vendor || '',
      frequency: sub.frequency || 'monthly',
      expectedAmount: sub.expectedAmount || '',
      nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toISOString().slice(0, 10) : '',
      costClassification: sub.costClassification || 'software',
      notes: sub.notes || '',
    });
  };

  const handleSaveEditSubscription = async (e) => {
    e.preventDefault();
    if (!editingSubscription) return;
    try {
      await updateSubscription.mutateAsync({
        id: editingSubscription._id,
        data: {
          ...subscriptionForm,
          expectedAmount: Number(subscriptionForm.expectedAmount),
        },
      });
      setEditingSubscription(null);
    } catch (_) {}
  };

  const handleDeleteSubscription = async (sub) => {
    if (window.confirm(`Are you sure you want to delete subscription "${sub.serviceName}"?`)) {
      try {
        await deleteSubscription.mutateAsync(sub._id);
      } catch (_) {}
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.date || e.createdAt;
      if (fromDate && expDate) {
        const d = new Date(expDate).toISOString().slice(0, 10);
        if (d < fromDate) return false;
      }
      if (toDate && expDate) {
        const d = new Date(expDate).toISOString().slice(0, 10);
        if (d > toDate) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const title = (e.title || '').toLowerCase();
      const vendor = (e.vendor || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      return title.includes(q) || vendor.includes(q) || cat.includes(q);
    });
  }, [expenses, fromDate, toDate, search]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredExpenses, dateSort]);

  // Group all expenses by Payee / Vendor
  const payeeSummaries = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const payeeName = (e.vendor || '').trim();
      const displayName = payeeName || 'Unassigned / General';
      const key = displayName.toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: displayName,
          rawName: payeeName,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          totalCount: 0,
          paidCount: 0,
          pendingCount: 0,
          items: [],
        };
      }
      const amt = Number(e.amount || 0);
      map[key].totalAmount += amt;
      map[key].totalCount += 1;
      map[key].items.push(e);
      if (e.paymentStatus === 'paid') {
        map[key].paidAmount += amt;
        map[key].paidCount += 1;
      } else {
        map[key].pendingAmount += amt;
        map[key].pendingCount += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  const filteredPayees = useMemo(() => {
    if (!payeeSearch.trim()) return payeeSummaries;
    const q = payeeSearch.toLowerCase();
    return payeeSummaries.filter((p) => p.name.toLowerCase().includes(q));
  }, [payeeSummaries, payeeSearch]);

  const activePayeeDetails = useMemo(() => {
    if (!selectedPayeeForLedger) return null;
    const target = selectedPayeeForLedger.toLowerCase();
    const matching = expenses.filter((e) => {
      const v = (e.vendor || '').trim();
      if (target === 'unassigned / general') return !v;
      return v.toLowerCase() === target;
    });
    const totalAmount = matching.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paidAmount = matching.filter((e) => e.paymentStatus === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);
    const pendingAmount = matching.filter((e) => e.paymentStatus !== 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);
    return {
      name: selectedPayeeForLedger,
      items: [...matching].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      totalAmount,
      paidAmount,
      pendingAmount,
      totalCount: matching.length,
      paidCount: matching.filter((e) => e.paymentStatus === 'paid').length,
      pendingCount: matching.filter((e) => e.paymentStatus !== 'paid').length,
    };
  }, [expenses, selectedPayeeForLedger]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unpaidBills = filteredExpenses.filter((e) => e.paymentStatus === 'unpaid');
  const totalUnpaidBills = unpaidBills.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleExport = () => {
    const rows = filteredExpenses.map((e) => ({
      date: formatDateIST(e.date),
      title: e.title,
      vendor: e.vendor || '',
      category: e.category,
      costType: e.costType,
      amount: e.amount,
      status: e.paymentStatus,
      account: e.fundingAccount?.accountName || '-',
    }));
    exportToCSV('agency_expenses_and_bills', rows, [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Item / Title' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'category', label: 'Category' },
      { key: 'costType', label: 'Cost Type' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'status', label: 'Payment Status' },
      { key: 'account', label: 'Funding Account' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL POSTED EXPENSES</span>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalExpenses)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recognized operating agency costs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>UNPAID VENDOR BILLS</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatINR(totalUnpaidBills)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{unpaidBills.length} vendor bills pending payment</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>RECURRING SUBSCRIPTIONS</span>
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{subscriptions.length} Active Tools</div>
          <div className="text-[11px] text-slate-500 mt-1">Scheduled software & hosting commitments</div>
        </div>
      </div>

      {/* Sub Tabs: Expenses / Payees / Subscriptions */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Operational Expenses & Vendor Bills ({filteredExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('payees')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'payees'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 Payee & Vendor Ledgers ({payeeSummaries.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Recurring Subscriptions ({subscriptions.length})
        </button>
      </div>

      {activeTab === 'expenses' && (
        <>
          {/* Filters & Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, vendor, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="production_shoot">Production / Shoot</option>
                <option value="travel">Travel</option>
                <option value="freelancers">Freelancers</option>
                <option value="software_subscriptions">Software / Subscriptions</option>
                <option value="rent">Rent</option>
                <option value="internet">Internet & Utilities</option>
                <option value="marketing">Marketing</option>
                <option value="office">Office Expenses</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid Expenses</option>
                <option value="unpaid">Unpaid Vendor Bills</option>
              </select>

              {/* Date to Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Dates:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="From Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="To Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Reset Date Range"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Date Sorting Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={dateSort}
                  onChange={(e) => setDateSort(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold cursor-pointer"
                >
                  <option value="desc">Date: Newest First (Desc)</option>
                  <option value="asc">Date: Oldest First (Asc)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                onClick={() => onQuickAdd('expense')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Expense / Bill
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] shadow-2xs">
                  <tr>
                    <th
                      onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      title="Click to toggle date sort (Newest / Oldest)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        <span className="text-indigo-600 font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                      </div>
                    </th>
                    <th className="p-3">Item / Description</th>
                    <th className="p-3">Vendor / Payee</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Cost Type</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No expenses or vendor bills found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-slate-600 font-medium">{formatDateIST(exp.date)}</td>
                        <td className="p-3 font-semibold text-slate-900">{exp.title}</td>
                        <td className="p-3 text-slate-700">
                          {exp.vendor ? (
                            <button
                              onClick={() => setSelectedPayeeForLedger(exp.vendor)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer group"
                              title={`Open ${exp.vendor}'s payment history & pending balance ledger`}
                            >
                              <User className="h-3 w-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                              <span>{exp.vendor}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEditExpense(exp)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 px-1.5 py-0.5 rounded border border-dashed border-slate-200 transition-colors cursor-pointer"
                              title="Click to assign payee/vendor name (e.g. VJ, Videographer)"
                            >
                              <Plus className="h-2.5 w-2.5" /> Assign Payee
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {exp.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              exp.costType === 'client_project'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {exp.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              exp.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {exp.paymentStatus === 'paid' ? 'Paid' : 'Unpaid Bill'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-sm">{formatINR(exp.amount)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {exp.paymentStatus === 'unpaid' ? (
                              <button
                                onClick={() => payVendorBill.mutate({ id: exp._id })}
                                disabled={payVendorBill.isPending}
                                className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 transition-colors disabled:opacity-50"
                              >
                                Pay Bill
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[10px] px-2 py-0.5 rounded bg-emerald-50">
                                Paid
                              </span>
                            )}
                            <button
                              onClick={() => handleStartEditExpense(exp)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              disabled={deleteExpense.isPending}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. PAYEES & VENDOR LEDGERS TAB */}
      {activeTab === 'payees' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search payee name, videographer, editor..."
                value={payeeSearch}
                onChange={(e) => setPayeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                {filteredPayees.length} {filteredPayees.length === 1 ? 'payee' : 'payees'} found
              </span>
              <button
                onClick={() => onQuickAdd('expense')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Expense / Bill
              </button>
            </div>
          </div>

          {/* Payees Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] shadow-2xs">
                  <tr>
                    <th className="p-3">Payee / Person / Vendor</th>
                    <th className="p-3 text-center">Bills & Payments Count</th>
                    <th className="p-3 text-right">Total Incurred</th>
                    <th className="p-3 text-right">Total Paid</th>
                    <th className="p-3 text-right">Pending to Pay</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        No payees or vendor records found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPayees.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button
                                onClick={() => setSelectedPayeeForLedger(p.name)}
                                className="font-bold text-slate-900 hover:text-indigo-600 text-left hover:underline cursor-pointer block"
                              >
                                {p.name}
                              </button>
                              <div className="text-[10px] text-slate-400">
                                {p.items[0]?.category ? p.items[0].category.replace(/_/g, ' ') : 'Payee Account'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-slate-800">{p.totalCount}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({p.paidCount} paid, {p.pendingCount} unpaid)</span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatINR(p.totalAmount)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{formatINR(p.paidAmount)}</td>
                        <td className="p-3 text-right font-bold text-sm">
                          {p.pendingAmount > 0 ? (
                            <span className="text-amber-600 font-extrabold">{formatINR(p.pendingAmount)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">₹0.00</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.pendingAmount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                              Payment Due
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Fully Cleared
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedPayeeForLedger(p.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <span>Open Ledger</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. RECURRING SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Software & Agency Subscriptions</h3>
              <p className="text-xs text-slate-500">
                Scheduled commitments automatically forecasted without unauthorized auto-debits
              </p>
            </div>
            <button
              onClick={() => onQuickAdd('subscription')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              + Schedule Subscription
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[600px] text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] shadow-2xs">
                <tr>
                  <th className="p-3">Tool / Service</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Expected Amount</th>
                  <th className="p-3">Next Renewal Date</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No recurring subscriptions scheduled.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{sub.serviceName}</td>
                      <td className="p-3 text-slate-600">{sub.vendor || sub.serviceName}</td>
                      <td className="p-3 capitalize">{sub.frequency}</td>
                      <td className="p-3 font-bold text-slate-900">{formatINR(sub.expectedAmount)}</td>
                      <td className="p-3 font-medium text-amber-700">{formatDateIST(sub.nextRenewalDate)}</td>
                      <td className="p-3 capitalize">{sub.costClassification}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => postRenewal.mutate({ id: sub._id, actualAmount: sub.expectedAmount })}
                            disabled={postRenewal.isPending}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            Post Renewal
                          </button>
                          <button
                            onClick={() => handleStartEditSubscription(sub)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Subscription"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubscription(sub)}
                            disabled={deleteSubscription.isPending}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Subscription"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      <Dialog open={Boolean(editingExpense)} onOpenChange={(open) => !open && setEditingExpense(null)}>
        {editingExpense && (
          <DialogContent variant="center" size="md" className="rounded-2xl p-6 text-xs max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Edit Expense / Vendor Bill</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update details for {editingExpense.title}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditExpense} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Title / Description</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. VJ, Videographer, Saran"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-400">Quick set:</span>
                    {['VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: sug }))}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-medium text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="production_shoot">Production / Shoot</option>
                    <option value="travel">Travel Allowance</option>
                    <option value="freelancers">Freelancers</option>
                    <option value="software_subscriptions">Software / Subscriptions</option>
                    <option value="rent">Rent</option>
                    <option value="internet">Internet & Utilities</option>
                    <option value="marketing">Marketing</option>
                    <option value="office">Office Expenses</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cost Type</label>
                  <select
                    value={expenseForm.costType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, costType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="agency_overhead">Agency Overhead</option>
                    <option value="client_project">Client Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Status</label>
                  <select
                    value={expenseForm.paymentStatus}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid Vendor Bill</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Optional internal remarks..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateExpense.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateExpense.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* EDIT SUBSCRIPTION MODAL */}
      <Dialog open={Boolean(editingSubscription)} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        {editingSubscription && (
          <DialogContent variant="center" size="md" className="rounded-2xl p-6 text-xs max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Edit Subscription</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update commitment for {editingSubscription.serviceName}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditSubscription} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Service / Tool Name</label>
                <input
                  type="text"
                  required
                  value={subscriptionForm.serviceName}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, serviceName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={subscriptionForm.expectedAmount}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expectedAmount: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Frequency</label>
                  <select
                    value={subscriptionForm.frequency}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, frequency: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Renewal Date</label>
                  <input
                    type="date"
                    required
                    value={subscriptionForm.nextRenewalDate}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, nextRenewalDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classification</label>
                  <select
                    value={subscriptionForm.costClassification}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, costClassification: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="software">Software / SaaS</option>
                    <option value="tools">Tools & Utilities</option>
                    <option value="hosting">Hosting / Cloud</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubscription(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubscription.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateSubscription.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* PAYEE / VENDOR STATEMENT & LEDGER MODAL */}
      <Dialog open={Boolean(selectedPayeeForLedger)} onOpenChange={(open) => !open && setSelectedPayeeForLedger(null)}>
        {selectedPayeeForLedger && activePayeeDetails && (
          <DialogContent variant="center" size="lg" className="rounded-2xl p-6 text-xs max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>Payee Ledger: {activePayeeDetails.name}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Detailed payment ledger, clearance history, and pending balances
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed / Tasks</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{formatINR(activePayeeDetails.totalAmount)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{activePayeeDetails.totalCount} total entries</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Cleared / Paid</span>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">{formatINR(activePayeeDetails.paidAmount)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">{activePayeeDetails.paidCount} cleared</div>
              </div>
              <div className={`p-3 rounded-xl border ${activePayeeDetails.pendingAmount > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pending to Pay</span>
                <div className={`text-lg font-bold mt-0.5 ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-900'}`}>
                  {formatINR(activePayeeDetails.pendingAmount)}
                </div>
                <div className={`text-[10px] mt-0.5 ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                  {activePayeeDetails.pendingCount > 0 ? `${activePayeeDetails.pendingCount} unpaid bills` : 'All cleared'}
                </div>
              </div>
            </div>

            {/* List of Transactions */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Payment Transactions</span>
                <span className="text-[10px] text-slate-500">{activePayeeDetails.items.length} records</span>
              </div>
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Item / Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePayeeDetails.items.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-600 font-medium whitespace-nowrap">{formatDateIST(item.date)}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.title}</td>
                        <td className="p-2.5">
                          <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {item.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatINR(item.amount)}</td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.paymentStatus !== 'paid' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateExpense.mutateAsync({
                                      id: item._id,
                                      data: { paymentStatus: 'paid' },
                                    });
                                  } catch (_) {}
                                }}
                                disabled={updateExpense.isPending}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                                title="Clear and mark this bill as paid"
                              >
                                ✓ Pay
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedPayeeForLedger(null);
                                handleStartEditExpense(item);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit item"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayeeForLedger(null);
                  onQuickAdd('expense');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Record New Expense for {activePayeeDetails.name}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayeeForLedger(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
