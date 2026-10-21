import { useState, useMemo, useDeferredValue, lazy, Suspense } from 'react';
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
  Printer,
  ChevronDown,
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

export const calculateExpenseFinancials = (e) => {
  if (!e) return { total: 0, paid: 0, balance: 0, status: 'unpaid' };
  const total = Number(e.amount || 0);
  let paid = 0;
  if (Array.isArray(e.payments) && e.payments.length > 0) {
    paid = e.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  } else if (e.paidAmount != null && Number(e.paidAmount) > 0) {
    paid = Number(e.paidAmount);
  } else if (e.paymentStatus === 'paid') {
    paid = total;
  }
  paid = Math.min(total, Math.max(0, paid));
  const balance = Math.max(0, total - paid);
  let status = e.paymentStatus || 'unpaid';
  if (balance === 0 && total > 0) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partially_paid';
  } else {
    status = 'unpaid';
  }
  return { total, paid, balance, status };
};

export const formatExpenseCategory = (cat) => {
  if (!cat) return '';
  const lower = String(cat).toLowerCase().trim();
  if (lower === 'rj') return 'RJ';
  if (lower === 'vj') return 'VJ';
  if (lower === 'production_shoot') return 'Production / Shoot';
  if (lower === 'software_subscriptions') return 'Software / Subscriptions';
  return cat.replace(/_/g, ' ');
};

