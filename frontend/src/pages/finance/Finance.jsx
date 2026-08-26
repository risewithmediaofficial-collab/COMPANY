import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Phone,
  Plus,
  Receipt,
  Send,
  Share2,
  Users2,
  Calendar,
  Pencil,
  Trash2,
  Filter,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Layers,
  Banknote,
  Coins,
  Printer,
  Table as TableIcon,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddFinanceModal } from '../../components/modals/AddFinanceModal';
import { AddInvoiceModal } from '../../components/modals/AddInvoiceModal';
import { ShareInvoiceModal } from '../../components/modals/ShareInvoiceModal';
import { AddExpenseModal } from '../../components/modals/AddExpenseModal';
import { AddAdsCampaignModal } from '../../components/modals/AddAdsCampaignModal';
import { MonthlyExpenseReportModal } from '../../components/modals/MonthlyExpenseReportModal';
import { AddSalaryModal } from '../../components/modals/AddSalaryModal';
import { PayslipModal } from '../../components/modals/PayslipModal';
import { exportInvoiceToPDF } from '../../utils/pdfExport';
import { DataTable } from '../../components/ui/DataTable';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import WorkspacePage from '../../components/ui/WorkspacePage';
import {
  useAddInternalFinanceNote,
  useAddPartialPayment,
  useAddPaymentNote,
  useCallHistory,
  useCreateCallHistory,
  useCreateReferral,
  useDeleteFinanceRecord,
  useDeleteInvoice,
  useDeleteReferral,
  useFinanceRecords,
  useFinanceSummary,
  useInvoices,
  useMarkInvoicePaid,
  useOverdueFinanceRecords,
  usePayments,
  useReferralAnalytics,
  useReferrals,
  useSendInvoice,
  useExpenses,
  useApproveExpense,
  useDeleteExpense,
} from '../../hooks/useFinance';
import {
  useSalaries,
  useSalarySummary,
  useUpdateSalaryStatus,
  useDeleteSalary,
  useGenerateMonthlyPayroll,
} from '../../hooks/useSalary';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const paymentStatusTone = {
  'Not Paid': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'Partially Paid': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Overdue: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const invoiceStatusTone = {
  Draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  Sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Viewed: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  viewed: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Partially Paid': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  partially_paid: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Overdue: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  overdue: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Cancelled: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  cancelled: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const salaryStatusTone = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  hold: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function Finance() {
  const { user } = useSelector((state) => state.auth);
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'superAdmin' || user?.role === 'admin';
  const canViewFinanceOverview = isAdmin || isManager || Boolean(user?.permissions?.canViewFinanceOverview) || Boolean(user?.permissions?.canManageFinance);
  const canManageFinanceAccess = isAdmin || isManager || Boolean(user?.permissions?.canManageFinance);

  const tabs = useMemo(() => {
    if (canViewFinanceOverview) {
      return [
        { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
        { id: 'expenses', label: 'Expenses & Profits', icon: Receipt },
        { id: 'salaries', label: 'Employee Salaries', icon: Banknote },
        { id: 'referrals', label: 'Referral Payouts', icon: Users2 },
      ];
    }
    return [{ id: 'invoices', label: 'Invoices & Billing', icon: FileText }];
  }, [canViewFinanceOverview]);

  const [activeTab, setActiveTab] = useState('invoices');
  const [search, setSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInvoice, setShareInvoice] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAdsCampaignModal, setShowAdsCampaignModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);

  // Salary module states
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipSalary, setPayslipSalary] = useState(null);
  const [deleteSalaryId, setDeleteSalaryId] = useState(null);

  const currentDate = new Date();
  const currentMonthName = MONTH_NAMES[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const [salaryMonthFilter, setSalaryMonthFilter] = useState(currentMonthName);
  const [salaryYearFilter, setSalaryYearFilter] = useState(currentYear.toString());
  const [salaryStatusFilter, setSalaryStatusFilter] = useState('all');
  const [salaryDeptFilter, setSalaryDeptFilter] = useState('all');
  const [salaryView, setSalaryView] = useState('table'); // 'table' | 'cards' | 'board'

  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [expenseSort, setExpenseSort] = useState('date_desc');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  const { startDate, endDate, isDateInRange } = useDateFilter();

  const canManage = canManageFinanceAccess;
  const canDeleteInvoice = canManageFinanceAccess;

  const { data: clients = [] } = useClients({}, { enabled: canViewFinanceOverview });
  const { data: projects = [] } = useProjects({}, { enabled: canViewFinanceOverview });
  const { data: rawInvoices = [], isLoading: invoicesLoading } = useInvoices({ search, startDate, endDate }, { enabled: canViewFinanceOverview });
  const { data: referrals = [] } = useReferrals({ search }, { enabled: canViewFinanceOverview });
  const { data: financeSummary = {} } = useFinanceSummary({ enabled: canViewFinanceOverview });
  const { data: rawExpenses = [], isLoading: expensesLoading } = useExpenses(
    {
      search,
      startDate,
      endDate,
      category: expenseCategoryFilter !== 'all' ? expenseCategoryFilter : undefined,
      transactionType: expenseTypeFilter !== 'all' ? expenseTypeFilter : undefined,
      sort: expenseSort,
    },
    { enabled: canViewFinanceOverview }
  );

  // Salary Queries
  const { data: rawSalaries = [], isLoading: salariesLoading } = useSalaries(
    {
      month: salaryMonthFilter !== 'all' ? salaryMonthFilter : undefined,
      year: salaryYearFilter !== 'all' ? Number(salaryYearFilter) : undefined,
      status: salaryStatusFilter !== 'all' ? salaryStatusFilter : undefined,
      department: salaryDeptFilter !== 'all' ? salaryDeptFilter : undefined,
      search,
    },
    { enabled: canViewFinanceOverview }
  );

  const { data: salarySummary = {} } = useSalarySummary(
    {
      month: salaryMonthFilter !== 'all' ? salaryMonthFilter : undefined,
      year: salaryYearFilter !== 'all' ? Number(salaryYearFilter) : undefined,
    },
    { enabled: canViewFinanceOverview }
  );

  const updateSalaryStatus = useUpdateSalaryStatus();
  const deleteSalary = useDeleteSalary();
  const generateMonthlyPayroll = useGenerateMonthlyPayroll();

  // Client-side date filter refinement
  const invoices = useMemo(() => {
    return rawInvoices.filter((i) => {
      const matchesDate = isDateInRange(i.issueDate || i.createdAt || i.dueDate);
      const matchesStatus = invoiceStatusFilter === 'all' || (i.status || '').toLowerCase() === invoiceStatusFilter.toLowerCase();
      const q = search.toLowerCase();
      const clientName = (i.client?.company || i.client?.name || i.clientDetails?.businessName || '').toLowerCase();
      const invNum = (i.invoiceNumber || '').toLowerCase();
      const matchesSearch = !q || clientName.includes(q) || invNum.includes(q);
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [rawInvoices, isDateInRange, invoiceStatusFilter, search]);

  const expenses = useMemo(() => {
    return rawExpenses.filter((e) => {
      const matchesDate = isDateInRange(e.date || e.createdAt);
      return matchesDate;
    });
  }, [rawExpenses, isDateInRange]);

  const salaries = useMemo(() => {
    return rawSalaries.filter((s) => {
      if (salaryStatusFilter !== 'all' && s.status !== salaryStatusFilter) return false;
      if (salaryDeptFilter !== 'all' && (s.employee?.department || '').toLowerCase() !== salaryDeptFilter.toLowerCase()) return false;
      return true;
    });
  }, [rawSalaries, salaryStatusFilter, salaryDeptFilter]);

  const departments = useMemo(() => {
    const set = new Set(rawSalaries.map((s) => s.employee?.department).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [rawSalaries]);

  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();
  const deleteInvoice = useDeleteInvoice();
  const markInvoicePaid = useMarkInvoicePaid();
  const addPartialPayment = useAddPartialPayment();
  const sendInvoice = useSendInvoice();
  const deleteReferral = useDeleteReferral();

  const categoryLabels = {
    rj: 'RJ / Voice Over',
    video_shoot: 'Video Shoot',
    travel_allowance: 'Travel Allowance',
    ads_campaign: 'Ads Campaign Spend',
    salary: 'Salary',
    tools: 'Software Tools',
    advertising: 'Advertising',
    travel: 'Travel',
    office: 'Office & Rent',
    freelance: 'Freelancer Fees',
    misc: 'Miscellaneous',
    other: 'Other (Custom)',
  };

  // High-level dynamic financial calculations
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, item) => sum + Number(item.totalAmount || item.amount || item.total || 0), 0);
  }, [invoices]);

  const totalCollected = useMemo(() => {
    return invoices.reduce((sum, item) => {
      if (String(item.status).toLowerCase() === 'paid') {
        return sum + Number(item.totalAmount || item.amount || item.total || 0);
      }
      return sum + Number(item.paidAmount || 0);
    }, 0);
  }, [invoices]);

  const totalReceivable = useMemo(() => {
    return invoices.reduce((sum, item) => {
      if (String(item.status).toLowerCase() === 'paid') return sum;
      const total = Number(item.totalAmount || item.amount || item.total || 0);
      const paid = Number(item.paidAmount || 0);
      return sum + Math.max(total - paid, 0);
    }, 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => {
      if (exp.transactionType === 'Profit') return sum;
      return sum + Number(exp.amount || 0);
    }, 0);
  }, [expenses]);

  const netProfit = totalCollected - totalExpenses;
  const profitMargin = totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : '0.0';

  const openInvoicesCount = invoices.filter((item) => !['Paid', 'Cancelled', 'paid', 'cancelled'].includes(item.status)).length;
  const overdueCount = invoices.filter((item) => item.status?.toLowerCase() === 'overdue' || (new Date(item.dueDate) < new Date() && !['paid', 'cancelled'].includes(item.status?.toLowerCase()))).length;

  // Invoices Columns
  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (row) => (
        <div className="min-w-0">
          <span className="font-bold text-foreground hover:text-primary transition-colors text-xs">{row.invoiceNumber}</span>
          <div className="text-[11px] text-muted-foreground truncate">{row.project?.name || row.projectName || 'General Billing'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client / Business',
      render: (row) => (
        <div className="font-semibold text-foreground text-xs">
          {row.client?.company || row.client?.name || row.clientDetails?.businessName || row.clientDetails?.name || 'Unnamed Client'}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount Breakdown',
      render: (row) => {
        const total = Number(row.totalAmount || row.amount || row.total || 0);
        const paid = Number(row.paidAmount || (String(row.status).toLowerCase() === 'paid' ? total : 0));
        const balance = Math.max(total - paid, 0);

        return (
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-foreground">{currency.format(total)}</div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
              <span className="text-emerald-600 font-semibold">Paid: {currency.format(paid)}</span>
              {balance > 0 && <span className="text-rose-600 font-semibold">Bal: {currency.format(balance)}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${invoiceStatusTone[row.status] || invoiceStatusTone.draft}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Dates',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-foreground font-medium">Issued: {row.issueDate ? new Date(row.issueDate).toLocaleDateString() : 'N/A'}</div>
          <div className="text-[11px] text-muted-foreground">Due: {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => exportInvoiceToPDF(row)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Download PDF Invoice"
          >
            <Download size={13} />
          </button>
          <button
            onClick={() => {
              setShareInvoice(row);
              setShowShareModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Share / Send Invoice"
          >
            <Share2 size={13} />
          </button>
          {canManage && (
            <button
              onClick={() => {
                setSelectedInvoice(row);
                setShowInvoiceModal(true);
              }}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Invoice"
            >
              <Pencil size={13} />
            </button>
          )}
          {canDeleteInvoice && (
            <button
              onClick={() => setDeleteInvoiceId(row._id)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
              title="Delete Invoice"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Expense Columns
  const expenseColumns = [
    {
      key: 'title',
      label: 'Expense / Description',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground text-xs">{row.title || row.description}</div>
          <div className="text-[11px] text-muted-foreground truncate">{row.notes || row.vendor || 'General expense'}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground capitalize">
          {categoryLabels[row.category] || row.category || 'Misc'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <div className="text-xs font-extrabold text-foreground">
          {currency.format(Number(row.amount || 0))}
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-xs text-muted-foreground font-medium">
          {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Approval',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          row.status === 'approved'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        }`}>
          {row.status === 'approved' ? 'Approved' : 'Pending Approval'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status !== 'approved' && canManage && (
            <button
              onClick={() => approveExpense.mutate(row._id)}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
            >
              Approve
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setDeleteExpenseId(row._id)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
              title="Delete Expense"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Employee Salary Columns (Notion Agency OS Table View)
  const salaryColumns = [
    {
      key: 'employee',
      label: 'Team Member',
      render: (row) => {
        const emp = row.employee || {};
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {emp.name?.charAt(0) || 'E'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs truncate">{emp.name || 'Unknown Employee'}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{emp.position || 'Team Member'}</span>
                <span>•</span>
                <span className="font-semibold text-primary/80">{emp.department || 'General'}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'baseSalary',
      label: 'Base Pay',
      render: (row) => (
        <div className="text-xs font-semibold text-foreground">
          {currency.format(Number(row.baseSalary || 0))}
        </div>
      ),
    },
    {
      key: 'incentive',
      label: 'Incentive',
      render: (row) => {
        const inc = Number(row.incentive || 0);
        return (
          <div className="text-xs">
            {inc > 0 ? (
              <div className="flex flex-col">
                <span className="font-bold text-amber-600 flex items-center gap-0.5">
                  <Sparkles size={11} />
                  +{currency.format(inc)}
                </span>
                {row.incentiveReason && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={row.incentiveReason}>
                    {row.incentiveReason}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground/60">₹0</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'ots',
      label: 'OTS (Overtime)',
      render: (row) => {
        const ots = Number(row.ots || 0);
        return (
          <div className="text-xs">
            {ots > 0 ? (
              <div className="flex flex-col">
                <span className="font-bold text-purple-600 flex items-center gap-0.5">
                  <Clock size={11} />
                  +{currency.format(ots)}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {row.otsHours ? `${row.otsHours} hrs` : ''} {row.otsReason ? `(${row.otsReason})` : ''}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground/60">₹0</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'otherAllowances',
      label: 'Other Perks',
      render: (row) => {
        const oth = Number(row.otherAllowances || 0);
        return (
          <div className="text-xs">
            {oth > 0 ? (
              <div className="flex flex-col">
                <span className="font-bold text-emerald-600">+{currency.format(oth)}</span>
                {row.otherAllowancesReason && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={row.otherAllowancesReason}>
                    {row.otherAllowancesReason}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground/60">₹0</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'deductions',
      label: 'Deductions',
      render: (row) => {
        const ded = Number(row.deductions || 0);
        return (
          <div className="text-xs">
            {ded > 0 ? (
              <div className="flex flex-col">
                <span className="font-bold text-rose-600">-{currency.format(ded)}</span>
                {row.deductionReason && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={row.deductionReason}>
                    {row.deductionReason}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground/60">₹0</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'netSalary',
      label: 'Net Take-Home',
      render: (row) => {
        const net = Number(row.netSalary || 0);
        return (
          <div className="text-xs font-black text-foreground bg-primary/10 px-2.5 py-1 rounded-xl inline-block border border-primary/20">
            {currency.format(net)}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${salaryStatusTone[row.status] || salaryStatusTone.pending}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Payment Info',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-foreground">{row.paymentMethod || 'Bank Transfer'}</div>
          {row.paymentDate && (
            <div className="text-[10px] text-muted-foreground">{new Date(row.paymentDate).toLocaleDateString()}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setPayslipSalary(row);
              setShowPayslipModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="View & Download Payslip"
          >
            <FileText size={13} />
          </button>
          {row.status !== 'paid' && canManage && (
            <button
              onClick={() => updateSalaryStatus.mutate({ id: row._id, status: 'paid' })}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
              title="Mark as Settled / Paid"
            >
              Pay
            </button>
          )}
          {canManage && (
            <button
              onClick={() => {
                setSelectedSalary(row);
                setShowSalaryModal(true);
              }}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Salary"
            >
              <Pencil size={13} />
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setDeleteSalaryId(row._id)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
              title="Delete Record"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Business & Finance', 'Finance Operations']}
      title="Finance & Revenue Hub"
      subtitle="Complete Notion-style command center for client billings, accounts receivable, agency spend, employee salaries, and net margins."
      icon="💰"
      properties={[
        { label: 'Collected', value: currency.format(totalCollected), tone: 'success' },
        { label: 'Outstanding', value: currency.format(totalReceivable), tone: totalReceivable > 0 ? 'warning' : 'neutral' },
        { label: 'Total Expenses', value: currency.format(totalExpenses), tone: 'danger' },
        { label: 'Net Profit', value: currency.format(netProfit), tone: netProfit >= 0 ? 'success' : 'danger' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              {activeTab === 'salaries' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      generateMonthlyPayroll.mutate({
                        month: salaryMonthFilter !== 'all' ? salaryMonthFilter : currentMonthName,
                        year: salaryYearFilter !== 'all' ? Number(salaryYearFilter) : currentYear,
                      })
                    }
                    disabled={generateMonthlyPayroll.isPending}
                    className="rounded-xl text-xs font-bold gap-1.5 h-9"
                  >
                    <Zap size={14} className="text-amber-500 fill-amber-500" />
                    <span>Auto-Generate ({salaryMonthFilter !== 'all' ? salaryMonthFilter : currentMonthName})</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedSalary(null);
                      setShowSalaryModal(true);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>+ Add Salary Entry</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowExpenseModal(true)}
                    className="rounded-xl text-xs font-bold gap-1.5 h-9"
                  >
                    <Receipt size={14} />
                    <span>+ Record Spend</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setShowInvoiceModal(true);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 h-9 shadow-sm"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>Create Invoice</span>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Notion-Style Executive Financial KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Card 1: Collected Cash */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Collected Cash</span>
            <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">{currency.format(totalCollected)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight size={13} />
            <span>{invoices.filter((i) => String(i.status).toLowerCase() === 'paid').length} fully settled invoices</span>
          </div>
        </div>

        {/* Card 2: Outstanding Receivables */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Receivables Due</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">{currency.format(totalReceivable)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
            <span>{openInvoicesCount} open invoice balances</span>
          </div>
        </div>

        {/* Card 3: Operating Expenses */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Spend</span>
            <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowDownRight size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">{currency.format(totalExpenses)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold">
            <span>{expenses.length} logged expense items</span>
          </div>
        </div>

        {/* Card 4: Net Margin */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Net Profit & Margin</span>
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <PieChart size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground">{currency.format(netProfit)}</div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <span>{profitMargin}% net agency margin</span>
          </div>
        </div>
      </div>

      {/* Database View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Filter Quick Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter records..."
            className="h-8 px-3 text-xs rounded-xl border border-border bg-background placeholder:text-muted-foreground w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Tab 1: Invoices & Billing */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['all', 'paid', 'partially_paid', 'sent', 'draft', 'overdue'].map((st) => (
              <button
                key={st}
                onClick={() => setInvoiceStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                  invoiceStatusFilter === st
                    ? 'bg-secondary text-foreground border border-border shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <DataTable
              data={invoices}
              columns={invoiceColumns}
              loading={invoicesLoading}
              emptyTitle="No invoices found"
              emptyDescription="Create client invoices with line items, partial payments, and PDF generation."
            />
          </div>
        </div>
      )}

      {/* Tab 2: Expenses & Profits */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Quick Expense Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {['all', 'ads_campaign', 'salary', 'video_shoot', 'tools', 'office'].map((cat) => (
              <button
                key={cat}
                onClick={() => setExpenseCategoryFilter(cat)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  expenseCategoryFilter === cat
                    ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <p className="text-[10px] uppercase font-bold tracking-wider">{cat === 'all' ? 'All Spend' : categoryLabels[cat] || cat}</p>
                <p className="text-xs font-extrabold text-foreground mt-0.5">
                  {currency.format(
                    expenses
                      .filter((e) => cat === 'all' || e.category === cat)
                      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                  )}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <DataTable
              data={expenses}
              columns={expenseColumns}
              loading={expensesLoading}
              emptyTitle="No expenses found"
              emptyDescription="Record agency expenses, team travel, voiceovers, and ads spend."
            />
          </div>
        </div>
      )}

      {/* Tab 3: Employee Salaries & Payroll (Notion Agency OS Hub) */}
      {activeTab === 'salaries' && (
        <div className="space-y-4">
          {/* Notion Agency OS Payroll KPI Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <span>Total Net Payroll</span>
                <Banknote size={14} className="text-primary" />
              </div>
              <div className="text-lg sm:text-xl font-black text-foreground">
                {currency.format(salarySummary.totalPayroll || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {salarySummary.totalEmployees || salaries.length} team members
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <span>Base Salaries</span>
                <CreditCard size={14} className="text-blue-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-foreground">
                {currency.format(salarySummary.totalBaseSalary || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">Contracted fixed pay</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <span>Incentives & OTS</span>
                <Sparkles size={14} className="text-amber-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600">
                +{currency.format(Number(salarySummary.totalIncentive || 0) + Number(salarySummary.totalOts || 0))}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Inc: {currency.format(salarySummary.totalIncentive || 0)}</span>
                <span>•</span>
                <span>OTS: {currency.format(salarySummary.totalOts || 0)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <span>Pending Disbursals</span>
                <Clock size={14} className="text-rose-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-600">
                {currency.format(salarySummary.totalPending || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {salarySummary.pendingCount || 0} unpaid entries
              </div>
            </div>
          </div>

          {/* Month & Period Filter Bar + View Switcher */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-2 bg-secondary/30 rounded-2xl border border-border">
            {/* Months Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0">
              <span className="text-[11px] font-bold text-muted-foreground px-2 uppercase">Period:</span>
              <select
                value={salaryMonthFilter}
                onChange={(e) => setSalaryMonthFilter(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Months</option>
                {MONTH_NAMES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={salaryYearFilter}
                onChange={(e) => setSalaryYearFilter(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Years</option>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-border">
                {['all', 'pending', 'paid', 'processing'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSalaryStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                      salaryStatusFilter === st
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Quick Filter & View Switcher */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <select
                value={salaryDeptFilter}
                onChange={(e) => setSalaryDeptFilter(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground capitalize focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Departments</option>
                {departments.filter((d) => d !== 'all').map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* View Switcher (Table / Cards / Board) */}
              <div className="flex items-center p-0.5 rounded-xl bg-card border border-border">
                <button
                  onClick={() => setSalaryView('table')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    salaryView === 'table' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setSalaryView('cards')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    salaryView === 'cards' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setSalaryView('board')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    salaryView === 'board' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Status Board View"
                >
                  <Layers size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* View 1: Notion Table View */}
          {salaryView === 'table' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
              <DataTable
                data={salaries}
                columns={salaryColumns}
                loading={salariesLoading}
                emptyTitle="No salary records found"
                emptyDescription="Generate monthly payroll or add custom employee salary records with incentives and OTS."
              />
            </div>
          )}

          {/* View 2: Notion Cards Grid View */}
          {salaryView === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {salaries.map((row) => {
                const emp = row.employee || {};
                return (
                  <div
                    key={row._id}
                    className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary uppercase tracking-wider text-muted-foreground">
                          {row.month} {row.year}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${salaryStatusTone[row.status] || salaryStatusTone.pending}`}>
                          {row.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                          {emp.name?.charAt(0) || 'E'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-foreground truncate">{emp.name || 'Team Member'}</h4>
                          <p className="text-xs text-muted-foreground truncate">{emp.position || 'Employee'} • {emp.department || 'General'}</p>
                        </div>
                      </div>

                      {/* Itemized Chips */}
                      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Pay:</span>
                          <span className="font-semibold text-foreground">{currency.format(Number(row.baseSalary || 0))}</span>
                        </div>
                        {Number(row.incentive || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-600 font-medium">Incentive:</span>
                            <span className="font-bold text-amber-600">+{currency.format(Number(row.incentive))}</span>
                          </div>
                        )}
                        {Number(row.ots || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-purple-600 font-medium">OTS Allowance:</span>
                            <span className="font-bold text-purple-600">+{currency.format(Number(row.ots))}</span>
                          </div>
                        )}
                        {Number(row.otherAllowances || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-emerald-600 font-medium">Other Perks:</span>
                            <span className="font-bold text-emerald-600">+{currency.format(Number(row.otherAllowances))}</span>
                          </div>
                        )}
                        {Number(row.deductions || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-rose-600 font-medium">Deductions:</span>
                            <span className="font-bold text-rose-600">-{currency.format(Number(row.deductions))}</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-border/60 flex justify-between items-center">
                          <span className="font-bold text-foreground">Net Pay:</span>
                          <span className="font-black text-sm text-foreground text-primary">{currency.format(Number(row.netSalary || 0))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <button
                        onClick={() => {
                          setPayslipSalary(row);
                          setShowPayslipModal(true);
                        }}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <FileText size={13} />
                        <span>Payslip</span>
                      </button>
                      <div className="flex items-center gap-1">
                        {row.status !== 'paid' && canManage && (
                          <button
                            onClick={() => updateSalaryStatus.mutate({ id: row._id, status: 'paid' })}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => {
                              setSelectedSalary(row);
                              setShowSalaryModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => setDeleteSalaryId(row._id)}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View 3: Notion Kanban Status Board */}
          {salaryView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {['pending', 'processing', 'paid'].map((statusKey) => {
                const columnItems = salaries.filter((s) => s.status === statusKey);
                const columnTotal = columnItems.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
                return (
                  <div key={statusKey} className="p-3.5 rounded-2xl bg-secondary/20 border border-border space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${salaryStatusTone[statusKey]}`}>
                          {statusKey}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">({columnItems.length})</span>
                      </div>
                      <span className="text-xs font-extrabold text-foreground">{currency.format(columnTotal)}</span>
                    </div>

                    <div className="space-y-2.5 min-h-[160px]">
                      {columnItems.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground/60">No entries in {statusKey}</div>
                      ) : (
                        columnItems.map((item) => {
                          const emp = item.employee || {};
                          return (
                            <div
                              key={item._id}
                              className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-2 hover:border-primary/40 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground">{emp.name}</span>
                                <span className="text-[11px] font-black text-primary">{currency.format(Number(item.netSalary || 0))}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">{emp.position} • {emp.department}</div>
                              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                                <span className="text-muted-foreground">{item.month}</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setPayslipSalary(item);
                                      setShowPayslipModal(true);
                                    }}
                                    className="text-primary hover:underline font-bold"
                                  >
                                    Slip
                                  </button>
                                  {statusKey !== 'paid' && canManage && (
                                    <button
                                      onClick={() => updateSalaryStatus.mutate({ id: item._id, status: 'paid' })}
                                      className="text-emerald-600 font-bold hover:underline"
                                    >
                                      Pay
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Referral Hub */}
      {activeTab === 'referrals' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <DataTable
            data={referrals}
            columns={[
              {
                key: 'referralPersonName',
                label: 'Partner / Referrer',
                render: (row) => (
                  <div className="font-bold text-foreground text-xs">{row.referralPersonName || 'Unknown Partner'}</div>
                ),
              },
              {
                key: 'referralSource',
                label: 'Channel',
                render: (row) => (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground capitalize">
                    {row.referralSource || 'Direct'}
                  </span>
                ),
              },
              {
                key: 'campaignName',
                label: 'Campaign',
                render: (row) => <span className="text-xs text-muted-foreground">{row.campaignName || 'N/A'}</span>,
              },
              {
                key: 'conversionStatus',
                label: 'Status',
                render: (row) => (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {row.conversionStatus || 'Active'}
                  </span>
                ),
              },
            ]}
            emptyTitle="No referral payouts found"
            emptyDescription="Track referral partner rewards and campaign commission payouts."
          />
        </div>
      )}

      {/* Modals */}
      {showInvoiceModal && (
        <AddInvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          invoice={selectedInvoice}
          clients={clients}
          projects={projects}
        />
      )}

      {showExpenseModal && (
        <AddExpenseModal
          open={showExpenseModal}
          onOpenChange={setShowExpenseModal}
          expense={selectedExpense}
        />
      )}

      {showSalaryModal && (
        <AddSalaryModal
          open={showSalaryModal}
          onOpenChange={setShowSalaryModal}
          salary={selectedSalary}
          initialMonth={salaryMonthFilter !== 'all' ? salaryMonthFilter : currentMonthName}
          initialYear={salaryYearFilter !== 'all' ? Number(salaryYearFilter) : currentYear}
        />
      )}

      {showPayslipModal && (
        <PayslipModal
          open={showPayslipModal}
          onOpenChange={setShowPayslipModal}
          salary={payslipSalary}
        />
      )}

      {showShareModal && (
        <ShareInvoiceModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          invoice={shareInvoice}
        />
      )}

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={Boolean(deleteInvoiceId)} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This invoice and its payment records will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteInvoiceId) deleteInvoice.mutate(deleteInvoiceId);
                setDeleteInvoiceId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Expense Confirmation */}
      <AlertDialog open={Boolean(deleteExpenseId)} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Expense Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This expense entry will be permanently removed from finance calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteExpenseId) deleteExpense.mutate(deleteExpenseId);
                setDeleteExpenseId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Salary Confirmation */}
      <AlertDialog open={Boolean(deleteSalaryId)} onOpenChange={(open) => !open && setDeleteSalaryId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Salary Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This employee compensation record and any linked expense will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSalaryId) deleteSalary.mutate(deleteSalaryId);
                setDeleteSalaryId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
