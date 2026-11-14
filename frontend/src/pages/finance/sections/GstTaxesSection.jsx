import React, { useState, useMemo } from 'react';
import {
  Percent,
  Search,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  AlertCircle,
  Building,
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
} from '@/components/ui/muiIcons';
import { useModuleInvoices, useModuleExpenses } from '../../../hooks/useFinance';
import { formatINR } from '../../../utils/financeFormatters';

export default function GstTaxesSection() {
  const [search, setSearch] = useState('');
  const [slabFilter, setSlabFilter] = useState('all');

  const { data: invoicesData = [], isLoading: invLoading } = useModuleInvoices();
  const { data: expenses = [] } = useModuleExpenses();

  const invoices = Array.isArray(invoicesData) ? invoicesData : invoicesData?.invoices || [];

  // Compute Output GST (on invoices raised)
  const taxSummary = useMemo(() => {
    let totalTaxableInvoiced = 0;
    let totalOutputGst = 0;

    const invoiceListWithTax = invoices.map((inv) => {
      const rate = Number(inv.taxRate !== undefined ? inv.taxRate : inv.tax || 18) || 0;
      const total = Number(inv.totalAmount || inv.total || 0);

      // Back-calculate or direct taxable
      let taxable = total;
      let taxAmount = 0;

      if (rate > 0) {
        if (inv.taxType === 'inclusive') {
          taxable = Math.round(total / (1 + rate / 100));
          taxAmount = total - taxable;
        } else {
          taxAmount = Math.round((total * rate) / (100 + rate));
          taxable = total - taxAmount;
        }
      }

      totalTaxableInvoiced += taxable;
      totalOutputGst += taxAmount;

      return {
        ...inv,
        taxRate: rate,
        taxableAmount: taxable,
        taxAmount,
      };
    });

    // Compute Input Tax Credit (ITC) from expenses
    let totalInputTaxCredit = 0;
    expenses.forEach((e) => {
      const expRate = Number(e.taxRate || 0);
      const expTotal = Number(e.amount || 0);
      if (expRate > 0) {
        const itc = Math.round((expTotal * expRate) / (100 + expRate));
        totalInputTaxCredit += itc;
      }
    });

    const netGstPayable = Math.max(0, totalOutputGst - totalInputTaxCredit);

    return {
      invoiceList: invoiceListWithTax,
      totalTaxableInvoiced,
      totalOutputGst,
      totalInputTaxCredit,
      netGstPayable,
    };
  }, [invoices, expenses]);

  const filteredInvoices = useMemo(() => {
    return taxSummary.invoiceList.filter((inv) => {
      const q = search.toLowerCase();
      const num = (inv.invoiceNumber || '').toLowerCase();
      const client = (inv.client?.company || inv.client?.name || '').toLowerCase();
      const matchesSearch = !q || num.includes(q) || client.includes(q);
      const matchesSlab = slabFilter === 'all' || inv.taxRate.toString() === slabFilter;
      return matchesSearch && matchesSlab;
    });
  }, [taxSummary.invoiceList, search, slabFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── STATUTORY ADVISORY BANNER ───────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-secondary/50 border border-border/40 flex items-start gap-3">
        <HelpCircle size={18} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-foreground">
            Tax Ledger & GST Compliance Overview
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Record applicable GST, tax amounts and related invoice details. <strong>Tax calculations and filings should be checked and verified by an accountant</strong> before filing monthly GSTR-1 and GSTR-3B returns.
          </p>
        </div>
      </div>

      {/* ── METRICS OVERVIEW ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Taxable Value</span>
            <Percent size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(taxSummary.totalTaxableInvoiced)}
          </div>
          <p className="text-[11px] text-muted-foreground">Base value before GST charges</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Output GST (Collected)</span>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(taxSummary.totalOutputGst)}
          </div>
          <p className="text-[11px] text-muted-foreground">GST charged on client invoices</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Input Tax Credit (Paid)</span>
            <ArrowDownRight size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {formatINR(taxSummary.totalInputTaxCredit)}
          </div>
          <p className="text-[11px] text-muted-foreground">GST paid on software & vendor bills</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Net GST Liability</span>
            <IndianRupee size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(taxSummary.netGstPayable)}
          </div>
          <p className="text-[11px] text-muted-foreground">Estimated tax payable after ITC</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All Slabs' },
              { id: '18', label: '18% GST' },
              { id: '12', label: '12% GST' },
              { id: '5', label: '5% GST' },
              { id: '0', label: 'Exempt (0%)' },
            ].map((slab) => (
              <button
                key={slab.id}
                type="button"
                onClick={() => setSlabFilter(slab.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  slabFilter === slab.id
                    ? 'bg-card text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {slab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAX INVOICE LEDGER TABLE ─────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">GST Rate</th>
                <th className="py-3 px-4">Taxable Value</th>
                <th className="py-3 px-4">CGST + SGST / IGST</th>
                <th className="py-3 px-4 text-right">Total Invoice Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {invLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading GST ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No tax records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {inv.client?.company || inv.client?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">
                      {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground">
                        {inv.taxRate}% GST
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground tabular-nums">
                      {formatINR(inv.taxableAmount)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatINR(inv.taxAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums text-sm">
                      {formatINR(inv.totalAmount || inv.total || 0)}
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
