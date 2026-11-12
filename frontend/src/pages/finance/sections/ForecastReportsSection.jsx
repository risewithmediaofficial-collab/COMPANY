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
} from '@/components/ui/muiIcons';
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
      <div className="bg-card p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-secondary/75 p-1">
          <button
            onClick={() => setReportType('forecast')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              reportType === 'forecast'
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Six-Month Cash Forecast</span>
          </button>
          <button
            onClick={() => setReportType('aging')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              reportType === 'aging'
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Receivables Aging Buckets</span>
          </button>
          <button
            onClick={() => setReportType('pnl')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              reportType === 'pnl'
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Monthly Profit &amp; Loss</span>
          </button>
        </div>

        {reportType === 'forecast' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-medium">Scenario:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="rounded-xl px-3 py-1.5 font-semibold text-foreground bg-background focus:ring-2 focus:ring-brand/40 outline-none cursor-pointer"
            >
              <option value="expected">Expected (100% Inflow / 100% Outflow)</option>
              <option value="conservative">Conservative (85% Inflow / 108% Outflow)</option>
              <option value="growth">Growth (115% Inflow / 95% Outflow)</option>
            </select>
            <button
              onClick={handleExportForecast}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-background hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        )}

        {reportType === 'aging' && (
          <button
            onClick={handleExportAging}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-background hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export Aging CSV
          </button>
        )}

        {reportType === 'pnl' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl px-3 py-1.5 font-semibold text-foreground bg-background focus:ring-2 focus:ring-brand/40 outline-none cursor-pointer"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
            <button
              onClick={handleExportPnl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-background hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export P&amp;L CSV
            </button>
          </div>
        )}
      </div>

      {/* 1. SIX-MONTH CASH FORECAST */}
      {reportType === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Average Monthly Outflows</span>
              <div className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{formatINR(forecastData.monthlyAverageBurn || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Estimated salaries, tools &amp; overhead</div>
            </div>

            <div className="bg-card p-5 rounded-2xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cash Runway Status</span>
              <div className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {typeof forecastData.runwayMonths === 'number'
                  ? `${forecastData.runwayMonths} Months`
                  : forecastData.runwayMonths || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Under {scenario} scenario assumptions</div>
            </div>
          </div>

          {/* Forecast Timeline Chart */}
          <div className="bg-card p-5 sm:p-6 rounded-2xl">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-foreground">Projected Cash Balance Trajectory</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastMonths} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground) / 0.06)" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => Math.abs(val) >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
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
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="closingCash" stroke="#12B7D4" strokeWidth={3} name="Closing Cash" dot={{ r: 4, fill: '#12B7D4' }} />
                  <Line type="monotone" dataKey="projectedInflow" stroke="#0891b2" strokeWidth={2} name="Projected Collections" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="projectedOutflow" stroke="#94a3b8" strokeWidth={2} name="Projected Disbursements" strokeDasharray="2 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month by month forecast breakdown table */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <div className="p-5">
              <h3 className="text-sm font-bold text-foreground">Forecast Cashbook Matrix (6 Months)</h3>
            </div>
            <div className="responsive-table-container overflow-y-auto max-h-[480px] text-xs px-2 pb-2">
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-secondary/70 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-lg">Month</th>
                    <th className="p-3 text-right">Opening Cash</th>
                    <th className="p-3 text-right">Expected Inflows</th>
                    <th className="p-3 text-right">Salaries Outflow</th>
                    <th className="p-3 text-right">Tools &amp; Overhead</th>
                    <th className="p-3 text-right">Net Cash Movement</th>
                    <th className="p-3 text-right rounded-r-lg">Projected Closing Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {forecastMonths.map((m) => (
                    <tr key={m.monthIndex} className="hover:bg-background/60 transition-colors">
                      <td className="p-3 font-bold text-foreground">{m.monthLabel}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatINR(m.openingCash)}</td>
                      <td className="p-3 text-right font-semibold text-foreground">+{formatINR(m.projectedInflow)}</td>
                      <td className="p-3 text-right text-muted-foreground">-{formatINR(m.breakdownOutflow?.salaries || 0)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        -{formatINR((m.breakdownOutflow?.subscriptions || 0) + (m.breakdownOutflow?.overhead || 0))}
                      </td>
                      <td className="p-3 text-right font-bold">
                        <span className={m.netMovement >= 0 ? 'text-foreground' : 'text-muted-foreground'}>
                          {m.netMovement >= 0 ? '+' : ''}
                          {formatINR(m.netMovement)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-foreground text-sm">{formatINR(m.closingCash)}</td>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(agingData.buckets || []).map((b) => (
              <div key={b.label} className="bg-card p-5 rounded-2xl">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{b.label}</span>
                <div className="text-xl font-bold mt-1.5 text-foreground tabular-nums">
                  {formatINR(b.total)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{b.count} Invoices</div>
              </div>
            ))}
          </div>

          {/* Aging Details Table */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <div className="p-5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-foreground">Detailed Receivables Aging Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Outstanding: <strong className="text-foreground tabular-nums">{formatINR(agingData.totalOutstanding)}</strong>
                </p>
              </div>
            </div>

            <div className="responsive-table-container overflow-y-auto max-h-[500px] text-xs px-2 pb-2">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-secondary/70 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-lg">Aging Bucket</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-center">Days Overdue</th>
                    <th className="p-3 text-right">Total Billed</th>
                    <th className="p-3 text-right rounded-r-lg">Balance Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {(agingData.buckets || []).flatMap((b) =>
                    (b.invoices || []).map((inv) => (
                      <tr key={inv._id} className="hover:bg-background/60 transition-colors">
                        <td className="p-3 font-semibold text-muted-foreground">{b.label}</td>
                        <td className="p-3 font-bold text-foreground">{inv.invoiceNumber}</td>
                        <td className="p-3 font-medium text-foreground">{inv.clientName}</td>
                        <td className="p-3 text-muted-foreground">{formatDateIST(inv.dueDate)}</td>
                        <td className="p-3 text-center">
                          {inv.daysOverdue > 0 ? (
                            <span className="font-bold text-foreground">{inv.daysOverdue} days</span>
                          ) : (
                            <span className="text-muted-foreground font-semibold">Not Due</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{formatINR(inv.totalAmount)}</td>
                        <td className="p-3 text-right font-bold text-foreground text-sm">
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
          <div className="bg-card p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ANNUAL PERFORMANCE {selectedYear}</span>
              <div className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                Net Profit: {formatINR(pnlData.totalNetProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                Annual Margin: <strong className="text-foreground">{pnlData.annualMargin !== null ? `${pnlData.annualMargin}%` : 'N/A'}</strong> on Total Service Revenue of {formatINR(pnlData.totalServiceRevenue)}
              </p>
            </div>
          </div>

          {/* Monthly P&L Table */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <div className="p-5">
              <h3 className="text-sm font-bold text-foreground">Profit &amp; Loss Statement: {selectedYear}</h3>
            </div>

            <div className="responsive-table-container overflow-y-auto max-h-[500px] text-xs px-2 pb-2">
              <table className="w-full min-w-[750px] text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-secondary/70 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-lg">Month</th>
                    <th className="p-3 text-right">Service Revenue</th>
                    <th className="p-3 text-right">Direct Service Costs</th>
                    <th className="p-3 text-right">Gross Contribution</th>
                    <th className="p-3 text-right">Salaries Expense</th>
                    <th className="p-3 text-right">Other Overhead</th>
                    <th className="p-3 text-right">Net Profit</th>
                    <th className="p-3 text-right rounded-r-lg">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {(pnlData.monthlyBreakdown || []).map((m) => (
                    <tr key={m.monthIndex} className="hover:bg-background/60 transition-colors">
                      <td className="p-3 font-bold text-foreground">{m.monthName}</td>
                      <td className="p-3 text-right font-semibold text-foreground">{formatINR(m.serviceRevenue)}</td>
                      <td className="p-3 text-right text-muted-foreground">-{formatINR(m.directCosts)}</td>
                      <td className="p-3 text-right font-bold text-foreground">{formatINR(m.grossContribution)}</td>
                      <td className="p-3 text-right text-muted-foreground">-{formatINR(m.salaryExpenses)}</td>
                      <td className="p-3 text-right text-muted-foreground">-{formatINR(m.otherOverhead)}</td>
                      <td className="p-3 text-right font-bold text-sm text-foreground">
                        {formatINR(m.netProfit)}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">
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
