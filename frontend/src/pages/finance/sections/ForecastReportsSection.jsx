import { useState } from 'react';
import {
  Download,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  useCashForecast,
  useReceivablesAging,
  useMonthlyPnl,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';

export default function ForecastReportsSection() {
  const [reportType, setReportType] = useState('forecast'); // 'forecast' | 'aging' | 'pnl'
  const [scenario, setScenario] = useState('expected'); // 'conservative' | 'expected' | 'growth'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: forecastData = { forecastMonths: [] } } = useCashForecast(scenario);
  const { data: agingData = { buckets: [], totalOutstanding: 0 } } = useReceivablesAging();
  const { data: pnlData = { monthlyBreakdown: [] } } = useMonthlyPnl(selectedYear);

  const forecastMonths = forecastData.forecastMonths || [];

  const handleExportForecast = () => {
    const rows = forecastMonths.map((m) => ({
      month: m.monthLabel,
      opening: m.openingCash,
      inflows: m.projectedInflow,
      outflows: m.projectedOutflow,
      net: m.netMovement,
      closing: m.closingCash,
    }));
    exportToCSV(`six_month_cash_forecast_${scenario}`, rows, [
      { key: 'month', label: 'Month' },
      { key: 'opening', label: 'Opening Cash (INR)' },
      { key: 'inflows', label: 'Projected Collections (INR)' },
      { key: 'outflows', label: 'Projected Outflows (INR)' },
      { key: 'net', label: 'Net Cash Flow (INR)' },
      { key: 'closing', label: 'Closing Cash Balance (INR)' },
    ]);
  };

  const handleExportAging = () => {
    const rows = [];
    (agingData.buckets || []).forEach((b) => {
      (b.invoices || []).forEach((inv) => {
        rows.push({
          bucket: b.label,
          invoiceNumber: inv.invoiceNumber,
          client: inv.clientName,
          dueDate: formatDateIST(inv.dueDate),
          daysOverdue: inv.daysOverdue,
          total: inv.totalAmount,
          balance: inv.balanceAmount,
        });
      });
    });
    exportToCSV('receivables_aging_report', rows, [
      { key: 'bucket', label: 'Aging Bucket' },
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'client', label: 'Client' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'daysOverdue', label: 'Days Overdue' },
      { key: 'total', label: 'Invoice Total (INR)' },
      { key: 'balance', label: 'Outstanding Balance (INR)' },
    ]);
  };

  const handleExportPnl = () => {
    const rows = (pnlData.monthlyBreakdown || []).map((m) => ({
      month: m.monthName,
      revenue: m.serviceRevenue,
      directCosts: m.directCosts,
      contribution: m.grossContribution,
      overhead: m.overheadCosts,
      salaries: m.salaryExpenses,
      netProfit: m.netProfit,
      margin: m.marginPercent !== null ? `${m.marginPercent}%` : 'N/A',
    }));
    exportToCSV(`profit_and_loss_${selectedYear}`, rows, [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Recognized Revenue (INR)' },
      { key: 'directCosts', label: 'Direct Service Costs (INR)' },
      { key: 'contribution', label: 'Gross Contribution (INR)' },
      { key: 'overhead', label: 'Overhead Costs (INR)' },
      { key: 'salaries', label: 'Salaries (INR)' },
      { key: 'netProfit', label: 'Net Profit (INR)' },
      { key: 'margin', label: 'Net Profit Margin' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Report Switcher Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportType('forecast')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              reportType === 'forecast'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📈 Six-Month Cash Forecast
          </button>
          <button
            onClick={() => setReportType('aging')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              reportType === 'aging'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ⏱️ Receivables Aging Buckets
          </button>
          <button
            onClick={() => setReportType('pnl')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              reportType === 'pnl'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📑 Monthly Profit & Loss
          </button>
        </div>

        {reportType === 'forecast' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Scenario:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-800 bg-slate-50"
            >
              <option value="expected">Expected (100% Inflow / 100% Outflow)</option>
              <option value="conservative">Conservative (85% Inflow / 108% Outflow)</option>
              <option value="growth">Growth (115% Inflow / 95% Outflow)</option>
            </select>
            <button
              onClick={handleExportForecast}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        )}

        {reportType === 'aging' && (
          <button
            onClick={handleExportAging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Export Aging CSV
          </button>
        )}

        {reportType === 'pnl' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-800 bg-slate-50"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
            <button
              onClick={handleExportPnl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Export P&L CSV
            </button>
          </div>
        )}
      </div>

      {/* 1. SIX-MONTH CASH FORECAST */}
      {reportType === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Monthly Outflows</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">{formatINR(forecastData.monthlyAverageBurn || 0)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Estimated salaries, tools & overhead</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Cash Runway Status</span>
              <div className="text-2xl font-bold text-indigo-700 mt-1">
                {typeof forecastData.runwayMonths === 'number'
                  ? `${forecastData.runwayMonths} Months`
                  : forecastData.runwayMonths || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Under {scenario} scenario assumptions</div>
            </div>
          </div>

          {/* Forecast Timeline Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Projected Cash Balance Trajectory</h3>
              <p className="text-xs text-slate-500">6-month forecast of opening vs closing liquidity</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastMonths} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => Math.abs(val) >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                  />
                  <Tooltip
                    formatter={(val) => [formatINR(val), '']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="closingCash" stroke="#4f46e5" strokeWidth={3} name="Closing Cash" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="projectedInflow" stroke="#10b981" strokeWidth={2} name="Projected Collections" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="projectedOutflow" stroke="#ef4444" strokeWidth={2} name="Projected Disbursements" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month by month forecast breakdown table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Forecast Cashbook Matrix (6 Months)</h3>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[480px] text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Opening Cash</th>
                    <th className="p-3">Expected Inflows</th>
                    <th className="p-3">Salaries Outflow</th>
                    <th className="p-3">Tools & Overhead</th>
                    <th className="p-3">Net Cash Movement</th>
                    <th className="p-3 text-right">Projected Closing Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastMonths.map((m) => (
                    <tr key={m.monthIndex} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{m.monthLabel}</td>
                      <td className="p-3 text-slate-700">{formatINR(m.openingCash)}</td>
                      <td className="p-3 font-semibold text-emerald-600">+{formatINR(m.projectedInflow)}</td>
                      <td className="p-3 text-rose-600">-{formatINR(m.breakdownOutflow?.salaries || 0)}</td>
                      <td className="p-3 text-rose-600">
                        -{formatINR((m.breakdownOutflow?.subscriptions || 0) + (m.breakdownOutflow?.overhead || 0))}
                      </td>
                      <td className="p-3 font-bold">
                        <span className={m.netMovement >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.netMovement >= 0 ? '+' : ''}
                          {formatINR(m.netMovement)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-700 text-sm">{formatINR(m.closingCash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. RECEIVABLES AGING REPORT */}
      {reportType === 'aging' && (
        <div className="space-y-6">
          {/* Aging Buckets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(agingData.buckets || []).map((b, i) => (
              <div key={b.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{b.label}</span>
                <div
                  className={`text-lg font-bold mt-1 ${
                    i === 0 ? 'text-slate-800' : i === 1 ? 'text-amber-600' : 'text-rose-600'
                  }`}
                >
                  {formatINR(b.total)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{b.count} Invoices</div>
              </div>
            ))}
          </div>

          {/* Aging Details Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Detailed Receivables Aging Schedule</h3>
                <p className="text-xs text-slate-500">
                  Total Outstanding: <strong className="text-slate-800">{formatINR(agingData.totalOutstanding)}</strong>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[500px] text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Aging Bucket</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-center">Days Overdue</th>
                    <th className="p-3">Total Billed</th>
                    <th className="p-3 text-right">Balance Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(agingData.buckets || []).flatMap((b) =>
                    (b.invoices || []).map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600">{b.label}</td>
                        <td className="p-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="p-3 font-medium text-slate-800">{inv.clientName}</td>
                        <td className="p-3 text-slate-600">{formatDateIST(inv.dueDate)}</td>
                        <td className="p-3 text-center">
                          {inv.daysOverdue > 0 ? (
                            <span className="font-bold text-rose-600">{inv.daysOverdue} days</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Not Due</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700">{formatINR(inv.totalAmount)}</td>
                        <td className="p-3 text-right font-bold text-rose-700 text-sm">
                          {formatINR(inv.balanceAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY PROFIT & LOSS */}
      {reportType === 'pnl' && (
        <div className="space-y-6">
          {/* P&L Annual Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">ANNUAL PERFORMANCE {selectedYear}</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                Net Profit: {formatINR(pnlData.totalNetProfit)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Annual Margin: <strong>{pnlData.annualMargin !== null ? `${pnlData.annualMargin}%` : 'N/A'}</strong> on Total Service Revenue of {formatINR(pnlData.totalServiceRevenue)}
              </p>
            </div>
          </div>

          {/* Monthly P&L Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Profit & Loss Statement: {selectedYear}</h3>
              <p className="text-xs text-slate-500">
                Formula: Recognized Service Revenue − Direct Costs = Gross Contribution − Overhead = Net Profit
              </p>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[500px] text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Service Revenue</th>
                    <th className="p-3">Direct Service Costs</th>
                    <th className="p-3">Gross Contribution</th>
                    <th className="p-3">Salaries Expense</th>
                    <th className="p-3">Other Overhead</th>
                    <th className="p-3">Net Profit</th>
                    <th className="p-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(pnlData.monthlyBreakdown || []).map((m) => (
                    <tr key={m.monthIndex} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{m.monthName}</td>
                      <td className="p-3 font-semibold text-blue-600">{formatINR(m.serviceRevenue)}</td>
                      <td className="p-3 text-rose-600">-{formatINR(m.directCosts)}</td>
                      <td className="p-3 font-bold text-slate-800">{formatINR(m.grossContribution)}</td>
                      <td className="p-3 text-rose-600">-{formatINR(m.salaryExpenses)}</td>
                      <td className="p-3 text-rose-600">-{formatINR(m.otherOverhead)}</td>
                      <td className="p-3 font-bold text-sm">
                        <span className={m.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatINR(m.netProfit)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {m.marginPercent !== null ? `${m.marginPercent}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
