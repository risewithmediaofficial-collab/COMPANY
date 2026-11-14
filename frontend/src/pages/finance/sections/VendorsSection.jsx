import React, { useState, useMemo } from 'react';
import {
  Building,
  Search,
  Plus,
  IndianRupee,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserCheck,
  Filter,
  Camera,
  Film,
  Sparkles,
} from '@/components/ui/muiIcons';
import { useModuleExpenses, usePayeeOverallPay } from '../../../hooks/useFinance';
import { formatINR } from '../../../utils/financeFormatters';

export default function VendorsSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: expenses = [], isLoading, refetch } = useModuleExpenses();
  const payeeOverallPayMutation = usePayeeOverallPay();

  // Aggregate expenses by Payee / Vendor
  const vendors = useMemo(() => {
    const map = new Map();

    expenses.forEach((e) => {
      const payeeName = (e.payee || e.vendor || e.vendorName || '').trim();
      if (!payeeName) return;

      const total = Number(e.amount) || 0;
      const isPaid = e.paymentStatus === 'paid';
      const paid = isPaid ? total : Number(e.paidAmount) || 0;
      const pending = Math.max(0, total - paid);

      if (!map.has(payeeName)) {
        map.set(payeeName, {
          name: payeeName,
          category: e.category || 'Freelancer / Outside Service',
          totalBilled: 0,
          totalPaid: 0,
          totalPending: 0,
          billCount: 0,
          lastDate: e.date || e.createdAt,
        });
      }

      const v = map.get(payeeName);
      v.totalBilled += total;
      v.totalPaid += paid;
      v.totalPending += pending;
      v.billCount += 1;
      if (new Date(e.date || e.createdAt) > new Date(v.lastDate)) {
        v.lastDate = e.date || e.createdAt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPending - a.totalPending);
  }, [expenses]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || v.category.toLowerCase().includes(categoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [vendors, search, categoryFilter]);

  // Aggregate stats
  const totalBilledAll = vendors.reduce((sum, v) => sum + v.totalBilled, 0);
  const totalPaidAll = vendors.reduce((sum, v) => sum + v.totalPaid, 0);
  const totalPendingAll = vendors.reduce((sum, v) => sum + v.totalPending, 0);

  const handleSettleVendor = async (vendorName, amount) => {
    if (!amount || amount <= 0) return;
    try {
      await payeeOverallPayMutation.mutateAsync({
        payeeName: vendorName,
        paymentAmount: amount,
        paymentMode: 'Bank',
        reference: `Settle ${vendorName}`,
      });
      refetch();
    } catch (_) {}
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── METRICS OVERVIEW ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Vendor Bills</span>
            <Building size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(totalBilledAll)}
          </div>
          <p className="text-[11px] text-muted-foreground">{vendors.length} service providers registered</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Paid to Vendors</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(totalPaidAll)}
          </div>
          <p className="text-[11px] text-muted-foreground">Settled creator & vendor payouts</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Pending Vendor Dues</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {formatINR(totalPendingAll)}
          </div>
          <p className="text-[11px] text-muted-foreground">Outstanding accounts payable</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Settlement Ratio</span>
            <ArrowUpRight size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {totalBilledAll > 0 ? `${Math.round((totalPaidAll / totalBilledAll) * 100)}%` : '100%'}
          </div>
          <p className="text-[11px] text-muted-foreground">Payout clearance rate</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendors (photographers, editors, influencers, printers)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickAdd ? onQuickAdd('expense') : null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px]"
          >
            <Plus size={14} />
            <span>Add Vendor Bill</span>
          </button>
        </div>
      </div>

      {/* ── VENDORS TABLE ───────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Vendor / Freelancer</th>
                <th className="py-3 px-4">Service Category</th>
                <th className="py-3 px-4">Bills</th>
                <th className="py-3 px-4">Total Invoiced</th>
                <th className="py-3 px-4">Total Paid</th>
                <th className="py-3 px-4">Pending Balance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading vendors & freelancers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No outside vendors or freelancers recorded yet. Click "Add Vendor Bill" to log vendor costs.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => (
                  <tr key={v.name} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{v.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Last activity: {new Date(v.lastDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground capitalize">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">
                      {v.billCount} {v.billCount === 1 ? 'bill' : 'bills'}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                      {formatINR(v.totalBilled)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatINR(v.totalPaid)}
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      <span
                        className={
                          v.totalPending > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatINR(v.totalPending)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.totalPending > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSettleVendor(v.name, v.totalPending)}
                          disabled={payeeOverallPayMutation.isPending}
                          className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[11px] cursor-pointer"
                        >
                          Settle Dues
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          Settled ✓
                        </span>
                      )}
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
