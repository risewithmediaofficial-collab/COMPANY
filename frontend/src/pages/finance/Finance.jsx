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
  Lock,
  Receipt,
  Briefcase,
  Percent,
  Package,
  Settings,
} from '@/components/ui/muiIcons';

const OverviewSection = lazy(() => import('./sections/OverviewSection'));
const QuotationsSection = lazy(() => import('./sections/QuotationsSection'));
const InvoicesSection = lazy(() => import('./sections/InvoicesSection'));
const PaymentsSection = lazy(() => import('./sections/PaymentsSection'));
const ClientsSection = lazy(() => import('./sections/ClientsSection'));
const ProjectsFinanceSection = lazy(() => import('./sections/ProjectsFinanceSection'));
const ExpensesSection = lazy(() => import('./sections/ExpensesSection'));
const PayrollSection = lazy(() => import('./sections/PayrollSection'));
const SubscriptionsSection = lazy(() => import('./sections/SubscriptionsSection'));
const VendorsSection = lazy(() => import('./sections/VendorsSection'));
const AssetsSection = lazy(() => import('./sections/AssetsSection'));
const GstTaxesSection = lazy(() => import('./sections/GstTaxesSection'));
const ForecastReportsSection = lazy(() => import('./sections/ForecastReportsSection'));
const SettingsSection = lazy(() => import('./sections/SettingsSection'));
const LoansSection = lazy(() => import('./sections/LoansSection'));
const FinanceLoginGate = lazy(() => import('./components/FinanceLoginGate'));
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

// Suggested Sidebar Order:
// Overview | Quotations | Invoices | Payments | Clients | Projects | Expenses | Payroll | Subscriptions | Vendors | Assets | GST & Taxes | Reports | Settings
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: Banknote },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'expenses', label: 'Expenses', icon: ArrowUpRight },
  { id: 'payroll', label: 'Payroll', icon: Landmark },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'vendors', label: 'Vendors', icon: Building },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'taxes', label: 'GST & Taxes', icon: Percent },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'loans', label: 'Loans Tracker', icon: ShieldCheck },
];

const VALID_TABS = [
  'overview',
  'quotations',
  'invoices',
  'payments',
  'income',
  'clients',
  'projects',
  'expenses',
  'payroll',
  'subscriptions',
  'vendors',
  'assets',
  'taxes',
  'reports',
  'forecast-reports',
  'settings',
  'loans',
];

export default function Finance() {
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const { section } = useParams();
  const navigate = useNavigate();

  // Finance Security Session Authentication State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('rwm_finance_auth_token') === 'true';
  });

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
  const rawTab = section || searchParams.get('tab') || 'overview';
  const normalizedTab = rawTab === 'income' ? 'payments' : rawTab === 'forecast-reports' ? 'reports' : rawTab;
  const initialTab = VALID_TABS.includes(normalizedTab) ? normalizedTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Quick Add Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddAction, setQuickAddAction] = useState('invoice');

  // Global Date Filter state
  const { startDate, endDate } = useDateFilter();

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = section || searchParams.get('tab') || 'overview';
    const normalized = tabFromUrl === 'income' ? 'payments' : tabFromUrl === 'forecast-reports' ? 'reports' : tabFromUrl;
    const resolvedTab = VALID_TABS.includes(normalized) ? normalized : 'overview';
    if (resolvedTab !== activeTab) {
      startTransition(() => {
        setActiveTab(resolvedTab);
      });
    }
    if (searchParams.get('tab') && !VALID_TABS.includes(searchParams.get('tab'))) {
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
    enabled: isUnlocked && activeTab === 'overview',
  });

  const openQuickAdd = (action = 'invoice') => {
    setQuickAddAction(action);
    setQuickAddOpen(true);
  };

  const handleLockPortal = () => {
    sessionStorage.removeItem('rwm_finance_auth_token');
    sessionStorage.removeItem('rwm_finance_auth_time');
    setIsUnlocked(false);
  };

  // If not authenticated for Finance, render the restricted security login gate
  if (!isUnlocked) {
    return (
      <Suspense fallback={<FinanceSectionSkeleton />}>
        <FinanceLoginGate
          user={user}
          onAuthenticated={() => setIsUnlocked(true)}
        />
      </Suspense>
    );
  }

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* ── TOP DASHBOARD CONTROL CARD ──────────────────────────────────── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shrink-0 shadow-xs">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  Finance Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Restricted
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                RiseWithMedia Financial Operating System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'overview' && (
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[38px]"
                title="Refresh Finance Overview"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span>Refresh</span>
              </button>
            )}

            {/* Central Add New Button */}
            <button
              onClick={() => openQuickAdd('invoice')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[38px] shadow-xs"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add New</span>
            </button>

            {/* Lock Portal Button */}
            <button
              type="button"
              onClick={handleLockPortal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary/80 hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[38px]"
              title="Lock Finance Portal"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>

        {/* ── 14 HORIZONTAL SECTION NAVIGATION TABS (SUGGESTED ORDER) ───── */}
        <div className="mt-4 pt-3 border-t border-border/30 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 min-h-[36px] cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
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
        <Suspense fallback={<FinanceSectionSkeleton />}>
          {activeTab === 'overview' && (
            <OverviewSection
              overviewData={overviewData}
              onQuickAdd={openQuickAdd}
              onNavigateSection={handleTabChange}
            />
          )}

          {activeTab === 'quotations' && (
            <QuotationsSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'invoices' && (
            <InvoicesSection
              onQuickAdd={openQuickAdd}
              onRecordPayment={() => openQuickAdd('receipt')}
            />
          )}

          {(activeTab === 'payments' || activeTab === 'income') && (
            <PaymentsSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'clients' && (
            <ClientsSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'projects' && (
            <ProjectsFinanceSection />
          )}

          {activeTab === 'expenses' && (
            <ExpensesSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'payroll' && (
            <PayrollSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'vendors' && (
            <VendorsSection onQuickAdd={openQuickAdd} />
          )}

          {activeTab === 'assets' && (
            <AssetsSection />
          )}

          {activeTab === 'taxes' && (
            <GstTaxesSection />
          )}

          {(activeTab === 'reports' || activeTab === 'forecast-reports') && (
            <ForecastReportsSection />
          )}

          {activeTab === 'settings' && (
            <SettingsSection onLockFinance={handleLockPortal} />
          )}

          {activeTab === 'loans' && (
            <LoansSection onQuickAdd={openQuickAdd} />
          )}
        </Suspense>
      </div>

      {/* ── CENTRAL QUICK ADD MODAL ───────────────────────────────────── */}
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
