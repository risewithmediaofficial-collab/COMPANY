import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Receipt,
  FileText,
  CreditCard,
  UserPlus,
  Banknote,
  ShieldCheck,
  ArrowRightLeft,
  CalendarCheck,
  Building,
  CheckCircle2,
  Trash2,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import {
  useCreateModuleInvoice,
  useRecordPaymentReceipt,
  useCreateModuleExpense,
  useCreateInternalTransfer,
  useCreateSubscription,
  useCreateFounderTransaction,
  useFinanceAccounts,
  useModuleInvoices,
  usePayrollEmployees,
  useCreatePayrollRecord,
} from '../../../hooks/useFinance';
import { useClients, useCreateClient } from '../../../hooks/useClients';
import { formatINR } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

export default function FinanceQuickAddModal({ open, onOpenChange, initialAction = 'invoice' }) {
  const [activeAction, setActiveAction] = useState(initialAction);

  useEffect(() => {
    if (open) {
      if (initialAction) {
        setActiveAction(initialAction);
      }
      setInvForm({
        client: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        servicePeriod: '',
        taxType: 'exclusive',
        taxRate: 18,
        isRetainer: false,
        workflowStatus: 'issued',
        notes: '',
        lineItems: [
          { serviceName: '', description: '', quantity: '', rate: '', itemType: 'service' },
        ],
      });
    }
  }, [initialAction, open]);

  const { data: clients = [] } = useClients({}, { enabled: open });
  const { data: accounts = [] } = useFinanceAccounts({ enabled: open });
  const { data: unpaidInvoices = [] } = useModuleInvoices({ status: 'unpaid' }, { enabled: open });
  const { data: employees = [] } = usePayrollEmployees({ enabled: open });

  // Mutations
  const createInvoice = useCreateModuleInvoice();
  const recordReceipt = useRecordPaymentReceipt();
  const createExpense = useCreateModuleExpense();
  const createTransfer = useCreateInternalTransfer();
  const createSubscription = useCreateSubscription();
  const createFounder = useCreateFounderTransaction();
  const createClient = useCreateClient();
  const createPayroll = useCreatePayrollRecord();

  const isSubmitting =
    createInvoice.isPending ||
    recordReceipt.isPending ||
    createExpense.isPending ||
    createTransfer.isPending ||
    createSubscription.isPending ||
    createFounder.isPending ||
    createClient.isPending ||
    createPayroll.isPending;

  // Form States
  // 1. Invoice Form
  const [invForm, setInvForm] = useState({
    client: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    servicePeriod: '',
    taxType: 'exclusive',
    taxRate: 18,
    isRetainer: false,
    workflowStatus: 'issued',
    notes: '',
    lineItems: [
      { serviceName: '', description: '', quantity: '', rate: '', itemType: 'service' },
    ],
  });

  // 2. Payment Receipt Form
  const [receiptForm, setReceiptForm] = useState({
    client: '',
    invoice: '',
    amount: '',
    receivedDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank',
    destinationAccount: '',
    reference: '',
    notes: '',
  });

  // 3. Expense Form
  const [expForm, setExpForm] = useState({
    title: '',
    vendor: '',
    amount: '',
    category: 'office',
    costType: 'agency_overhead',
    client: '',
    paymentStatus: 'paid',
    paymentMode: 'Bank',
    fundingAccount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // 4. New Client Form
  const [clientForm, setClientForm] = useState({
    name: '',
    company: '',
    contactName: '',
    email: '',
    phone: '',
    monthlyPlanFee: '',
    servicePlan: '',
    deliverables: '',
    billingDate: '',
    billingCycle: 'monthly',
  });

  // 5. Payroll Form
  const [payrollForm, setPayrollForm] = useState({
    employee: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    baseSalary: '',
    additions: '',
    additionReason: '',
    deductions: '',
    deductionReason: '',
    netSalary: '',
    status: 'pending',
    paymentAccount: '',
    notes: '',
  });

  // 6. Transfer Form
  const [transferForm, setTransferForm] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    bankFee: '',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });

  // 7. Subscription Form
  const [subForm, setSubForm] = useState({
    serviceName: '',
    vendor: '',
    frequency: 'monthly',
    expectedAmount: '',
    nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    paymentAccount: '',
    costClassification: 'software',
    notes: '',
  });

  // 8. Founder Entry Form
  const [founderForm, setFounderForm] = useState({
    founderName: 'Dinesh M',
    transactionType: 'capital_introduced',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    account: '',
    paymentMode: 'Bank Transfer',
    reference: '',
    notes: '',
  });

  // Set default accounts once loaded
  useEffect(() => {
    if (accounts.length > 0) {
      const defaultAcc = accounts[0]._id;
      if (!receiptForm.destinationAccount) setReceiptForm((f) => ({ ...f, destinationAccount: defaultAcc }));
      if (!expForm.fundingAccount) setExpForm((f) => ({ ...f, fundingAccount: defaultAcc }));
      if (!transferForm.fromAccount && accounts.length > 1) {
        setTransferForm((f) => ({ ...f, fromAccount: accounts[0]._id, toAccount: accounts[1]._id }));
      }
      if (!subForm.paymentAccount) setSubForm((f) => ({ ...f, paymentAccount: defaultAcc }));
      if (!founderForm.account) setFounderForm((f) => ({ ...f, account: defaultAcc }));
      if (!payrollForm.paymentAccount) setPayrollForm((f) => ({ ...f, paymentAccount: defaultAcc }));
    }
  }, [accounts]);

  // Invoice Totals Calculation
  const invoiceSubtotal = useMemo(() => {
    return invForm.lineItems.reduce((acc, item) => {
      const hasRate = item.rate !== '' && item.rate != null && !isNaN(Number(item.rate));
      if (!hasRate) return acc;
      const q = (item.quantity !== '' && item.quantity != null && !isNaN(Number(item.quantity)))
        ? Number(item.quantity)
        : 1;
      const r = Number(item.rate || 0);
      return acc + (q * r);
    }, 0);
  }, [invForm.lineItems]);

  const invoiceTaxAmount = useMemo(() => {
    if (invForm.taxType === 'exclusive' && invoiceSubtotal > 0) {
      return Math.round(invoiceSubtotal * (Number(invForm.taxRate || 18) / 100));
    }
    return 0;
  }, [invoiceSubtotal, invForm.taxType, invForm.taxRate]);

  const invoiceTotal = invoiceSubtotal + invoiceTaxAmount;

  // Handlers
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invForm.client) return toast.error('Select a client');

    const validItems = invForm.lineItems
      .filter((item) => (item.serviceName && item.serviceName.trim() !== '') || Number(item.rate || 0) > 0)
      .map((item) => ({
        ...item,
        serviceName: item.serviceName?.trim() || 'Service Item',
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        rate: Number(item.rate || 0),
      }));

    if (validItems.length === 0) {
      return toast.error('Please enter at least one line item with service details');
    }

    try {
      await createInvoice.mutateAsync({
        ...invForm,
        lineItems: validItems,
        taxRate: invForm.taxType === 'exempt' ? 0 : Number(invForm.taxRate || 18),
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptForm.client) return toast.error('Select a client');
    if (!receiptForm.amount || Number(receiptForm.amount) <= 0) return toast.error('Enter valid amount');
    try {
      await recordReceipt.mutateAsync({
        ...receiptForm,
        amount: Number(receiptForm.amount),
        destinationAccount: receiptForm.destinationAccount || undefined,
        invoice: receiptForm.invoice || undefined,
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expForm.title || !expForm.amount) return toast.error('Fill required expense details');
    try {
      await createExpense.mutateAsync({
        ...expForm,
        amount: Number(expForm.amount),
        fundingAccount: expForm.fundingAccount || undefined,
        client: expForm.costType === 'client_project' ? expForm.client : undefined,
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (!clientForm.name) return toast.error('Enter client / business name');
    try {
      await createClient.mutateAsync({
        ...clientForm,
        monthlyPlanFee: Number(clientForm.monthlyPlanFee || 0),
        billingDate: Number(clientForm.billingDate || 1),
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handlePayrollSubmit = async (e) => {
    e.preventDefault();
    if (!payrollForm.employee) return toast.error('Select an employee');
    if (!payrollForm.baseSalary || Number(payrollForm.baseSalary) < 0) return toast.error('Enter valid base salary');
    try {
      await createPayroll.mutateAsync({
        ...payrollForm,
        baseSalary: Number(payrollForm.baseSalary),
        additions: Number(payrollForm.additions || 0),
        deductions: Number(payrollForm.deductions || 0),
        netSalary: Number(payrollForm.netSalary || payrollForm.baseSalary),
        year: Number(payrollForm.year),
        paymentAccount: payrollForm.paymentAccount || undefined,
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.fromAccount || !transferForm.toAccount) return toast.error('Select both accounts');
    if (transferForm.fromAccount === transferForm.toAccount) return toast.error('Source and destination accounts must differ');
    if (!transferForm.amount || Number(transferForm.amount) <= 0) return toast.error('Enter valid transfer amount');
    try {
      await createTransfer.mutateAsync({
        ...transferForm,
        amount: Number(transferForm.amount),
        bankFee: Number(transferForm.bankFee || 0),
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();
    if (!subForm.serviceName || !subForm.expectedAmount) return toast.error('Fill subscription details');
    try {
      await createSubscription.mutateAsync({
        ...subForm,
        expectedAmount: Number(subForm.expectedAmount),
        paymentAccount: subForm.paymentAccount || undefined,
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const handleFounderSubmit = async (e) => {
    e.preventDefault();
    if (!founderForm.amount || Number(founderForm.amount) <= 0) return toast.error('Enter valid amount');
    try {
      await createFounder.mutateAsync({
        ...founderForm,
        amount: Number(founderForm.amount),
        account: founderForm.account || undefined,
      });
      onOpenChange(false);
    } catch (err) {}
  };

  const actionTabs = [
    { id: 'invoice', label: 'Income / Invoice', icon: FileText },
    { id: 'receipt', label: 'Client Payment', icon: Receipt },
    { id: 'expense', label: 'Expense / Bill', icon: CreditCard },
    { id: 'client', label: 'New Client', icon: UserPlus },
    { id: 'payroll', label: 'Payroll Entry', icon: Banknote },
    { id: 'transfer', label: 'Internal Transfer', icon: ArrowRightLeft },
    { id: 'subscription', label: 'Subscription', icon: CalendarCheck },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="side"
        size="xl"
        noPadding={true}
        className="bg-card border-l border-border shadow-2xl overflow-hidden flex flex-col font-sans"
      >
        {/* ── DRAWER HEADER (PINNED) ───────────────────────────────────── */}
        <div className="shrink-0 border-b border-border px-6 pt-5 pb-4 bg-muted/20 pr-24 sm:pr-28 select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold text-base shadow-2xs shrink-0">
              +
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                Add New Financial Transaction
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Record operational entries with double-entry reconciliation into RiseWithMedia Finance.
              </DialogDescription>
            </div>
          </div>

          {/* Action Tabs Grid (4 columns on desktop, 2 on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {actionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeAction === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveAction(tab.id)}
                  className={`flex items-center justify-center gap-2 h-9 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold scale-[1.01]'
                      : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SCROLLABLE FORM BODY ─────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar overscroll-contain">
          {/* 1. INVOICE FORM */}
          {activeAction === 'invoice' && (
            <form id="finance-modal-form" onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Client *</label>
                  <select
                    value={invForm.client}
                    onChange={(e) => setInvForm({ ...invForm, client: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.company || c.name} {c.monthlyPlanFee ? `(₹${c.monthlyPlanFee}/mo)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Service Period (e.g. October 2026)</label>
                  <input
                    type="text"
                    value={invForm.servicePeriod}
                    onChange={(e) => setInvForm({ ...invForm, servicePeriod: e.target.value })}
                    placeholder="e.g. October 2026"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice Date</label>
                  <input
                    type="date"
                    value={invForm.invoiceDate}
                    onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={invForm.dueDate}
                    onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tax Treatment</label>
                  <select
                    value={invForm.taxType}
                    onChange={(e) => setInvForm({ ...invForm, taxType: e.target.value, taxRate: e.target.value === 'exempt' ? 0 : 18 })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="exclusive">GST 18% Exclusive</option>
                    <option value="exempt">Tax Exempt (0%)</option>
                  </select>
                </div>
              </div>

              {/* Line Items Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Deliverable Line Items</span>
                    <p className="text-[11px] text-slate-400">Add deliverables or services with customized rates</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setInvForm({
                        ...invForm,
                        lineItems: [
                          ...invForm.lineItems,
                          { serviceName: '', description: '', quantity: '', rate: '', itemType: 'service' },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition-colors border border-indigo-200/60 shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line Item
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  <div className="col-span-4">Service / Deliverable</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Rate (₹)</div>
                  <div className="col-span-1 text-center">Delete</div>
                </div>

                {/* Item Rows */}
                {invForm.lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Service name / Deliverable"
                        value={item.serviceName || ''}
                        onChange={(e) => {
                          const copy = [...invForm.lineItems];
                          copy[idx].serviceName = e.target.value;
                          setInvForm({ ...invForm, lineItems: copy });
                        }}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description || ''}
                        onChange={(e) => {
                          const copy = [...invForm.lineItems];
                          copy[idx].description = e.target.value;
                          setInvForm({ ...invForm, lineItems: copy });
                        }}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.itemType || 'service'}
                        onChange={(e) => {
                          const copy = [...invForm.lineItems];
                          copy[idx].itemType = e.target.value;
                          setInvForm({ ...invForm, lineItems: copy });
                        }}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="service">Service Fee</option>
                        <option value="ad_budget_pass_through">Ad Budget (Pass)</option>
                        <option value="management_fee">Mgmt Fee</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={item.quantity === '' || item.quantity == null ? '' : item.quantity}
                        onChange={(e) => {
                          const copy = [...invForm.lineItems];
                          copy[idx].quantity = e.target.value;
                          setInvForm({ ...invForm, lineItems: copy });
                        }}
                        className="h-8.5 w-full text-center rounded-lg border border-slate-200 bg-white px-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={item.rate === '' || item.rate == null ? '' : item.rate}
                        onChange={(e) => {
                          const copy = [...invForm.lineItems];
                          copy[idx].rate = e.target.value;
                          setInvForm({ ...invForm, lineItems: copy });
                        }}
                        className="h-8.5 w-full text-right rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (invForm.lineItems.length > 1) {
                            setInvForm({
                              ...invForm,
                              lineItems: invForm.lineItems.filter((_, i) => i !== idx),
                            });
                          } else {
                            setInvForm({
                              ...invForm,
                              lineItems: [
                                { serviceName: '', description: '', quantity: '', rate: '', itemType: 'service' },
                              ],
                            });
                          }
                        }}
                        className="h-8.5 w-8.5 inline-flex items-center justify-center rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title={invForm.lineItems.length > 1 ? 'Delete line item' : 'Clear item fields'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Item Bottom Row */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setInvForm({
                        ...invForm,
                        lineItems: [
                          ...invForm.lineItems,
                          { serviceName: '', description: '', quantity: '', rate: '', itemType: 'service' },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/80 border border-dashed border-indigo-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line Item
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {invForm.lineItems.length} {invForm.lineItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Subtotal & Totals Strip */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-medium px-1">
                  <span>Subtotal: <strong className="text-slate-900">{formatINR(invoiceSubtotal)}</strong></span>
                  <span>Tax ({invForm.taxType === 'exclusive' ? `${invForm.taxRate}% GST` : 'Exempt'}): <strong className="text-slate-900">{formatINR(invoiceTaxAmount)}</strong></span>
                  <span className="text-sm font-extrabold text-indigo-700">Total: {formatINR(invoiceTotal)}</span>
                </div>
              </div>
            </form>
          )}

          {/* 2. PAYMENT RECEIPT FORM */}
          {activeAction === 'receipt' && (
            <form id="finance-modal-form" onSubmit={handleReceiptSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client *</label>
                  <select
                    value={receiptForm.client}
                    onChange={(e) => setReceiptForm({ ...receiptForm, client: e.target.value })}
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>{c.company || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Allocate to Invoice (Optional)</label>
                  <select
                    value={receiptForm.invoice}
                    onChange={(e) => setReceiptForm({ ...receiptForm, invoice: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Unallocated / Advance Credit --</option>
                    {unpaidInvoices
                      .filter((inv) => !receiptForm.client || (inv.client?._id || inv.client) === receiptForm.client)
                      .map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          #{inv.invoiceNumber} — Balance Due: ₹{inv.outstandingBalance || inv.balanceDue || inv.total}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount Received (₹) *</label>
                  <input
                    type="number"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    placeholder="e.g. 25000"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-emerald-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Mode</label>
                  <select
                    value={receiptForm.paymentMode}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="Bank">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                    <option value="Cash">Cash Vault</option>
                  </select>
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination Account (Optional)</label>
                    <select
                      value={receiptForm.destinationAccount}
                      onChange={(e) => setReceiptForm({ ...receiptForm, destinationAccount: e.target.value })}
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      <option value="">-- No Specific Account --</option>
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.accountName} (₹{a.currentBalance})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reference / UTR Number</label>
                  <input
                    type="text"
                    value={receiptForm.reference}
                    onChange={(e) => setReceiptForm({ ...receiptForm, reference: e.target.value })}
                    placeholder="e.g. UTR102938475"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date Received</label>
                  <input
                    type="date"
                    value={receiptForm.receivedDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, receivedDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 3. EXPENSE / BILL FORM */}
          {activeAction === 'expense' && (
            <form id="finance-modal-form" onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expense Title / Item *</label>
                  <input
                    type="text"
                    value={expForm.title}
                    onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                    placeholder="e.g. Freelance Videographer Shoot"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor / Payee</label>
                  <input
                    type="text"
                    value={expForm.vendor}
                    onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })}
                    placeholder="e.g. Ramesh Media Works"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    value={expForm.amount}
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                    placeholder="e.g. 4500"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-rose-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={expForm.category}
                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="production_shoot">Production / Video Shoot</option>
                    <option value="travel">Client / Shoot Travel</option>
                    <option value="freelancers">Freelancers</option>
                    <option value="software_subscriptions">Software & Subscriptions</option>
                    <option value="rent">Office Rent</option>
                    <option value="internet">Internet & Utilities</option>
                    <option value="marketing">Agency Marketing</option>
                    <option value="office">Office Expenses</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cost Classification</label>
                  <select
                    value={expForm.costType}
                    onChange={(e) => setExpForm({ ...expForm, costType: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="agency_overhead">Agency Overhead</option>
                    <option value="client_project">Direct Client Project Cost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Status</label>
                  <select
                    value={expForm.paymentStatus}
                    onChange={(e) => setExpForm({ ...expForm, paymentStatus: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="paid">Paid Now (Cash Outflow)</option>
                    <option value="unpaid">Unpaid Vendor Bill (Payable)</option>
                  </select>
                </div>
                {expForm.paymentStatus === 'paid' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Mode</label>
                    <select
                      value={expForm.paymentMode}
                      onChange={(e) => setExpForm({ ...expForm, paymentMode: e.target.value })}
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      <option value="Bank">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Corporate / Credit Card</option>
                    </select>
                  </div>
                )}
                {expForm.paymentStatus === 'paid' && accounts.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Funding Account (Optional)</label>
                    <select
                      value={expForm.fundingAccount}
                      onChange={(e) => setExpForm({ ...expForm, fundingAccount: e.target.value })}
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      <option value="">-- No Specific Account --</option>
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.accountName} (₹{a.currentBalance})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expense Date</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 4. NEW CLIENT FORM */}
          {activeAction === 'client' && (
            <form id="finance-modal-form" onSubmit={handleClientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client / Business Name *</label>
                  <input
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    placeholder="e.g. Apex Dental Clinic"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Contact Name</label>
                  <input
                    type="text"
                    value={clientForm.contactName}
                    onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="client@company.com"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Plan Fee (₹)</label>
                  <input
                    type="number"
                    value={clientForm.monthlyPlanFee}
                    onChange={(e) => setClientForm({ ...clientForm, monthlyPlanFee: e.target.value })}
                    placeholder="e.g. 35000"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deliverables Package</label>
                  <input
                    type="text"
                    value={clientForm.deliverables}
                    onChange={(e) => setClientForm({ ...clientForm, deliverables: e.target.value })}
                    placeholder="e.g. 8 reels + 6 posts"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Billing Date (Day of Month)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={clientForm.billingDate}
                    onChange={(e) => setClientForm({ ...clientForm, billingDate: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 5. PAYROLL FORM */}
          {activeAction === 'payroll' && (
            <form id="finance-modal-form" onSubmit={handlePayrollSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Employee *</label>
                  <select
                    value={payrollForm.employee}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((x) => x._id === empId);
                      const base = emp?.salary ? Number(emp.salary) : 30000;
                      setPayrollForm({
                        ...payrollForm,
                        employee: empId,
                        baseSalary: String(base),
                        netSalary: String(base + Number(payrollForm.additions || 0) - Number(payrollForm.deductions || 0)),
                      });
                    }}
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.department || emp.role || 'Staff'}) {emp.salary ? `— Base: ₹${emp.salary}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Month Period</label>
                  <select
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                      <option key={m} value={m}>{m} {payrollForm.year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    value={payrollForm.baseSalary}
                    onChange={(e) => {
                      const base = Number(e.target.value || 0);
                      const net = Math.max(0, base + Number(payrollForm.additions || 0) - Number(payrollForm.deductions || 0));
                      setPayrollForm({ ...payrollForm, baseSalary: e.target.value, netSalary: String(net) });
                    }}
                    placeholder="e.g. 30000"
                    required
                    min="0"
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Additions / OTS (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.additions}
                    onChange={(e) => {
                      const add = Number(e.target.value || 0);
                      const net = Math.max(0, Number(payrollForm.baseSalary || 0) + add - Number(payrollForm.deductions || 0));
                      setPayrollForm({ ...payrollForm, additions: e.target.value, netSalary: String(net) });
                    }}
                    placeholder="0"
                    min="0"
                    className="h-9.5 w-full rounded-xl border border-emerald-200 text-emerald-700 font-semibold px-3 text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deductions (₹)</label>
                  <input
                    type="number"
                    value={payrollForm.deductions}
                    onChange={(e) => {
                      const ded = Number(e.target.value || 0);
                      const net = Math.max(0, Number(payrollForm.baseSalary || 0) + Number(payrollForm.additions || 0) - ded);
                      setPayrollForm({ ...payrollForm, deductions: e.target.value, netSalary: String(net) });
                    }}
                    placeholder="0"
                    min="0"
                    className="h-9.5 w-full rounded-xl border border-rose-200 text-rose-700 font-semibold px-3 text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between text-indigo-950">
                <div>
                  <div className="font-bold">Calculated Net Payable:</div>
                  <div className="text-[11px] text-indigo-700">Base + Additions − Deductions</div>
                </div>
                <div className="text-xl font-extrabold text-indigo-700">
                  {formatINR(Number(payrollForm.netSalary || payrollForm.baseSalary || 0))}
                </div>
              </div>
            </form>
          )}

          {/* 6. FOUNDER ENTRY FORM */}
          {activeAction === 'founder' && (
            <form id="finance-modal-form" onSubmit={handleFounderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Founder *</label>
                  <select
                    value={founderForm.founderName}
                    onChange={(e) => setFounderForm({ ...founderForm, founderName: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="Dinesh M">Dinesh M (Founder / CEO)</option>
                    <option value="Sathish Kumar">Sathish Kumar (Founder / Partner)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transaction Type *</label>
                  <select
                    value={founderForm.transactionType}
                    onChange={(e) => setFounderForm({ ...founderForm, transactionType: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="capital_introduced">Capital Introduced (Equity Inflow)</option>
                    <option value="drawings">Drawings (Equity Outflow)</option>
                    <option value="loan_to_company">Founder Loan to Company (Liability)</option>
                    <option value="loan_repayment">Founder Loan Repayment</option>
                    <option value="profit_allocation">Profit Allocation (Paper Entry)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    value={founderForm.amount}
                    onChange={(e) => setFounderForm({ ...founderForm, amount: e.target.value })}
                    placeholder="e.g. 100000"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 shadow-2xs"
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bank / Cash Account</label>
                    <select
                      value={founderForm.account}
                      onChange={(e) => setFounderForm({ ...founderForm, account: e.target.value })}
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      <option value="">-- No Specific Account --</option>
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.accountName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={founderForm.date}
                    onChange={(e) => setFounderForm({ ...founderForm, date: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 text-indigo-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Founder movements are equity/liability records and strictly isolated from agency operational revenue.</span>
              </div>
            </form>
          )}

          {/* 7. INTERNAL TRANSFER FORM */}
          {activeAction === 'transfer' && (
            <form id="finance-modal-form" onSubmit={handleTransferSubmit} className="space-y-4">
              {accounts.length < 2 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>No company bank accounts configured yet. Once bank accounts are added, you can record internal transfers between accounts here.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">From Account (Source Outflow) *</label>
                    <select
                      value={transferForm.fromAccount}
                      onChange={(e) => setTransferForm({ ...transferForm, fromAccount: e.target.value })}
                      required
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.accountName} (₹{a.currentBalance})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">To Account (Destination Inflow) *</label>
                    <select
                      value={transferForm.toAccount}
                      onChange={(e) => setTransferForm({ ...transferForm, toAccount: e.target.value })}
                      required
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                    >
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>{a.accountName} (₹{a.currentBalance})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transfer Amount (₹) *</label>
                  <input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bank Fee / Charges (₹)</label>
                  <input
                    type="number"
                    value={transferForm.bankFee}
                    onChange={(e) => setTransferForm({ ...transferForm, bankFee: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 8. SUBSCRIPTION FORM */}
          {activeAction === 'subscription' && (
            <form id="finance-modal-form" onSubmit={handleSubscriptionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Service / Tool Name *</label>
                  <input
                    type="text"
                    value={subForm.serviceName}
                    onChange={(e) => setSubForm({ ...subForm, serviceName: e.target.value })}
                    placeholder="e.g. Figma / Adobe Suite"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor</label>
                  <input
                    type="text"
                    value={subForm.vendor}
                    onChange={(e) => setSubForm({ ...subForm, vendor: e.target.value })}
                    placeholder="e.g. Adobe Inc."
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected Amount (₹) *</label>
                  <input
                    type="number"
                    value={subForm.expectedAmount}
                    onChange={(e) => setSubForm({ ...subForm, expectedAmount: e.target.value })}
                    placeholder="e.g. 2400"
                    required
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Frequency</label>
                  <select
                    value={subForm.frequency}
                    onChange={(e) => setSubForm({ ...subForm, frequency: e.target.value })}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Renewal Date</label>
                  <input
                    type="date"
                    value={subForm.nextRenewalDate}
                    onChange={(e) => setSubForm({ ...subForm, nextRenewalDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── MODAL FOOTER ─────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 pt-4 pb-7 sm:pb-8 flex items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse" />
            <span className="truncate">Double-Entry Verified · Asia/Kolkata</span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9.5 px-4.5 rounded-xl border border-border bg-background hover:bg-muted/70 text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="finance-modal-form"
              disabled={isSubmitting}
              className="h-9.5 px-5.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {activeAction === 'invoice' && 'Issue Invoice & Post Receivable'}
                    {activeAction === 'receipt' && 'Record Payment Receipt'}
                    {activeAction === 'expense' && 'Record Expense Entry'}
                    {activeAction === 'client' && 'Create Client & Retainer'}
                    {activeAction === 'payroll' && 'Post Payroll Entry'}
                    {activeAction === 'founder' && 'Record Capital Entry'}
                    {activeAction === 'transfer' && 'Execute Internal Transfer'}
                    {activeAction === 'subscription' && 'Save Subscription'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
