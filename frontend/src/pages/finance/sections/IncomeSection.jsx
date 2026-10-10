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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  usePaymentReceipts,
  useModuleInvoices,
  useUpdatePaymentReceipt,
  useDeletePaymentReceipt,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';

export default function IncomeSection({ onQuickAdd }) {
  const [clientFilter, setClientFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
      if (fromDate && rDate) {
        const d = new Date(rDate).toISOString().slice(0, 10);
        if (d < fromDate) return false;
      }
      if (toDate && rDate) {
        const d = new Date(rDate).toISOString().slice(0, 10);
        if (d > toDate) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const clientName = (r.client?.company || r.client?.name || '').toLowerCase();
      const ref = (r.reference || '').toLowerCase();
      const mode = (r.paymentMode || '').toLowerCase();
      return clientName.includes(q) || ref.includes(q) || mode.includes(q);
    });
  }, [receipts, fromDate, toDate, search]);

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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL COLLECTED REVENUE</span>
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{formatINR(totalCollected)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Confirmed client payment receipts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>UNAPPLIED ADVANCE CREDITS</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatINR(totalUnappliedCredit)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Advances preserved without negative invoice outstanding</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>RECEIPTS COUNT</span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{filteredReceipts.length} Transactions</div>
          <div className="text-[11px] text-slate-500 mt-1">Total confirmed receipt vouchers</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, UTR, or mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-medium"
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
            onClick={() => onQuickAdd('receipt')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Record Payment Receipt
          </button>
        </div>
      </div>

      {/* Receipts Table */}
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
                    <span>Received Date</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    <span className="text-indigo-600 font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
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
            <tbody className="divide-y divide-slate-100">
              {sortedReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No payment receipts found matching your filters.
                  </td>
                </tr>
              ) : (
                sortedReceipts.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-600 font-medium">{formatDateIST(r.receivedDate || r.paidAt)}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      {r.client?.company || r.client?.name || 'Client'}
                    </td>
                    <td className="p-3">
                      {r.invoice ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {r.invoice.invoiceNumber}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                          Advance Credit
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700 text-[10px]">
                        {r.paymentMode || r.method || 'Direct'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{r.destinationAccount?.accountName || '-'}</td>
                    <td className="p-3 font-mono text-slate-500">{r.reference || '-'}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 text-sm">+{formatINR(r.amount)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEditReceipt(r)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Receipt"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(r)}
                          disabled={deleteReceipt.isPending}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          <DialogContent variant="center" size="md" className="rounded-2xl p-6 text-xs max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Edit Payment Receipt</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Receipt for {editingReceipt.client?.company || editingReceipt.client?.name || 'Client'} ({formatINR(editingReceipt.amount)})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditReceipt} className="space-y-3.5 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Received Date</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.receivedDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, receivedDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <select
                    value={receiptForm.paymentMode}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                  >
                    <option value="Bank">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Stripe">Stripe / Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={receiptForm.reference}
                  onChange={(e) => setReceiptForm({ ...receiptForm, reference: e.target.value })}
                  placeholder="e.g. UTR12345678"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  placeholder="Optional internal remarks..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateReceipt.isPending}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updateReceipt.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
