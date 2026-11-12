import { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  Plus,
  Receipt,
  Search,
  CheckCircle,
  Clock,
  ArrowDownRight,
  CreditCard,
  Building,
  Calendar,
  ArrowUpDown,
  X,
  Edit2,
  Trash2,
} from '@/components/ui/muiIcons';
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
  usePaymentReceipts,
  useModuleInvoices,
  useUpdatePaymentReceipt,
  useDeletePaymentReceipt,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { useDateFilter } from '../../../context/DateFilterContext';

export default function IncomeSection({ onQuickAdd }) {
  const { startDate: fromDate, endDate: toDate, isDateInRange } = useDateFilter();
  const [clientFilter, setClientFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)

  // Edit Receipt State
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [receiptForm, setReceiptForm] = useState({
    receivedDate: '',
    paymentMode: 'Bank',
    reference: '',
    notes: '',
  });

  const { data: receipts = [], isLoading } = usePaymentReceipts({
    client: clientFilter !== 'all' ? clientFilter : undefined,
    startDate: fromDate || undefined,
    endDate: toDate || undefined,
    sortOrder: dateSort,
  });

  const { data: clients = [] } = useClients();
  const updateReceipt = useUpdatePaymentReceipt();
  const deleteReceipt = useDeletePaymentReceipt();

  const handleStartEditReceipt = (r) => {
    setEditingReceipt(r);
    const d = r.receivedDate || r.paidAt;
    setReceiptForm({
      receivedDate: d ? new Date(d).toISOString().slice(0, 10) : '',
      paymentMode: r.paymentMode || r.method || 'Bank',
      reference: r.reference || '',
      notes: r.notes || '',
    });
  };

  const handleSaveEditReceipt = async (e) => {
    e.preventDefault();
    if (!editingReceipt) return;
    try {
      await updateReceipt.mutateAsync({
        id: editingReceipt._id,
        data: receiptForm,
      });
      setEditingReceipt(null);
    } catch (_) {}
  };

  const handleDeleteReceipt = async (r) => {
    if (window.confirm(`Are you sure you want to delete payment receipt of ₹${r.amount}?`)) {
      try {
        await deleteReceipt.mutateAsync(r._id);
      } catch (_) {}
    }
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const rDate = r.receivedDate || r.paidAt || r.createdAt;
      if (!isDateInRange(rDate)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const clientName = (r.client?.company || r.client?.name || '').toLowerCase();
      const ref = (r.reference || '').toLowerCase();
      const mode = (r.paymentMode || '').toLowerCase();
      return clientName.includes(q) || ref.includes(q) || mode.includes(q);
    });
  }, [receipts, isDateInRange, search]);

  const sortedReceipts = useMemo(() => {
    return [...filteredReceipts].sort((a, b) => {
      const timeA = new Date(a.receivedDate || a.paidAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.receivedDate || b.paidAt || b.createdAt || 0).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredReceipts, dateSort]);

  const totalCollected = filteredReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalUnappliedCredit = filteredReceipts.reduce((sum, r) => sum + Number(r.unappliedCredit || 0), 0);

  const handleExport = () => {
    const rows = filteredReceipts.map((r) => ({
      date: formatDateIST(r.receivedDate),
      client: r.client?.company || r.client?.name || 'Client',
      amount: r.amount,
      mode: r.paymentMode,
      account: r.destinationAccount?.accountName || '-',
      reference: r.reference || '',
      invoice: r.invoice?.invoiceNumber || 'Advance Credit',
      unappliedCredit: r.unappliedCredit || 0,
    }));
    exportToCSV('client_payment_receipts', rows, [
      { key: 'date', label: 'Date Received' },
      { key: 'client', label: 'Client' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'mode', label: 'Payment Mode' },
      { key: 'account', label: 'Destination Account' },
      { key: 'reference', label: 'UTR / Reference' },
      { key: 'invoice', label: 'Allocated Invoice' },
      { key: 'unappliedCredit', label: 'Unapplied Credit (INR)' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Total Collected Revenue</span>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalCollected)}</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Unapplied Advance Credits</span>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{formatINR(totalUnappliedCredit)}</div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Receipts Count</span>
            <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{filteredReceipts.length} Transactions</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client, UTR, or mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring bg-background"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full sm:w-auto rounded-lg px-3 py-1.5 text-xs bg-background text-foreground font-medium"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.company || c.name}
              </option>
            ))}
          </select>
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
            onClick={() => onQuickAdd('receipt')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex-1 sm:flex-initial min-h-[36px] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-card rounded-xl overflow-hidden flex flex-col">
        <div className="responsive-table-container overflow-y-auto max-h-[600px] text-xs">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-secondary sticky top-0 z-10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] ">
              <tr>
                <th
                  onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="p-3 cursor-pointer select-none hover:bg-muted transition-colors"
                  title="Click to toggle date sort (Newest / Oldest)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Received Date</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                  </div>
                </th>
                <th className="p-3">Client</th>
                <th className="p-3">Invoice Allocation</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3">Destination Account</th>
                <th className="p-3">UTR / Ref</th>
                <th className="p-3 text-right">Amount Received</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05]">
              {sortedReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-muted-foreground">
                    No payment receipts found matching your filters.
                  </td>
                </tr>
              ) : (
                sortedReceipts.map((r) => (
                  <tr key={r._id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-3 text-muted-foreground font-medium tabular-nums whitespace-nowrap">{formatDateIST(r.receivedDate || r.paidAt)}</td>
                    <td className="p-3 font-semibold text-foreground">
                      {r.client?.company || r.client?.name || 'Client'}
                    </td>
                    <td className="p-3">
                      {r.invoice ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-secondary px-2 py-0.5 rounded text-[11px] tabular-nums">
                          {r.invoice.invoiceNumber}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded text-[10px]">
                          Advance Credit
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-secondary font-medium text-foreground text-[10px]">
                        {r.paymentMode || r.method || 'Direct'}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.destinationAccount?.accountName || '-'}</td>
                    <td className="p-3 font-mono text-muted-foreground tabular-nums">{r.reference || '-'}</td>
                    <td className="p-3 text-right font-bold text-foreground text-sm tabular-nums whitespace-nowrap">+{formatINR(r.amount)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEditReceipt(r)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title="Edit Receipt"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(r)}
                          disabled={deleteReceipt.isPending}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title="Delete Receipt"
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

      {/* EDIT RECEIPT MODAL */}
      <Dialog open={Boolean(editingReceipt)} onOpenChange={(open) => !open && setEditingReceipt(null)}>
        {editingReceipt && (
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
            <form onSubmit={handleSaveEditReceipt} className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      Edit Payment Receipt
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Edit payment receipt
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
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Received Date *</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.receivedDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, receivedDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Mode *</label>
                  <select
                    value={receiptForm.paymentMode}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                  >
                    <option value="Bank">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Stripe">Stripe / Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">UTR / Transaction Reference</label>
                  <input
                    type="text"
                    value={receiptForm.reference}
                    onChange={(e) => setReceiptForm({ ...receiptForm, reference: e.target.value })}
                    placeholder="e.g. UTR12345678"
                    className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 tabular-nums transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes / Remarks</label>
                  <textarea
                    rows={3}
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
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
                    onClick={() => setEditingReceipt(null)}
                    className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateReceipt.isPending}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all w-full sm:w-auto"
                  >
                    {updateReceipt.isPending ? 'Saving...' : 'Save Changes'}
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
