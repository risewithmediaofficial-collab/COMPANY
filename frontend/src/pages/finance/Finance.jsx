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
import {
  MetricCard,
  MetricGrid,
  PageHeader,
  PageToolbar,
  SearchField,
  SectionCard,
  StatusBadge,
} from '../../components/ui/page';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
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
  'Not Paid': 'neutral',
  'Partially Paid': 'warning',
  Paid: 'success',
  Overdue: 'danger',
};

const invoiceStatusTone = {
  Draft: 'neutral',
  Sent: 'info',
  Viewed: 'info',
  'Partially Paid': 'warning',
  Paid: 'success',
  Overdue: 'danger',
  Cancelled: 'danger',
};

const Finance = () => {
  const { user } = useSelector((state) => state.auth);
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'superAdmin';
  const canViewFinanceOverview = isAdmin || isManager || Boolean(user?.permissions?.canViewFinanceOverview) || Boolean(user?.permissions?.canManageFinance);
  const canManageFinanceAccess = isAdmin || isManager || Boolean(user?.permissions?.canManageFinance);

  const tabs = useMemo(() => {
    if (canViewFinanceOverview) {
      return [
        { id: 'invoices', label: 'Invoices', icon: FileText },
        { id: 'referrals', label: 'Referrals', icon: Users2 },
        { id: 'expenses', label: 'Expenses & Profits', icon: Receipt },
      ];
    }
    return [{ id: 'invoices', label: 'Invoices', icon: FileText }];
  }, [canViewFinanceOverview]);

  const [activeTab, setActiveTab] = useState('invoices');
  const [search, setSearch] = useState('');
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

  const [paymentForms, setPaymentForms] = useState({});
  const [followupForms, setFollowupForms] = useState({});
  const [callForm, setCallForm] = useState({
    clientId: '',
    projectId: '',
    callType: 'Outgoing',
    callPurpose: 'General Update',
    callDate: new Date().toISOString().split('T')[0],
    callTime: '',
    spokenWith: '',
    contactNumber: '',
    callSummary: '',
    clientResponse: '',
    nextAction: '',
    nextFollowUpDate: '',
    visibleToClient: false,
  });
  const [referralForm, setReferralForm] = useState({
    clientId: '',
    projectId: '',
    referralSource: 'LinkedIn',
    referralPersonName: '',
    referralPersonContact: '',
    referralPlatformLink: '',
    campaignName: '',
    leadQuality: 'Warm',
    conversionStatus: 'Lead',
    notes: '',
  });

  const canManage = canManageFinanceAccess;
  const canDeleteFinance = canManageFinanceAccess;
  const canDeleteInvoice = canManageFinanceAccess;

  const { data: clients = [] } = useClients({}, { enabled: canViewFinanceOverview });
  const { data: projects = [] } = useProjects({}, { enabled: canViewFinanceOverview });
  const { data: managerProjects = [] } = useProjects({ search }, { enabled: isManager });
  const { data: financeRecords = [] } = useFinanceRecords({ search }, { enabled: canViewFinanceOverview });
  const { data: invoices = [] } = useInvoices({ search }, { enabled: canViewFinanceOverview });
  const { data: callHistory = [] } = useCallHistory({ search }, { enabled: canViewFinanceOverview });
  const { data: referrals = [] } = useReferrals({ search }, { enabled: canViewFinanceOverview });
  const { data: referralAnalytics = {} } = useReferralAnalytics({ enabled: canViewFinanceOverview });
  const { data: financeSummary = {} } = useFinanceSummary({ enabled: canViewFinanceOverview });
  const { data: expenses = [] } = useExpenses(
    {
      search,
      category: expenseCategoryFilter !== 'all' ? expenseCategoryFilter : undefined,
      transactionType: expenseTypeFilter !== 'all' ? expenseTypeFilter : undefined,
      sort: expenseSort,
    },
    { enabled: canViewFinanceOverview }
  );
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();
  const { data: payments = [] } = usePayments({ search }, { enabled: canViewFinanceOverview });
  const { data: overdueRecords = [] } = useOverdueFinanceRecords({ enabled: canViewFinanceOverview });

  const addPaymentNote = useAddPaymentNote();
  const addInternalFinanceNote = useAddInternalFinanceNote();
  const createCallHistory = useCreateCallHistory();
  const createReferral = useCreateReferral();
  const deleteFinanceRecord = useDeleteFinanceRecord();
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

  const categoryBreakdown = useMemo(() => {
    const breakdown = {
      rj: 0,
      video_shoot: 0,
      travel_allowance: 0,
      ads_campaign: 0,
      salary: 0,
      tools: 0,
      travel: 0,
      office: 0,
      freelance: 0,
      misc: 0,
      other: 0,
    };
    expenses.forEach((exp) => {
      if (exp.status === 'approved' && exp.transactionType !== 'Profit') {
        const cat = exp.category || 'misc';
        breakdown[cat] = (breakdown[cat] || 0) + Number(exp.amount || 0);
      }
    });
    return breakdown;
  }, [expenses]);

  const profitMargin = useMemo(() => {
    const revenue = Number(financeSummary.totalRevenue || 0);
    const profit = Number(financeSummary.profit || 0);
    return revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
  }, [financeSummary]);

  const filteredReferrals = useMemo(() => referrals.filter((item) => {
    const haystack = [
      item.referralSource,
      item.referralPersonName,
      item.campaignName,
      item.client?.name,
      item.client?.company,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [referrals, search]);

  const selectedClientProjects = callForm.clientId
    ? projects.filter((project) => project.client?._id === callForm.clientId || project.client === callForm.clientId)
    : projects;

  const referralClientProjects = referralForm.clientId
    ? projects.filter((project) => project.client?._id === referralForm.clientId || project.client === referralForm.clientId)
    : projects;

  const metrics = {
    totalReceivable: invoices.reduce((sum, item) => sum + Number(item.balanceAmount || Math.max((item.total || item.amount || 0) - (item.paidAmount || 0), 0)), 0),
    totalPaid: invoices.reduce((sum, item) => sum + Number(item.paidAmount || (item.status?.toLowerCase() === 'paid' ? (item.total || item.amount || 0) : 0)), 0),
    openInvoices: invoices.filter((item) => !['Paid', 'Cancelled', 'paid', 'cancelled'].includes(item.status)).length,
    overdue: invoices.filter((item) => item.status?.toLowerCase() === 'overdue' || (new Date(item.dueDate) < new Date() && !['paid', 'cancelled'].includes(item.status?.toLowerCase()))).length,
  };

  const financeColumns = [
    {
      key: 'client',
      label: 'Client / Project',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.clientName || row.clientId?.name || row.clientId?.company}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.projectName || row.projectId?.name}</div>
        </div>
      ),
    },
    {
      key: 'serviceName',
      label: 'Service',
      render: (row) => row.serviceName,
    },
    {
      key: 'amounts',
      label: 'Amounts',
      render: (row) => (
        <div className="text-sm">
          <div className="font-semibold text-foreground">Total: {currency.format(Number(row.totalProjectAmount || 0))}</div>
          <div className="text-muted-foreground">Paid: {currency.format(Number(row.totalPaidAmount || 0))}</div>
          <div className="text-muted-foreground">Balance: {currency.format(Number(row.balanceAmount || 0))}</div>
        </div>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      render: (row) => <StatusBadge tone={paymentStatusTone[row.paymentStatus] || 'neutral'}>{row.paymentStatus}</StatusBadge>,
    },
    {
      key: 'invoiceStatus',
      label: 'Invoice Status',
      render: (row) => <StatusBadge tone={invoiceStatusTone[row.invoiceStatus] || 'neutral'}>{row.invoiceStatus}</StatusBadge>,
    },
    {
      key: 'dueDate',
      label: 'Due / Follow-up',
      render: (row) => (
        <div className="text-sm text-foreground">
          <div>{row.paymentDueDate ? new Date(row.paymentDueDate).toLocaleDateString() : 'No due date'}</div>
          <div className="text-xs text-muted-foreground">{row.nextFollowUpDate ? `Next: ${new Date(row.nextFollowUpDate).toLocaleDateString()}` : 'No follow-up'}</div>
        </div>
      ),
    },
  ];

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.invoiceNumber}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.project?.name || row.projectName || 'No linked project'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => row.client?.company || row.client?.name || row.clientDetails?.businessName || row.clientDetails?.name,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <div className="text-sm">
          <div className="font-semibold text-foreground">Total: {currency.format(Number(row.totalAmount || row.amount || 0))}</div>
          <div className="text-muted-foreground">Paid: {currency.format(Number(row.paidAmount || 0))}</div>
          <div className="text-muted-foreground">Balance: {currency.format(Number(row.balanceAmount || 0))}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge tone={invoiceStatusTone[row.status] || 'neutral'}>{row.status}</StatusBadge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => exportInvoiceToPDF(row, { save: true })} title="Download PDF" className="px-2">
            <Download size={14} className="mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShareInvoice(row); setShowShareModal(true); }} title="Share Invoice" className="px-2 text-primary border-primary/30">
            <Share2 size={14} className="mr-1" /> Share
          </Button>
          {canManage ? <Button size="sm" variant="outline" onClick={() => sendInvoice.mutate(row._id)} title="Send via email/portal" className="px-2">
            <Send size={14} className="mr-1" /> Send
          </Button> : null}
          {canManage && !['Paid', 'Cancelled'].includes(row.status) ? <Button size="sm" variant="outline" onClick={() => markInvoicePaid.mutate({ id: row._id })} className="px-2">
            Mark Paid
          </Button> : null}
        </div>
      ),
    },
  ];

  const expenseColumns = [
    {
      key: 'title',
      label: 'Expense / Profit Title',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.title}</div>
          {row.notes ? <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{row.notes}</div> : null}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Type / Category',
      render: (row) => (
        <StatusBadge tone="neutral">
          {row.category === 'other' && row.customCategory
            ? row.customCategory
            : categoryLabels[row.category] || row.category}
        </StatusBadge>
      ),
    },
    {
      key: 'transactionType',
      label: 'Transaction',
      render: (row) => (
        <StatusBadge tone={row.transactionType === 'Profit' ? 'success' : 'danger'}>
          {row.transactionType || 'Expense'}
        </StatusBadge>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className="font-bold text-foreground">{currency.format(Number(row.amount || 0))}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-xs">{row.date ? new Date(row.date).toLocaleDateString('en-IN') : 'N/A'}</span>
      ),
    },
    {
      key: 'submittedBy',
      label: 'Submitted By',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.submittedBy?.name || 'Admin'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={
          row.status === 'approved' ? 'success' :
          row.status === 'pending' ? 'warning' : 'danger'
        }>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          {row.status === 'pending' && canManage ? (
            <>
              <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-7 px-2 text-xs" onClick={() => approveExpense.mutate({ id: row._id, action: 'approve' })} disabled={approveExpense.isPending}>Approve</Button>
              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 h-7 px-2 text-xs" onClick={() => approveExpense.mutate({ id: row._id, action: 'reject' })} disabled={approveExpense.isPending}>Reject</Button>
            </>
          ) : null}
          {canManage ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                setSelectedExpense(row);
                setShowExpenseModal(true);
              }}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setDeleteExpenseId(row._id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const handleAddPaymentNote = async (recordId) => {
    const form = paymentForms[recordId];
    if (!form?.noteTitle) return;
    await addPaymentNote.mutateAsync({ id: recordId, data: form });
    setPaymentForms((current) => ({
      ...current,
      [recordId]: { noteTitle: '', noteDescription: '', amountPaid: '', paymentMode: 'UPI', paymentDate: '', nextFollowUpDate: '', visibleToClient: false },
    }));
  };

  const handleAddFollowup = async (recordId) => {
    const form = followupForms[recordId];
    if (!form?.followUpNote) return;
    await addInternalFinanceNote.mutateAsync({ id: recordId, data: form });
    setFollowupForms((current) => ({
      ...current,
      [recordId]: { followUpNote: '', nextFollowUpDate: '', spokenWith: '', clientResponse: '', paymentPromiseDate: '', amountPromised: '' },
    }));
  };

  const handleCreateCall = async () => {
    await createCallHistory.mutateAsync(callForm);
    setCallForm({
      clientId: '',
      projectId: '',
      callType: 'Outgoing',
      callPurpose: 'General Update',
      callDate: new Date().toISOString().split('T')[0],
      callTime: '',
      spokenWith: '',
      contactNumber: '',
      callSummary: '',
      clientResponse: '',
      nextAction: '',
      nextFollowUpDate: '',
      visibleToClient: false,
    });
  };

  const handleCreateReferral = async () => {
    await createReferral.mutateAsync(referralForm);
    setReferralForm({
      clientId: '',
      projectId: '',
      referralSource: 'LinkedIn',
      referralPersonName: '',
      referralPersonContact: '',
      referralPlatformLink: '',
      campaignName: '',
      leadQuality: 'Warm',
      conversionStatus: 'Lead',
      notes: '',
    });
  };

  const adsBudgetProjects = useMemo(() => {
    const projList = isAdmin ? projects : managerProjects;
    const filteredProjList = isAdmin
      ? projList.filter((p) => {
          const haystack = `${p.name} ${p.client?.company || ''} ${p.client?.name || ''}`.toLowerCase();
          return haystack.includes(search.toLowerCase());
        })
      : projList;

    return filteredProjList.map((project) => {
      const adsBudget = Number(project.budgetDetails?.adsAmount || 0);
      return {
        ...project,
        adsBudget,
      };
    });
  }, [isAdmin, projects, managerProjects, search]);

  const totalAdsBudget = adsBudgetProjects.reduce((sum, project) => sum + project.adsBudget, 0);



  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/90 dark:border-border bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 dark:from-card dark:to-secondary/50 p-6 text-slate-900 dark:text-foreground shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Finance
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-foreground">Finance Operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-muted-foreground">
              Track partial payments, follow-ups, visible payment history, invoice status, and client communication from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canManage ? <Button onClick={() => { setSelectedInvoice(null); setShowInvoiceModal(true); }} className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 rounded-2xl px-4 py-2.5 font-bold"><Plus size={16} className="mr-2" />Invoice</Button> : null}
            {(isAdmin || isManager) && activeTab === 'expenses' ? <Button onClick={() => setShowExpenseModal(true)} className="bg-slate-900 text-white dark:bg-card dark:text-foreground hover:bg-slate-800 rounded-2xl px-4 py-2.5 font-bold"><Plus size={16} className="mr-2" />Record Expense</Button> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Outstanding" value={currency.format(metrics.totalReceivable)} helper="Pending receivable balance" icon={AlertCircle} tone={metrics.totalReceivable > 0 ? 'warning' : 'success'} />
          <MetricCard label="Collected" value={currency.format(metrics.totalPaid)} helper="Total payments recorded" icon={CheckCircle2} tone="success" />
          <MetricCard label="Open Invoices" value={metrics.openInvoices} helper="Draft, sent, viewed, or partial" icon={Receipt} tone="info" />
          <MetricCard label="Overdue" value={metrics.overdue} helper="Finance records past due date" icon={FileText} tone={metrics.overdue ? 'danger' : 'neutral'} />
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <PageToolbar>
        <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients, projects, invoices, calls, or referrals..." />
        <div className="flex flex-wrap items-center gap-2">
          <div className="app-pill">{invoices.length} invoices</div>
          <div className="app-pill">{payments.length} payments</div>
          {(isAdmin || isManager) && <div className="app-pill">{expenses.length} expenses</div>}
        </div>
      </PageToolbar>

      {activeTab === 'records' ? (
        <SectionCard title="Finance Records" description="Track total amount, paid amount, balance, follow-up notes, and client-visible payment updates.">
          <div className="max-h-[400px] overflow-y-auto pr-1 border border-border/40 rounded-2xl">
            <DataTable
              data={financeRecords}
              columns={financeColumns}
              onRowClick={(row) => {
                setSelectedRecord(row);
                setShowFinanceModal(true);
              }}
              onEdit={canManage ? (row) => {
                setSelectedRecord(row);
                setShowFinanceModal(true);
              } : null}
              onDelete={canDeleteFinance ? (id) => deleteFinanceRecord.mutate(id) : null}
              emptyTitle="No finance records yet"
              emptyDescription="Create a finance record for each client project to start tracking balance and follow-up."
            />
          </div>

          <div className="mt-6 grid gap-4 max-h-[500px] overflow-y-auto pr-1">
            {financeRecords.map((record) => (
              <div key={record._id} className="rounded-3xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{record.serviceName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{record.clientName} • {record.projectName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={paymentStatusTone[record.paymentStatus] || 'neutral'}>{record.paymentStatus}</StatusBadge>
                    <StatusBadge tone={invoiceStatusTone[record.invoiceStatus] || 'neutral'}>{record.invoiceStatus}</StatusBadge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Add Payment Note</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder="Note title" value={paymentForms[record._id]?.noteTitle || ''} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], noteTitle: event.target.value } }))} />
                      <input className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" type="number" placeholder="Amount paid" value={paymentForms[record._id]?.amountPaid || ''} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], amountPaid: event.target.value } }))} />
                      <select className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={paymentForms[record._id]?.paymentMode || 'UPI'} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], paymentMode: event.target.value } }))}>
                        {['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'].map((mode) => <option key={mode}>{mode}</option>)}
                      </select>
                      <input className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" type="date" value={paymentForms[record._id]?.paymentDate || ''} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], paymentDate: event.target.value } }))} />
                    </div>
                    <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder="Payment note description" value={paymentForms[record._id]?.noteDescription || ''} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], noteDescription: event.target.value } }))} />
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-sm text-muted-foreground"><input type="checkbox" className="mr-2" checked={Boolean(paymentForms[record._id]?.visibleToClient)} onChange={(event) => setPaymentForms((current) => ({ ...current, [record._id]: { ...current[record._id], visibleToClient: event.target.checked } }))} />Visible to client</label>
                      <Button type="button" onClick={() => handleAddPaymentNote(record._id)} disabled={addPaymentNote.isPending}>Save Payment Note</Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Internal Follow-up Note</p>
                    <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder="Follow-up summary, client promise, next action..." value={followupForms[record._id]?.followUpNote || ''} onChange={(event) => setFollowupForms((current) => ({ ...current, [record._id]: { ...current[record._id], followUpNote: event.target.value } }))} />
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder="Spoken with" value={followupForms[record._id]?.spokenWith || ''} onChange={(event) => setFollowupForms((current) => ({ ...current, [record._id]: { ...current[record._id], spokenWith: event.target.value } }))} />
                      <input className="rounded-2xl border border-border bg-background px-4 py-3 text-sm" type="date" value={followupForms[record._id]?.nextFollowUpDate || ''} onChange={(event) => setFollowupForms((current) => ({ ...current, [record._id]: { ...current[record._id], nextFollowUpDate: event.target.value } }))} />
                    </div>
                    <Button type="button" className="mt-3" onClick={() => handleAddFollowup(record._id)} disabled={addInternalFinanceNote.isPending}>Save Follow-up</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'invoices' ? (
        <SectionCard title="Invoices" description="Create invoices, send them to the client dashboard, and track partial or completed payment updates.">
          <div className="max-h-[400px] overflow-y-auto pr-1 border border-border/40 rounded-2xl">
            <DataTable
              data={invoices}
              columns={invoiceColumns}
              onRowClick={(row) => {
                setSelectedInvoice(row);
                setShowInvoiceModal(true);
              }}
              onEdit={canManage ? (row) => {
                setSelectedInvoice(row);
                setShowInvoiceModal(true);
              } : null}
              onDelete={canDeleteInvoice ? (id) => setDeleteInvoiceId(id) : null}
              emptyTitle="No invoices created yet"
              emptyDescription="Create your first invoice to share payment details with the client."
            />
          </div>

          <div className="mt-6 grid gap-4 max-h-[500px] overflow-y-auto pr-1">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="rounded-3xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{invoice.invoiceNumber}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.client?.company || invoice.client?.name} • {invoice.project?.name || 'No linked project'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={invoiceStatusTone[invoice.status] || 'neutral'}>{invoice.status}</StatusBadge>
                    <Button size="sm" variant="outline" onClick={() => exportInvoiceToPDF(invoice, { save: true })} className="h-8 text-xs gap-1">
                      <Download size={13} /> PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShareInvoice(invoice); setShowShareModal(true); }} className="h-8 text-xs gap-1 text-primary border-primary/30">
                      <Share2 size={13} /> Share
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <p className="font-semibold text-foreground">Total</p>
                    <p className="mt-2 text-muted-foreground">{currency.format(Number(invoice.totalAmount || invoice.amount || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <p className="font-semibold text-foreground">Paid</p>
                    <p className="mt-2 text-muted-foreground">{currency.format(Number(invoice.paidAmount || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <p className="font-semibold text-foreground">Balance</p>
                    <p className="mt-2 text-muted-foreground">{currency.format(Number(invoice.balanceAmount || 0))}</p>
                  </div>
                </div>
                {canManage && !['Paid', 'Cancelled'].includes(invoice.status) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" type="number" placeholder="Partial payment amount" value={paymentForms[`invoice-${invoice._id}`]?.amountPaid || ''} onChange={(event) => setPaymentForms((current) => ({ ...current, [`invoice-${invoice._id}`]: { ...current[`invoice-${invoice._id}`], amountPaid: event.target.value } }))} />
                    <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={paymentForms[`invoice-${invoice._id}`]?.paymentMode || 'UPI'} onChange={(event) => setPaymentForms((current) => ({ ...current, [`invoice-${invoice._id}`]: { ...current[`invoice-${invoice._id}`], paymentMode: event.target.value } }))}>
                      {['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'].map((mode) => <option key={mode}>{mode}</option>)}
                    </select>
                    <Button type="button" onClick={() => addPartialPayment.mutate({ id: invoice._id, data: paymentForms[`invoice-${invoice._id}`] || {} })} disabled={addPartialPayment.isPending}>Add Partial Payment</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}


      {activeTab === 'referrals' ? (
        <SectionCard title="Referral Tracking" description="Track source platforms, conversion quality, and revenue contribution from converted clients.">
          {canManage ? (
            <div className="mb-6 grid gap-3 rounded-3xl border border-border bg-background p-5 md:grid-cols-2 xl:grid-cols-4">
              <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={referralForm.clientId} onChange={(event) => setReferralForm((current) => ({ ...current, clientId: event.target.value, projectId: '' }))}>
                <option value="">Select client</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.company || client.name}</option>)}
              </select>
              <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={referralForm.projectId} onChange={(event) => setReferralForm((current) => ({ ...current, projectId: event.target.value }))}>
                <option value="">Select project</option>
                {referralClientProjects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
              </select>
              <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={referralForm.referralSource} onChange={(event) => setReferralForm((current) => ({ ...current, referralSource: event.target.value }))}>
                {['LinkedIn', 'Instagram', 'Facebook', 'WhatsApp', 'Website', 'Google Search', 'Google Ads', 'Existing Client Referral', 'Direct Call', 'Walk-in', 'Friend Referral', 'Partner Referral', 'Other'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={referralForm.leadQuality} onChange={(event) => setReferralForm((current) => ({ ...current, leadQuality: event.target.value }))}>
                {['Hot', 'Warm', 'Cold'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <input className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" placeholder="Referral person name" value={referralForm.referralPersonName} onChange={(event) => setReferralForm((current) => ({ ...current, referralPersonName: event.target.value }))} />
              <input className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" placeholder="Referral contact" value={referralForm.referralPersonContact} onChange={(event) => setReferralForm((current) => ({ ...current, referralPersonContact: event.target.value }))} />
              <input className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" placeholder="Platform link" value={referralForm.referralPlatformLink} onChange={(event) => setReferralForm((current) => ({ ...current, referralPlatformLink: event.target.value }))} />
              <input className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" placeholder="Campaign name" value={referralForm.campaignName} onChange={(event) => setReferralForm((current) => ({ ...current, campaignName: event.target.value }))} />
              <select className="rounded-2xl border border-border bg-card px-4 py-3 text-sm" value={referralForm.conversionStatus} onChange={(event) => setReferralForm((current) => ({ ...current, conversionStatus: event.target.value }))}>
                {['Lead', 'Contacted', 'Proposal Sent', 'Converted', 'Not Converted'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <textarea className="min-h-24 rounded-2xl border border-border bg-card px-4 py-3 text-sm md:col-span-2" placeholder="Referral notes" value={referralForm.notes} onChange={(event) => setReferralForm((current) => ({ ...current, notes: event.target.value }))} />
              <Button type="button" onClick={handleCreateReferral} disabled={createReferral.isPending}>Save Referral</Button>
            </div>
          ) : null}

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Leads" value={referralAnalytics.totalLeads || 0} helper="Tracked referral leads" icon={Users2} tone="info" />
            <MetricCard label="Converted" value={referralAnalytics.convertedLeads || 0} helper="Converted referral clients" icon={CheckCircle2} tone="success" />
            <MetricCard label="Pending" value={referralAnalytics.pendingLeads || 0} helper="Leads not converted yet" icon={AlertCircle} tone="warning" />
            <MetricCard label="Revenue" value={currency.format(Number(referralAnalytics.totalRevenueFromConvertedClients || 0))} helper={referralAnalytics.bestPerformingReferralSource ? `Best source: ${referralAnalytics.bestPerformingReferralSource}` : 'No best source yet'} icon={IndianRupee} tone="primary" />
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredReferrals.map((item) => (
              <div key={item._id} className="rounded-3xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-foreground">{item.client?.company || item.client?.name || item.referralPersonName || 'Referral record'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.referralSource || 'Other'} • {item.campaignName || 'No campaign name'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.leadQuality ? <StatusBadge tone={item.leadQuality === 'Hot' ? 'danger' : item.leadQuality === 'Warm' ? 'warning' : 'neutral'}>{item.leadQuality}</StatusBadge> : null}
                    {item.conversionStatus ? <StatusBadge tone={item.conversionStatus === 'Converted' ? 'success' : 'info'}>{item.conversionStatus}</StatusBadge> : null}
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground">{item.notes || 'No notes added.'}</p>
                {canDeleteFinance ? (
                  <div className="mt-3">
                    <Button type="button" variant="outline" onClick={() => deleteReferral.mutate(item._id)}>Delete Referral</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'expenses' && canViewFinanceOverview ? (
        <div className="space-y-6">
          <SectionCard
            title="Expenses & Profits Management"
            description="Track company expenses (RJ fees, Video Shoot, Travel Allowance, Ads Spend), profit adjustments, and monthly reports."
          >
            {/* Metric Overview inside the Tab */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
              <MetricCard 
                label="Total Revenue" 
                value={currency.format(Number(financeSummary.totalRevenue || 0))} 
                helper="Client invoices & payments received" 
                icon={IndianRupee} 
                tone="success" 
              />
              <MetricCard 
                label="Total Expenses" 
                value={currency.format(Number(financeSummary.totalExpenses || 0))} 
                helper="Approved company expenses" 
                icon={Receipt} 
                tone="danger" 
              />
              <MetricCard 
                label="Net Profit" 
                value={currency.format(Number(financeSummary.profit || 0))} 
                helper="Revenue minus approved expenses" 
                icon={CheckCircle2} 
                tone={Number(financeSummary.profit || 0) >= 0 ? 'success' : 'danger'} 
              />
              <MetricCard 
                label="Profit Margin" 
                value={`${profitMargin}%`} 
                helper="Net profitability ratio" 
                icon={AlertCircle} 
                tone={Number(financeSummary.profit || 0) >= 0 ? 'primary' : 'warning'} 
              />
            </div>

            {/* Filter & Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-card/60 p-4 rounded-2xl border border-border/40">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <SearchField value={search} onChange={setSearch} placeholder="Search title, category, notes..." />
                
                {/* Category Filter */}
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="rj">RJ / Voice Over</option>
                  <option value="video_shoot">Video Shoot</option>
                  <option value="travel_allowance">Travel Allowance</option>
                  <option value="ads_campaign">Ads Campaign Spend</option>
                  <option value="salary">Salary</option>
                  <option value="tools">Software Tools</option>
                  <option value="office">Office & Rent</option>
                  <option value="freelance">Freelance Fees</option>
                  <option value="misc">Miscellaneous</option>
                  <option value="other">Other (Custom)</option>
                </select>

                {/* Transaction Type Filter */}
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={expenseTypeFilter}
                  onChange={(e) => setExpenseTypeFilter(e.target.value)}
                >
                  <option value="all">All Transactions</option>
                  <option value="Expense">Expenses Only</option>
                  <option value="Profit">Profits Only</option>
                </select>

                {/* Date Sort Filter */}
                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={expenseSort}
                  onChange={(e) => setExpenseSort(e.target.value)}
                >
                  <option value="date_desc">Date: Newest First</option>
                  <option value="date_asc">Date: Oldest First</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowMonthlyReportModal(true)}>
                  <Calendar size={15} className="mr-1.5" /> Monthly Expense Report
                </Button>
                <Button size="sm" onClick={() => {
                  setSelectedExpense(null);
                  setShowExpenseModal(true);
                }}>
                  <Plus size={15} className="mr-1.5" /> Record Expense / Profit
                </Button>
              </div>
            </div>

            {/* Category Breakdown list */}
            <div className="rounded-3xl border border-border bg-background p-6 mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Category-Wise Overheads & Costs</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Object.entries(categoryBreakdown).map(([catKey, val]) => {
                  const maxVal = Math.max(...Object.values(categoryBreakdown), 1);
                  const pct = Math.round((val / maxVal) * 100);
                  return (
                    <div key={catKey} className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{categoryLabels[catKey] || catKey}</span>
                        <div className="text-xl font-bold text-foreground mt-1">{currency.format(val)}</div>
                      </div>
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table of all expenses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Logged Expenses & Profit Entries</h3>
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-1 border border-border/40 rounded-2xl">
                <DataTable
                  data={expenses}
                  columns={expenseColumns}
                  emptyTitle="No financial records found"
                  emptyDescription="Try adjusting your search or category filters, or record a new expense."
                />
              </div>
            </div>

          </SectionCard>
        </div>
      ) : null}

      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteInvoiceId) {
                  await deleteInvoice.mutateAsync(deleteInvoiceId);
                  setDeleteInvoiceId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteExpenseId} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteExpenseId) {
                  await deleteExpense.mutateAsync(deleteExpenseId);
                  setDeleteExpenseId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AddFinanceModal open={showFinanceModal} onOpenChange={setShowFinanceModal} entry={selectedRecord} />
      <AddInvoiceModal open={showInvoiceModal} onOpenChange={setShowInvoiceModal} invoice={selectedInvoice} />
      {showShareModal && shareInvoice && (
        <ShareInvoiceModal open={showShareModal} onOpenChange={setShowShareModal} invoice={shareInvoice} />
      )}
      <AddExpenseModal
        open={showExpenseModal}
        onOpenChange={(open) => {
          setShowExpenseModal(open);
          if (!open) setSelectedExpense(null);
        }}
        expense={selectedExpense}
      />
      <AddAdsCampaignModal open={showAdsCampaignModal} onOpenChange={setShowAdsCampaignModal} />
      <MonthlyExpenseReportModal open={showMonthlyReportModal} onOpenChange={setShowMonthlyReportModal} />
    </div>
  );
};

export default Finance;
