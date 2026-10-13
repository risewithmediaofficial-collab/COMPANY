import { useState, useMemo, lazy, Suspense } from 'react';
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
  FileText,
  ArrowLeft,
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
  usePayeeOverallPay,
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

const PaymentRemindersTab = lazy(() => import('./PaymentRemindersTab'));

export default function ExpensesSection({ onQuickAdd }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'payees' | 'subscriptions' | 'payment_reminders'
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

  // Overall Pay State (bulk settlement for payee)
  const [isOverallPaying, setIsOverallPaying] = useState(false);
  const [overallPayFormData, setOverallPayFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank',
    fundingAccount: '',
    reference: '',
    notes: '',
  });

  // Edit Expense State (integrated into right-hand slide-over drawer)
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditingExpenseInSidebar, setIsEditingExpenseInSidebar] = useState(false);
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
  const payeeOverallPay = usePayeeOverallPay();
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

  const handleOpenOverallPay = (payee) => {
    const pendingAmt = Number(payee?.pendingAmount || 0);
    setOverallPayFormData({
      amount: pendingAmt > 0 ? String(pendingAmt) : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Bank',
      fundingAccount: '',
      reference: `Overall Pay: ${payee?.name}`,
      notes: `Settlement across ${payee?.pendingCount || 'unpaid'} bills`,
    });
    setIsOverallPaying(true);
  };

  const handleOverallPaySubmit = async (e) => {
    e.preventDefault();
    const payeeName = activePayeeDetails?.name || selectedPayeeForLedger;
    if (!payeeName) return;
    const amt = Number(overallPayFormData.amount);
    if (!amt || amt <= 0) return;

    try {
      await payeeOverallPay.mutateAsync({
        payee: payeeName,
        amount: amt,
        paymentDate: overallPayFormData.paymentDate,
        paymentMode: overallPayFormData.paymentMode,
        fundingAccount: overallPayFormData.fundingAccount || undefined,
        reference: overallPayFormData.reference,
        notes: overallPayFormData.notes,
      });
      setIsOverallPaying(false);
    } catch (_) {}
  };

  const handleStartEditExpense = (exp) => {
    setSelectedExpenseForSidebar(exp);
    setSelectedPayeeForLedger(null);
    setIsEditingExpenseInSidebar(true);
    setEditingExpense(exp);
    setExpenseForm({
      title: exp.title || '',
      amount: exp.amount != null ? String(exp.amount) : '',
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
    const targetId = editingExpense?._id || currentSelectedExpense?._id || selectedExpenseForSidebar?._id;
    if (!targetId) return;
    try {
      await updateExpense.mutateAsync({
        id: targetId,
        data: {
          ...expenseForm,
          amount: Number(expenseForm.amount),
        },
      });
      setIsEditingExpenseInSidebar(false);
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

  const unpaidBillsForActivePayee = useMemo(() => {
    if (!activePayeeDetails?.items) return [];
    return activePayeeDetails.items
      .filter((item) => {
        const total = Number(item.amount || 0);
        const paid = Array.isArray(item.payments) && item.payments.length > 0
          ? item.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
          : (item.paidAmount != null ? Number(item.paidAmount) : (item.paymentStatus === 'paid' ? total : 0));
        return Math.max(0, total - paid) > 0 && item.paymentStatus !== 'paid';
      })
      .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)); // FIFO: oldest first
  }, [activePayeeDetails]);

  const simulatedSettlement = useMemo(() => {
    let rem = Number(overallPayFormData.amount || 0);
    return unpaidBillsForActivePayee.map((item, idx) => {
      const total = Number(item.amount || 0);
      const paid = Array.isArray(item.payments) && item.payments.length > 0
        ? item.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
        : (item.paidAmount != null ? Number(item.paidAmount) : (item.paymentStatus === 'paid' ? total : 0));
      const currentBalance = Math.max(0, total - paid);
      const allocated = Math.min(currentBalance, Math.max(0, rem));
      rem = Math.max(0, rem - allocated);
      const remainingBal = Math.max(0, currentBalance - allocated);
      const willBeStatus = remainingBal === 0 ? 'paid' : (allocated > 0 ? 'partially_paid' : 'unpaid');
      return {
        ...item,
        fifoIndex: idx + 1,
        currentBalance,
        allocated,
        remainingBal,
        willBeStatus,
      };
    });
  }, [unpaidBillsForActivePayee, overallPayFormData.amount]);

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

      {/* Sub Tabs: Expenses / Payees / Subscriptions / Payment Reminders */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Operational Expenses & Vendor Bills ({filteredExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('payees')}
          className={`pb-2.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'payees'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 Payee & Vendor Ledgers ({payeeSummaries.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-2.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Recurring Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('payment_reminders')}
          className={`pb-2.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'payment_reminders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔔 Payment Reminders
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
                          <div className="flex items-center justify-end gap-1.5">
                            {p.pendingAmount > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayeeForLedger(p.name);
                                  handleOpenOverallPay(p);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                                title={`Overall Pay ${formatINR(p.pendingAmount)} for ${p.name}`}
                              >
                                <Wallet className="h-3 w-3" />
                                <span>Overall Pay</span>
                              </button>
                            )}
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
                          </div>
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

      {/* 4. PAYMENT REMINDERS (ISOLATED REFERRAL / CLIENT SETTLEMENTS) */}
      {activeTab === 'payment_reminders' && (
        <Suspense fallback={
          <div className="w-full py-12 flex flex-col items-center justify-center space-y-3">
            <div className="h-7 w-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-[11px] font-medium text-muted-foreground animate-pulse">Loading payment reminders...</span>
          </div>
        }>
          <PaymentRemindersTab />
        </Suspense>
      )}

      {/* EDIT SUBSCRIPTION SLIDE-OVER DRAWER */}
      <Dialog open={Boolean(editingSubscription)} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        {editingSubscription && (
          <DialogContent variant="side" size="lg" className="flex flex-col h-full bg-white text-xs border-l border-slate-200 shadow-2xl p-0">
            <DialogHeader className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/40 pr-12">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shrink-0">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Edit Subscription
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Update recurring commitment for {editingSubscription.serviceName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form id="edit-subscription-form" onSubmit={handleSaveEditSubscription} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Subscription Info
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Service / Tool Name</label>
                  <input
                    type="text"
                    required
                    value={subscriptionForm.serviceName}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, serviceName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vendor / Provider</label>
                  <input
                    type="text"
                    value={subscriptionForm.vendor}
                    onChange={(e) => setSubscriptionForm({ ...subscriptionForm, vendor: e.target.value })}
                    placeholder="e.g. Adobe, AWS, Figma..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Billing Cycle & Amount
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">Expected Amount (₹)</label>
                      {Number(subscriptionForm.expectedAmount) > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {formatINR(Number(subscriptionForm.expectedAmount))}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={subscriptionForm.expectedAmount}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expectedAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Frequency</label>
                    <select
                      value={subscriptionForm.frequency}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, frequency: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    Renewal & Category
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Renewal Date</label>
                    <input
                      type="date"
                      required
                      value={subscriptionForm.nextRenewalDate}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, nextRenewalDate: e.target.value })}
                      onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Classification</label>
                    <select
                      value={subscriptionForm.costClassification}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, costClassification: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                    >
                      <option value="software">Software / SaaS</option>
                      <option value="tools">Tools & Utilities</option>
                      <option value="hosting">Hosting / Cloud</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSubscription(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-subscription-form"
                disabled={updateSubscription.isPending}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {updateSubscription.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
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
            setIsEditingExpenseInSidebar(false);
            setIsOverallPaying(false);
          }
        }}
      >
        <DialogContent variant="side" size="xl" className="flex flex-col h-full bg-white text-xs border-l border-slate-200 shadow-2xl p-0">
          {/* CASE 1: INDIVIDUAL EXPENSE DETAILS SIDEBAR */}
          {selectedExpenseForSidebar && currentSelectedExpense && (
            isEditingExpenseInSidebar ? (
              <>
                {/* ── HIGH-END EDIT EXPENSE SLIDE-OVER DRAWER FORM ── */}
                <DialogHeader className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 pr-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Edit2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                            Edit Mode
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateIST(currentSelectedExpense.date)}
                          </span>
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 truncate">
                          Edit Expense / Vendor Bill
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 truncate">
                          Update billing details, vendor allocation, and settlement status
                        </DialogDescription>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingExpenseInSidebar(false)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer mr-6 shadow-2xs"
                      title="Switch back to view mode"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      View Details
                    </button>
                  </div>
                </DialogHeader>

                <form
                  id="edit-expense-sidebar-form"
                  onSubmit={handleSaveEditExpense}
                  className="flex-1 overflow-y-auto p-5 space-y-4"
                >
                  {/* CARD 1: TITLE & AMOUNT & DATE */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Basic Bill Details
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Required
                      </span>
                    </div>

                    {/* Item Title */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Item Title / Description <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={expenseForm.title}
                        onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                        placeholder="e.g. Saran bro - vshoot payment, Office Fiber Broadband..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs"
                      />
                    </div>

                    {/* Amount & Date Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Total Bill Amount (₹) <span className="text-rose-500">*</span>
                          </label>
                          {Number(expenseForm.amount) > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {formatINR(Number(expenseForm.amount))}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Bill / Expense Date <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setExpenseForm((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            Set Today
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            required
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                            onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: VENDOR / PAYEE ALLOCATION */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="h-4 w-4 text-indigo-600" />
                        Vendor / Payee Allocation
                      </span>
                      {expenseForm.vendor && (
                        <button
                          type="button"
                          onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: '' }))}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Payee / Vendor Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Saran, VJ, Office Landlord, Videographer..."
                          value={expenseForm.vendor}
                          onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Quick Role & Vendor Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          1-Click Payee Presets:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: sug }))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              expenseForm.vendor === sug
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                                : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 border-slate-200'
                            }`}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        💡 Bills assigned to a payee will automatically synchronize with their dedicated balance statement and payment ledger.
                      </p>
                    </div>
                  </div>

                  {/* CARD 3: CATEGORY & COST TYPE */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-indigo-600" />
                        Classification & Cost Allocation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Expense Category
                        </label>
                        <select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs cursor-pointer"
                        >
                          <option value="production_shoot">🎬 Production / Shoot</option>
                          <option value="travel">✈️ Travel Allowance</option>
                          <option value="freelancers">🤝 Freelancers & Crew</option>
                          <option value="software_subscriptions">💻 Software & Subscriptions</option>
                          <option value="rent">🏢 Office Rent</option>
                          <option value="internet">⚡ Internet & Utilities</option>
                          <option value="marketing">📣 Marketing & Promotion</option>
                          <option value="office">📎 Office Supplies & Expenses</option>
                          <option value="other">📦 Other Operations</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Cost Allocation Type
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setExpenseForm((prev) => ({ ...prev, costType: 'agency_overhead' }))}
                            className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                              expenseForm.costType === 'agency_overhead'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Overhead
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseForm((prev) => ({ ...prev, costType: 'client_project' }))}
                            className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                              expenseForm.costType === 'client_project'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Client Direct
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: PAYMENT STATUS CARDS */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        Clearance & Payment Status
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Paid */}
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'paid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'paid'
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <CheckCircle2 className={`h-4 w-4 ${expenseForm.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {expenseForm.paymentStatus === 'paid' && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900">Paid</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Fully cleared</div>
                      </button>

                      {/* Partially Paid */}
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'partially_paid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'partially_paid'
                            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Clock className={`h-4 w-4 ${expenseForm.paymentStatus === 'partially_paid' ? 'text-amber-600' : 'text-slate-400'}`} />
                          {expenseForm.paymentStatus === 'partially_paid' && (
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900">Partially Paid</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Advance / split</div>
                      </button>

                      {/* Unpaid */}
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'unpaid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'unpaid'
                            ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <AlertCircle className={`h-4 w-4 ${expenseForm.paymentStatus === 'unpaid' ? 'text-rose-600' : 'text-slate-400'}`} />
                          {expenseForm.paymentStatus === 'unpaid' && (
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900">Unpaid Bill</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Pending liability</div>
                      </button>
                    </div>
                  </div>

                  {/* CARD 5: NOTES & REMARKS */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                      <Receipt className="h-4 w-4 text-indigo-600" />
                      Internal Remarks & Notes
                    </span>
                    <textarea
                      rows="3"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      placeholder="Optional notes, invoice reference, approval notes, or vendor payment arrangements..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs resize-none"
                    />
                  </div>
                </form>

                {/* Sticky Action Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingExpenseInSidebar(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      form="edit-expense-sidebar-form"
                      disabled={updateExpense.isPending}
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {updateExpense.isPending ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
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
            )
          )}

          {/* CASE 2: PAYEE / VENDOR STATEMENT & LEDGER SIDEBAR */}
          {selectedPayeeForLedger && activePayeeDetails && !selectedExpenseForSidebar && (
            isOverallPaying ? (
              <>
                {/* ── HIGH-END OVERALL SETTLEMENT PAY FORM ── */}
                <DialogHeader className="p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 pr-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOverallPaying(false)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Back to Ledger"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div>
                        <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                          <span>Overall Pay: {activePayeeDetails.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">
                          Record a lump-sum payment to settle outstanding bills (FIFO: oldest bills cleared first)
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Overview Balance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Pending Balance</span>
                      <div className="text-xl font-extrabold text-amber-700 mt-0.5">{formatINR(activePayeeDetails.pendingAmount)}</div>
                      <div className="text-[11px] text-amber-600 mt-0.5 font-medium">
                        {unpaidBillsForActivePayee.length} unpaid / partially paid bills pending
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Settlement Allocation</span>
                      <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                        {Number(overallPayFormData.amount) > 0 ? formatINR(Number(overallPayFormData.amount)) : '₹0.00'}
                      </div>
                      <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                        {Number(overallPayFormData.amount) >= activePayeeDetails.pendingAmount
                          ? '✨ Full settlement of all pending bills'
                          : Number(overallPayFormData.amount) > 0
                          ? `Partial payment (₹${Math.max(0, activePayeeDetails.pendingAmount - Number(overallPayFormData.amount)).toLocaleString('en-IN')} remaining)`
                          : 'Enter an amount to preview settlement'}
                      </div>
                    </div>
                  </div>

                  {/* FORM INPUTS */}
                  <form id="overall-pay-form" onSubmit={handleOverallPaySubmit} className="space-y-4">
                    {/* Card 1: Amount with 1-Click Chips */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span>Payment Amount (₹)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        {activePayeeDetails.pendingAmount > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(activePayeeDetails.pendingAmount) }))}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Pay Full (₹{activePayeeDetails.pendingAmount.toLocaleString('en-IN')})
                            </button>
                            {activePayeeDetails.pendingAmount > 500 && (
                              <button
                                type="button"
                                onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(Math.round(activePayeeDetails.pendingAmount / 2)) }))}
                                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                50% (₹{Math.round(activePayeeDetails.pendingAmount / 2).toLocaleString('en-IN')})
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={overallPayFormData.amount}
                          onChange={(e) => setOverallPayFormData({ ...overallPayFormData, amount: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Card 2: Date & Mode Grid */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Payment Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={overallPayFormData.paymentDate}
                            onChange={(e) => setOverallPayFormData({ ...overallPayFormData, paymentDate: e.target.value })}
                            onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Payment Mode <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={overallPayFormData.paymentMode}
                            onChange={(e) => setOverallPayFormData({ ...overallPayFormData, paymentMode: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                            <option value="Bank">Bank Transfer (NEFT/IMPS/RTGS)</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Debit / Credit Card</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Paid From Account
                          </label>
                          <select
                            value={overallPayFormData.fundingAccount}
                            onChange={(e) => setOverallPayFormData({ ...overallPayFormData, fundingAccount: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                            placeholder="e.g. UPI Ref / Cheque # / NEFT UTR"
                            value={overallPayFormData.reference}
                            onChange={(e) => setOverallPayFormData({ ...overallPayFormData, reference: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Payment Remarks / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lump-sum shoot settlement, clearance notes..."
                          value={overallPayFormData.notes}
                          onChange={(e) => setOverallPayFormData({ ...overallPayFormData, notes: e.target.value })}
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Card 3: FIFO Settlement Breakdown & Bill Clearance Preview */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-indigo-600" />
                          FIFO Bill Clearance Preview ({simulatedSettlement.length} pending bills)
                        </span>
                        <span className="text-[10px] text-slate-500">Oldest bills settled first</span>
                      </div>
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase sticky top-0">
                            <tr>
                              <th className="p-2.5">Priority</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5 text-right">Pending Balance</th>
                              <th className="p-2.5 text-right">Paying Now</th>
                              <th className="p-2.5 text-center">Status After Pay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {simulatedSettlement.map((item) => (
                              <tr key={item._id} className={item.allocated > 0 ? 'bg-emerald-50/30' : ''}>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    #{item.fifoIndex}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 whitespace-nowrap">{formatDateIST(item.date)}</td>
                                <td className="p-2.5 font-semibold text-slate-900 max-w-[160px] truncate" title={item.title}>
                                  {item.title}
                                </td>
                                <td className="p-2.5 text-right font-medium text-slate-700">{formatINR(item.currentBalance)}</td>
                                <td className="p-2.5 text-right font-bold text-emerald-700">
                                  {item.allocated > 0 ? `+${formatINR(item.allocated)}` : '₹0.00'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    item.willBeStatus === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                                      : item.willBeStatus === 'partially_paid'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {item.willBeStatus === 'paid' ? 'Paid' : item.willBeStatus === 'partially_paid' ? 'Partial' : 'Unpaid'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </form>
                </div>

                {/* OVERALL PAY FOOTER */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setIsOverallPaying(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white cursor-pointer"
                  >
                    Back to Statement
                  </button>
                  <button
                    type="submit"
                    form="overall-pay-form"
                    disabled={payeeOverallPay.isPending || !Number(overallPayFormData.amount)}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Wallet className="h-4 w-4" />
                    {payeeOverallPay.isPending
                      ? 'Recording Overall Pay...'
                      : `Confirm Overall Pay (${formatINR(Number(overallPayFormData.amount) || 0)})`}
                  </button>
                </div>
              </>
            ) : (
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
                    <div className={`p-3 rounded-xl border flex flex-col justify-between ${activePayeeDetails.pendingAmount > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pending to Pay</span>
                          {activePayeeDetails.pendingAmount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                              Due
                            </span>
                          )}
                        </div>
                        <div className={`text-lg font-bold mt-0.5 ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-900'}`}>
                          {formatINR(activePayeeDetails.pendingAmount)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${activePayeeDetails.pendingAmount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                          {activePayeeDetails.pendingCount > 0 ? `${activePayeeDetails.pendingCount} unpaid bills` : 'All cleared'}
                        </div>
                      </div>
                      {activePayeeDetails.pendingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails)}
                          className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                          title={`Pay overall balance of ${formatINR(activePayeeDetails.pendingAmount)}`}
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Overall Pay</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Transactions */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Payment Transactions</span>
                        <span className="text-[10px] text-slate-500">{activePayeeDetails.items.length} records</span>
                      </div>
                      {activePayeeDetails.pendingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          title={`Settle ${formatINR(activePayeeDetails.pendingAmount)} across all unpaid bills`}
                        >
                          <Wallet className="h-3 w-3" />
                          <span>Overall Pay ({formatINR(activePayeeDetails.pendingAmount)})</span>
                        </button>
                      )}
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
                  <div className="flex items-center gap-2">
                    {activePayeeDetails.pendingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenOverallPay(activePayeeDetails)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        <span>Overall Pay ({formatINR(activePayeeDetails.pendingAmount)})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPayeeForLedger(null)}
                      className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
