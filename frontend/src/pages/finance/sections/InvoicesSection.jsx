import { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  Plus,
  Search,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  XCircle,
  Eye,
  Calendar,
  ArrowUpDown,
  X,
  Edit2,
  Trash2,
} from '@/components/ui/muiIcons';
import {
  useModuleInvoices,
  useUpdateInvoiceWorkflow,
  useUpdateModuleInvoice,
  useDeleteModuleInvoice,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { useDateFilter } from '../../../context/DateFilterContext';
import { SelectDropdown } from '../../../components/ui/SelectDropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '../../../components/ui/button';

export default function InvoicesSection({ onQuickAdd, onRecordPayment }) {
  const { startDate: fromDate, endDate: toDate, isDateInRange } = useDateFilter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    dueDate: '',
    status: 'unpaid',
    notes: '',
    terms: '',
  });

  const { data: invoices = [], isLoading } = useModuleInvoices({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    client: clientFilter !== 'all' ? clientFilter : undefined,
    startDate: fromDate || undefined,
    endDate: toDate || undefined,
    sortOrder: dateSort,
  });

  const { data: clients = [] } = useClients();
  const updateWorkflow = useUpdateInvoiceWorkflow();
  const updateInvoice = useUpdateModuleInvoice();
  const deleteInvoice = useDeleteModuleInvoice();

  const handleStartEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      status: inv.status || 'unpaid',
      notes: inv.notes || '',
      terms: inv.terms || '',
    });
  };

  const handleSaveEditInvoice = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      await updateInvoice.mutateAsync({
        id: editingInvoice._id,
        data: invoiceForm,
      });
      setEditingInvoice(null);
    } catch (_) {}
  };

  const handleDeleteInvoice = async (inv) => {
    if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}?`)) {
      try {
        await deleteInvoice.mutateAsync(inv._id);
      } catch (_) {}
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const invDate = i.invoiceDate || i.issueDate || i.createdAt;
      if (!isDateInRange(invDate)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const invNum = (i.invoiceNumber || '').toLowerCase();
      const clientName = (i.client?.company || i.client?.name || i.clientDetails?.businessName || '').toLowerCase();
      return invNum.includes(q) || clientName.includes(q);
    });
  }, [invoices, isDateInRange, search]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const timeA = new Date(a.invoiceDate || a.issueDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.invoiceDate || b.issueDate || b.createdAt || 0).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredInvoices, dateSort]);

  const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + Number(i.total || i.totalAmount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + Number(i.balanceAmount || 0), 0);
  const overdueCount = filteredInvoices.filter((i) => i.isOverdue).length;

  const handleExport = () => {
    const rows = filteredInvoices.map((i) => ({
      number: i.invoiceNumber,
      client: i.client?.company || i.client?.name || i.clientDetails?.businessName || 'Client',
      date: formatDateIST(i.invoiceDate || i.issueDate),
      dueDate: formatDateIST(i.dueDate),
      servicePeriod: i.servicePeriod || '',
      serviceRevenue: i.serviceRevenue || i.subtotal,
      adBudget: i.passThroughAdBudget || 0,
      tax: i.taxAmount || 0,
      total: i.total || i.totalAmount,
      balance: i.balanceAmount,
      status: i.displayStatus || i.status,
    }));
    exportToCSV('invoices_and_receivables', rows, [
      { key: 'number', label: 'Invoice Number' },
      { key: 'client', label: 'Client' },
      { key: 'date', label: 'Invoice Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'servicePeriod', label: 'Service Period' },
      { key: 'serviceRevenue', label: 'Service Revenue (INR)' },
      { key: 'adBudget', label: 'Pass-Through Ad Budget (INR)' },
      { key: 'tax', label: 'GST Tax (INR)' },
      { key: 'total', label: 'Total Payable (INR)' },
      { key: 'balance', label: 'Outstanding Balance (INR)' },
      { key: 'status', label: 'Collection Status' },
    ]);
  };

  const handlePrint = (inv) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Total Invoiced</span>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalInvoiced)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Total billed including service & taxes</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Outstanding Receivables</span>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalOutstanding)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Pending collection against issued invoices</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Overdue Invoices</span>
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{overdueCount} Invoices Overdue</div>
          <div className="text-[11px] text-muted-foreground mt-1">Follow-ups required immediately</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring bg-background"
            />
          </div>

          <SelectDropdown
            value={statusFilter || 'all'}
            onChange={(val) => setStatusFilter(val || 'all')}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'draft', label: 'Drafts' },
              { value: 'unpaid', label: 'Unpaid / Issued' },
              { value: 'partially_paid', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'void', label: 'Voided' },
            ]}
            placeholder="All Statuses"
            allowCustom={false}
            className="w-full sm:w-40"
            buttonClassName="h-8 rounded-lg px-3 text-xs bg-background text-foreground font-medium border border-border/50"
          />

          <SelectDropdown
            value={clientFilter || 'all'}
            onChange={(val) => setClientFilter(val || 'all')}
            options={[
              { value: 'all', label: 'All Clients' },
              ...clients.map((c) => ({
                value: c._id,
                label: c.company || c.name,
              })),
            ]}
            placeholder="All Clients"
            allowCustom={false}
            className="w-full sm:w-48"
            buttonClassName="h-8 rounded-lg px-3 text-xs bg-background text-foreground font-medium border border-border/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-foreground font-semibold hover:bg-secondary flex-1 sm:flex-initial min-h-[36px] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onQuickAdd('invoice')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex-1 sm:flex-initial min-h-[36px] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices Master Table */}
      <div className="bg-card rounded-xl overflow-hidden flex flex-col">
        <div className="responsive-table-container overflow-y-auto max-h-[600px] text-xs">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-secondary sticky top-0 z-10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] ">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Client</th>
                <th className="p-3">Period</th>
                <th
                  onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="p-3 cursor-pointer select-none hover:bg-muted transition-colors"
                  title="Click to toggle date sort (Newest / Oldest)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                  </div>
                </th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Total Payable</th>
                <th className="p-3 text-right">Balance Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05]">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-3 font-bold text-foreground tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      {inv.client?.company || inv.client?.name || inv.clientDetails?.businessName || 'Client'}
                    </td>
                    <td className="p-3 text-muted-foreground">{inv.servicePeriod || '-'}</td>
                    <td className="p-3 text-muted-foreground tabular-nums whitespace-nowrap">{formatDateIST(inv.invoiceDate || inv.issueDate)}</td>
                    <td className="p-3 tabular-nums whitespace-nowrap">
                      <span className={inv.isOverdue ? 'font-bold text-foreground underline underline-offset-2' : 'text-muted-foreground'}>
                        {formatDateIST(inv.dueDate)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-foreground tabular-nums whitespace-nowrap">{formatINR(inv.total || inv.totalAmount)}</td>
                    <td className="p-3 text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                      {inv.balanceAmount > 0 ? formatINR(inv.balanceAmount) : <span className="text-muted-foreground font-medium">₹0.00</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.displayStatus === 'paid'
                            ? 'bg-primary text-primary-foreground'
                            : inv.displayStatus === 'overdue'
                            ? 'bg-secondary text-foreground font-bold'
                            : inv.displayStatus === 'partially_paid'
                            ? 'bg-secondary text-foreground '
                            : inv.displayStatus === 'draft'
                            ? 'bg-muted text-muted-foreground '
                            : 'bg-secondary text-muted-foreground '
                        }`}
                      >
                        {inv.displayStatus || inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-foreground hover:underline font-medium text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 shrink-0" /> View
                        </button>
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => updateWorkflow.mutate({ id: inv._id, workflowStatus: 'issued' })}
                            className="text-foreground hover:underline font-semibold text-xs cursor-pointer"
                          >
                            Issue
                          </button>
                        )}
                        {inv.balanceAmount > 0 && inv.status !== 'draft' && inv.status !== 'void' && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="px-2 py-0.5 rounded bg-secondary text-foreground hover:bg-muted font-semibold text-[11px] cursor-pointer"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEditInvoice(inv)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          disabled={deleteInvoice.isPending}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title="Delete Invoice"
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

      {/* DETAILED PRINTABLE / DOWNLOADABLE INVOICE VIEW MODAL */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        {selectedInvoice && (
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
            <div className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate tabular-nums">
                      {selectedInvoice.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Tax Invoice • Rise With Media Agency OS
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                {/* Status & Due Date row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl ">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedInvoice.status === 'paid'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground '
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    Due Date: <strong className="text-foreground">{formatDateIST(selectedInvoice.dueDate)}</strong>
                  </div>
                </div>

                {/* Billed to */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl ">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Billed To</span>
                    <div className="font-bold text-foreground text-sm mt-0.5">
                      {selectedInvoice.client?.company || selectedInvoice.client?.name || selectedInvoice.clientDetails?.businessName}
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">{selectedInvoice.client?.email || selectedInvoice.clientDetails?.email}</div>
                    <div className="text-muted-foreground text-xs tabular-nums">{selectedInvoice.client?.phone || selectedInvoice.clientDetails?.phone}</div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Service Period</span>
                    <div className="font-semibold text-foreground text-sm mt-0.5">{selectedInvoice.servicePeriod || 'General'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Tax: {selectedInvoice.taxType === 'exempt' ? 'Exempt' : 'GST 18% Exclusive'}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="responsive-table-container rounded-xl ">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-secondary text-muted-foreground uppercase text-[10px] font-semibold ">
                      <tr>
                        <th className="p-3">Item & Description</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.05]">
                      {(selectedInvoice.lineItems || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{item.serviceName}</div>
                            <div className="text-muted-foreground text-[11px]">{item.description}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] capitalize text-muted-foreground">
                              {item.itemType?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-center tabular-nums">{item.quantity}</td>
                          <td className="p-3 text-right font-medium tabular-nums">{formatINR(item.rate)}</td>
                          <td className="p-3 text-right font-semibold text-foreground tabular-nums">{formatINR(item.total || item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Totals */}
                <div className="rounded-xl p-4 space-y-2 text-xs text-muted-foreground bg-muted/20 tabular-nums">
                  <div className="flex justify-between">
                    <span>Agency Service Subtotal:</span>
                    <span className="font-semibold text-foreground">{formatINR(selectedInvoice.serviceRevenue ?? selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.passThroughAdBudget > 0 && (
                    <div className="flex justify-between text-foreground font-medium">
                      <span>Client Pass-Through Ad Budget:</span>
                      <span className="font-semibold">{formatINR(selectedInvoice.passThroughAdBudget)}</span>
                    </div>
                  )}
                  {selectedInvoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Applicable GST Tax:</span>
                      <span className="font-semibold text-foreground">{formatINR(selectedInvoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-foreground pt-2">
                    <span>Total Payable:</span>
                    <span>{formatINR(selectedInvoice.total || selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground font-semibold">
                    <span>Amount Paid:</span>
                    <span>-{formatINR(selectedInvoice.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground pt-1.5">
                    <span>Balance Outstanding:</span>
                    <span>{formatINR(selectedInvoice.balanceAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <button
                  type="button"
                  onClick={() => updateWorkflow.mutate({ id: selectedInvoice._id, workflowStatus: 'void', voidReason: 'Cancelled by user' })}
                  className="text-foreground hover:underline font-semibold cursor-pointer text-xs"
                >
                  Void Invoice
                </button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedInvoice(null)}
                    className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handlePrint(selectedInvoice)}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4 shrink-0" /> Print / Save PDF
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* EDIT INVOICE MODAL */}
      <Dialog open={Boolean(editingInvoice)} onOpenChange={(open) => !open && setEditingInvoice(null)}>
        {editingInvoice && (
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
            <form onSubmit={handleSaveEditInvoice} className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      Edit Invoice {editingInvoice.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Edit invoice
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Linear Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Status *</label>
                  <SelectDropdown
                    value={invoiceForm.status || 'unpaid'}
                    onChange={(val) => setInvoiceForm({ ...invoiceForm, status: val || 'unpaid' })}
                    options={[
                      { value: 'unpaid', label: 'Unpaid' },
                      { value: 'partially_paid', label: 'Partially Paid' },
                      { value: 'paid', label: 'Paid' },
                      { value: 'overdue', label: 'Overdue' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'void', label: 'Void' },
                    ]}
                    placeholder="Payment Status"
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-full"
                    buttonClassName="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground border border-border/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Terms</label>
                  <input
                    type="text"
                    value={invoiceForm.terms}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
                    placeholder="e.g. Net 15 Days"
                    className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes / Terms Remark</label>
                  <textarea
                    rows={3}
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    placeholder="Optional internal remarks..."
                    className="w-full rounded-xl bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingInvoice(null)}
                    className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateInvoice.isPending}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all w-full sm:w-auto"
                  >
                    {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
