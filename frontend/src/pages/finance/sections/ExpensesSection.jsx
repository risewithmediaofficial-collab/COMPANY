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
  Wallet,
  DollarSign,
  History,
  Sparkles,
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
  useAddExpensePayment,
  useDeleteExpensePayment,
  useUpdateModuleExpense,
  useDeleteModuleExpense,
  useSubscriptions,
  useUpdateSubscription,
  useDeleteSubscription,
  usePostSubscriptionRenewal,
  useFinanceAccounts,
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

  // Payee / Vendor Ledger & Expense Details Sidebar State
  const [selectedPayeeForLedger, setSelectedPayeeForLedger] = useState(null);
  const [selectedExpenseForSidebar, setSelectedExpenseForSidebar] = useState(null);

  // Add Payment / Installment State
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank',
    fundingAccount: '',
    reference: '',
    notes: '',
  });

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
  const { data: accounts = [] } = useFinanceAccounts();

  const payVendorBill = usePayVendorBill();
  const addExpensePayment = useAddExpensePayment();
  const deleteExpensePayment = useDeleteExpensePayment();
  const updateExpense = useUpdateModuleExpense();
  const deleteExpense = useDeleteModuleExpense();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const postRenewal = usePostSubscriptionRenewal();

  const handleOpenAddPayment = (exp) => {
    const total = Number(exp.amount || 0);
    const paid = Array.isArray(exp.payments) && exp.payments.length > 0
      ? exp.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
      : (exp.paidAmount != null ? Number(exp.paidAmount) : (exp.paymentStatus === 'paid' ? total : 0));
    const balance = Math.max(0, total - paid);

    setPaymentFormData({
      amount: balance > 0 ? String(balance) : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Bank',
      fundingAccount: exp.fundingAccount?._id || exp.fundingAccount || '',
      reference: '',
      notes: '',
    });
    setShowAddPaymentForm(true);
  };

  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentSelectedExpense) return;
    const amt = Number(paymentFormData.amount);
    if (!amt || amt <= 0) return;
    try {
      await addExpensePayment.mutateAsync({
        id: currentSelectedExpense._id,
        data: {
          amount: amt,
          paymentDate: paymentFormData.paymentDate,
          paymentMode: paymentFormData.paymentMode,
          fundingAccount: paymentFormData.fundingAccount || undefined,
          reference: paymentFormData.reference,
          notes: paymentFormData.notes,
        },
      });
      setShowAddPaymentForm(false);
    } catch (_) {}
  };

  const handleDeletePayment = async (paymentId) => {
    if (!currentSelectedExpense) return;
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await deleteExpensePayment.mutateAsync({
          expenseId: currentSelectedExpense._id,
          paymentId,
        });
      } catch (_) {}
    }
  };

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
      const paid = Number(e.paidAmount != null ? e.paidAmount : (e.paymentStatus === 'paid' ? amt : 0));
      const pending = Number(e.balanceAmount != null ? e.balanceAmount : Math.max(0, amt - paid));
      map[key].totalAmount += amt;
      map[key].paidAmount += paid;
      map[key].pendingAmount += pending;
      map[key].totalCount += 1;
      map[key].items.push(e);
      if (pending === 0 && amt > 0) {
        map[key].paidCount += 1;
      } else {
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
    const paidAmount = matching.reduce((s, e) => s + Number(e.paidAmount != null ? e.paidAmount : (e.paymentStatus === 'paid' ? e.amount : 0)), 0);
    const pendingAmount = matching.reduce((s, e) => s + Number(e.balanceAmount != null ? e.balanceAmount : Math.max(0, Number(e.amount || 0) - Number(e.paidAmount || 0))), 0);
    return {
      name: selectedPayeeForLedger,
      items: [...matching].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      totalAmount,
      paidAmount,
      pendingAmount,
      totalCount: matching.length,
      paidCount: matching.filter((e) => Number(e.balanceAmount || 0) === 0 && e.paymentStatus === 'paid').length,
      pendingCount: matching.filter((e) => Number(e.balanceAmount || 0) > 0 || e.paymentStatus !== 'paid').length,
    };
  }, [expenses, selectedPayeeForLedger]);

  const currentSelectedExpense = useMemo(() => {
    if (!selectedExpenseForSidebar) return null;
    return expenses.find((e) => e._id === selectedExpenseForSidebar._id) || selectedExpenseForSidebar;
  }, [expenses, selectedExpenseForSidebar]);

  const currentExpTotal = Number(currentSelectedExpense?.amount || 0);
  const currentExpPaid = Array.isArray(currentSelectedExpense?.payments) && currentSelectedExpense.payments.length > 0
    ? currentSelectedExpense.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    : (currentSelectedExpense?.paidAmount != null ? Number(currentSelectedExpense.paidAmount) : (currentSelectedExpense?.paymentStatus === 'paid' ? currentExpTotal : 0));
  const currentExpBalance = Math.max(0, currentExpTotal - currentExpPaid);
  const currentExpPercent = currentExpTotal > 0 ? Math.min(100, Math.round((currentExpPaid / currentExpTotal) * 100)) : 100;

  const displayedPayments = useMemo(() => {
    if (!currentSelectedExpense) return [];
    if (Array.isArray(currentSelectedExpense.payments) && currentSelectedExpense.payments.length > 0) {
      return [...currentSelectedExpense.payments].sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));
    }
    if (currentSelectedExpense.paymentStatus === 'paid' && currentExpPaid > 0) {
      return [{
        _id: 'legacy-settlement',
        amount: currentExpPaid,
        paymentDate: currentSelectedExpense.paymentDate || currentSelectedExpense.date,
        paymentMode: currentSelectedExpense.paymentMode || 'Bank',
        reference: 'Full Settlement',
        notes: 'Initial payment recorded',
        isLegacy: true,
      }];
    }
    return [];
  }, [currentSelectedExpense, currentExpPaid]);

  const relatedPayeeDetailsForExpense = useMemo(() => {
    if (!currentSelectedExpense?.vendor) return null;
    const target = currentSelectedExpense.vendor.trim().toLowerCase();
    const matching = expenses.filter((e) => (e.vendor || '').trim().toLowerCase() === target);
    const totalAmount = matching.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paidAmount = matching.reduce((s, e) => s + Number(e.paidAmount != null ? e.paidAmount : (e.paymentStatus === 'paid' ? e.amount : 0)), 0);
    const pendingAmount = matching.reduce((s, e) => s + Number(e.balanceAmount != null ? e.balanceAmount : Math.max(0, Number(e.amount || 0) - Number(e.paidAmount || 0))), 0);
    return {
      name: currentSelectedExpense.vendor,
      items: [...matching].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      totalAmount,
      paidAmount,
      pendingAmount,
      totalCount: matching.length,
      paidCount: matching.filter((e) => Number(e.balanceAmount || 0) === 0 && e.paymentStatus === 'paid').length,
      pendingCount: matching.filter((e) => Number(e.balanceAmount || 0) > 0 || e.paymentStatus !== 'paid').length,
    };
  }, [expenses, currentSelectedExpense]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unpaidBills = filteredExpenses.filter((e) => e.paymentStatus !== 'paid');
  const totalUnpaidBills = unpaidBills.reduce((sum, e) => sum + Number(e.balanceAmount != null ? e.balanceAmount : (e.paymentStatus === 'paid' ? 0 : e.amount)), 0);

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
                <option value="paid">Fully Paid Expenses</option>
                <option value="partially_paid">Partially Paid Bills</option>
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
                      <tr
                        key={exp._id}
                        onClick={() => setSelectedExpenseForSidebar(exp)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        title="Click row to view all details & history in sidebar"
                      >
                        <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{formatDateIST(exp.date)}</td>
                        <td className="p-3 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>{exp.title}</span>
                            <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">
                          {exp.vendor ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPayeeForLedger(exp.vendor);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer group/v"
                              title={`Open ${exp.vendor}'s payment history & pending balance ledger in sidebar`}
                            >
                              <User className="h-3 w-3 text-indigo-500 group-hover/v:scale-110 transition-transform" />
                              <span>{exp.vendor}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditExpense(exp);
                              }}
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
                                : exp.paymentStatus === 'partially_paid'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {exp.paymentStatus === 'paid'
                              ? 'Paid'
                              : exp.paymentStatus === 'partially_paid'
                              ? `Partially Paid (${formatINR(exp.paidAmount || 0)})`
                              : 'Unpaid Bill'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-sm">{formatINR(exp.amount)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {exp.paymentStatus !== 'paid' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpenseForSidebar(exp);
                                  handleOpenAddPayment(exp);
                                }}
                                className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Add payment or pay bill"
                              >
                                <Plus className="h-3 w-3" />
                                Pay / Add
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[10px] px-2 py-0.5 rounded bg-emerald-50">
                                Paid
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditExpense(exp)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp)}
                              disabled={deleteExpense.isPending}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                      <tr
                        key={p.name}
                        onClick={() => setSelectedPayeeForLedger(p.name)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        title={`Click row to view ${p.name}'s payment ledger in sidebar`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayeeForLedger(p.name);
                                }}
                                className="font-bold text-slate-900 group-hover:text-indigo-600 text-left hover:underline cursor-pointer block"
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
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayeeForLedger(p.name);
                            }}
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
                    <option value="paid">Paid (Fully Cleared)</option>
                    <option value="partially_paid">Partially Paid</option>
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

      {/* EXPENSE & PAYEE DETAILS SLIDE-OVER SIDE BAR DRAWER */}
      <Dialog
        open={Boolean(selectedPayeeForLedger || selectedExpenseForSidebar)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayeeForLedger(null);
            setSelectedExpenseForSidebar(null);
          }
        }}
      >
        <DialogContent variant="side" size="xl" className="flex flex-col h-full bg-white text-xs border-l border-slate-200 shadow-2xl p-0">
          {/* CASE 1: INDIVIDUAL EXPENSE DETAILS SIDEBAR */}
          {selectedExpenseForSidebar && currentSelectedExpense && (
            <>
              <DialogHeader className="p-5 border-b border-slate-200 bg-slate-50/80 pr-12">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        currentSelectedExpense.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentSelectedExpense.paymentStatus === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {currentSelectedExpense.paymentStatus === 'paid'
                          ? 'Paid / Cleared'
                          : currentSelectedExpense.paymentStatus === 'partially_paid'
                          ? `Partially Paid (${formatINR(currentExpPaid)} / ${formatINR(currentExpTotal)})`
                          : 'Unpaid Bill'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {formatDateIST(currentSelectedExpense.date)}
                      </span>
                    </div>
                    <DialogTitle className="text-base font-bold text-slate-900">
                      {currentSelectedExpense.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      {currentSelectedExpense.vendor ? `Payee: ${currentSelectedExpense.vendor}` : 'No payee assigned yet'} · {currentSelectedExpense.costType === 'client_project' ? 'Client Direct' : 'Agency Overhead'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  {currentExpBalance > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => payVendorBill.mutate({ id: currentSelectedExpense._id })}
                        disabled={payVendorBill.isPending}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        title={`Pay remaining balance of ${formatINR(currentExpBalance)}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {payVendorBill.isPending ? 'Processing...' : `Pay Full Balance (${formatINR(currentExpBalance)})`}
                      </button>
                    </>
                  )}
                  {currentExpBalance === 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Add an additional payment adjustment"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Payment
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartEditExpense(currentSelectedExpense)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const exp = currentSelectedExpense;
                      setSelectedExpenseForSidebar(null);
                      await handleDeleteExpense(exp);
                    }}
                    disabled={deleteExpense.isPending}
                    className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                {/* Primary Financial Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {formatINR(currentExpTotal)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Cleared</span>
                    <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                      {formatINR(currentExpPaid)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border ${currentExpBalance > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentExpBalance > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pending Balance</span>
                    <div className={`text-base font-extrabold mt-0.5 ${currentExpBalance > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {formatINR(currentExpBalance)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category / Type</span>
                    <div className="text-xs font-bold text-slate-800 mt-1 capitalize truncate">
                      {currentSelectedExpense.category?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {currentSelectedExpense.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                    </div>
                  </div>
                </div>

                {/* Settlement Progress Bar Strip */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-indigo-600" />
                      Settlement Progress
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {currentExpPercent}% Settled ({formatINR(currentExpPaid)} / {formatINR(currentExpTotal)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentExpPercent === 100 ? 'bg-emerald-500' : currentExpPercent > 0 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${currentExpPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>{displayedPayments.length} payment installment(s) recorded</span>
                    {currentExpBalance > 0 ? (
                      <span className="text-amber-700 font-bold">{formatINR(currentExpBalance)} pending clearance</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">✓ Fully Cleared</span>
                    )}
                  </div>
                </div>

                {/* PAYMENTS & INSTALLMENTS LIST & INLINE ADD FORM */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-xs">Payments & Installments</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {displayedPayments.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (showAddPaymentForm) {
                          setShowAddPaymentForm(false);
                        } else {
                          handleOpenAddPayment(currentSelectedExpense);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      {showAddPaymentForm ? 'Cancel' : 'Add Payment'}
                    </button>
                  </div>

                  {/* INLINE ADD PAYMENT FORM */}
                  {showAddPaymentForm && (
                    <form onSubmit={handleAddPaymentSubmit} className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5 text-indigo-600" />
                          Record New Payment / Installment
                        </span>
                        {currentExpBalance > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(currentExpBalance) }))}
                              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                            >
                              Pay Remaining (₹{currentExpBalance})
                            </button>
                            {currentExpBalance > 500 && (
                              <button
                                type="button"
                                onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(Math.round(currentExpBalance / 2)) }))}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                              >
                                50% (₹{Math.round(currentExpBalance / 2)})
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Payment Amount (₹) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="e.g. 1500"
                            value={paymentFormData.amount}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Payment Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={paymentFormData.paymentDate}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                            onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Payment Mode *
                          </label>
                          <select
                            value={paymentFormData.paymentMode}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMode: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                            <option value="Bank">Bank Transfer (NEFT/IMPS/RTGS)</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Debit / Credit Card</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Paid From Account
                          </label>
                          <select
                            value={paymentFormData.fundingAccount}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, fundingAccount: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="">Default / Not specified</option>
                            {accounts.map((acc) => (
                              <option key={acc._id} value={acc._id}>
                                {acc.accountName} ({acc.accountType})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Reference / UTR / Txn ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UPI Ref / Cheque #"
                            value={paymentFormData.reference}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Payment Remarks / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 50% advance for shoot, balance payment..."
                          value={paymentFormData.notes}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentForm(false)}
                          className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addExpensePayment.isPending}
                          className="px-4 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                        >
                          {addExpensePayment.isPending ? 'Recording...' : 'Save Payment'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TABLE / LIST OF PAYMENTS */}
                  {displayedPayments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50 space-y-1.5">
                      <Clock className="h-6 w-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">No payments recorded yet</p>
                      <p className="text-[11px] text-slate-400">
                        Record partial installments or full settlement as payments are made.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                        className="inline-flex items-center gap-1 px-3 py-1 mt-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <Plus className="h-3 w-3" />
                        Record First Payment
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Reference / Notes</th>
                            <th className="p-2.5 text-right">Amount</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedPayments.map((pmt, idx) => (
                            <tr key={pmt._id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">
                                {formatDateIST(pmt.paymentDate || pmt.createdAt)}
                              </td>
                              <td className="p-2.5">
                                <div className="flex flex-col">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold w-fit">
                                    {pmt.paymentMode || 'Bank'}
                                  </span>
                                  {(pmt.fundingAccount?.accountName || accounts.find((a) => String(a._id) === String(pmt.fundingAccount))?.accountName) && (
                                    <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                                      {pmt.fundingAccount?.accountName || accounts.find((a) => String(a._id) === String(pmt.fundingAccount))?.accountName}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-[11px]">
                                <div className="font-semibold text-slate-800">{pmt.reference || 'Payment'}</div>
                                {pmt.notes && <div className="text-slate-400 text-[10px] truncate max-w-[180px]">{pmt.notes}</div>}
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                                +{formatINR(pmt.amount)}
                              </td>
                              <td className="p-2.5 text-right">
                                {!pmt.isLegacy && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(pmt._id)}
                                    disabled={deleteExpensePayment.isPending}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Delete this payment record"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payee / Vendor Section */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-indigo-600" />
                      Payee / Vendor
                    </span>
                    {currentSelectedExpense.vendor && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayeeForLedger(currentSelectedExpense.vendor);
                          setSelectedExpenseForSidebar(null);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full Statement</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {currentSelectedExpense.vendor ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                            {currentSelectedExpense.vendor.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-indigo-950 text-xs block">{currentSelectedExpense.vendor}</span>
                            <span className="text-[10px] text-indigo-700">Assigned Vendor / Freelancer</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEditExpense(currentSelectedExpense)}
                          className="px-2 py-1 rounded bg-white text-indigo-700 font-semibold text-[11px] border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                        >
                          Change Payee
                        </button>
                      </div>

                      {/* Mini Ledger Stats for this vendor */}
                      {relatedPayeeDetailsForExpense && (
                        <div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Billed</span>
                              <span className="font-bold text-slate-800 text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.totalAmount)}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                              <span className="text-[9px] uppercase font-bold text-emerald-700 block">Cleared</span>
                              <span className="font-bold text-emerald-800 text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.paidAmount)}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                              <span className="text-[9px] uppercase font-bold text-amber-800 block">Pending</span>
                              <span className="font-bold text-amber-700 text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.pendingAmount)}</span>
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <span className="font-bold text-slate-700 text-[10px] uppercase">
                                Other Payments & Bills for {currentSelectedExpense.vendor} ({relatedPayeeDetailsForExpense.items.length})
                              </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                              {relatedPayeeDetailsForExpense.items.map((item) => (
                                <div
                                  key={item._id}
                                  onClick={() => setSelectedExpenseForSidebar(item)}
                                  className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                                    item._id === currentSelectedExpense._id ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <span className="text-slate-900 block">{item.title}</span>
                                    <span className="text-[10px] text-slate-400">{formatDateIST(item.date)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-slate-900 block">{formatINR(item.amount)}</span>
                                    <span className={`text-[9px] font-bold uppercase ${
                                      item.paymentStatus === 'paid'
                                        ? 'text-emerald-600'
                                        : item.paymentStatus === 'partially_paid'
                                        ? 'text-amber-600'
                                        : 'text-rose-600'
                                    }`}>
                                      {item.paymentStatus === 'paid' ? 'Paid' : item.paymentStatus === 'partially_paid' ? 'Partial' : 'Unpaid'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2">
                      <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>No vendor/payee assigned to this expense</span>
                      </div>
                      <div className="text-[10px] text-slate-500">1-click assign from common roles:</div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {['VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={async () => {
                              try {
                                await updateExpense.mutateAsync({
                                  id: currentSelectedExpense._id,
                                  data: { vendor: sug },
                                });
                              } catch (_) {}
                            }}
                            className="px-2 py-0.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-[10px] shadow-2xs transition-colors cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Block */}
                {currentSelectedExpense.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Internal Remarks & Notes
                    </span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{currentSelectedExpense.notes}</p>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {currentExpBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Payment
                    </button>
                  )}
                  {currentSelectedExpense.vendor && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExpenseForSidebar(null);
                        onQuickAdd('expense');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Record Another Expense for {currentSelectedExpense.vendor}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseForSidebar(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}

          {/* CASE 2: PAYEE / VENDOR STATEMENT & LEDGER SIDEBAR */}
          {selectedPayeeForLedger && activePayeeDetails && !selectedExpenseForSidebar && (
            <>
              <DialogHeader className="p-5 border-b border-slate-200 bg-slate-50/80 pr-12">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span>Payee Statement & Ledger: {activePayeeDetails.name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Detailed payment ledger, clearance history, and pending balances
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* KPI Cards Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto text-xs">
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
                          <tr
                            key={item._id}
                            onClick={() => {
                              setSelectedPayeeForLedger(null);
                              setSelectedExpenseForSidebar(item);
                            }}
                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                            title="Click to view all payments and settlement history for this bill"
                          >
                            <td className="p-2.5 text-slate-600 font-medium whitespace-nowrap">{formatDateIST(item.date)}</td>
                            <td className="p-2.5 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              <div className="flex items-center gap-1">
                                <span>{item.title}</span>
                                <ArrowRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                {item.category?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                item.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.paymentStatus === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.paymentStatus === 'paid' ? 'Paid' : item.paymentStatus === 'partially_paid' ? 'Partial' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{formatINR(item.amount)}</td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {item.paymentStatus !== 'paid' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPayeeForLedger(null);
                                      setSelectedExpenseForSidebar(item);
                                      handleOpenAddPayment(item);
                                    }}
                                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                    title="Add payment or pay this bill"
                                  >
                                    <Plus className="h-2.5 w-2.5" /> Pay / Add
                                  </button>
                                )}
                                <button
                                  type="button"
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
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center">
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
                  className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
