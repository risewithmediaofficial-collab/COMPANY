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
  Building,
  CheckCircle,
  HelpCircle,
  Filter,
} from 'lucide-react';
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

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b', '#06b6d4', '#f97316'];

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
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium shadow-sm transition-all ${
                alert.type === 'danger'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-bold">{alert.title}: </span>
                  {alert.message}
                </div>
              </div>
              {alert.actionLink && (
                <button
                  onClick={() => onNavigateSection(alert.actionLink.split('/')[2]?.split('?')[0] || 'overview')}
                  className="px-2.5 py-1 rounded bg-white font-semibold shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
                >
                  View Details →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TOP KPI CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Recognized Service Revenue */}
        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Service Revenue</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatINR(kpis.recognizedServiceRevenue)}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Earned agency services</span>
            <span className="text-blue-600 font-medium group-hover:underline">View →</span>
          </div>
        </div>

        {/* Card 2: Cash Received */}
        <div
          onClick={() => onNavigateSection('income')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Received</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatINR(kpis.cashReceived)}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Collected in bank/cash</span>
            <span className="text-emerald-600 font-medium group-hover:underline">Receipts →</span>
          </div>
        </div>

        {/* Card 3: Recognized Costs */}
        <div
          onClick={() => onNavigateSection('expenses')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recognized Costs</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatINR(kpis.recognizedExpenses)}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ops & Salaries recognized</span>
            <span className="text-rose-600 font-medium group-hover:underline">Bills →</span>
          </div>
        </div>

        {/* Card 4: Net Profit & Margin */}
        <div
          onClick={() => onNavigateSection('forecast-reports')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Profit</span>
            <div className={`p-1.5 rounded-lg ${kpis.netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'} group-hover:scale-110 transition-transform`}>
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-xl font-bold ${kpis.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {formatINR(kpis.netProfit)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Margin: <strong className="text-slate-800">{kpis.profitMargin !== null ? `${kpis.profitMargin}%` : 'N/A'}</strong>
            </span>
            <span className="text-indigo-600 font-medium group-hover:underline">P&L →</span>
          </div>
        </div>

        {/* Card 5: Bank & Cash Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank & Cash Total</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatINR(kpis.totalCashBankBalance)}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Closing liquid balance</span>
          </div>
        </div>
      </div>

      {/* SECONDARY MINI KPI ROW: RECEIVABLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-xl border border-amber-200/80 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Outstanding Receivables</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">{formatINR(kpis.outstandingReceivables)}</div>
            <div className="text-[11px] text-amber-700/80">Issued invoices pending collection</div>
          </div>
          <Clock className="h-7 w-7 text-amber-500/40" />
        </div>

        <div
          onClick={() => onNavigateSection('invoices')}
          className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 rounded-xl border border-rose-200/80 flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Overdue Invoices</div>
            <div className="text-lg font-bold text-rose-900 mt-0.5">{formatINR(kpis.overdueReceivables)}</div>
            <div className="text-[11px] text-rose-700/80">Passed due date without full payment</div>
          </div>
          <AlertTriangle className="h-7 w-7 text-rose-500/40" />
        </div>

        <div
          onClick={() => onNavigateSection('income')}
          className="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent p-4 rounded-xl border border-indigo-200/80 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Pass-Through Ad Spend</div>
            <div className="text-lg font-bold text-indigo-900 mt-0.5">{formatINR(kpis.passThroughAdBudgetTotal)}</div>
            <div className="text-[11px] text-indigo-700/80">Client ad budget (excluded from service revenue)</div>
          </div>
          <Receipt className="h-7 w-7 text-indigo-500/40" />
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blue Revenue vs Green Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Revenue vs. Expenses</h3>
              <p className="text-xs text-slate-500">6-month trend comparing earned service revenue to operating costs</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Expenses
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatINR(val), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Service Revenue" />
                <Bar dataKey="expenses" fill="#10b981" radius={[4, 4, 0, 0]} name="Operating Costs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Expense Category Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution of expenditures by operational bucket</p>
          </div>
          <div className="h-44 w-full">
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
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto text-xs">
            {categoryBreakdown.slice(0, 5).map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="capitalize truncate">{cat.category.replace(/_/g, ' ')}</span>
                </span>
                <span className="font-semibold text-slate-800">{formatINR(cat.amount, false)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Financial Transactions</h3>
            <p className="text-xs text-slate-500">Live feed of issued invoices, confirmed payments, and posted expenses</p>
          </div>
          <button
            onClick={() => onQuickAdd('invoice')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            + Quick Entry
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Transaction / Type</th>
                <th className="p-3">Client / Vendor</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Invoices */}
              {(recentTransactions.invoices || []).slice(0, 3).map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-slate-600">{formatDateIST(inv.invoiceDate || inv.issueDate)}</td>
                  <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Invoice {inv.invoiceNumber}
                  </td>
                  <td className="p-3 text-slate-700">{inv.client?.company || inv.client?.name || 'Client'}</td>
                  <td className="p-3 font-bold text-slate-900">{formatINR(inv.total || inv.totalAmount)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inv.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('invoices')}
                      className="text-indigo-600 font-medium hover:underline text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {/* Payments */}
              {(recentTransactions.payments || []).slice(0, 3).map((pay) => (
                <tr key={pay._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-slate-600">{formatDateIST(pay.receivedDate || pay.paidAt)}</td>
                  <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Receipt ({pay.paymentMode})
                  </td>
                  <td className="p-3 text-slate-700">{pay.client?.company || pay.client?.name || 'Client'}</td>
                  <td className="p-3 font-bold text-emerald-600">+{formatINR(pay.amount)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700">
                      Confirmed
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('income')}
                      className="text-emerald-600 font-medium hover:underline text-xs"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}

              {/* Expenses */}
              {(recentTransactions.expenses || []).slice(0, 3).map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-slate-600">{formatDateIST(exp.date)}</td>
                  <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Expense ({exp.category})
                  </td>
                  <td className="p-3 text-slate-700">{exp.vendor || exp.title}</td>
                  <td className="p-3 font-bold text-rose-600">-{formatINR(exp.amount)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        exp.paymentStatus === 'paid' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {exp.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateSection('expenses')}
                      className="text-rose-600 font-medium hover:underline text-xs"
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
