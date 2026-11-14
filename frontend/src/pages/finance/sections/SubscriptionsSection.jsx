import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Globe2,
  Layers,
  Sparkles,
} from '@/components/ui/muiIcons';
import { useSubscriptions, usePostSubscriptionRenewal } from '../../../hooks/useFinance';
import { formatINR } from '../../../utils/financeFormatters';

export default function SubscriptionsSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const { data: subscriptions = [], isLoading, refetch } = useSubscriptions();
  const postRenewal = usePostSubscriptionRenewal();

  const filteredSubs = subscriptions.filter((s) => {
    const q = search.toLowerCase();
    const name = (s.serviceName || s.name || '').toLowerCase();
    const vendor = (s.vendor || '').toLowerCase();
    return !q || name.includes(q) || vendor.includes(q);
  });

  const totalMonthly = subscriptions.reduce((sum, s) => {
    const cost = Number(s.cost || s.amount || 0);
    return s.billingCycle === 'yearly' ? sum + cost / 12 : sum + cost;
  }, 0);

  const totalAnnual = totalMonthly * 12;

  const handleRenew = async (id) => {
    try {
      await postRenewal.mutateAsync(id);
      refetch();
    } catch (_) {}
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── METRIC STATS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Monthly Software Run-Rate</span>
            <RefreshCw size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(Math.round(totalMonthly))}
          </div>
          <p className="text-[11px] text-muted-foreground">Monthly recurring commitments</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Annualized Spend</span>
            <Calendar size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(Math.round(totalAnnual))}
          </div>
          <p className="text-[11px] text-muted-foreground">Projected annual software cost</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Subscriptions</span>
            <Layers size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {subscriptions.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Tools, hosting & design assets</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Next Renewal</span>
            <ClockIcon size={16} className="text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-foreground truncate">
            {subscriptions.length > 0 && subscriptions[0].nextRenewalDate
              ? new Date(subscriptions[0].nextRenewalDate).toLocaleDateString()
              : 'None soon'}
          </div>
          <p className="text-[11px] text-muted-foreground">Automated renewal tracking</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search software (Adobe, Canva, Hosting, Domains...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onQuickAdd ? onQuickAdd('expense') : null}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px]"
        >
          <Plus size={14} />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* ── SUBSCRIPTIONS TABLE ─────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Service / Tool</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading subscriptions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No active software subscriptions found. Click "Add Subscription" to add tools like Adobe, Canva, or Hosting.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub._id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      {sub.serviceName || sub.name}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {sub.vendor || '—'}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium">
                      {sub.billingCycle || 'monthly'}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">
                      {sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                      {formatINR(sub.cost || sub.amount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRenew(sub._id)}
                        disabled={postRenewal.isPending}
                        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px] cursor-pointer"
                      >
                        Record Renewal
                      </button>
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

function ClockIcon(props) {
  return <Calendar {...props} />;
}
