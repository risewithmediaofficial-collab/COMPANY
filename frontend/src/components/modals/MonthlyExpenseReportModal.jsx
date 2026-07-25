import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricCard, StatusBadge } from '../ui/page';
import { useMonthlyExpenseReport } from '../../hooks/useFinance';
import { Download, Printer, IndianRupee, Receipt, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [2023, 2024, 2025, 2026];

const CATEGORY_LABELS = {
  rj: 'RJ / Voice Over',
  video_shoot: 'Video Shoot',
  travel_allowance: 'Travel Allowance',
  ads_campaign: 'Ads Campaign Spend',
  salary: 'Salary',
  tools: 'Software Tools',
  advertising: 'Advertising',
  travel: 'Travel',
  office: 'Office & Rent',
  freelance: 'Freelancer Fees',
  misc: 'Miscellaneous',
  other: 'Other (Custom)',
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const MonthlyExpenseReportModal = ({ open, onOpenChange }) => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());

  const { data: report = {}, isLoading } = useMonthlyExpenseReport(
    { year: Number(year), month: Number(month) },
    { enabled: open }
  );

  const handleExportCSV = () => {
    if (!report.expenses || report.expenses.length === 0) {
      alert('No expense data to export for this month.');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Custom Category', 'Type', 'Amount (INR)', 'Client', 'Project', 'Status'];
    const rows = report.expenses.map((exp) => [
      exp.date ? new Date(exp.date).toLocaleDateString('en-IN') : '',
      `"${(exp.title || '').replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[exp.category] || exp.category || ''}"`,
      `"${(exp.customCategory || '').replace(/"/g, '""')}"`,
      exp.transactionType || 'Expense',
      exp.amount || 0,
      `"${(exp.client?.company || exp.client?.name || '').replace(/"/g, '""')}"`,
      `"${(exp.project?.name || '').replace(/"/g, '""')}"`,
      exp.status || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Expense_Report_${MONTH_NAMES[Number(month) - 1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryTotals = report.categoryTotals || {};
  const totalCatExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-w-full print:p-0">
        <DialogHeader className="print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Monthly Financial & Expense Report
              </DialogTitle>
              <DialogDescription>
                Comprehensive breakdown of revenue, expenses (RJ, Video Shoot, Travel Allowance, Ads Spend), and profits.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print Report
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/40 print:hidden mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Select Month:</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Year:</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px] bg-background">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">Monthly Expense & Financial Report</h1>
          <p className="text-sm text-gray-600">
            Period: {MONTH_NAMES[Number(month) - 1]} {year}
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading report...</div>
        ) : (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Monthly Revenue"
                value={currency.format(report.totalRevenue || 0)}
                helper="Invoices collected"
                icon={IndianRupee}
                tone="success"
              />
              <MetricCard
                label="Monthly Expenses"
                value={currency.format(report.totalExpenses || 0)}
                helper="Approved expenses"
                icon={Receipt}
                tone="danger"
              />
              <MetricCard
                label="Net Profit"
                value={currency.format(report.netProfit || 0)}
                helper={`Margin: ${report.profitMargin || 0}%`}
                icon={CheckCircle2}
                tone={Number(report.netProfit || 0) >= 0 ? 'success' : 'danger'}
              />
              <MetricCard
                label="Profits Added"
                value={currency.format(report.totalProfitsAdded || 0)}
                helper="Other profit inflows"
                icon={TrendingUp}
                tone="primary"
              />
            </div>

            {/* Category Breakdown */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="text-base font-bold text-foreground mb-4">
                Expense Breakdown by Category ({MONTH_NAMES[Number(month) - 1]} {year})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(categoryTotals).map(([catKey, amount]) => {
                  if (amount === 0) return null;
                  const pct = Math.round((amount / totalCatExpenses) * 100);
                  return (
                    <div key={catKey} className="rounded-xl border border-border/40 bg-background p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <span>{CATEGORY_LABELS[catKey] || catKey}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="text-lg font-bold text-foreground mt-1">{currency.format(amount)}</div>
                      </div>
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.values(categoryTotals).every((val) => val === 0) ? (
                  <p className="text-sm text-muted-foreground col-span-full py-2">No category expenses recorded for this month.</p>
                ) : null}
              </div>
            </div>

            {/* Expenses List */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="text-base font-bold text-foreground mb-3">
                Logged Transactions ({report.expensesCount || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Category / Type</th>
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Submitted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {report.expenses && report.expenses.length > 0 ? (
                      report.expenses.map((exp) => (
                        <tr key={exp._id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {exp.date ? new Date(exp.date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">{exp.title}</div>
                            {exp.notes ? <div className="text-[11px] text-muted-foreground">{exp.notes}</div> : null}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge tone="neutral">
                              {exp.category === 'other' && exp.customCategory
                                ? exp.customCategory
                                : CATEGORY_LABELS[exp.category] || exp.category}
                            </StatusBadge>
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge tone={exp.transactionType === 'Profit' ? 'success' : 'danger'}>
                              {exp.transactionType || 'Expense'}
                            </StatusBadge>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground">
                            {currency.format(exp.amount || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {exp.submittedBy?.name || 'System'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No transactions found for {MONTH_NAMES[Number(month) - 1]} {year}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
