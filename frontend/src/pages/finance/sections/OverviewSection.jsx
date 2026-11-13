import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Receipt,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  HelpCircle,
  Filter,
} from '@/components/ui/muiIcons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { formatINR, formatDateIST } from '../../../utils/financeFormatters';

const PIE_COLORS = ['#12B7D4', '#0891b2', '#38bdf8', '#0284c7', '#0e7490', '#64748b', '#94a3b8', '#cbd5e1'];

const formatCategory = (cat) => {
  if (!cat) return '';
  const lower = String(cat).toLowerCase().trim();
  if (lower === 'rj') return 'RJ';
  if (lower === 'vj') return 'VJ';
  return cat.replace(/_/g, ' ');
};

export default function OverviewSection({ overviewData, onQuickAdd, onNavigateSection }) {
  const kpis = overviewData?.kpis || {};
  const monthlySeries = overviewData?.monthlySeries || [];
  const categoryBreakdown = overviewData?.categoryBreakdown || [];
  const recentTransactions = overviewData?.recentTransactions || {};
  const alerts = overviewData?.alerts || [];

  return (
    <div className="space-y-6">
      {/* ALERTS BANNER (If any alerts exist) */}
      {alerts.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-4 rounded-2xl bg-card text-foreground text-xs font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-foreground" />
                <div>
                  <span className="font-bold">{alert.title}: </span>
                  <span className="text-muted-foreground">{alert.message}</span>
                </div>
              </div>
              {alert.actionLink && (
                <button
                  onClick={() => onNavigateSection(alert.actionLink.split('/')[2]?.split('?')[0] || 'overview')}
                  className="px-3 py-1.5 rounded-xl bg-background font-semibold text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
                >
                  View Details →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TOP KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Recognized Service Revenue */}
        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-card p-5 rounded-2xl hover:bg-secondary/75 cursor-pointer transition-colors group space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Service Revenue</span>
            <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{formatINR(kpis.recognizedServiceRevenue)}</div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Earned agency services</span>
            <span className="text-foreground font-semibold group-hover:underline">View →</span>
          </div>
        </div>

        {/* Card 2: Cash Received */}
        <div
          onClick={() => onNavigateSection('income')}
          className="bg-card p-5 rounded-2xl hover:bg-secondary/75 cursor-pointer transition-colors group space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cash Received</span>
            <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{formatINR(kpis.cashReceived)}</div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Collected in bank/cash</span>
            <span className="text-foreground font-semibold group-hover:underline">Receipts →</span>
          </div>
        </div>

        {/* Card 3: Recognized Costs */}
        <div
          onClick={() => onNavigateSection('expenses')}
          className="bg-card p-5 rounded-2xl hover:bg-secondary/75 cursor-pointer transition-colors group space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recognized Costs</span>
            <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{formatINR(kpis.recognizedExpenses)}</div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ops &amp; Salaries recognized</span>
            <span className="text-foreground font-semibold group-hover:underline">Bills →</span>
          </div>
        </div>

        {/* Card 4: Net Profit & Margin */}
        <div
          onClick={() => onNavigateSection('forecast-reports')}
          className="bg-card p-5 rounded-2xl hover:bg-secondary/75 cursor-pointer transition-colors group space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</span>
            <div className="p-2 rounded-xl bg-background text-foreground shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
            {formatINR(kpis.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Margin: <strong className="text-foreground tabular-nums">{kpis.profitMargin !== null ? `${kpis.profitMargin}%` : 'N/A'}</strong>
            </span>
            <span className="text-foreground font-semibold group-hover:underline">P&amp;L →</span>
          </div>
        </div>
      </div>

      {/* SECONDARY MINI KPI ROW: RECEIVABLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-card p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-secondary/75 transition-colors"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Receivables</div>
            <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatINR(kpis.outstandingReceivables)}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-card p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-secondary/75 transition-colors"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue Invoices</div>
            <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatINR(kpis.overdueReceivables)}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div
          onClick={() => onNavigateSection('income')}
          className="bg-card p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-secondary/75 transition-colors"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pass-Through Ad Spend</div>
            <div className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatINR(kpis.passThroughAdBudgetTotal)}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monochrome Revenue vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-card p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Revenue vs. Expenses</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Expenses
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            {monthlySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground) / 0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val === 0) return '₹0';
                      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                      return `₹${val}`;
                    }}
                  />
                  <Tooltip
                    formatter={(val) => [formatINR(val), '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: 'none',
                      color: 'hsl(var(--foreground))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#12B7D4" radius={[4, 4, 0, 0]} name="Service Revenue" />
                  <Bar dataKey="expenses" fill="#64748b" radius={[4, 4, 0, 0]} name="Operating Costs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No monthly revenue and expense records found
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown Donut */}
        <div className="bg-card p-5 sm:p-6 rounded-2xl">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">Expense Category Breakdown</h3>
          </div>
          <div className="h-44 w-full">
            {categoryBreakdown.length > 0 && categoryBreakdown.some(c => c.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatINR(val), 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: 'none',
                      color: 'hsl(var(--foreground))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No expense category data for this period
              </div>
            )}
          </div>
          <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto text-xs">
            {categoryBreakdown.slice(0, 5).map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className={`truncate ${['rj', 'vj'].includes(cat.category?.toLowerCase()) ? 'uppercase font-bold text-foreground' : 'capitalize'}`}>
                    {formatCategory(cat.category)}
                  </span>
                </span>
                <span className="font-semibold text-foreground tabular-nums">{formatINR(cat.amount, false)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE SECTION */}
      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Recent Financial Transactions</h3>
          </div>
          <button
            onClick={() => onQuickAdd('invoice')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer min-h-[36px]"
          >
            Quick Entry
          </button>
        </div>

        <div className="responsive-table-container overflow-y-auto max-h-[420px] text-xs px-2 pb-2">
          <table className="w-full min-w-[620px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-secondary/70 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 rounded-l-lg">Date</th>
                <th className="p-3">Transaction / Type</th>
                <th className="p-3">Client / Vendor</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
              {/* Invoices */}
              {(recentTransactions.invoices || []).slice(0, 3).map((inv) => (
                <tr key={inv._id} className="hover:bg-background/60 transition-colors">
                  <td className="p-3 text-muted-foreground">{formatDateIST(inv.invoiceDate || inv.issueDate)}</td>
                  <td className="p-3 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-foreground" />
                      <span>Invoice {inv.invoiceNumber}</span>
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{inv.client?.company || inv.client?.name || 'Client'}</td>
                  <td className="p-3 text-right font-bold text-foreground">{formatINR(inv.total || inv.totalAmount)}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-background text-foreground">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('invoices')}
                      className="text-foreground font-medium hover:underline text-xs cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {/* Payments */}
              {(recentTransactions.payments || []).slice(0, 3).map((pay) => (
                <tr key={pay._id} className="hover:bg-background/60 transition-colors">
                  <td className="p-3 text-muted-foreground">{formatDateIST(pay.receivedDate || pay.paidAt)}</td>
                  <td className="p-3 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span>Receipt ({pay.paymentMode})</span>
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{pay.client?.company || pay.client?.name || 'Client'}</td>
                  <td className="p-3 text-right font-bold text-foreground">+{formatINR(pay.amount)}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-background text-foreground">
                      Confirmed
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('income')}
                      className="text-foreground font-medium hover:underline text-xs cursor-pointer"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}

              {/* Expenses */}
              {(recentTransactions.expenses || []).slice(0, 3).map((exp) => (
                <tr key={exp._id} className="hover:bg-background/60 transition-colors">
                  <td className="p-3 text-muted-foreground">{formatDateIST(exp.date)}</td>
                  <td className="p-3 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-zinc-400" />
                      <span>Expense ({formatCategory(exp.category)})</span>
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{exp.vendor || exp.title}</td>
                  <td className="p-3 text-right font-bold text-foreground">-{formatINR(exp.amount)}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-background text-muted-foreground">
                      {exp.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('expenses')}
                      className="text-foreground font-medium hover:underline text-xs cursor-pointer"
                    >
                      Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
