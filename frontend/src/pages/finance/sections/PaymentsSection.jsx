import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  FileText,
  Filter,
  IndianRupee,
  CreditCard,
  Building,
  AlertTriangle,
  RefreshCw,
} from '@/components/ui/muiIcons';
import {
  usePaymentReceipts,
  useModuleInvoices,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { useDateFilter } from '../../../context/DateFilterContext';
import { formatINR } from '../../../utils/financeFormatters';
import { SelectDropdown } from '../../../components/ui/SelectDropdown';

export default function PaymentsSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const { startDate, endDate, isDateInRange } = useDateFilter();

  const {
    data: receipts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePaymentReceipts();

  const { data: clientsData = [] } = useClients();
  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.clients || [];

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const q = search.trim().toLowerCase();
      const clientName = (r.client?.company || r.client?.name || '').toLowerCase();
      const ref = (r.reference || r.transactionReference || '').toLowerCase();
      const num = (r.receiptNumber || (r._id ? `REC-${r._id.toString().slice(-6)}` : '')).toLowerCase();
      const invNum = (r.invoice?.invoiceNumber || '').toLowerCase();
      const projName = (r.project?.name || '').toLowerCase();

      const matchesSearch =
        !q ||
        clientName.includes(q) ||
        ref.includes(q) ||
        num.includes(q) ||
        invNum.includes(q) ||
        projName.includes(q);

      const clientId = r.client?._id || r.client;
      const matchesClient = clientFilter === 'all' || clientId === clientFilter;

      const mode = (r.paymentMode || r.method || '').toLowerCase();
      const matchesMethod = methodFilter === 'all' || mode === methodFilter.toLowerCase();

      const recDate = r.receivedDate || r.paidAt || r.paymentDate || r.createdAt;
      const matchesDate = !startDate && !endDate ? true : isDateInRange(recDate);

      return matchesSearch && matchesClient && matchesMethod && matchesDate;
    });
  }, [receipts, search, clientFilter, methodFilter, startDate, endDate, isDateInRange]);

  // Aggregate stats based on loaded receipts (matching active date filter)
  const totalReceived = filteredReceipts.reduce((sum, r) => sum + (Number(r.amount ?? r.amountPaid) || 0), 0);
  const thisMonthReceived = filteredReceipts
    .filter((r) => {
      const d = new Date(r.receivedDate || r.paidAt || r.paymentDate || r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + (Number(r.amount ?? r.amountPaid) || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── ERROR ALERT BANNER ────────────────────────────────────────── */}
      {isError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Unable to load payments ({error?.response?.data?.message || error?.message || 'Server error'}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="h-3 w-3 shrink-0" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── METRICS OVERVIEW ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Collections</span>
            <Banknote size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(totalReceived)}
          </div>
          <p className="text-[11px] text-muted-foreground">Lifetime client payments recorded</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">This Month Receipts</span>
            <Calendar size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(thisMonthReceived)}
          </div>
          <p className="text-[11px] text-muted-foreground">Collected in current calendar month</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Transactions</span>
            <CheckCircle2 size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {filteredReceipts.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Verified payment entries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Avg Payment Size</span>
            <ArrowDownRight size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {filteredReceipts.length > 0 ? formatINR(Math.round(totalReceived / filteredReceipts.length)) : '₹0'}
          </div>
          <p className="text-[11px] text-muted-foreground">Per payment receipt</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client, reference number, or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh payment records"
            className="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Method Filter */}
          <div className="w-[140px] flex-1 sm:flex-initial">
            <SelectDropdown
              value={methodFilter}
              onChange={(val) => setMethodFilter(val || 'all')}
              options={[
                { value: 'all', label: 'All Modes' },
                { value: 'bank', label: 'Bank / NEFT' },
                { value: 'upi', label: 'UPI / GPay' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
              ]}
              placeholder="All Modes"
              allowCustom={false}
              allowDeselect={false}
              buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground"
            />
          </div>

          {/* Client Filter */}
          <div className="w-[180px] flex-1 sm:flex-initial">
            <SelectDropdown
              value={clientFilter}
              onChange={(val) => setClientFilter(val || 'all')}
              options={[
                { value: 'all', label: 'All Clients' },
                ...clients.map((c) => ({
                  value: c._id,
                  label: c.company || c.name,
                })),
              ]}
              placeholder="All Clients"
              searchPlaceholder="Search clients..."
              allowCustom={false}
              allowDeselect={false}
              buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground"
            />
          </div>

          <button
            type="button"
            onClick={() => onQuickAdd ? onQuickAdd('receipt') : null}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px] w-full sm:w-auto"
          >
            <Plus size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* ── PAYMENTS TABLE ──────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Invoice / Project</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference / UTR</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading payments data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rec) => {
                  const dateVal = rec.receivedDate || rec.paidAt || rec.paymentDate || rec.createdAt;
                  const displayDate = dateVal ? new Date(dateVal).toLocaleDateString() : '—';
                  const displayReceiptNum = rec.receiptNumber || (rec._id ? `REC-${rec._id.toString().slice(-6).toUpperCase()}` : 'REC-—');
                  const displayLinked = rec.invoice?.invoiceNumber || (rec.invoiceId ? 'Invoice Linked' : rec.project?.name ? `Project: ${rec.project.name}` : 'Advance / General');
                  const displayMethod = rec.paymentMode || rec.method || 'Bank';
                  const displayRef = rec.reference || rec.transactionReference || rec.notes || '—';
                  const displayAmount = Number(rec.amount ?? rec.amountPaid ?? 0);

                  return (
                    <tr key={rec._id || Math.random()} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {displayReceiptNum}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground tabular-nums">
                        {displayDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {rec.client?.company || rec.client?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {displayLinked}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-secondary text-foreground">
                          {displayMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {displayRef}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                        +{formatINR(displayAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