export default function ExpensesSection({ onQuickAdd }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'payees' | 'subscriptions' | 'payment_reminders'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [payeeSearch, setPayeeSearch] = useState('');
  const deferredPayeeSearch = useDeferredValue(payeeSearch);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'this_week' | 'this_month' | 'this_year' | 'custom'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)

  // Payee ledger date filter state
  const [payeeDatePreset, setPayeeDatePreset] = useState('all');
  const [payeeFromDate, setPayeeFromDate] = useState('');
  const [payeeToDate, setPayeeToDate] = useState('');
  const [showPayeeExportMenu, setShowPayeeExportMenu] = useState(false);

  const setQuickDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }

    if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setFromDate(`${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`);
      setToDate(`${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`);
      return;
    }

    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setFromDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`);
      setToDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
      return;
    }

    if (preset === 'this_year') {
      const year = now.getFullYear();
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
      return;
    }
  };

  const setQuickPayeeDatePreset = (preset) => {
    setPayeeDatePreset(preset);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    if (preset === 'all') {
      setPayeeFromDate('');
      setPayeeToDate('');
      return;
    }

    if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setPayeeFromDate(`${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`);
      setPayeeToDate(`${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`);
      return;
    }

    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setPayeeFromDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`);
      setPayeeToDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
      return;
    }

    if (preset === 'this_year') {
      const year = now.getFullYear();
      setPayeeFromDate(`${year}-01-01`);
      setPayeeToDate(`${year}-12-31`);
      return;
    }
  };

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

  const handleOpenOverallPay = (payee, customPendingAmount = null) => {
    const pendingAmt = customPendingAmount != null ? Number(customPendingAmount) : Number(payee?.pendingAmount || 0);
    setOverallPayFormData({
      amount: pendingAmt > 0 ? String(pendingAmt) : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Bank',
      fundingAccount: '',
      reference: `Overall Pay: ${payee?.name || payee || ''}`,
      notes: `Settlement across unpaid bills`,
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
      if (!deferredSearch.trim()) return true;
      const q = deferredSearch.toLowerCase();
      const title = (e.title || '').toLowerCase();
      const vendor = (e.vendor || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      return title.includes(q) || vendor.includes(q) || cat.includes(q);
    });
  }, [expenses, fromDate, toDate, deferredSearch]);

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
      const fin = calculateExpenseFinancials(e);
      map[key].totalAmount += fin.total;
      map[key].paidAmount += fin.paid;
      map[key].pendingAmount += fin.balance;
      map[key].totalCount += 1;
      map[key].items.push({ ...e, ...fin });
      if (fin.balance === 0 && fin.total > 0) {
        map[key].paidCount += 1;
      } else {
        map[key].pendingCount += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  const filteredPayees = useMemo(() => {
    if (!deferredPayeeSearch.trim()) return payeeSummaries;
    const q = deferredPayeeSearch.toLowerCase();
    return payeeSummaries.filter((p) => p.name.toLowerCase().includes(q));
  }, [payeeSummaries, deferredPayeeSearch]);

  const activePayeeDetails = useMemo(() => {
    if (!selectedPayeeForLedger) return null;
    const target = selectedPayeeForLedger.toLowerCase();
    const matching = expenses.filter((e) => {
      const v = (e.vendor || '').trim();
      if (target === 'unassigned / general') return !v;
      return v.toLowerCase() === target;
    });

    const enrichedItems = matching.map((e) => {
      const fin = calculateExpenseFinancials(e);
      return {
        ...e,
        total: fin.total,
        paid: fin.paid,
        balance: fin.balance,
        calculatedStatus: fin.status,
      };
    }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

    const totalAmount = enrichedItems.reduce((s, e) => s + e.total, 0);
    const paidAmount = enrichedItems.reduce((s, e) => s + e.paid, 0);
    const pendingAmount = enrichedItems.reduce((s, e) => s + e.balance, 0);
    const paidCount = enrichedItems.filter((e) => e.balance === 0 && e.total > 0).length;
    const pendingCount = enrichedItems.filter((e) => e.balance > 0).length;

    return {
      name: selectedPayeeForLedger,
      items: enrichedItems,
      totalAmount,
      paidAmount,
      pendingAmount,
      totalCount: enrichedItems.length,
      paidCount,
      pendingCount,
    };
  }, [expenses, selectedPayeeForLedger]);

  const displayedPayeeItems = useMemo(() => {
    if (!activePayeeDetails?.items) return [];
    return activePayeeDetails.items.filter((item) => {
      const expDate = item.date || item.createdAt;
      if (payeeFromDate && expDate) {
        const d = new Date(expDate).toISOString().slice(0, 10);
        if (d < payeeFromDate) return false;
      }
      if (payeeToDate && expDate) {
        const d = new Date(expDate).toISOString().slice(0, 10);
        if (d > payeeToDate) return false;
      }
      return true;
    });
  }, [activePayeeDetails, payeeFromDate, payeeToDate]);

  const payeeFilteredTotal = useMemo(
    () => displayedPayeeItems.reduce((s, e) => s + e.total, 0),
    [displayedPayeeItems]
  );
  const payeeFilteredPaid = useMemo(
    () => displayedPayeeItems.reduce((s, e) => s + e.paid, 0),
    [displayedPayeeItems]
  );
  const payeeFilteredPending = useMemo(
    () => displayedPayeeItems.reduce((s, e) => s + e.balance, 0),
    [displayedPayeeItems]
  );
  const payeeFilteredPaidCount = useMemo(
    () => displayedPayeeItems.filter((e) => e.balance === 0 && e.total > 0).length,
    [displayedPayeeItems]
  );
  const payeeFilteredPendingCount = useMemo(
    () => displayedPayeeItems.filter((e) => e.balance > 0).length,
    [displayedPayeeItems]
  );

  const unpaidBillsForActivePayee = useMemo(() => {
    if (!displayedPayeeItems) return [];
    return displayedPayeeItems
      .filter((item) => item.balance > 0)
      .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)); // FIFO: oldest first
  }, [displayedPayeeItems]);

  const simulatedSettlement = useMemo(() => {
    let rem = Number(overallPayFormData.amount || 0);
    return unpaidBillsForActivePayee.map((item, idx) => {
      const currentBalance = item.balance;
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

  const currentExpFinancials = useMemo(
    () => calculateExpenseFinancials(currentSelectedExpense),
    [currentSelectedExpense]
  );
  const currentExpTotal = currentExpFinancials.total;
  const currentExpPaid = currentExpFinancials.paid;
  const currentExpBalance = currentExpFinancials.balance;
  const currentExpPercent = currentExpTotal > 0 ? Math.min(100, Math.round((currentExpPaid / currentExpTotal) * 100)) : 100;

  const displayedPayments = useMemo(() => {
    if (!currentSelectedExpense) return [];
    if (Array.isArray(currentSelectedExpense.payments) && currentSelectedExpense.payments.length > 0) {
      return [...currentSelectedExpense.payments].sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));
    }
    if (currentExpPaid > 0) {
      return [{
        _id: 'legacy-settlement',
        amount: currentExpPaid,
        paymentDate: currentSelectedExpense.paymentDate || currentSelectedExpense.date,
        paymentMode: currentSelectedExpense.paymentMode || 'Bank',
        reference: currentExpBalance === 0 ? 'Full Settlement' : 'Partial Settlement',
        notes: 'Initial payment recorded',
        isLegacy: true,
      }];
    }
    return [];
  }, [currentSelectedExpense, currentExpPaid, currentExpBalance]);

  const relatedPayeeDetailsForExpense = useMemo(() => {
    if (!currentSelectedExpense?.vendor) return null;
    const target = currentSelectedExpense.vendor.trim().toLowerCase();
    const matching = expenses.filter((e) => (e.vendor || '').trim().toLowerCase() === target);
    const enriched = matching.map((e) => ({ ...e, ...calculateExpenseFinancials(e) }));
    const totalAmount = enriched.reduce((s, e) => s + e.total, 0);
    const paidAmount = enriched.reduce((s, e) => s + e.paid, 0);
    const pendingAmount = enriched.reduce((s, e) => s + e.balance, 0);
    return {
      name: currentSelectedExpense.vendor,
      items: [...enriched].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      totalAmount,
      paidAmount,
      pendingAmount,
      totalCount: enriched.length,
      paidCount: enriched.filter((e) => e.balance === 0 && e.total > 0).length,
      pendingCount: enriched.filter((e) => e.balance > 0).length,
    };
  }, [expenses, currentSelectedExpense]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + calculateExpenseFinancials(e).total, 0),
    [filteredExpenses]
  );
  const totalPaidExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + calculateExpenseFinancials(e).paid, 0),
    [filteredExpenses]
  );
  const totalUnpaidBills = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + calculateExpenseFinancials(e).balance, 0),
    [filteredExpenses]
  );
  const unpaidBillsCount = useMemo(
    () => filteredExpenses.filter((e) => calculateExpenseFinancials(e).balance > 0).length,
    [filteredExpenses]
  );
  const paidBillsCount = useMemo(
    () => filteredExpenses.filter((e) => calculateExpenseFinancials(e).balance === 0 && calculateExpenseFinancials(e).total > 0).length,
    [filteredExpenses]
  );

  const handleExportCSV = (items = filteredExpenses, filenamePrefix = 'agency_expenses_report', customPeriodLabel = '') => {
    setShowExportMenu(false);
    setShowPayeeExportMenu(false);

    let periodLabel = customPeriodLabel;
    if (!periodLabel) {
      periodLabel = datePreset === 'this_week'
        ? 'this_week'
        : datePreset === 'this_month'
        ? 'this_month'
        : datePreset === 'this_year'
        ? 'this_year'
        : (fromDate && toDate ? `${fromDate}_to_${toDate}` : 'all_time');
    }

    const rows = items.map((e) => {
      const fin = calculateExpenseFinancials(e);
      return {
        date: formatDateIST(e.date || e.createdAt),
        title: e.title,
        vendor: e.vendor || 'Unassigned',
        category: formatExpenseCategory(e.category),
        costType: e.costType || 'agency_overhead',
        amount: fin.total,
        paidAmount: fin.paid,
        balanceAmount: fin.balance,
        status: fin.status === 'paid' ? 'Paid' : fin.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid',
        account: e.fundingAccount?.accountName || '-',
        notes: e.notes || '',
      };
    });

    exportToCSV(`${filenamePrefix}_${periodLabel}`, rows, [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Item / Description' },
      { key: 'vendor', label: 'Payee / Vendor' },
      { key: 'category', label: 'Category' },
      { key: 'costType', label: 'Cost Type' },
      { key: 'amount', label: 'Total Amount (INR)' },
      { key: 'paidAmount', label: 'Paid Amount (INR)' },
      { key: 'balanceAmount', label: 'Pending Due (INR)' },
      { key: 'status', label: 'Payment Status' },
      { key: 'account', label: 'Funding Account' },
      { key: 'notes', label: 'Remarks / Notes' },
    ]);
  };

  const handleExport = () => handleExportCSV();

  const handlePrintReport = (
    itemsToPrint = filteredExpenses,
    reportTitle = 'Operational Expenses & Vendor Bills Report',
    periodDescription = '',
    customSubtitle = ''
  ) => {
    setShowExportMenu(false);
    setShowPayeeExportMenu(false);

    if (!itemsToPrint || !itemsToPrint.length) {
      alert('No expense records found for the selected filter range to export.');
      return;
    }

    const totalAmt = itemsToPrint.reduce((s, e) => s + calculateExpenseFinancials(e).total, 0);
    const paidAmt = itemsToPrint.reduce((s, e) => s + calculateExpenseFinancials(e).paid, 0);
    const pendingAmt = itemsToPrint.reduce((s, e) => s + calculateExpenseFinancials(e).balance, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to open the printable report.');
      return;
    }

    const dateScope = periodDescription || (
      datePreset === 'this_week'
        ? `This Week (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : datePreset === 'this_month'
        ? `This Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : datePreset === 'this_year'
        ? `This Year (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : fromDate && toDate
        ? `${formatDateIST(fromDate)} – ${formatDateIST(toDate)}`
        : 'All Time Records'
    );

    const rowsHtml = itemsToPrint.map((e, idx) => {
      const fin = calculateExpenseFinancials(e);
      return `
      <tr>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; white-space: nowrap;">${formatDateIST(e.date || e.createdAt)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${e.title || '-'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${e.vendor || 'Unassigned'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${formatExpenseCategory(e.category)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">${formatINR(fin.total)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #059669; font-weight: 600;">${formatINR(fin.paid)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #d97706; font-weight: 600;">${formatINR(fin.balance)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-align: center; text-transform: uppercase; font-weight: 700;">
          <span style="padding: 2px 6px; border-radius: 9999px; background: ${fin.status === 'paid' ? '#d1fae5; color: #065f46;' : fin.status === 'partially_paid' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">
            ${fin.status === 'paid' ? 'Paid' : fin.status === 'partially_paid' ? 'Partial' : 'Unpaid'}
          </span>
        </td>
      </tr>
    `}).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - RiseWithMedia</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
            .subtitle { font-size: 12px; color: #64748b; margin: 0; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11px; border-radius: 6px; margin-top: 6px; }
            .kpis { display: flex; gap: 12px; margin-bottom: 16px; }
            .kpi-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
            .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
            .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { padding: 8px 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
            .actions-bar { margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px; }
            .print-btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; font-weight: 700; font-size: 12px; border-radius: 6px; cursor: pointer; }
            @media print { .actions-bar { display: none; } }
          </style>
        </head>
        <body>
          <div class="actions-bar">
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
          </div>
          <div class="header">
            <div>
              <h1 class="title">${reportTitle}</h1>
              <p class="subtitle">${customSubtitle || 'RiseWithMedia Agency OS · Financial Statement & Expense Audit'}</p>
              <div class="badge">Period: ${dateScope}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 16px; color: #4f46e5;">RiseWithMedia</div>
              <div style="font-size: 11px; color: #64748b;">Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Total Billed</div>
              <div class="kpi-value">${formatINR(totalAmt)}</div>
            </div>
            <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
              <div class="kpi-label" style="color: #047857;">Total Cleared / Paid</div>
              <div class="kpi-value" style="color: #065f46;">${formatINR(paidAmt)}</div>
            </div>
            <div class="kpi-card" style="background: #fffbeb; border-color: #fde68a;">
              <div class="kpi-label" style="color: #b45309;">Pending to Pay</div>
              <div class="kpi-value" style="color: #92400e;">${formatINR(pendingAmt)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Entries Count</div>
              <div class="kpi-value">${itemsToPrint.length} Records</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Item / Description</th>
                <th>Payee / Vendor</th>
                <th>Category</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Cleared Amount</th>
                <th style="text-align: right;">Pending Due</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>RiseWithMedia Agency Management OS · Confidential Finance Record</span>
            <span>Page 1 of 1</span>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL POSTED EXPENSES</span>
            <ArrowUpRight className="h-4 w-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalExpenses)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{filteredExpenses.length} total recorded bills</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex justify-between items-center text-emerald-700 text-xs font-semibold mb-1">
            <span>TOTAL CLEARED / PAID</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{formatINR(totalPaidExpenses)}</div>
          <div className="text-[11px] text-emerald-600 mt-1">{paidBillsCount} settled bills</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex justify-between items-center text-amber-700 text-xs font-semibold mb-1">
            <span>UNPAID VENDOR BILLS</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatINR(totalUnpaidBills)}</div>
          <div className="text-[11px] text-amber-700 mt-1">{unpaidBillsCount} vendor bills pending payment</div>
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
                <option value="rj">RJ (Radio Jockey)</option>
                <option value="vj">VJ (Video Jockey)</option>
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

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickDatePreset('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset('this_week')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === 'this_week'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset('this_month')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === 'this_month'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset('this_year')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === 'this_year'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset('custom')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === 'custom'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date to Date
                </button>
              </div>

              {/* Date to Date Filter Inputs */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Dates:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="From Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="To Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => setQuickDatePreset('all')}
                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
              {/* Export as Report Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Export Report</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleExportCSV()}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Download CSV Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReport()}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Print / Save PDF Report</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => onQuickAdd('expense')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-2xs cursor-pointer"
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
                    sortedExpenses.map((exp) => {
                      const fin = calculateExpenseFinancials(exp);
                      return (
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
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              ['rj', 'vj'].includes(exp.category?.toLowerCase())
                                ? 'bg-indigo-50 text-indigo-700 font-bold uppercase'
                                : 'bg-slate-100 text-slate-700 capitalize'
                            }`}
                          >
                            {formatExpenseCategory(exp.category)}
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
                              fin.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : fin.status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {fin.status === 'paid'
                              ? 'Paid'
                              : fin.status === 'partially_paid'
                              ? `Partially Paid (${formatINR(fin.paid)})`
                              : 'Unpaid Bill'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                          <div>{formatINR(fin.total)}</div>
                          {fin.paid > 0 && fin.balance > 0 && (
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Paid: {formatINR(fin.paid)}
                            </div>
                          )}
                          {fin.balance > 0 && fin.paid > 0 && (
                            <div className="text-[10px] text-amber-600 font-bold">
                              Due: {formatINR(fin.balance)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {fin.balance > 0 ? (
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
                    );})
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
          <DialogContent variant="side" size="lg" className="flex flex-col h-full bg-card text-foreground border-l border-border shadow-2xl p-0">
            <DialogHeader className="p-6 border-b border-border bg-muted/20 pr-16 select-none">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Edit Subscription
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Update recurring commitment for {editingSubscription.serviceName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form id="edit-subscription-form" onSubmit={handleSaveEditSubscription} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar overscroll-contain">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Service / Tool Name *</label>
                <input
                  type="text"
                  required
                  value={subscriptionForm.serviceName}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, serviceName: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Vendor / Provider</label>
                <input
                  type="text"
                  value={subscriptionForm.vendor}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, vendor: e.target.value })}
                  placeholder="e.g. Adobe, AWS, Figma..."
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground">Expected Amount (₹) *</label>
                  {Number(subscriptionForm.expectedAmount) > 0 && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
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
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Frequency</label>
                <select
                  value={subscriptionForm.frequency}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, frequency: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Next Renewal Date *</label>
                <input
                  type="date"
                  required
                  value={subscriptionForm.nextRenewalDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, nextRenewalDate: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Classification</label>
                <select
                  value={subscriptionForm.costClassification}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, costClassification: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
                >
                  <option value="software">Software / SaaS</option>
                  <option value="tools">Tools & Utilities</option>
                  <option value="hosting">Hosting / Cloud</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </form>

            <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 select-none">
              <span className="text-xs text-muted-foreground font-medium">Auto-renewing ledger commitment</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSubscription(null)}
                  className="h-11 px-5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-subscription-form"
                  disabled={updateSubscription.isPending}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
                >
                  {updateSubscription.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
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
                  className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar overscroll-contain"
                >
                  {/* Item Title */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Item Title / Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={expenseForm.title}
                      onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                      placeholder="e.g. Saran bro - vshoot payment, Office Fiber Broadband..."
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Total Bill Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      {Number(expenseForm.amount) > 0 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                          {formatINR(Number(expenseForm.amount))}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        placeholder="0.00"
                        className="h-11 w-full pl-8 pr-4 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Bill / Expense Date <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))}
                        className="text-xs text-primary hover:underline font-bold cursor-pointer"
                      >
                        Set Today
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                    />
                  </div>

                  {/* Vendor / Payee */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Payee / Vendor Name
                      </label>
                      {expenseForm.vendor && (
                        <button
                          type="button"
                          onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: '' }))}
                          className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="e.g. Saran, VJ, Office Landlord, Videographer..."
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        className="h-11 w-full pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-muted-foreground font-medium">1-Click Presets:</span>
                      {['RJ', 'VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: sug }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            expenseForm.vendor === sug
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                              : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground border-border'
                          }`}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expense Category */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Expense Category
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
                    >
                      <option value="production_shoot">🎬 Production / Shoot</option>
                      <option value="rj">🎙️ RJ (Radio Jockey / Voice Talent)</option>
                      <option value="vj">📺 VJ (Video Jockey / Presenter / Anchor)</option>
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

                  {/* Cost Allocation Type */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Cost Allocation Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, costType: 'agency_overhead' }))}
                        className={`h-9 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          expenseForm.costType === 'agency_overhead'
                            ? 'bg-card text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Overhead
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, costType: 'client_project' }))}
                        className={`h-9 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          expenseForm.costType === 'client_project'
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Client Direct
                      </button>
                    </div>
                  </div>

                  {/* Clearance & Payment Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Clearance & Payment Status
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'paid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'paid'
                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <CheckCircle2 className={`h-4 w-4 ${expenseForm.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'paid' && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-foreground">Paid</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Fully cleared</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'partially_paid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'partially_paid'
                            ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20 shadow-2xs'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Clock className={`h-4 w-4 ${expenseForm.paymentStatus === 'partially_paid' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'partially_paid' && (
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-foreground">Partially Paid</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Advance / split</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'unpaid' }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'unpaid'
                            ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20 shadow-2xs'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <AlertCircle className={`h-4 w-4 ${expenseForm.paymentStatus === 'unpaid' ? 'text-rose-600' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'unpaid' && (
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-foreground">Unpaid Bill</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Pending liability</div>
                      </button>
                    </div>
                  </div>

                  {/* Notes & Remarks */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Internal Remarks & Notes
                    </label>
                    <textarea
                      rows="3"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      placeholder="Optional notes, invoice reference, approval notes, or vendor payment arrangements..."
                      className="w-full p-3.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs resize-none"
                    />
                  </div>
                </form>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsEditingExpenseInSidebar(false)}
                    className="h-11 px-5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-expense-sidebar-form"
                    disabled={updateExpense.isPending}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {updateExpense.isPending ? 'Saving Changes...' : 'Save Changes'}
                  </button>
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
                    <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                      {formatExpenseCategory(currentSelectedExpense.category)}
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
                    <form onSubmit={handleAddPaymentSubmit} className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Plus className="h-4 w-4 text-primary" />
                          Record New Payment / Installment
                        </span>
                        {currentExpBalance > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(currentExpBalance) }))}
                              className="text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                              Pay Remaining (₹{currentExpBalance})
                            </button>
                            {currentExpBalance > 500 && (
                              <button
                                type="button"
                                onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(Math.round(currentExpBalance / 2)) }))}
                                className="text-xs font-bold text-primary hover:underline cursor-pointer"
                              >
                                50% (₹{Math.round(currentExpBalance / 2)})
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Payment Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="e.g. 1500"
                          value={paymentFormData.amount}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentFormData.paymentDate}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                          onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Payment Mode *
                        </label>
                        <select
                          value={paymentFormData.paymentMode}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMode: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
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
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Paid From Account
                        </label>
                        <select
                          value={paymentFormData.fundingAccount}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, fundingAccount: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
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
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Reference / UTR / Txn ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UPI Ref / Cheque #"
                          value={paymentFormData.reference}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Payment Remarks / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 50% advance for shoot, balance payment..."
                          value={paymentFormData.notes}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentForm(false)}
                          className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addExpensePayment.isPending}
                          className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
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
                        {['RJ', 'VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
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
                  <form id="overall-pay-form" onSubmit={handleOverallPaySubmit} className="space-y-6">
                    {/* Payment Amount */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                        <label className="text-sm font-semibold text-foreground">
                          Payment Amount (₹) <span className="text-rose-500">*</span>
                        </label>
                        {activePayeeDetails.pendingAmount > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(activePayeeDetails.pendingAmount) }))}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              Pay Full (₹{activePayeeDetails.pendingAmount.toLocaleString('en-IN')})
                            </button>
                            {activePayeeDetails.pendingAmount > 500 && (
                              <button
                                type="button"
                                onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(Math.round(activePayeeDetails.pendingAmount / 2)) }))}
                                className="text-xs font-bold text-primary hover:underline cursor-pointer"
                              >
                                50% (₹{Math.round(activePayeeDetails.pendingAmount / 2).toLocaleString('en-IN')})
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={overallPayFormData.amount}
                          onChange={(e) => setOverallPayFormData({ ...overallPayFormData, amount: e.target.value })}
                          className="h-11 w-full pl-8 pr-4 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Payment Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={overallPayFormData.paymentDate}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, paymentDate: e.target.value })}
                        onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                      />
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Payment Mode <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={overallPayFormData.paymentMode}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, paymentMode: e.target.value })}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="Bank">Bank Transfer (NEFT/IMPS/RTGS)</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Paid From Account */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Paid From Account
                      </label>
                      <select
                        value={overallPayFormData.fundingAccount}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, fundingAccount: e.target.value })}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <option value="">Default / Not specified</option>
                        {accounts.map((acc) => (
                          <option key={acc._id} value={acc._id}>
                            {acc.accountName} ({acc.accountType})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reference / UTR */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Reference / UTR / Txn ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UPI Ref / Cheque # / NEFT UTR"
                        value={overallPayFormData.reference}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, reference: e.target.value })}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                      />
                    </div>

                    {/* Remarks / Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Payment Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Lump-sum shoot settlement, clearance notes..."
                        value={overallPayFormData.notes}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, notes: e.target.value })}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                      />
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
                <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-card/95 backdrop-blur-md flex justify-between items-center select-none">
                  <button
                    type="button"
                    onClick={() => setIsOverallPaying(false)}
                    className="h-11 px-5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer"
                  >
                    Back to Statement
                  </button>
                  <button
                    type="submit"
                    form="overall-pay-form"
                    disabled={payeeOverallPay.isPending || !Number(overallPayFormData.amount)}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                  {/* Date Filters & Export Statement Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Preset Pills */}
                      <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setQuickPayeeDatePreset('all')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                            payeeDatePreset === 'all'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPayeeDatePreset('this_week')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                            payeeDatePreset === 'this_week'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPayeeDatePreset('this_month')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                            payeeDatePreset === 'this_month'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          This Month
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPayeeDatePreset('this_year')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                            payeeDatePreset === 'this_year'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          This Year
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPayeeDatePreset('custom')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                            payeeDatePreset === 'custom'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Date to Date
                        </button>
                      </div>

                      {/* Date Range Inputs */}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <input
                          type="date"
                          value={payeeFromDate}
                          onChange={(e) => {
                            setPayeeFromDate(e.target.value);
                            setPayeeDatePreset('custom');
                          }}
                          onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                          title="From Date"
                          className="px-1 py-0.5 rounded border border-slate-200 text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">to</span>
                        <input
                          type="date"
                          value={payeeToDate}
                          onChange={(e) => {
                            setPayeeToDate(e.target.value);
                            setPayeeDatePreset('custom');
                          }}
                          onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                          title="To Date"
                          className="px-1 py-0.5 rounded border border-slate-200 text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                        />
                        {(payeeFromDate || payeeToDate) && (
                          <button
                            type="button"
                            onClick={() => setQuickPayeeDatePreset('all')}
                            className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Reset Dates"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Export Statement Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPayeeExportMenu((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Export Statement</span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </button>
                      {showPayeeExportMenu && (
                        <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayeeExportMenu(false);
                              handleExportCSV(
                                displayedPayeeItems,
                                `statement_${(activePayeeDetails.name || 'payee').replace(/[^a-z0-9]/gi, '_')}`,
                                payeeDatePreset === 'this_week'
                                  ? 'this_week'
                                  : payeeDatePreset === 'this_month'
                                  ? 'this_month'
                                  : payeeDatePreset === 'this_year'
                                  ? 'this_year'
                                  : payeeFromDate && payeeToDate
                                  ? `${payeeFromDate}_to_${payeeToDate}`
                                  : 'all_time'
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Download CSV Statement</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayeeExportMenu(false);
                              handlePrintReport(
                                displayedPayeeItems,
                                `Payee Statement & Ledger: ${activePayeeDetails.name}`,
                                payeeDatePreset === 'this_week'
                                  ? `This Week (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                                  : payeeDatePreset === 'this_month'
                                  ? `This Month (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                                  : payeeDatePreset === 'this_year'
                                  ? `This Year (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                                  : payeeFromDate && payeeToDate
                                  ? `${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)}`
                                  : 'All Time Statement',
                                `Individual vendor statement & payment clearance ledger for ${activePayeeDetails.name}`
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Print / Save PDF Statement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Period Indicator Badge */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Period:</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {payeeDatePreset === 'this_week'
                          ? `This Week (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                          : payeeDatePreset === 'this_month'
                          ? `This Month (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                          : payeeDatePreset === 'this_year'
                          ? `This Year (${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)})`
                          : payeeFromDate && payeeToDate
                          ? `${formatDateIST(payeeFromDate)} – ${formatDateIST(payeeToDate)}`
                          : 'All Time Records'}
                      </span>
                    </div>
                    {(payeeFromDate || payeeToDate || payeeDatePreset !== 'all') && (
                      <button
                        type="button"
                        onClick={() => setQuickPayeeDatePreset('all')}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                      >
                        Reset to All Records
                      </button>
                    )}
                  </div>

                  {/* KPI Cards Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed / Tasks</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{formatINR(payeeFilteredTotal)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{displayedPayeeItems.length} entries in range</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Cleared / Paid</span>
                      <div className="text-lg font-bold text-emerald-800 mt-0.5">{formatINR(payeeFilteredPaid)}</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">{payeeFilteredPaidCount} cleared</div>
                    </div>
                    <div className={`p-3 rounded-xl border flex flex-col justify-between ${payeeFilteredPending > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${payeeFilteredPending > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pending to Pay</span>
                          {payeeFilteredPending > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                              Due
                            </span>
                          )}
                        </div>
                        <div className={`text-lg font-bold mt-0.5 ${payeeFilteredPending > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-900'}`}>
                          {formatINR(payeeFilteredPending)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${payeeFilteredPending > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                          {payeeFilteredPendingCount > 0 ? `${payeeFilteredPendingCount} unpaid bills` : 'All cleared'}
                        </div>
                      </div>
                      {payeeFilteredPending > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                          className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                          title={`Pay overall balance of ${formatINR(payeeFilteredPending)}`}
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
                        <span className="text-[10px] text-slate-500">{displayedPayeeItems.length} records</span>
                      </div>
                      {payeeFilteredPending > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          title={`Settle ${formatINR(payeeFilteredPending)} across unpaid bills in range`}
                        >
                          <Wallet className="h-3 w-3" />
                          <span>Overall Pay ({formatINR(payeeFilteredPending)})</span>
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto text-xs">
                      {displayedPayeeItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 space-y-2">
                          <p className="font-medium text-xs">No transaction records found for the selected date filter.</p>
                          <button
                            type="button"
                            onClick={() => setQuickPayeeDatePreset('all')}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                          >
                            Reset Date Filter
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-left">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase sticky top-0">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Item / Description</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Amount (Billed / Due)</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedPayeeItems.map((item) => (
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
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      ['rj', 'vj'].includes(item.category?.toLowerCase())
                                        ? 'bg-indigo-50 text-indigo-700 font-bold uppercase'
                                        : 'bg-slate-100 text-slate-700 capitalize'
                                    }`}
                                  >
                                    {formatExpenseCategory(item.category)}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    (item.calculatedStatus || item.paymentStatus) === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : (item.calculatedStatus || item.paymentStatus) === 'partially_paid'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {(item.calculatedStatus || item.paymentStatus) === 'paid' ? 'Paid' : (item.calculatedStatus || item.paymentStatus) === 'partially_paid' ? 'Partial' : 'Unpaid'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                  <div>{formatINR(item.total)}</div>
                                  {item.paid > 0 && item.balance > 0 && (
                                    <div className="text-[10px] text-emerald-600 font-semibold">
                                      Paid: {formatINR(item.paid)}
                                    </div>
                                  )}
                                  {item.balance > 0 && item.paid > 0 && (
                                    <div className="text-[10px] text-amber-600 font-bold">
                                      Due: {formatINR(item.balance)}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {item.balance > 0 && (
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
                      )}
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
                    {payeeFilteredPending > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        <span>Overall Pay ({formatINR(payeeFilteredPending)})</span>
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
