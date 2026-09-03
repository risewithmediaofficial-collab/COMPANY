import React, { useState, useEffect } from 'react';
import api from '../../../api/index';
import { IndianRupee, Calendar, DollarSign, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PortalAdBudget() {
  const [data, setData] = useState({
    totals: {
      monthlyBudget: 0,
      dailyBudget: 0,
      amountAdded: 0,
      amountSpent: 0,
      balance: 0,
      notes: '',
    },
    campaigns: [],
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoading(true);
        const res = await api.get('/portal/budget');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load portal ad budget:', err);
        toast.error('Failed to load ad budget details');
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, []);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const { totals, campaigns, recentLogs } = data;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Loading Ad Budget...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IndianRupee size={20} />
            </span>
            Marketing & Ad Budget
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent breakdown of your Monthly Budget, Daily Run-Rate, Funds Added, Balance, and Campaign Notes
          </p>
        </div>
      </div>

      {/* ── General Notes Banner ───────────────────────────────────── */}
      {totals.notes && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
          <FileText size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-foreground block">Agency Observation & Budget Notes</span>
            <p className="text-muted-foreground leading-relaxed">{totals.notes}</p>
          </div>
        </div>
      )}

      {/* ── 4 Essential KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Monthly Budget */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Monthly Budget</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{fmt(totals.monthlyBudget)}</p>
          <p className="text-[11px] text-muted-foreground">Allocated monthly marketing budget</p>
        </div>

        {/* 2. Daily Budget */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Daily Budget</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{fmt(totals.dailyBudget)}</p>
          <p className="text-[11px] text-muted-foreground">Active daily ad spend cap</p>
        </div>

        {/* 3. Amount Added */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Amount Added</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{fmt(totals.amountAdded)}</p>
          <p className="text-[11px] text-muted-foreground">Total funds deposited into ad campaigns</p>
        </div>

        {/* 4. Balance */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Available Balance</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(totals.balance)}</p>
          <p className="text-[11px] text-muted-foreground">Remaining balance for active ads</p>
        </div>
      </div>

      {/* ── Active Campaigns Budget Table ───────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Campaigns Budget & Notes</h3>
            <p className="text-xs text-muted-foreground">Individual campaign allocations and operational notes</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
            {campaigns.length} Campaigns
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No campaigns active for your account currently.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Campaign & Platform</th>
                  <th className="py-3 px-4 text-right font-semibold">Monthly Budget</th>
                  <th className="py-3 px-4 text-right font-semibold">Daily Budget</th>
                  <th className="py-3 px-4 text-right font-semibold">Amount Added</th>
                  <th className="py-3 px-4 text-right font-semibold">Balance</th>
                  <th className="py-3 px-4 text-left font-semibold">Notes / Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campaigns.map((c) => (
                  <tr key={c._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-foreground block">{c.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary">
                          {c.platform || 'Meta'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.objective || 'Awareness'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                      {fmt(c.monthlyBudget)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-foreground">
                      {fmt(c.dailyBudget)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-foreground">
                      {fmt(c.amountAdded)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {fmt(c.balance)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                      {c.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Budget Logs / Ledger ─────────────────────────────── */}
      {recentLogs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Recent Budget Logs & Spend</h3>
            <p className="text-xs text-muted-foreground">Historical records of amount added, spend, and balances</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Date</th>
                  <th className="py-3 px-4 text-left font-semibold">Campaign</th>
                  <th className="py-3 px-4 text-right font-semibold">Added</th>
                  <th className="py-3 px-4 text-right font-semibold">Spent</th>
                  <th className="py-3 px-4 text-right font-semibold">Balance</th>
                  <th className="py-3 px-4 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {log.date ? new Date(log.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {log.campaignName}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                      {log.amountAdded ? fmt(log.amountAdded) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                      {log.amountSpent ? fmt(log.amountSpent) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                      {fmt(log.balance)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-sm truncate">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
