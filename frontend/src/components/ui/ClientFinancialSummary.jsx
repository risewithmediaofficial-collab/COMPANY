import { IndianRupee, TrendingUp, FileText, AlertCircle } from '@/components/ui/muiIcons';
import { useClientProjectsFinance } from '../../hooks/useProjectFinance';
import { formatINR } from '../../utils/currency';
import { Badge } from './badge';

/**
 * ClientFinancialSummary - Display financial overview for a client
 */
const ClientFinancialSummary = ({ clientId, clientName, clientTier = 'growth' }) => {
  const { data: financeData, isLoading } = useClientProjectsFinance(clientId);

  const getHealthStatus = (margin) => {
    const m = parseFloat(margin);
    if (m >= 40) return { label: 'Excellent', code: 'EX' };
    if (m >= 20) return { label: 'Good', code: 'GD' };
    if (m >= 0) return { label: 'Fair', code: 'FR' };
    return { label: 'Poor', code: 'PR' };
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!financeData) {
    return (
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 text-center text-muted-foreground">
        No financial data available
      </div>
    );
  }

  const healthStatus = getHealthStatus(financeData.avgProfitMargin);
  const profitMarginPercentage = parseFloat(financeData.avgProfitMargin);

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Financial Summary</h3>
          <p className="text-sm text-muted-foreground">{clientName} • Tier: {clientTier}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center text-sm font-black tracking-wider shrink-0">
          {healthStatus.code}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 tabular-nums">
        {/* Total Income */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">TOTAL INCOME</span>
            <IndianRupee size={16} className="text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatINR(financeData.totalIncome)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">{financeData.projects.length} projects</div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">TOTAL EXPENSES</span>
            <TrendingUp size={16} className="text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatINR(financeData.totalExpenses)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {financeData.totalBudget > 0
              ? `${((financeData.totalExpenses / financeData.totalBudget) * 100).toFixed(0)}% of budget`
              : 'No budget set'}
          </div>
        </div>

        {/* Total Profit */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">TOTAL PROFIT</span>
            <TrendingUp size={16} className="text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatINR(financeData.totalProfit)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {financeData.activeProjects} active
          </div>
        </div>

        {/* Health Status */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">AVG MARGIN</span>
            <AlertCircle size={16} className="text-muted-foreground shrink-0" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {financeData.avgProfitMargin}%
          </div>
          <Badge variant="secondary" className="mt-2 w-fit border border-border">
            {healthStatus.label}
          </Badge>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border tabular-nums">
        {/* Budget Overview */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <IndianRupee size={16} className="shrink-0" />
            Budget Overview
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Budget</span>
              <span className="font-semibold text-foreground">{formatINR(financeData.totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilized</span>
              <span className="font-semibold text-foreground">
                {financeData.totalBudget > 0
                  ? `${((financeData.totalExpenses / financeData.totalBudget) * 100).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-semibold text-foreground">
                {formatINR(Math.max(0, financeData.totalBudget - financeData.totalExpenses))}
              </span>
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <FileText size={16} className="shrink-0" />
            Project Stats
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Projects</span>
              <Badge variant="outline" className="bg-secondary">
                {financeData.activeProjects}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Projects</span>
              <span className="font-semibold text-foreground">{financeData.projects.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg ROI</span>
              <span className="font-semibold text-foreground">
                {financeData.projects.length > 0
                  ? `${(financeData.projects.reduce((sum, p) => sum + parseFloat(p.roi), 0) / financeData.projects.length).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Projects */}
      {financeData.projects.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3 tabular-nums">
          <h4 className="font-semibold text-sm">Top Performing Projects</h4>
          <div className="space-y-2">
            {financeData.projects
              .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
              .slice(0, 3)
              .map((project) => (
                <div key={project._id} className="p-2 rounded-lg bg-secondary/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(project.profit)} profit</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap ml-2">
                    {project.profitMargin}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFinancialSummary;
