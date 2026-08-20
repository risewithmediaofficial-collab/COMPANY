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

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Business & Finance', 'Finance Operations']}
      title="Finance & Revenue Hub"
      subtitle="Complete Notion-style command center for client billings, accounts receivable, agency spend, and net margins."
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

      {/* Tab 3: Referral Hub */}
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

      {showShareModal && (
        <ShareInvoiceModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          invoice={shareInvoice}
        />
      )}

      {/* Delete Confirmation */}
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
    </WorkspacePage>
  );
}
