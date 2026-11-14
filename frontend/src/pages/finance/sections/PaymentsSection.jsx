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
} from '@/components/ui/muiIcons';
import {
  usePaymentReceipts,
  useModuleInvoices,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR } from '../../../utils/financeFormatters';

export default function PaymentsSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const { data: receipts = [], isLoading, refetch } = usePaymentReceipts();
  const { data: clientsData = [] } = useClients();
  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.clients || [];

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const q = search.toLowerCase();
      const clientName = (r.client?.company || r.client?.name || '').toLowerCase();
      const ref = (r.reference || '').toLowerCase();
      const num = (r.receiptNumber || '').toLowerCase();
      const invNum = (r.invoice?.invoiceNumber || '').toLowerCase();
      const matchesSearch = !q || clientName.includes(q) || ref.includes(q) || num.includes(q) || invNum.includes(q);
      const matchesClient = clientFilter === 'all' || r.client?._id === clientFilter || r.client === clientFilter;
      const matchesMethod = methodFilter === 'all' || (r.paymentMode || '').toLowerCase() === methodFilter.toLowerCase();
      return matchesSearch && matchesClient && matchesMethod;
    });
  }, [receipts, search, clientFilter, methodFilter]);

  // Aggregate stats
  const totalReceived = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const thisMonthReceived = receipts
    .filter((r) => {
      const d = new Date(r.receivedDate || r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── METRICS OVERVIEW ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            {receipts.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Verified payment entries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Avg Payment Size</span>
            <ArrowDownRight size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {receipts.length > 0 ? formatINR(Math.round(totalReceived / receipts.length)) : '₹0'}
          </div>
          <p className="text-[11px] text-muted-foreground">Per payment receipt</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">All Payment Modes</option>
            <option value="bank">Bank Transfer / NEFT / IMPS</option>
            <option value="upi">UPI / GPay / PhonePe</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground focus:outline-none max-w-[180px]"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.company || c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onQuickAdd ? onQuickAdd('receipt') : null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px]"
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
                <th className="py-3 px-4">Invoice Linked</th>
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
                filteredReceipts.map((rec) => (
                  <tr key={rec._id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {rec.receiptNumber || 'REC-—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">
                      {rec.receivedDate ? new Date(rec.receivedDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {rec.client?.company || rec.client?.name || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {rec.invoice?.invoiceNumber || (rec.invoiceId ? 'Invoice Linked' : 'Advance / General')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-secondary text-foreground">
                        {rec.paymentMode || 'Bank'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {rec.reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                      +{formatINR(rec.amount || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
