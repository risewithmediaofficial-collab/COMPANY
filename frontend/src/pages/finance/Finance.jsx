import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';

import OverviewSection from './sections/OverviewSection';
import IncomeSection from './sections/IncomeSection';
import ExpensesSection from './sections/ExpensesSection';
import ClientsSection from './sections/ClientsSection';
import InvoicesSection from './sections/InvoicesSection';
import PayrollSection from './sections/PayrollSection';
import ForecastReportsSection from './sections/ForecastReportsSection';
import FinanceQuickAddModal from './components/FinanceQuickAddModal';

import { useFinanceModuleOverview } from '../../hooks/useFinance';
import { formatINR } from '../../utils/financeFormatters';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'income', label: 'Income', icon: ArrowDownRight },
  { id: 'expenses', label: 'Expenses', icon: ArrowUpRight },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payroll', label: 'Payroll', icon: Banknote },
  { id: 'forecast-reports', label: 'Forecast & Reports', icon: TrendingUp },
];

export default function Finance() {
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const { section } = useParams();
  const navigate = useNavigate();

  // Active section (from URL query param, route param, or default 'overview')
  const rawTab = section || searchParams.get('tab') || 'overview';
  const initialTab = rawTab === 'cash-flow' || rawTab === 'founders' || rawTab === 'settings' ? 'overview' : rawTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Quick Add Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddAction, setQuickAddAction] = useState('invoice');

  // Filter States
  const [periodFilter, setPeriodFilter] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Sync tab with URL
  useEffect(() => {
    let tabFromUrl = section || searchParams.get('tab');
    if (tabFromUrl === 'cash-flow' || tabFromUrl === 'founders' || tabFromUrl === 'settings') {
      tabFromUrl = 'overview';
      setSearchParams({ tab: 'overview' });
    }
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [section, searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Determine date ranges for overview query
  const dateParams = useMemo(() => {
    const now = new Date();
    if (periodFilter === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (periodFilter === 'this_week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      return { startDate: firstDay.toISOString().slice(0, 10) };
    }
    if (periodFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { startDate: start };
    }
    if (periodFilter === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
      return { startDate: start };
    }
    if (periodFilter === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      return { startDate: start };
    }
    if (periodFilter === 'custom') {
      const res = {};
      if (customStartDate) res.startDate = customStartDate;
      if (customEndDate) res.endDate = customEndDate;
      return res;
    }
    return {};
  }, [periodFilter, customStartDate, customEndDate]);

  const { data: overviewData = {}, isLoading: overviewLoading, refetch } = useFinanceModuleOverview(dateParams);

  const openQuickAdd = (action = 'invoice') => {
    setQuickAddAction(action);
    setQuickAddOpen(true);
  };

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* ── TOP DASHBOARD CONTROL CARD ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-sm font-bold text-lg">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">RiseWithMedia Finance</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Double-Entry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Operating System · Multi-item billing, cashflow, payroll & partner ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Central Add New Button */}
            <button
              onClick={() => openQuickAdd('invoice')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all hover:shadow hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* ── 10 HORIZONTAL SECTION NAVIGATION TABS ───────────────────────── */}
        <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────── */}
      <div className="space-y-5">
        {/* PERIOD & DATE FILTER BAR (Active on Overview) */}
        {activeTab === 'overview' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Period:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'this_quarter', label: 'This Quarter' },
                    { id: 'this_year', label: 'This Year' },
                    { id: 'all_time', label: 'All Time' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPeriodFilter(p.id);
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        periodFilter === p.id
                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date to Date Picker */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium text-[11px]">Date Range:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPeriodFilter('custom');
                  }}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50/50 text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-400 font-bold text-[10px]">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPeriodFilter('custom');
                  }}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50/50 text-slate-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                />
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setPeriodFilter('this_month');
                    }}
                    className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors font-bold text-xs"
                    title="Clear Date Range"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold text-xs cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        )}

        {/* ── SECTION SWITCHER ────────────────────────────────────────── */}
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

        {activeTab === 'forecast-reports' && <ForecastReportsSection />}
      </div>

      {/* ── CENTRAL QUICK ADD MODAL (Handles all 8 action flows) ────── */}
      <FinanceQuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialAction={quickAddAction}
      />
    </div>
  );
}
