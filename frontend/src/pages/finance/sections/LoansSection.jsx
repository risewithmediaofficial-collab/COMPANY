// =============================================
// LOANS TRACKER SECTION
// Simple & clear business loan management & EMI tracker
// =============================================

import { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Edit2,
  Trash2,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  Building,
  HelpCircle,
  X,
  BellRing,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '../../../components/ui/button';
import {
  useLoans,
  useCreateLoan,
  useUpdateLoan,
  useRecordLoanPayment,
  useDeleteLoan,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST } from '../../../utils/financeFormatters';
import { useDebounce } from '../../../hooks/useDebounce';
import { toast } from 'sonner';

export default function LoansSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all' | 'closed'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [recordingPaymentLoan, setRecordingPaymentLoan] = useState(null);
  const [historyLoan, setHistoryLoan] = useState(null);

  // Form State for Add / Edit Loan
  const [formData, setFormData] = useState({
    loanName: '',
    lender: '',
    accountNumber: '',
    loanAmount: '',
    interestRate: '',
    totalPayable: '',
    emiAmount: '',
    tenureMonths: 12,
    startDate: new Date().toISOString().slice(0, 10),
    nextPaymentDate: '',
    initialPaidAmount: '',
    notes: '',
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank Transfer',
    reference: '',
    notes: '',
    nextPaymentDate: '',
  });

  // Queries & Mutations
  const { data: loanResponse = {}, isLoading, refetch } = useLoans({
    status: statusFilter,
    search: debouncedSearch,
  });

  const loans = loanResponse.data || [];
  const summary = loanResponse.summary || {
    totalBorrowed: 0,
    totalPayable: 0,
    totalPaid: 0,
    totalRemaining: 0,
    activeCount: 0,
    closedCount: 0,
    totalCount: 0,
    upcomingEmiCount: 0,
    upcomingEmiAmount: 0,
  };

  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const recordPayment = useRecordLoanPayment();
  const deleteLoan = useDeleteLoan();

  // Helper to open Add Loan modal
  const handleOpenAdd = () => {
    setEditingLoan(null);
    const today = new Date();
    // Default next payment date to 1 month from today
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setFormData({
      loanName: '',
      lender: '',
      accountNumber: '',
      loanAmount: '',
      interestRate: '',
      totalPayable: '',
      emiAmount: '',
      tenureMonths: 12,
      startDate: today.toISOString().slice(0, 10),
      nextPaymentDate: nextMonth.toISOString().slice(0, 10),
      initialPaidAmount: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  // Helper to open Edit Loan modal
  const handleOpenEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      loanName: loan.loanName || '',
      lender: loan.lender || '',
      accountNumber: loan.accountNumber || '',
      loanAmount: loan.loanAmount || '',
      interestRate: loan.interestRate || '',
      totalPayable: loan.totalPayable || '',
      emiAmount: loan.emiAmount || '',
      tenureMonths: loan.tenureMonths || 12,
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().slice(0, 10) : '',
      nextPaymentDate: loan.nextPaymentDate ? new Date(loan.nextPaymentDate).toISOString().slice(0, 10) : '',
      initialPaidAmount: '',
      notes: loan.notes || '',
    });
    setShowAddModal(true);
  };

  // Helper to open Pay EMI modal
  const handleOpenPayEMI = (loan) => {
    setRecordingPaymentLoan(loan);
    // Suggest next payment date as +1 month from current loan's nextPaymentDate
    let suggestedNextDate = '';
    if (loan.nextPaymentDate) {
      const currentNext = new Date(loan.nextPaymentDate);
      currentNext.setMonth(currentNext.getMonth() + 1);
      suggestedNextDate = currentNext.toISOString().slice(0, 10);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      suggestedNextDate = d.toISOString().slice(0, 10);
    }

    // Default amount to EMI amount or remaining balance if less
    const suggestedAmount = Math.min(
      Number(loan.emiAmount || 0),
      Number(loan.balanceAmount || loan.emiAmount || 0)
    );

    setPaymentForm({
      amount: suggestedAmount > 0 ? suggestedAmount : (loan.emiAmount || ''),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Bank Transfer',
      reference: '',
      notes: `EMI for ${loan.loanName}`,
      nextPaymentDate: suggestedNextDate,
    });
  };

  // Calculate days difference for due date display
  const getDueBadgeInfo = (nextPaymentDate, status) => {
    if (status === 'closed') {
      return {
        label: 'Fully Paid / Closed',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        isUrgent: false,
      };
    }

    if (!nextPaymentDate) {
      return {
        label: 'No Due Date Set',
        color: 'bg-slate-50 text-slate-600 border-slate-200',
        isUrgent: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold animate-pulse',
        isUrgent: true,
      };
    }
    if (diffDays === 0) {
      return {
        label: '🚨 Due Today!',
        color: 'bg-red-100 text-red-800 border-red-300 font-bold',
        isUrgent: true,
      };
    }
    if (diffDays === 1) {
      return {
        label: '⚠️ Due Tomorrow',
        color: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
        isUrgent: true,
      };
    }
    if (diffDays === 2) {
      return {
        label: '🔔 Due in 2 Days (Reminded)',
        color: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        isUrgent: true,
      };
    }
    return {
      label: `Due in ${diffDays} days (${formatDateIST(nextPaymentDate)})`,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      isUrgent: false,
    };
  };

  // Auto-estimate totalPayable when principal, interest rate, or tenure changes
  const handleAmountOrInterestChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const p = Number(field === 'loanAmount' ? value : formData.loanAmount);
    const r = Number(field === 'interestRate' ? value : formData.interestRate);
    const t = Number(field === 'tenureMonths' ? value : formData.tenureMonths);

    if (field === 'loanAmount' && (!formData.totalPayable || formData.totalPayable === formData.loanAmount)) {
      if (r > 0 && t > 0) {
        const interest = p * (r / 100) * (t / 12);
        updated.totalPayable = Math.round(p + interest);
      } else {
        updated.totalPayable = p || '';
      }
    } else if ((field === 'interestRate' || field === 'tenureMonths') && p > 0) {
      if (r > 0 && t > 0) {
        const interest = p * (r / 100) * (t / 12);
        updated.totalPayable = Math.round(p + interest);
      }
    }

    // Auto-calculate suggested monthly EMI if tenure > 0
    if (t > 0 && updated.totalPayable) {
      updated.emiAmount = Math.round(Number(updated.totalPayable) / t);
    }

    setFormData(updated);
  };

  // Submit Add / Edit
  const handleSubmitLoan = async (e) => {
    e.preventDefault();

    if (!formData.loanName.trim()) {
      toast.error('Please enter loan name');
      return;
    }
    if (!formData.lender.trim()) {
      toast.error('Please enter lender or bank name');
      return;
    }
    if (!formData.loanAmount || Number(formData.loanAmount) <= 0) {
      toast.error('Please enter a valid loan amount');
      return;
    }
    if (!formData.emiAmount || Number(formData.emiAmount) <= 0) {
      toast.error('Please enter monthly EMI amount');
      return;
    }
    if (!formData.nextPaymentDate) {
      toast.error('Please select next payment date');
      return;
    }

    try {
      if (editingLoan) {
        await updateLoan.mutateAsync({
          id: editingLoan._id,
          data: {
            loanName: formData.loanName.trim(),
            lender: formData.lender.trim(),
            accountNumber: formData.accountNumber.trim(),
            loanAmount: Number(formData.loanAmount),
            interestRate: Number(formData.interestRate || 0),
            totalPayable: Number(formData.totalPayable || formData.loanAmount),
            emiAmount: Number(formData.emiAmount),
            tenureMonths: Number(formData.tenureMonths || 12),
            startDate: formData.startDate,
            nextPaymentDate: formData.nextPaymentDate,
            notes: formData.notes,
          },
        });
      } else {
        await createLoan.mutateAsync({
          loanName: formData.loanName.trim(),
          lender: formData.lender.trim(),
          accountNumber: formData.accountNumber.trim(),
          loanAmount: Number(formData.loanAmount),
          interestRate: Number(formData.interestRate || 0),
          totalPayable: Number(formData.totalPayable || formData.loanAmount),
          emiAmount: Number(formData.emiAmount),
          tenureMonths: Number(formData.tenureMonths || 12),
          startDate: formData.startDate,
          nextPaymentDate: formData.nextPaymentDate,
          initialPaidAmount: Number(formData.initialPaidAmount || 0),
          notes: formData.notes,
        });
      }
      setShowAddModal(false);
    } catch (err) {
      // toast is handled in mutation hook
    }
  };

  // Submit EMI Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      await recordPayment.mutateAsync({
        id: recordingPaymentLoan._id,
        data: {
          amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMode: paymentForm.paymentMode,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
          nextPaymentDate: paymentForm.nextPaymentDate || undefined,
        },
      });
      setRecordingPaymentLoan(null);
    } catch (err) {
      // toast is handled in mutation hook
    }
  };

  // Delete Loan
  const handleDeleteLoan = async (loan) => {
    if (window.confirm(`Are you sure you want to delete loan "${loan.loanName}"?`)) {
      await deleteLoan.mutateAsync(loan._id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Borrowed */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Borrowed</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatINR(summary.totalBorrowed, false)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across {summary.totalCount || 0} loan{summary.totalCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        {/* Total Repaid */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Repaid</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              {formatINR(summary.totalPaid, false)}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {summary.totalPayable > 0
                ? `${Math.round((summary.totalPaid / summary.totalPayable) * 100)}% repaid of ₹${(summary.totalPayable).toLocaleString('en-IN')}`
                : '0% repaid'}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Remaining Liability */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
            <h3 className="text-xl font-bold text-rose-600 mt-1">
              {formatINR(summary.totalRemaining, false)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Active loan liabilities</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        {/* Active Loans & Monthly EMIs */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Loans</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {summary.activeCount} <span className="text-xs font-normal text-slate-500">Active</span>
            </h3>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              {summary.upcomingEmiAmount > 0
                ? `${formatINR(summary.upcomingEmiAmount, false)} EMI due this month`
                : `${summary.closedCount} loan(s) closed`}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by loan name, bank, or account no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({summary.activeCount || 0})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({summary.totalCount || 0})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                statusFilter === 'closed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Closed ({summary.closedCount || 0})
            </button>
          </div>
        </div>

        {/* Add Loan Button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Loan
        </button>
      </div>

      {/* ── LOANS LIST ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center">
          <div className="h-7 w-7 rounded-full border-2 border-indigo-600/30 border-t-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading loan records...</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
            <Landmark className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Loans Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {search
              ? 'No loan matches your current search criteria.'
              : 'Keep track of company loans, bank borrowings, monthly EMIs, repayments, and automated 2-day due reminders in one simple place.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Your First Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map((loan) => {
            const dueInfo = getDueBadgeInfo(loan.nextPaymentDate, loan.status);
            const total = Number(loan.totalPayable || loan.loanAmount || 0);
            const paid = Number(loan.paidAmount || 0);
            const balance = Number(loan.balanceAmount || 0);
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

            return (
              <div
                key={loan._id}
                className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 tracking-tight">
                          {loan.loanName}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            loan.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {loan.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Building className="h-3 w-3 text-slate-400" /> {loan.lender}
                        </span>
                        {loan.accountNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-slate-600">
                              Ref: {loan.accountNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Due Badge */}
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-right shrink-0 ${dueInfo.color}`}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 my-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">
                        Repaid: <strong className="text-emerald-700 font-bold">{formatINR(paid, false)}</strong>
                      </span>
                      <span className="text-slate-600 font-medium">
                        Total: <strong>{formatINR(total, false)}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>Remaining Balance: <strong className="text-rose-600">{formatINR(balance, false)}</strong></span>
                      <span>Tenure: {loan.tenureMonths || 12} mos</span>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-center border-t border-b border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Principal</span>
                      <span className="font-bold text-slate-800">{formatINR(loan.loanAmount, false)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Interest Rate</span>
                      <span className="font-bold text-slate-800">
                        {loan.interestRate ? `${loan.interestRate}% p.a.` : '0%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly EMI</span>
                      <span className="font-bold text-indigo-700">{formatINR(loan.emiAmount, false)}</span>
                    </div>
                  </div>

                  {/* Notes / Footer Info */}
                  {loan.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-2.5 line-clamp-1">
                      "{loan.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {/* View History Button */}
                    <button
                      onClick={() => setHistoryLoan(loan)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="View repayment transactions"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>{loan.payments?.length || 0} Paid</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(loan)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit loan details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteLoan(loan)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete loan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Pay EMI Button (Only for active loans) */}
                  {loan.status === 'active' && (
                    <button
                      onClick={() => handleOpenPayEMI(loan)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pay EMI
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT LOAN MODAL ────────────────────────────────────────── */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]">
            <form onSubmit={handleSubmitLoan} className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      {editingLoan ? 'Edit Loan Details' : 'Add New Loan'}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                      Track borrowing details, monthly EMIs, and automatic reminders
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Linear Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Loan Name / Purpose <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Workstation Laptops Loan, HDFC Business Loan"
                    value={formData.loanName}
                    onChange={(e) => setFormData({ ...formData, loanName: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Lender / Bank Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI, Partner"
                    value={formData.lender}
                    onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Loan Account / Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LN-98420-2026"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Principal Amount (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500000"
                    value={formData.loanAmount}
                    onChange={(e) => handleAmountOrInterestChange('loanAmount', e.target.value)}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 10.5"
                    value={formData.interestRate}
                    onChange={(e) => handleAmountOrInterestChange('interestRate', e.target.value)}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 12, 24, 36"
                    value={formData.tenureMonths}
                    onChange={(e) => handleAmountOrInterestChange('tenureMonths', e.target.value)}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Total Payable (₹) <span className="text-muted-foreground text-xs font-normal">(Principal + Interest)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 550000"
                    value={formData.totalPayable}
                    onChange={(e) => setFormData({ ...formData, totalPayable: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Monthly EMI Amount (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 15000"
                    value={formData.emiAmount}
                    onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-primary font-bold focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Next Payment Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.nextPaymentDate}
                    onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Loan Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden cursor-pointer"
                  />
                </div>

                {!editingLoan && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Already Repaid So Far (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 30000 (if already begun)"
                      value={formData.initialPaidAmount}
                      onChange={(e) => setFormData({ ...formData, initialPaidAmount: e.target.value })}
                      className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Notes / Terms
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional notes about loan conditions, auto-debit bank account, or collateral..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden resize-none"
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-600 dark:text-amber-400">
                  <BellRing className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Automated Reminder:</strong> Notification will be dispatched to admins & managers <strong>2 days before</strong> the next payment date.
                  </span>
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="h-11 px-5 rounded-xl border-border hover:bg-muted text-sm font-medium w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoan.isPending || updateLoan.isPending}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-md transition-all w-full sm:w-auto"
                  >
                    {editingLoan ? 'Save Changes' : 'Create Loan'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── RECORD EMI / REPAYMENT MODAL ─────────────────────────────────── */}
      {recordingPaymentLoan && (
        <Dialog open={!!recordingPaymentLoan} onOpenChange={() => setRecordingPaymentLoan(null)}>
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]">
            <form onSubmit={handleSubmitPayment} className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      Record EMI Payment
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                      {recordingPaymentLoan.loanName} ({recordingPaymentLoan.lender})
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Linear Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Remaining Balance</span>
                    <span className="font-bold text-destructive text-sm mt-0.5 block">
                      {formatINR(recordingPaymentLoan.balanceAmount, false)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[11px]">Standard EMI</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">
                      {formatINR(recordingPaymentLoan.emiAmount, false)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Payment Amount (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 15000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-emerald-600 font-bold focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Payment Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Payment Mode
                  </label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Auto Debit">Auto Debit (ECS/NACH)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Next Payment Date <span className="text-primary text-xs font-normal">(Auto +1 month)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentForm.nextPaymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, nextPaymentDate: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Transaction / UTR Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-849204859"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional payment notes..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecordingPaymentLoan(null)}
                    className="h-11 px-5 rounded-xl border-border hover:bg-muted text-sm font-medium w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={recordPayment.isPending}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all w-full sm:w-auto"
                  >
                    Confirm Payment
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── REPAYMENT HISTORY MODAL ──────────────────────────────────────── */}
      {historyLoan && (
        <Dialog open={!!historyLoan} onOpenChange={() => setHistoryLoan(null)}>
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]">
            <div className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      Repayment History: {historyLoan.loanName}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                      Total repaid: {formatINR(historyLoan.paidAmount, false)} • Lender: {historyLoan.lender}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="space-y-4 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                {!historyLoan.payments || historyLoan.payments.length === 0 ? (
                  <div className="p-8 text-center bg-secondary/20 border border-border rounded-xl">
                    <p className="text-xs text-muted-foreground">No repayment entries recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyLoan.payments.map((p, idx) => (
                      <div
                        key={p._id || idx}
                        className="p-4 bg-secondary/20 hover:bg-secondary/40 border border-border rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {formatINR(p.amount, false)}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {p.paymentMode || 'Bank Transfer'}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{formatDateIST(p.paymentDate)}</span>
                            {p.reference && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{p.reference}</span>
                              </>
                            )}
                            {p.recordedBy?.name && (
                              <>
                                <span>•</span>
                                <span>by {p.recordedBy.name}</span>
                              </>
                            )}
                          </div>
                          {p.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1">"{p.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHistoryLoan(null)}
                  className="h-11 px-5 rounded-xl border-border hover:bg-muted text-sm font-medium w-full sm:w-auto ml-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
