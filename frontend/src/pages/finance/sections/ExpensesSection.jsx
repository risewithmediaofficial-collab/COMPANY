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
  BellRing,
  FileText,
  ArrowLeft,
  Printer,
  ChevronDown,
} from '@/components/ui/muiIcons';
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
import { useDateFilter } from '../../../context/DateFilterContext';
import { SelectDropdown } from '../../../components/ui/SelectDropdown';

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
  const { startDate: fromDate, endDate: toDate, period: globalPeriod, isDateInRange, resetDateFilter } = useDateFilter();
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'payees' | 'subscriptions' | 'payment_reminders'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [payeeSearch, setPayeeSearch] = useState('');
  const deferredPayeeSearch = useDeferredValue(payeeSearch);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)
  const [showPayeeExportMenu, setShowPayeeExportMenu] = useState(false);

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
      if (!isDateInRange(expDate)) return false;
      if (!deferredSearch.trim()) return true;
      const q = deferredSearch.toLowerCase();
      const title = (e.title || '').toLowerCase();
      const vendor = (e.vendor || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      return title.includes(q) || vendor.includes(q) || cat.includes(q);
    });
  }, [expenses, isDateInRange, deferredSearch]);

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
      return isDateInRange(expDate);
    });
  }, [activePayeeDetails, isDateInRange]);

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
      periodLabel = globalPeriod === 'this_month'
        ? 'this_month'
        : globalPeriod === 'previous_month'
        ? 'previous_month'
        : globalPeriod === 'yearly'
        ? 'yearly'
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
      globalPeriod === 'this_month'
        ? `This Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : globalPeriod === 'previous_month'
        ? `Previous Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : globalPeriod === 'yearly'
        ? `Yearly (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
        : fromDate && toDate
        ? `${formatDateIST(fromDate)} – ${formatDateIST(toDate)}`
        : 'All Dates'
    );

    const rowsHtml = itemsToPrint.map((e, idx) => {
      const fin = calculateExpenseFinancials(e);
      return `
      <tr>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; font-variant-numeric: tabular-nums;">${idx + 1}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; white-space: nowrap; font-variant-numeric: tabular-nums;">${formatDateIST(e.date || e.createdAt)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; font-weight: 600;">${e.title || '-'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px;">${e.vendor || 'Unassigned'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px;">${formatExpenseCategory(e.category)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums;">${formatINR(fin.total)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; text-align: right; color: #18181b; font-weight: 600; font-variant-numeric: tabular-nums;">${formatINR(fin.paid)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 11px; text-align: right; color: #52525b; font-weight: 600; font-variant-numeric: tabular-nums;">${formatINR(fin.balance)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e4e4e7; font-size: 10px; text-align: center; text-transform: uppercase; font-weight: 700;">
          <span style="padding: 2px 8px; border-radius: 9999px; ${fin.status === 'paid' ? 'background: #18181b; color: #ffffff;' : fin.status === 'partially_paid' ? 'background: #e4e4e7; color: #18181b;' : 'background: #f4f4f5; color: #52525b; border: 1px solid #d4d4d8;'}">
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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #09090b; margin: 0; padding: 20px; font-variant-numeric: tabular-nums; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e4e4e7; padding-bottom: 14px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; color: #09090b; margin: 0 0 4px 0; }
            .subtitle { font-size: 12px; color: #52525b; margin: 0; }
            .badge { display: inline-block; padding: 4px 10px; background: #f4f4f5; color: #18181b; border: 1px solid #d4d4d8; font-weight: 700; font-size: 11px; border-radius: 6px; margin-top: 6px; }
            .kpis { display: flex; gap: 12px; margin-bottom: 16px; }
            .kpi-card { flex: 1; border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 14px; background: #fafafa; }
            .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #52525b; margin-bottom: 2px; }
            .kpi-value { font-size: 16px; font-weight: 800; color: #09090b; font-variant-numeric: tabular-nums; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { padding: 8px 10px; background: #f4f4f5; border-bottom: 2px solid #d4d4d8; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #3f3f46; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; font-size: 10px; color: #71717a; }
            .actions-bar { margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px; }
            .print-btn { background: #18181b; color: #ffffff; border: none; padding: 8px 16px; font-weight: 700; font-size: 12px; border-radius: 6px; cursor: pointer; }
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
              <div style="font-weight: 800; font-size: 16px; color: #18181b;">RiseWithMedia</div>
              <div style="font-size: 11px; color: #52525b;">Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Total Billed</div>
              <div class="kpi-value">${formatINR(totalAmt)}</div>
            </div>
            <div class="kpi-card" style="background: #ffffff; border-color: #d4d4d8;">
              <div class="kpi-label" style="color: #3f3f46;">Total Cleared / Paid</div>
              <div class="kpi-value" style="color: #09090b;">${formatINR(paidAmt)}</div>
            </div>
            <div class="kpi-card" style="background: #f4f4f5; border-color: #d4d4d8;">
              <div class="kpi-label" style="color: #3f3f46;">Pending to Pay</div>
              <div class="kpi-value" style="color: #18181b;">${formatINR(pendingAmt)}</div>
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
        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold mb-1">
            <span>TOTAL POSTED EXPENSES</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalExpenses)}</div>
          <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">{filteredExpenses.length} total recorded bills</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold mb-1">
            <span>TOTAL CLEARED / PAID</span>
            <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalPaidExpenses)}</div>
          <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">{paidBillsCount} settled bills</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold mb-1">
            <span>UNPAID VENDOR BILLS</span>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalUnpaidBills)}</div>
          <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">{unpaidBillsCount} vendor bills pending payment</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold mb-1">
            <span>RECURRING SUBSCRIPTIONS</span>
            <CalendarCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{subscriptions.length} Active Tools</div>
          <div className="text-[11px] text-muted-foreground mt-1">Scheduled software & hosting commitments</div>
        </div>
      </div>

      {/* Sub Tabs: Expenses / Payees / Subscriptions / Payment Reminders */}
      <div className="inline-flex max-w-full bg-secondary/75 p-1 rounded-xl gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 tabular-nums ${
            activeTab === 'expenses'
              ? 'bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="h-3.5 w-3.5 shrink-0" />
          <span>Operational Expenses & Vendor Bills ({filteredExpenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payees')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 tabular-nums ${
            activeTab === 'payees'
              ? 'bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>Payee & Vendor Ledgers ({payeeSummaries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 tabular-nums ${
            activeTab === 'subscriptions'
              ? 'bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Recurring Subscriptions ({subscriptions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payment_reminders')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'payment_reminders'
              ? 'bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BellRing className="h-3.5 w-3.5 shrink-0" />
          <span>Payment Reminders</span>
        </button>
      </div>

      {activeTab === 'expenses' && (
        <>
          {/* Filters & Action Bar */}
          <div className="bg-card p-3.5 sm:p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search title, vendor, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary bg-background min-h-[36px]"
                />
              </div>

              <SelectDropdown
                value={categoryFilter || 'all'}
                onChange={(val) => setCategoryFilter(val || 'all')}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'production_shoot', label: 'Production / Shoot' },
                  { value: 'rj', label: 'RJ (Radio Jockey)' },
                  { value: 'vj', label: 'VJ (Video Jockey)' },
                  { value: 'travel', label: 'Travel' },
                  { value: 'freelancers', label: 'Freelancers' },
                  { value: 'software_subscriptions', label: 'Software / Subscriptions' },
                  { value: 'rent', label: 'Rent' },
                  { value: 'internet', label: 'Internet & Utilities' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'office', label: 'Office Expenses' },
                ]}
                placeholder="All Categories"
                allowCustom={false}
                allowDeselect={false}
                className="w-full sm:w-44"
                buttonClassName="h-9 px-3 rounded-lg text-xs bg-background text-foreground border border-border/50"
              />

              <SelectDropdown
                value={paymentStatusFilter || 'all'}
                onChange={(val) => setPaymentStatusFilter(val || 'all')}
                options={[
                  { value: 'all', label: 'All Payment Statuses' },
                  { value: 'paid', label: 'Fully Paid Expenses' },
                  { value: 'partially_paid', label: 'Partially Paid Bills' },
                  { value: 'unpaid', label: 'Unpaid Vendor Bills' },
                ]}
                placeholder="All Payment Statuses"
                allowCustom={false}
                allowDeselect={false}
                className="w-full sm:w-48"
                buttonClassName="h-9 px-3 rounded-lg text-xs bg-background text-foreground border border-border/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Export as Report Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-background text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer min-h-[36px]"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Export Report</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-popover rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-1.5 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleExportCSV()}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Download CSV Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReport()}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Print / Save PDF Report</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => onQuickAdd('expense')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer min-h-[36px]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Record Expense / Bill</span>
              </button>
            </div>
          </div>

          {/* Mobile Cards List (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {sortedExpenses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-card rounded-xl ">
                No expenses or vendor bills found matching your criteria.
              </div>
            ) : (
              sortedExpenses.map((exp) => {
                const fin = calculateExpenseFinancials(exp);
                return (
                  <div
                    key={exp._id}
                    onClick={() => setSelectedExpenseForSidebar(exp)}
                    className="p-4 rounded-xl bg-card space-y-3 active:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-1">
                          <span className="text-muted-foreground font-medium tabular-nums">{formatDateIST(exp.date)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground ${
                              ['rj', 'vj'].includes(exp.category?.toLowerCase()) ? 'font-bold uppercase' : 'capitalize'
                            }`}
                          >
                            {formatExpenseCategory(exp.category)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              exp.costType === 'client_project'
                                ? 'bg-secondary text-foreground '
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {exp.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground leading-snug">{exp.title}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-foreground tabular-nums">{formatINR(fin.total)}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase mt-0.5 ${
                            fin.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                              : fin.status === 'partially_paid'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {fin.status === 'paid' ? 'Paid' : fin.status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <div>
                        {exp.vendor ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayeeForLedger(exp.vendor);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary hover:bg-muted text-foreground font-bold text-xs cursor-pointer"
                          >
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{exp.vendor}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditExpense(exp);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            <Plus className="h-2.5 w-2.5 shrink-0" /> Assign Payee
                          </button>
                        )}
                      </div>

                      {fin.balance > 0 && fin.paid > 0 && (
                        <div className="text-[11px] text-foreground font-bold tabular-nums">
                          Due: {formatINR(fin.balance)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 " onClick={(e) => e.stopPropagation()}>
                      {fin.balance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExpenseForSidebar(exp);
                            handleOpenAddPayment(exp);
                          }}
                          className="flex-1 min-h-[36px] flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3 shrink-0" />
                          <span>Pay / Add</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEditExpense(exp)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg text-foreground hover:bg-muted font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        title="Edit Expense"
                      >
                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp)}
                        disabled={deleteExpense.isPending}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Expenses Table (Desktop hidden md:flex) */}
          <div className="hidden md:flex bg-card rounded-xl overflow-hidden flex-col">
            <div className="responsive-table-container overflow-y-auto max-h-[600px] text-xs">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-muted sticky top-0 z-10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] ">
                  <tr>
                    <th
                      onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="p-3 cursor-pointer select-none hover:bg-secondary transition-colors"
                      title="Click to toggle date sort (Newest / Oldest)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
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
                <tbody className="divide-y divide-foreground/[0.05]">
                  {sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-muted-foreground">
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
                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                        title="Click row to view all details & history in sidebar"
                      >
                        <td className="p-3 text-muted-foreground font-medium whitespace-nowrap tabular-nums">{formatDateIST(exp.date)}</td>
                        <td className="p-3 font-semibold text-foreground transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>{exp.title}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                          </div>
                        </td>
                        <td className="p-3 text-foreground">
                          {exp.vendor ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPayeeForLedger(exp.vendor);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary hover:bg-muted text-foreground font-bold text-xs transition-colors cursor-pointer group/v"
                              title={`Open ${exp.vendor}'s payment history & pending balance ledger in sidebar`}
                            >
                              <User className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{exp.vendor}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditExpense(exp);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                              title="Click to assign payee/vendor name (e.g. VJ, Videographer)"
                            >
                              <Plus className="h-2.5 w-2.5 shrink-0" /> Assign Payee
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground ${
                              ['rj', 'vj'].includes(exp.category?.toLowerCase()) ? 'font-bold uppercase' : 'capitalize'
                            }`}
                          >
                            {formatExpenseCategory(exp.category)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              exp.costType === 'client_project'
                                ? 'bg-secondary text-foreground '
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {exp.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tabular-nums ${
                              fin.status === 'paid'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                                : fin.status === 'partially_paid'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {fin.status === 'paid'
                              ? 'Paid'
                              : fin.status === 'partially_paid'
                              ? `Partially Paid (${formatINR(fin.paid)})`
                              : 'Unpaid Bill'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-foreground text-sm whitespace-nowrap tabular-nums">
                          <div>{formatINR(fin.total)}</div>
                          {fin.paid > 0 && fin.balance > 0 && (
                            <div className="text-[10px] text-muted-foreground font-semibold">
                              Paid: {formatINR(fin.paid)}
                            </div>
                          )}
                          {fin.balance > 0 && fin.paid > 0 && (
                            <div className="text-[10px] text-foreground font-bold">
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
                                className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 "
                                title="Add payment or pay bill"
                              >
                                <Plus className="h-3 w-3 shrink-0" />
                                Pay / Add
                              </button>
                            ) : (
                              <span className="text-foreground font-semibold text-[10px] px-2 py-0.5 rounded bg-secondary ">
                                Paid
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditExpense(exp)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5 shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp)}
                              disabled={deleteExpense.isPending}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" />
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
          <div className="bg-card p-3.5 sm:p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search payee name, videographer, editor..."
                value={payeeSearch}
                onChange={(e) => setPayeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary bg-background min-h-[36px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <span className="text-muted-foreground font-medium tabular-nums">
                {filteredPayees.length} {filteredPayees.length === 1 ? 'payee' : 'payees'} found
              </span>
              <button
                onClick={() => onQuickAdd('expense')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 min-h-[36px] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Record Expense / Bill</span>
              </button>
            </div>
          </div>

          {/* Payees Mobile Cards (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredPayees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-card rounded-xl ">
                No payees or vendor records found matching your search.
              </div>
            ) : (
              filteredPayees.map((p) => (
                <div
                  key={p.name}
                  onClick={() => setSelectedPayeeForLedger(p.name)}
                  className="p-4 rounded-xl bg-card space-y-3 active:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-secondary text-foreground font-bold flex items-center justify-center text-sm shrink-0 ">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{p.name}</h4>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {p.items[0]?.category ? p.items[0].category.replace(/_/g, ' ') : 'Payee Account'}
                        </div>
                      </div>
                    </div>
                    {p.pendingAmount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground shrink-0">
                        Payment Due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary text-primary-foreground shrink-0">
                        Cleared
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 text-center text-xs tabular-nums">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">Total</span>
                      <span className="font-bold text-foreground mt-0.5 block">{formatINR(p.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">Cleared</span>
                      <span className="font-bold text-foreground mt-0.5 block">{formatINR(p.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block">Pending</span>
                      <span className={`font-bold mt-0.5 block ${p.pendingAmount > 0 ? 'text-foreground font-extrabold' : 'text-muted-foreground'}`}>
                        {formatINR(p.pendingAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 tabular-nums">
                    <span>{p.totalCount} bills ({p.paidCount} paid, {p.pendingCount} unpaid)</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 " onClick={(e) => e.stopPropagation()}>
                    {p.pendingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayeeForLedger(p.name);
                          handleOpenOverallPay(p);
                        }}
                        className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer"
                      >
                        <Wallet className="h-3.5 w-3.5 shrink-0" />
                        <span>Overall Pay</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPayeeForLedger(p.name)}
                      className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground font-bold text-xs cursor-pointer"
                    >
                      <span>Open Ledger</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payees Directory Table (Desktop hidden md:flex) */}
          <div className="hidden md:flex bg-card rounded-xl overflow-hidden flex-col">
            <div className="responsive-table-container overflow-y-auto max-h-[600px] text-xs">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-muted sticky top-0 z-10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] ">
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
                <tbody className="divide-y divide-foreground/[0.05]">
                  {filteredPayees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-muted-foreground">
                        No payees or vendor records found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPayees.map((p) => (
                      <tr
                        key={p.name}
                        onClick={() => setSelectedPayeeForLedger(p.name)}
                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                        title={`Click row to view ${p.name}'s payment ledger in sidebar`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-secondary text-foreground font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayeeForLedger(p.name);
                                }}
                                className="font-bold text-foreground text-left hover:underline cursor-pointer block"
                              >
                                {p.name}
                              </button>
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {p.items[0]?.category ? p.items[0].category.replace(/_/g, ' ') : 'Payee Account'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center tabular-nums">
                          <span className="font-bold text-foreground">{p.totalCount}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({p.paidCount} paid, {p.pendingCount} unpaid)</span>
                        </td>
                        <td className="p-3 text-right font-bold text-foreground tabular-nums">{formatINR(p.totalAmount)}</td>
                        <td className="p-3 text-right font-bold text-foreground tabular-nums">{formatINR(p.paidAmount)}</td>
                        <td className="p-3 text-right font-bold text-sm tabular-nums">
                          {p.pendingAmount > 0 ? (
                            <span className="text-foreground font-extrabold">{formatINR(p.pendingAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground font-normal">₹0.00</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.pendingAmount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground ">
                              Payment Due
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary text-primary-foreground">
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors cursor-pointer"
                                title={`Overall Pay ${formatINR(p.pendingAmount)} for ${p.name}`}
                              >
                                <Wallet className="h-3 w-3 shrink-0" />
                                <span>Overall Pay</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPayeeForLedger(p.name);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground font-bold text-xs transition-colors cursor-pointer"
                            >
                              <span>Open Ledger</span>
                              <ArrowRight className="h-3 w-3 shrink-0" />
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
        <div className="space-y-4">
          <div className="bg-card p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Software & Agency Subscriptions</h3>
            </div>
            <button
              onClick={() => onQuickAdd('subscription')}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 min-h-[36px] w-full sm:w-auto cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Schedule Subscription</span>
            </button>
          </div>

          {/* Subscriptions Mobile Cards (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-card rounded-xl ">
                No recurring subscriptions scheduled.
              </div>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub._id} className="p-4 rounded-xl bg-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-bold capitalize">
                          {sub.costClassification}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold capitalize">
                          {sub.frequency}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground truncate">{sub.serviceName}</h4>
                      <p className="text-xs text-muted-foreground truncate">{sub.vendor || sub.serviceName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-foreground tabular-nums">{formatINR(sub.expectedAmount)}</div>
                      <span className="text-[10px] font-medium text-muted-foreground block mt-0.5 tabular-nums">
                        Due {formatDateIST(sub.nextRenewalDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 ">
                    <button
                      onClick={() => postRenewal.mutate({ id: sub._id, actualAmount: sub.expectedAmount })}
                      disabled={postRenewal.isPending}
                      className="flex-1 min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      Post Renewal
                    </button>
                    <button
                      onClick={() => handleStartEditSubscription(sub)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg text-foreground hover:bg-muted font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      title="Edit Subscription"
                    >
                      <Edit2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(sub)}
                      disabled={deleteSubscription.isPending}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      title="Delete Subscription"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subscriptions Desktop Table (hidden md:flex) */}
          <div className="hidden md:flex bg-card rounded-xl overflow-hidden flex-col">
            <div className="responsive-table-container overflow-y-auto max-h-[600px] text-xs">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-muted sticky top-0 z-10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] ">
                  <tr>
                    <th className="p-3">Tool / Service</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3 text-right">Expected Amount</th>
                    <th className="p-3">Next Renewal Date</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05]">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-muted-foreground">
                        No recurring subscriptions scheduled.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{sub.serviceName}</td>
                        <td className="p-3 text-muted-foreground">{sub.vendor || sub.serviceName}</td>
                        <td className="p-3 capitalize text-foreground">{sub.frequency}</td>
                        <td className="p-3 text-right font-bold text-foreground tabular-nums">{formatINR(sub.expectedAmount)}</td>
                        <td className="p-3 font-medium text-muted-foreground whitespace-nowrap tabular-nums">{formatDateIST(sub.nextRenewalDate)}</td>
                        <td className="p-3 capitalize text-foreground">{sub.costClassification}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => postRenewal.mutate({ id: sub._id, actualAmount: sub.expectedAmount })}
                              disabled={postRenewal.isPending}
                              className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Post Renewal
                            </button>
                            <button
                              onClick={() => handleStartEditSubscription(sub)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit Subscription"
                            >
                              <Edit2 className="h-3.5 w-3.5 shrink-0" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubscription(sub)}
                              disabled={deleteSubscription.isPending}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Delete Subscription"
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" />
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

      {/* 4. PAYMENT REMINDERS (ISOLATED REFERRAL / CLIENT SETTLEMENTS) */}
      {activeTab === 'payment_reminders' && (
        <Suspense fallback={
          <div className="w-full py-12 flex flex-col items-center justify-center space-y-3">
            <div className="h-7 w-7 rounded-full border-2 border-border border-t-foreground animate-spin" />
            <span className="text-[11px] font-medium text-muted-foreground">Loading payment reminders...</span>
          </div>
        }>
          <PaymentRemindersTab />
        </Suspense>
      )}

      {/* EDIT SUBSCRIPTION SLIDE-OVER DRAWER */}
      <Dialog open={Boolean(editingSubscription)} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        {editingSubscription && (
          <DialogContent variant="side" size="lg" className="flex flex-col h-full bg-card text-foreground p-0">
            <DialogHeader className="p-6 bg-muted/30 pr-16 select-none">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                  <CalendarCheck className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Edit Subscription — {editingSubscription.serviceName}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Edit subscription
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
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Vendor / Provider</label>
                <input
                  type="text"
                  value={subscriptionForm.vendor}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, vendor: e.target.value })}
                  placeholder="e.g. Adobe, AWS, Figma..."
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground">Expected Amount (₹) *</label>
                  {Number(subscriptionForm.expectedAmount) > 0 && (
                    <span className="text-xs font-bold text-foreground bg-secondary px-2 py-0.5 rounded-lg tabular-nums">
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
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm font-bold text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Frequency</label>
                <SelectDropdown
                  value={subscriptionForm.frequency || 'monthly'}
                  onChange={(val) => setSubscriptionForm({ ...subscriptionForm, frequency: val || 'monthly' })}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'annual', label: 'Annual' },
                    { value: 'quarterly', label: 'Quarterly' },
                  ]}
                  placeholder="Frequency"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground border border-border/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Next Renewal Date *</label>
                <input
                  type="date"
                  required
                  value={subscriptionForm.nextRenewalDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, nextRenewalDate: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Classification</label>
                <SelectDropdown
                  value={subscriptionForm.costClassification || 'software'}
                  onChange={(val) => setSubscriptionForm({ ...subscriptionForm, costClassification: val || 'software' })}
                  options={[
                    { value: 'software', label: 'Software / SaaS' },
                    { value: 'tools', label: 'Tools & Utilities' },
                    { value: 'hosting', label: 'Hosting / Cloud' },
                    { value: 'other', label: 'Other' },
                  ]}
                  placeholder="Classification"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground border border-border/50"
                />
              </div>
            </form>

            <div className="shrink-0 p-4 sm:p-5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <span className="text-xs text-muted-foreground font-medium text-center sm:text-left">Auto-renewing ledger commitment</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-subscription-form"
                  disabled={updateSubscription.isPending}
                  className="flex-1 sm:flex-initial h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
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
        <DialogContent variant="side" size="xl" className="flex flex-col h-full bg-card text-foreground text-xs p-0">
          {/* CASE 1: INDIVIDUAL EXPENSE DETAILS SIDEBAR */}
          {selectedExpenseForSidebar && currentSelectedExpense && (
            isEditingExpenseInSidebar ? (
              <>
                {/* ── EDIT EXPENSE SLIDE-OVER DRAWER FORM ── */}
                <DialogHeader className="p-5 bg-muted/30 pr-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Edit2 className="h-5 w-5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground ">
                            Edit Mode
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                            {formatDateIST(currentSelectedExpense.date)}
                          </span>
                        </div>
                        <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                          Edit Expense
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Edit expense
                        </DialogDescription>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingExpenseInSidebar(false)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer mr-6 "
                      title="Switch back to view mode"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
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
                      Item Title / Description <span className="text-foreground">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={expenseForm.title}
                      onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                      placeholder="e.g. Saran bro - vshoot payment, Office Fiber Broadband..."
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Total Bill Amount (₹) <span className="text-foreground">*</span>
                      </label>
                      {Number(expenseForm.amount) > 0 && (
                        <span className="text-xs font-bold text-foreground bg-secondary px-2 py-0.5 rounded-lg tabular-nums">
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
                        className="h-11 w-full pl-8 pr-4 rounded-xl bg-background text-sm font-bold text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 "
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Bill / Expense Date <span className="text-foreground">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))}
                        className="text-xs text-foreground hover:underline font-bold cursor-pointer"
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
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer "
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
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. Saran, VJ, Office Landlord, Videographer..."
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        className="h-11 w-full pl-10 pr-4 rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-muted-foreground font-medium">1-Click Presets:</span>
                      {['RJ', 'VJ', 'Videographer', 'Video Editor', 'Graphic Designer', 'Shoot Crew', 'Saran Bro'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setExpenseForm((prev) => ({ ...prev, vendor: sug }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            expenseForm.vendor === sug
                              ? 'bg-primary text-primary-foreground font-bold '
                              : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground '
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
                    <SelectDropdown
                      value={expenseForm.category}
                      onChange={(val) => setExpenseForm({ ...expenseForm, category: val })}
                      options={[
                        { value: 'production_shoot', label: 'Production / Shoot' },
                        { value: 'rj', label: 'RJ (Radio Jockey / Voice Talent)' },
                        { value: 'vj', label: 'VJ (Video Jockey / Presenter / Anchor)' },
                        { value: 'travel', label: 'Travel Allowance' },
                        { value: 'freelancers', label: 'Freelancers & Crew' },
                        { value: 'software_subscriptions', label: 'Software & Subscriptions' },
                        { value: 'rent', label: 'Office Rent' },
                        { value: 'internet', label: 'Internet & Utilities' },
                        { value: 'marketing', label: 'Marketing & Promotion' },
                        { value: 'office', label: 'Office Supplies & Expenses' },
                        { value: 'other', label: 'Other Operations' },
                      ]}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground"
                    />
                  </div>

                  {/* Cost Allocation Type */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Cost Allocation Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl ">
                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, costType: 'agency_overhead' }))}
                        className={`h-9 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          expenseForm.costType === 'agency_overhead'
                            ? 'bg-card text-foreground '
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
                            ? 'bg-primary text-primary-foreground '
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
                        className={`p-3 rounded-xl text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'paid'
                            ? 'bg-secondary ring-2 ring-primary/20 '
                            : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${expenseForm.paymentStatus === 'paid' ? 'text-foreground' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'paid' && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-foreground">Paid</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Fully cleared</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'partially_paid' }))}
                        className={`p-3 rounded-xl text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'partially_paid'
                            ? 'bg-secondary ring-2 ring-primary/20 '
                            : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Clock className={`h-4 w-4 shrink-0 ${expenseForm.paymentStatus === 'partially_paid' ? 'text-foreground' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'partially_paid' && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="font-bold text-xs text-foreground">Partially Paid</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Advance / split</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpenseForm((prev) => ({ ...prev, paymentStatus: 'unpaid' }))}
                        className={`p-3 rounded-xl text-left transition-all cursor-pointer relative ${
                          expenseForm.paymentStatus === 'unpaid'
                            ? 'bg-secondary ring-2 ring-primary/20 '
                            : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <AlertCircle className={`h-4 w-4 shrink-0 ${expenseForm.paymentStatus === 'unpaid' ? 'text-foreground' : 'text-muted-foreground'}`} />
                          {expenseForm.paymentStatus === 'unpaid' && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
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
                      className="w-full p-3.5 rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                </form>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-4 sm:p-5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditingExpenseInSidebar(false)}
                      className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="edit-expense-sidebar-form"
                      disabled={updateExpense.isPending}
                      className="flex-1 sm:flex-initial h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{updateExpense.isPending ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="p-5 bg-muted/30 pr-12">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tabular-nums ${
                        currentSelectedExpense.paymentStatus === 'paid'
                          ? 'bg-primary text-primary-foreground'
                          : currentSelectedExpense.paymentStatus === 'partially_paid'
                          ? 'bg-secondary text-foreground '
                          : 'bg-muted text-muted-foreground '
                      }`}>
                        {currentSelectedExpense.paymentStatus === 'paid'
                          ? 'Paid / Cleared'
                          : currentSelectedExpense.paymentStatus === 'partially_paid'
                          ? `Partially Paid (${formatINR(currentExpPaid)} / ${formatINR(currentExpTotal)})`
                          : 'Unpaid Bill'}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                        {formatDateIST(currentSelectedExpense.date)}
                      </span>
                    </div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      {currentSelectedExpense.title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Expense details
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-muted/40 ">
                  {currentExpBalance > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                        className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span>Add Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => payVendorBill.mutate({ id: currentSelectedExpense._id })}
                        disabled={payVendorBill.isPending}
                        className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 tabular-nums"
                        title={`Pay remaining balance of ${formatINR(currentExpBalance)}`}
                      >
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>{payVendorBill.isPending ? 'Processing...' : `Pay Full (${formatINR(currentExpBalance)})`}</span>
                      </button>
                    </>
                  )}
                  {currentExpBalance === 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                      className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Add an additional payment adjustment"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>Add Payment</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartEditExpense(currentSelectedExpense)}
                    className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Edit Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const exp = currentSelectedExpense;
                      setSelectedExpenseForSidebar(null);
                      await handleDeleteExpense(exp);
                    }}
                    disabled={deleteExpense.isPending}
                    className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer sm:ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Primary Financial Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-muted/40 ">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Billed</span>
                    <div className="text-base font-extrabold text-foreground mt-0.5 tabular-nums">
                      {formatINR(currentExpTotal)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 ">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Cleared</span>
                    <div className="text-base font-extrabold text-foreground mt-0.5 tabular-nums">
                      {formatINR(currentExpPaid)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${currentExpBalance > 0 ? 'bg-secondary ' : 'bg-muted/40 '}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Balance</span>
                    <div className={`text-base font-extrabold mt-0.5 tabular-nums ${currentExpBalance > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {formatINR(currentExpBalance)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 ">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category / Type</span>
                    <div className="text-xs font-bold text-foreground mt-1 truncate">
                      {formatExpenseCategory(currentSelectedExpense.category)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {currentSelectedExpense.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                    </div>
                  </div>
                </div>

                {/* Settlement Progress Bar Strip */}
                <div className="p-3.5 rounded-xl bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      Settlement Progress
                    </span>
                    <span className="font-extrabold text-foreground tabular-nums">
                      {currentExpPercent}% Settled ({formatINR(currentExpPaid)} / {formatINR(currentExpTotal)})
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentExpPercent === 100 ? 'bg-primary' : currentExpPercent > 0 ? 'bg-foreground/70' : 'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${currentExpPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground tabular-nums">
                    <span>{displayedPayments.length} payment installment(s) recorded</span>
                    {currentExpBalance > 0 ? (
                      <span className="text-foreground font-bold">{formatINR(currentExpBalance)} pending clearance</span>
                    ) : (
                      <span className="text-foreground font-bold">Fully Cleared</span>
                    )}
                  </div>
                </div>

                {/* PAYMENTS & INSTALLMENTS LIST & INLINE ADD FORM */}
                <div className="rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-bold text-foreground text-xs">Payments & Installments</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground tabular-nums">
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary hover:bg-muted text-foreground font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      {showAddPaymentForm ? 'Cancel' : 'Add Payment'}
                    </button>
                  </div>

                  {/* INLINE ADD PAYMENT FORM */}
                  {showAddPaymentForm && (
                    <form onSubmit={handleAddPaymentSubmit} className="p-5 rounded-2xl bg-muted/40 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Plus className="h-4 w-4 text-foreground shrink-0" />
                          Record New Payment / Installment
                        </span>
                        {currentExpBalance > 0 && (
                          <div className="flex items-center gap-2 tabular-nums">
                            <button
                              type="button"
                              onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(currentExpBalance) }))}
                              className="text-xs font-bold text-foreground hover:underline cursor-pointer"
                            >
                              Pay Remaining (₹{currentExpBalance})
                            </button>
                            {currentExpBalance > 500 && (
                              <button
                                type="button"
                                onClick={() => setPaymentFormData((prev) => ({ ...prev, amount: String(Math.round(currentExpBalance / 2)) }))}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
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
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm font-bold text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 "
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
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 "
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Payment Mode *
                        </label>
                        <SelectDropdown
                          value={paymentFormData.paymentMode}
                          onChange={(val) => setPaymentFormData({ ...paymentFormData, paymentMode: val })}
                          options={[
                            { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                            { value: 'Bank', label: 'Bank Transfer (NEFT/IMPS/RTGS)' },
                            { value: 'Cash', label: 'Cash' },
                            { value: 'Card', label: 'Debit / Credit Card' },
                            { value: 'Cheque', label: 'Cheque' },
                            { value: 'Other', label: 'Other' },
                          ]}
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Paid From Account
                        </label>
                        <SelectDropdown
                          value={paymentFormData.fundingAccount}
                          onChange={(val) => setPaymentFormData({ ...paymentFormData, fundingAccount: val })}
                          options={[
                            { value: '', label: 'Default / Not specified' },
                            ...accounts.map((acc) => ({
                              value: acc._id,
                              label: `${acc.accountName} (${acc.accountType})`,
                            })),
                          ]}
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground"
                        />
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
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
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
                          className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentForm(false)}
                          className="h-11 px-5 rounded-xl bg-background hover:bg-muted text-foreground font-semibold text-sm cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addExpensePayment.isPending}
                          className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50 cursor-pointer"
                        >
                          {addExpensePayment.isPending ? 'Recording...' : 'Save Payment'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TABLE / LIST OF PAYMENTS */}
                  {displayedPayments.length === 0 ? (
                    <div className="p-4 rounded-xl text-center bg-muted/30 space-y-1.5">
                      <Clock className="h-6 w-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No payments recorded yet</p>
                      <p className="text-[11px] text-muted-foreground">
                        Record partial installments or full settlement as payments are made.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                        className="inline-flex items-center gap-1 px-3 py-1 mt-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer "
                      >
                        <Plus className="h-3 w-3 shrink-0" />
                        Record First Payment
                      </button>
                    </div>
                  ) : (
                    <div className="responsive-table-container rounded-xl ">
                      <table className="w-full min-w-[450px] text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Reference / Notes</th>
                            <th className="p-2.5 text-right">Amount</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/[0.05]">
                          {displayedPayments.map((pmt, idx) => (
                            <tr key={pmt._id || idx} className="hover:bg-muted/40 transition-colors">
                              <td className="p-2.5 font-medium text-muted-foreground whitespace-nowrap tabular-nums">
                                {formatDateIST(pmt.paymentDate || pmt.createdAt)}
                              </td>
                              <td className="p-2.5">
                                <div className="flex flex-col">
                                  <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-semibold w-fit">
                                    {pmt.paymentMode || 'Bank'}
                                  </span>
                                  {(pmt.fundingAccount?.accountName || accounts.find((a) => String(a._id) === String(pmt.fundingAccount))?.accountName) && (
                                    <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                                      {pmt.fundingAccount?.accountName || accounts.find((a) => String(a._id) === String(pmt.fundingAccount))?.accountName}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-[11px]">
                                <div className="font-semibold text-foreground">{pmt.reference || 'Payment'}</div>
                                {pmt.notes && <div className="text-muted-foreground text-[10px] truncate max-w-[180px]">{pmt.notes}</div>}
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-foreground whitespace-nowrap tabular-nums">
                                +{formatINR(pmt.amount)}
                              </td>
                              <td className="p-2.5 text-right">
                                {!pmt.isLegacy && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(pmt._id)}
                                    disabled={deleteExpensePayment.isPending}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                                    title="Delete this payment record"
                                  >
                                    <Trash2 className="h-3 w-3 shrink-0" />
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
                <div className="rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      Payee / Vendor
                    </span>
                    {currentSelectedExpense.vendor && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayeeForLedger(currentSelectedExpense.vendor);
                          setSelectedExpenseForSidebar(null);
                        }}
                        className="text-[11px] font-bold text-foreground hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full Statement</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </button>
                    )}
                  </div>

                  {currentSelectedExpense.vendor ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 ">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">
                            {currentSelectedExpense.vendor.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-foreground text-xs block">{currentSelectedExpense.vendor}</span>
                            <span className="text-[10px] text-muted-foreground">Assigned Vendor / Freelancer</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEditExpense(currentSelectedExpense)}
                          className="px-2 py-1 rounded bg-background text-foreground font-semibold text-[11px] hover:bg-muted cursor-pointer"
                        >
                          Change Payee
                        </button>
                      </div>

                      {/* Mini Ledger Stats for this vendor */}
                      {relatedPayeeDetailsForExpense && (
                        <div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-3 tabular-nums">
                            <div className="p-2 rounded-lg bg-muted/40 ">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Billed</span>
                              <span className="font-bold text-foreground text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.totalAmount)}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/40 ">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Cleared</span>
                              <span className="font-bold text-foreground text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.paidAmount)}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-secondary ">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Pending</span>
                              <span className="font-bold text-foreground text-xs mt-0.5 block">{formatINR(relatedPayeeDetailsForExpense.pendingAmount)}</span>
                            </div>
                          </div>

                          <div className="rounded-lg overflow-hidden">
                            <div className="p-2 bg-muted/50 flex items-center justify-between">
                              <span className="font-bold text-foreground text-[10px] uppercase">
                                Other Payments & Bills for {currentSelectedExpense.vendor} ({relatedPayeeDetailsForExpense.items.length})
                              </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto divide-y divide-foreground/[0.05] text-[11px]">
                              {relatedPayeeDetailsForExpense.items.map((item) => (
                                <div
                                  key={item._id}
                                  onClick={() => setSelectedExpenseForSidebar(item)}
                                  className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                                    item._id === currentSelectedExpense._id ? 'bg-secondary font-semibold' : 'hover:bg-muted/40'
                                  }`}
                                >
                                  <div>
                                    <span className="text-foreground block">{item.title}</span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatDateIST(item.date)}</span>
                                  </div>
                                  <div className="text-right tabular-nums">
                                    <span className="font-bold text-foreground block">{formatINR(item.amount)}</span>
                                    <span className={`text-[9px] font-bold uppercase ${
                                      item.paymentStatus === 'paid'
                                        ? 'text-foreground'
                                        : item.paymentStatus === 'partially_paid'
                                        ? 'text-muted-foreground'
                                        : 'text-muted-foreground'
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
                    <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                      <div className="text-[11px] text-foreground font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>No vendor/payee assigned to this expense</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">1-click assign from common roles:</div>
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
                            className="px-2 py-0.5 rounded-md bg-background hover:bg-muted text-foreground font-semibold text-[10px] transition-colors cursor-pointer"
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
                  <div className="p-3 rounded-xl bg-muted/40 ">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Internal Remarks & Notes
                    </span>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{currentSelectedExpense.notes}</p>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-4 bg-card flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {currentExpBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment(currentSelectedExpense)}
                      className="flex-1 sm:flex-initial min-h-[36px] px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>Add Payment</span>
                    </button>
                  )}
                  {currentSelectedExpense.vendor && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExpenseForSidebar(null);
                        onQuickAdd('expense');
                      }}
                      className="text-xs font-semibold text-foreground hover:underline flex items-center justify-center sm:justify-start gap-1 cursor-pointer py-1"
                    >
                      Record Another Expense for {currentSelectedExpense.vendor}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseForSidebar(null)}
                  className="w-full sm:w-auto min-h-[36px] px-4 py-2 rounded-lg text-foreground font-semibold text-xs hover:bg-muted cursor-pointer text-center"
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
                {/* ── OVERALL SETTLEMENT PAY FORM ── */}
                <DialogHeader className="p-5 bg-muted/30 pr-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOverallPaying(false)}
                        className="p-1.5 rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Back to Ledger"
                      >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                      </button>
                      <div>
                        <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-foreground shrink-0" />
                          <span>Overall Pay: {activePayeeDetails.name}</span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Record lump-sum payment
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Overview Balance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
                    <div className="p-3.5 rounded-xl bg-muted/40 ">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Pending Balance</span>
                      <div className="text-xl font-extrabold text-foreground mt-0.5">{formatINR(activePayeeDetails.pendingAmount)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {unpaidBillsForActivePayee.length} unpaid / partially paid bills pending
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-secondary flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Settlement Allocation</span>
                      <div className="text-xl font-extrabold text-foreground mt-0.5">
                        {Number(overallPayFormData.amount) > 0 ? formatINR(Number(overallPayFormData.amount)) : '₹0.00'}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {Number(overallPayFormData.amount) >= activePayeeDetails.pendingAmount
                          ? 'Full settlement of all pending bills'
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
                          Payment Amount (₹) <span className="text-foreground">*</span>
                        </label>
                        {activePayeeDetails.pendingAmount > 0 && (
                          <div className="flex items-center gap-2 tabular-nums">
                            <button
                              type="button"
                              onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(activePayeeDetails.pendingAmount) }))}
                              className="text-xs font-bold text-foreground hover:underline cursor-pointer"
                            >
                              Pay Full (₹{activePayeeDetails.pendingAmount.toLocaleString('en-IN')})
                            </button>
                            {activePayeeDetails.pendingAmount > 500 && (
                              <button
                                type="button"
                                onClick={() => setOverallPayFormData((prev) => ({ ...prev, amount: String(Math.round(activePayeeDetails.pendingAmount / 2)) }))}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
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
                          className="h-11 w-full pl-8 pr-4 rounded-xl bg-background text-sm font-bold text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 "
                        />
                      </div>
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Payment Date <span className="text-foreground">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={overallPayFormData.paymentDate}
                        onChange={(e) => setOverallPayFormData({ ...overallPayFormData, paymentDate: e.target.value })}
                        onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                        className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 "
                      />
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Payment Mode <span className="text-foreground">*</span>
                      </label>
                      <SelectDropdown
                        value={overallPayFormData.paymentMode}
                        onChange={(val) => setOverallPayFormData({ ...overallPayFormData, paymentMode: val })}
                        options={[
                          { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                          { value: 'Bank', label: 'Bank Transfer (NEFT/IMPS/RTGS)' },
                          { value: 'Cash', label: 'Cash' },
                          { value: 'Card', label: 'Debit / Credit Card' },
                          { value: 'Cheque', label: 'Cheque' },
                          { value: 'Other', label: 'Other' },
                        ]}
                        className="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground"
                      />
                    </div>

                    {/* Paid From Account */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Paid From Account
                      </label>
                      <SelectDropdown
                        value={overallPayFormData.fundingAccount}
                        onChange={(val) => setOverallPayFormData({ ...overallPayFormData, fundingAccount: val })}
                        options={[
                          { value: '', label: 'Default / Not specified' },
                          ...accounts.map((acc) => ({
                            value: acc._id,
                            label: `${acc.accountName} (${acc.accountType})`,
                          })),
                        ]}
                        className="h-11 w-full rounded-xl bg-background px-4 text-sm font-medium text-foreground"
                      />
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
                        className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
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
                        className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 "
                      />
                    </div>

                    {/* Card 3: FIFO Settlement Breakdown & Bill Clearance Preview */}
                    <div className="rounded-xl overflow-hidden bg-card ">
                      <div className="p-3 bg-muted/50 flex items-center justify-between">
                        <span className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          FIFO Bill Clearance Preview ({simulatedSettlement.length} pending bills)
                        </span>
                        <span className="text-[10px] text-muted-foreground">Oldest bills settled first</span>
                      </div>
                      <div className="responsive-table-container max-h-[300px] overflow-y-auto text-xs">
                        <table className="w-full min-w-[600px] text-left">
                          <thead className="bg-muted text-muted-foreground font-semibold text-[10px] uppercase sticky top-0">
                            <tr>
                              <th className="p-2.5">Priority</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5 text-right">Pending Balance</th>
                              <th className="p-2.5 text-right">Paying Now</th>
                              <th className="p-2.5 text-center">Status After Pay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-foreground/[0.05]">
                            {simulatedSettlement.map((item) => (
                              <tr key={item._id} className={item.allocated > 0 ? 'bg-muted/30' : ''}>
                                <td className="p-2.5 tabular-nums">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-foreground ">
                                    #{item.fifoIndex}
                                  </span>
                                </td>
                                <td className="p-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{formatDateIST(item.date)}</td>
                                <td className="p-2.5 font-semibold text-foreground max-w-[160px] truncate" title={item.title}>
                                  {item.title}
                                </td>
                                <td className="p-2.5 text-right font-medium text-foreground tabular-nums">{formatINR(item.currentBalance)}</td>
                                <td className="p-2.5 text-right font-bold text-foreground tabular-nums">
                                  {item.allocated > 0 ? `+${formatINR(item.allocated)}` : '₹0.00'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    item.willBeStatus === 'paid'
                                      ? 'bg-primary text-primary-foreground font-bold'
                                      : item.willBeStatus === 'partially_paid'
                                      ? 'bg-secondary text-foreground '
                                      : 'bg-muted text-muted-foreground'
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
                <div className="shrink-0 p-4 sm:p-5 bg-card flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsOverallPaying(false)}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors cursor-pointer text-center"
                  >
                    Back to Statement
                  </button>
                  <button
                    type="submit"
                    form="overall-pay-form"
                    disabled={payeeOverallPay.isPending || !Number(overallPayFormData.amount)}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tabular-nums"
                  >
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span>
                      {payeeOverallPay.isPending
                        ? 'Recording Overall Pay...'
                        : `Confirm Overall Pay (${formatINR(Number(overallPayFormData.amount) || 0)})`}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="p-5 bg-muted/30 pr-12">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>Payee Statement: {activePayeeDetails.name}</span>
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Payee statement ledger
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Active Date Scope & Export Statement Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-muted/40 rounded-xl ">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Period:</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground tabular-nums">
                        {globalPeriod === 'this_month'
                          ? `This Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                          : globalPeriod === 'previous_month'
                          ? `Previous Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                          : globalPeriod === 'yearly'
                          ? `Yearly (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                          : fromDate && toDate
                          ? `${formatDateIST(fromDate)} – ${formatDateIST(toDate)}`
                          : 'All Dates'}
                      </span>
                    </div>

                    {/* Export Statement Dropdown */}
                    <div className="relative w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowPayeeExportMenu((prev) => !prev)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-background text-foreground font-bold text-xs hover:bg-muted transition-colors cursor-pointer min-h-[36px]"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Export Statement</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                      {showPayeeExportMenu && (
                        <div className="absolute right-0 mt-1 w-52 bg-popover rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-1.5 z-40 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayeeExportMenu(false);
                              handleExportCSV(
                                displayedPayeeItems,
                                `statement_${(activePayeeDetails.name || 'payee').replace(/[^a-z0-9]/gi, '_')}`,
                                globalPeriod === 'this_month'
                                  ? 'this_month'
                                  : globalPeriod === 'previous_month'
                                  ? 'previous_month'
                                  : globalPeriod === 'yearly'
                                  ? 'yearly'
                                  : fromDate && toDate
                                  ? `${fromDate}_to_${toDate}`
                                  : 'all_time'
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Download CSV Statement</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayeeExportMenu(false);
                              handlePrintReport(
                                displayedPayeeItems,
                                `Payee Statement & Ledger: ${activePayeeDetails.name}`,
                                globalPeriod === 'this_month'
                                  ? `This Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                                  : globalPeriod === 'previous_month'
                                  ? `Previous Month (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                                  : globalPeriod === 'yearly'
                                  ? `Yearly (${formatDateIST(fromDate)} – ${formatDateIST(toDate)})`
                                  : fromDate && toDate
                                  ? `${formatDateIST(fromDate)} – ${formatDateIST(toDate)}`
                                  : 'All Dates Statement',
                                `Individual vendor statement & payment clearance ledger for ${activePayeeDetails.name}`
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Print / Save PDF Statement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KPI Cards Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                    <div className="p-3 rounded-xl bg-muted/40 ">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Billed / Tasks</span>
                      <div className="text-lg font-bold text-foreground mt-0.5">{formatINR(payeeFilteredTotal)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{displayedPayeeItems.length} entries in range</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 ">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Cleared / Paid</span>
                      <div className="text-lg font-bold text-foreground mt-0.5">{formatINR(payeeFilteredPaid)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{payeeFilteredPaidCount} cleared</div>
                    </div>
                    <div className={`p-3 rounded-xl flex flex-col justify-between ${payeeFilteredPending > 0 ? 'bg-secondary ' : 'bg-muted/40 '}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending to Pay</span>
                          {payeeFilteredPending > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-primary text-primary-foreground uppercase">
                              Due
                            </span>
                          )}
                        </div>
                        <div className={`text-lg font-bold mt-0.5 ${payeeFilteredPending > 0 ? 'text-foreground font-extrabold' : 'text-foreground'}`}>
                          {formatINR(payeeFilteredPending)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${payeeFilteredPending > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          {payeeFilteredPendingCount > 0 ? `${payeeFilteredPendingCount} unpaid bills` : 'All cleared'}
                        </div>
                      </div>
                      {payeeFilteredPending > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                          className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title={`Pay overall balance of ${formatINR(payeeFilteredPending)}`}
                        >
                          <Wallet className="h-3.5 w-3.5 shrink-0" />
                          <span>Overall Pay</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Transactions */}
                  <div className="rounded-xl overflow-hidden bg-card">
                    <div className="p-2.5 bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">Payment Transactions</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{displayedPayeeItems.length} records</span>
                      </div>
                      {payeeFilteredPending > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                          className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 tabular-nums"
                          title={`Settle ${formatINR(payeeFilteredPending)} across unpaid bills in range`}
                        >
                          <Wallet className="h-3 w-3 shrink-0" />
                          <span>Overall Pay ({formatINR(payeeFilteredPending)})</span>
                        </button>
                      )}
                    </div>
                    <div className="responsive-table-container max-h-[420px] overflow-y-auto text-xs">
                      {displayedPayeeItems.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground space-y-2">
                          <p className="font-medium text-xs">No transaction records found for the selected date filter.</p>
                          <button
                            type="button"
                            onClick={resetDateFilter}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-muted cursor-pointer"
                          >
                            Reset Date Filter
                          </button>
                        </div>
                      ) : (
                        <table className="w-full min-w-[650px] text-left">
                          <thead className="bg-muted text-muted-foreground font-semibold text-[10px] uppercase sticky top-0">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Item / Description</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Amount (Billed / Due)</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-foreground/[0.05]">
                            {displayedPayeeItems.map((item) => (
                              <tr
                                key={item._id}
                                onClick={() => {
                                  setSelectedPayeeForLedger(null);
                                  setSelectedExpenseForSidebar(item);
                                }}
                                className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                title="Click to view all payments and settlement history for this bill"
                              >
                                <td className="p-2.5 text-muted-foreground font-medium whitespace-nowrap tabular-nums">{formatDateIST(item.date)}</td>
                                <td className="p-2.5 font-semibold text-foreground transition-colors">
                                  <div className="flex items-center gap-1">
                                    <span>{item.title}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground ${
                                      ['rj', 'vj'].includes(item.category?.toLowerCase()) ? 'font-bold uppercase' : 'capitalize'
                                    }`}
                                  >
                                    {formatExpenseCategory(item.category)}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    (item.calculatedStatus || item.paymentStatus) === 'paid'
                                      ? 'bg-primary text-primary-foreground'
                                      : (item.calculatedStatus || item.paymentStatus) === 'partially_paid'
                                      ? 'bg-secondary text-foreground '
                                      : 'bg-muted text-muted-foreground '
                                  }`}>
                                    {(item.calculatedStatus || item.paymentStatus) === 'paid' ? 'Paid' : (item.calculatedStatus || item.paymentStatus) === 'partially_paid' ? 'Partial' : 'Unpaid'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                                  <div>{formatINR(item.total)}</div>
                                  {item.paid > 0 && item.balance > 0 && (
                                    <div className="text-[10px] text-muted-foreground font-semibold">
                                      Paid: {formatINR(item.paid)}
                                    </div>
                                  )}
                                  {item.balance > 0 && item.paid > 0 && (
                                    <div className="text-[10px] text-foreground font-bold">
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
                                        className="px-2 py-0.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                        title="Add payment or pay this bill"
                                      >
                                        <Plus className="h-2.5 w-2.5 shrink-0" /> Pay / Add
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPayeeForLedger(null);
                                        handleStartEditExpense(item);
                                      }}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                      title="Edit item"
                                    >
                                      <Edit2 className="h-3 w-3 shrink-0" />
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
                <div className="p-4 bg-card flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayeeForLedger(null);
                      onQuickAdd('expense');
                    }}
                    className="text-xs font-semibold text-foreground hover:underline flex items-center justify-center sm:justify-start gap-1 cursor-pointer py-1"
                  >
                    Record New Expense for {activePayeeDetails.name}
                  </button>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {payeeFilteredPending > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenOverallPay(activePayeeDetails, payeeFilteredPending)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 min-h-[36px] tabular-nums"
                      >
                        <Wallet className="h-3.5 w-3.5 shrink-0" />
                        <span>Overall Pay ({formatINR(payeeFilteredPending)})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPayeeForLedger(null)}
                      className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg text-foreground font-semibold text-xs hover:bg-muted cursor-pointer min-h-[36px]"
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
