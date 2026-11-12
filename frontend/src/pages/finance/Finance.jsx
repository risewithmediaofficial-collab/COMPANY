import { useState, useMemo, useEffect, lazy, Suspense, startTransition } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Building,
  FileText,
  Banknote,
  ShieldCheck,
  TrendingUp,
  Plus,
  Search,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
  RefreshCw,
  Landmark,
  X,
} from '@/components/ui/muiIcons';

const OverviewSection = lazy(() => import('./sections/OverviewSection'));
const IncomeSection = lazy(() => import('./sections/IncomeSection'));
const ExpensesSection = lazy(() => import('./sections/ExpensesSection'));
const ClientsSection = lazy(() => import('./sections/ClientsSection'));
const InvoicesSection = lazy(() => import('./sections/InvoicesSection'));
const PayrollSection = lazy(() => import('./sections/PayrollSection'));
const LoansSection = lazy(() => import('./sections/LoansSection'));
const ForecastReportsSection = lazy(() => import('./sections/ForecastReportsSection'));
const FinanceQuickAddModal = lazy(() => import('./components/FinanceQuickAddModal'));

const FinanceSectionSkeleton = () => (
  <div className="w-full py-12 flex flex-col items-center justify-center space-y-3">
    <div className="h-7 w-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    <span className="text-[11px] font-medium text-muted-foreground animate-pulse">Loading finance data...</span>
  </div>
);

import { useFinanceModuleOverview } from '../../hooks/useFinance';
import { formatINR } from '../../utils/financeFormatters';
import { useDateFilter } from '../../context/DateFilterContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'income', label: 'Income', icon: ArrowDownRight },
  { id: 'expenses', label: 'Expenses', icon: ArrowUpRight },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payroll', label: 'Payroll', icon: Banknote },
  { id: 'loans', label: 'Loans Tracker', icon: Landmark },
  { id: 'forecast-reports', label: 'Forecast & Reports', icon: TrendingUp },
];

export default function Finance() {
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const { section } = useParams();
  const navigate = useNavigate();

  // Strict Client Protection: Clients only have access to their individual invoices
  useEffect(() => {
    if (user?.role === 'client') {
      navigate('/portal/invoices', { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === 'client') {
    return null;
  }

  // Active section (from URL query param, route param, or default 'overview')
  const validTabs = ['overview', 'income', 'expenses', 'clients', 'invoices', 'payroll', 'loans', 'forecast-reports'];
  const rawTab = section || searchParams.get('tab') || 'overview';
  const initialTab = validTabs.includes(rawTab) ? rawTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Quick Add Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddAction, setQuickAddAction] = useState('invoice');

  // Global Date Filter state
  const { startDate, endDate } = useDateFilter();

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = section || searchParams.get('tab') || 'overview';
    const resolvedTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview';
    if (resolvedTab !== activeTab) {
      startTransition(() => {
        setActiveTab(resolvedTab);
      });
    }
    if (searchParams.get('tab') && !validTabs.includes(searchParams.get('tab'))) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
  }, [section, searchParams, activeTab]);

  const handleTabChange = (tabId) => {
    startTransition(() => {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId });
    });
  };

  // Determine date ranges for overview query from global filter
  const dateParams = useMemo(() => {
    const res = {};
    if (startDate) res.startDate = startDate;
    if (endDate) res.endDate = endDate;
    return res;
  }, [startDate, endDate]);

  // Only load heavy overview data when Overview tab is active
  const { data: overviewData = {}, isLoading: overviewLoading, refetch } = useFinanceModuleOverview(dateParams, {
    enabled: activeTab === 'overview',
  });

  const openQuickAdd = (action = 'invoice') => {
    setQuickAddAction(action);
    setQuickAddOpen(true);
  };

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* ── TOP DASHBOARD CONTROL CARD ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs font-bold text-lg shrink-0">
              ₹
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Finance</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'overview' && (
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border bg-card hover:bg-secondary text-foreground font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[38px]"
                title="Refresh Finance Overview"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span>Refresh</span>
              </button>
            )}
            {/* Central Add New Button */}
            <button
              onClick={() => openQuickAdd('invoice')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer min-h-[38px]"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* ── 10 HORIZONTAL SECTION NAVIGATION TABS ───────────────────────── */}
        <div className="mt-4 pt-3 border-t border-border overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 min-h-[38px] ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────── */}
      <div className="space-y-5">
        {/* ── SECTION SWITCHER ────────────────────────────────────────── */}
        <Suspense fallback={<FinanceSectionSkeleton />}>
          {activeTab === 'overview' && (
            <OverviewSection
              overviewData={overviewData}
              onQuickAdd={openQuickAdd}
              onNavigateSection={handleTabChange}
            />
          )}

          {activeTab === 'income' && <IncomeSection onQuickAdd={openQuickAdd} />}

          {activeTab === 'expenses' && <ExpensesSection onQuickAdd={openQuickAdd} />}

          {activeTab === 'clients' && <ClientsSection onQuickAdd={openQuickAdd} />}

          {activeTab === 'invoices' && (
            <InvoicesSection
              onQuickAdd={openQuickAdd}
              onRecordPayment={(inv) => {
                openQuickAdd('receipt');
              }}
            />
          )}

          {activeTab === 'payroll' && <PayrollSection onQuickAdd={openQuickAdd} />}

          {activeTab === 'loans' && <LoansSection onQuickAdd={openQuickAdd} />}

          {activeTab === 'forecast-reports' && <ForecastReportsSection />}
        </Suspense>
      </div>

      {/* ── CENTRAL QUICK ADD MODAL (Handles all 8 action flows) ────── */}
      {quickAddOpen && (
        <Suspense fallback={null}>
          <FinanceQuickAddModal
            open={quickAddOpen}
            onOpenChange={setQuickAddOpen}
            initialAction={quickAddAction}
          />
        </Suspense>
      )}
    </div>
  );
}
