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
} from 'lucide-react';
import {
  useModuleInvoices,
  useUpdateInvoiceWorkflow,
  useUpdateModuleInvoice,
  useDeleteModuleInvoice,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function InvoicesSection({ onQuickAdd, onRecordPayment }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
      if (fromDate && invDate) {
        const d = new Date(invDate).toISOString().slice(0, 10);
        if (d < fromDate) return false;
      }
      if (toDate && invDate) {
        const d = new Date(invDate).toISOString().slice(0, 10);
        if (d > toDate) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const invNum = (i.invoiceNumber || '').toLowerCase();
      const clientName = (i.client?.company || i.client?.name || i.clientDetails?.businessName || '').toLowerCase();
      return invNum.includes(q) || clientName.includes(q);
    });
  }, [invoices, fromDate, toDate, search]);

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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL INVOICED</span>
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalInvoiced)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total billed including service & taxes</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>OUTSTANDING RECEIVABLES</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatINR(totalOutstanding)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending collection against issued invoices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>OVERDUE INVOICES</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{overdueCount} Invoices Overdue</div>
          <div className="text-[11px] text-slate-500 mt-1">Follow-ups required immediately</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="unpaid">Unpaid / Issued</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="void">Voided</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.company || c.name}
              </option>
            ))}
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
            onClick={() => onQuickAdd('invoice')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            + Create New Invoice
          </button>
        </div>
      </div>

      {/* Invoices Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] shadow-2xs">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Client</th>
                <th className="p-3">Period</th>
                <th
                  onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Click to toggle date sort (Newest / Oldest)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    <span className="text-indigo-600 font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                  </div>
                </th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Total Payable</th>
                <th className="p-3">Balance Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {inv.client?.company || inv.client?.name || inv.clientDetails?.businessName || 'Client'}
                    </td>
                    <td className="p-3 text-slate-600">{inv.servicePeriod || '-'}</td>
                    <td className="p-3 text-slate-600">{formatDateIST(inv.invoiceDate || inv.issueDate)}</td>
                    <td className="p-3">
                      <span className={inv.isOverdue ? 'font-bold text-rose-600' : 'text-slate-600'}>
                        {formatDateIST(inv.dueDate)}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{formatINR(inv.total || inv.totalAmount)}</td>
                    <td className="p-3 font-bold text-amber-600">
                      {inv.balanceAmount > 0 ? formatINR(inv.balanceAmount) : <span className="text-emerald-600">₹0.00</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.displayStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : inv.displayStatus === 'overdue'
                            ? 'bg-rose-100 text-rose-700'
                            : inv.displayStatus === 'partially_paid'
                            ? 'bg-amber-100 text-amber-700'
                            : inv.displayStatus === 'draft'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {inv.displayStatus || inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => updateWorkflow.mutate({ id: inv._id, workflowStatus: 'issued' })}
                            className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs"
                          >
                            Issue
                          </button>
                        )}
                        {inv.balanceAmount > 0 && inv.status !== 'draft' && inv.status !== 'void' && (
                          <button
                            onClick={() => onRecordPayment(inv)}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px]"
                          >
                            + Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEditInvoice(inv)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          disabled={deleteInvoice.isPending}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          <DialogContent variant="center" size="xl" className="rounded-2xl border-border bg-card p-6 shadow-2xl text-xs max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-border pb-4 mb-4 pr-10">
              <div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase text-[11px]">Tax Invoice</span>
                <DialogTitle className="text-xl font-bold text-foreground mt-0.5">{selectedInvoice.invoiceNumber}</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">Rise With Media Agency OS</DialogDescription>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {selectedInvoice.status}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1.5">
                  Due: <strong className="text-foreground">{formatDateIST(selectedInvoice.dueDate)}</strong>
                </div>
              </div>
            </div>

            {/* Billed to */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-muted/30 rounded-xl mb-4 border border-border">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Billed To</span>
                <div className="font-bold text-foreground text-sm mt-0.5">
                  {selectedInvoice.client?.company || selectedInvoice.client?.name || selectedInvoice.clientDetails?.businessName}
                </div>
                <div className="text-muted-foreground mt-0.5">{selectedInvoice.client?.email || selectedInvoice.clientDetails?.email}</div>
                <div className="text-muted-foreground">{selectedInvoice.client?.phone || selectedInvoice.clientDetails?.phone}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Service Period</span>
                <div className="font-semibold text-foreground mt-0.5">{selectedInvoice.servicePeriod || 'General'}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Tax: {selectedInvoice.taxType === 'exempt' ? 'Exempt' : 'GST 18% Exclusive'}</div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border border-border overflow-hidden mb-4">
              <table className="w-full text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Item & Description</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(selectedInvoice.lineItems || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <div className="font-semibold text-foreground">{item.serviceName}</div>
                        <div className="text-muted-foreground text-[11px]">{item.description}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] capitalize text-muted-foreground">
                          {item.itemType?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right font-medium">{formatINR(item.rate)}</td>
                      <td className="p-2.5 text-right font-semibold text-foreground">{formatINR(item.total || item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="border-t border-border pt-3 space-y-1.5 text-xs text-foreground/80">
              <div className="flex justify-between">
                <span>Agency Service Subtotal:</span>
                <span className="font-semibold text-foreground">{formatINR(selectedInvoice.serviceRevenue ?? selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.passThroughAdBudget > 0 && (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
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
              <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2">
                <span>Total Payable:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{formatINR(selectedInvoice.total || selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Amount Paid:</span>
                <span>-{formatINR(selectedInvoice.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-amber-600 border-t border-dashed border-border pt-1.5">
                <span>Balance Outstanding:</span>
                <span>{formatINR(selectedInvoice.balanceAmount || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
              <button
                onClick={() => updateWorkflow.mutate({ id: selectedInvoice._id, workflowStatus: 'void', voidReason: 'Cancelled by user' })}
                className="text-rose-600 hover:underline font-semibold cursor-pointer text-xs"
              >
                Void Invoice
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="h-9.5 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="h-9.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* EDIT INVOICE MODAL */}
      <Dialog open={Boolean(editingInvoice)} onOpenChange={(open) => !open && setEditingInvoice(null)}>
        {editingInvoice && (
          <DialogContent variant="center" size="md" className="rounded-2xl p-6 text-xs max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Edit Invoice</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update parameters for invoice {editingInvoice.invoiceNumber}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditInvoice} className="space-y-3.5 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Status</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="draft">Draft</option>
                    <option value="void">Void</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={invoiceForm.terms}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
                  placeholder="e.g. Net 15 Days"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes / Terms Remark</label>
                <textarea
                  rows="2"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="Optional internal remarks..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateInvoice.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
