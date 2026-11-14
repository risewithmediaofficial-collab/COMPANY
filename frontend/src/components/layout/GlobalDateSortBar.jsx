import { useLocation } from 'react-router-dom';
import { Calendar, X } from '@/components/ui/muiIcons';
import { useDateFilter } from '@/context/DateFilterContext';

/**
 * Strict whitelist of routes that legitimately require global date range filtering.
 * Pages with their own dedicated calendar/month navigation (e.g. /attendance, /smm/tracker, /calendar),
 * static resource libraries (/sop, /assets), directory/user registries (/admin/users, /clients, /hr, /influencers),
 * system utilities (/settings, /automations, /audit-logs, /recycle-bin), and single-entity detail pages
 * are intentionally excluded so the layout remains clean and uncluttered.
 */
export const ALLOWED_DATE_FILTER_ROUTES = [
  '/',
  '/reports',
  '/crm/leads',
  '/projects',
  '/tasks',
  '/manager-tasks',
  '/call-history',
  '/my-eod-reports',
  '/finance',
  '/smm',
  '/smm/campaigns',
  '/smm/adsets',
  '/smm/ads',
  '/smm/budget',
  '/smm/performance',
  '/smm/analytics',
  '/smm/reports',
  '/smm/daily-tracking',
  '/smm/call-logs',
  '/smm/leads',
  '/smm/content',
  '/development',
  '/development/board',
  '/development/my-tasks',
  '/development/sprints',
  '/development/reviews',
  '/development/qa',
  '/development/releases',
];

export const shouldShowGlobalDateFilter = (rawPathname) => {
  if (!rawPathname) return false;
  // Normalize trailing slashes (e.g. '/finance/' -> '/finance')
  const pathname = rawPathname.replace(/\/+$/, '') || '/';

  // Explicitly allow exact routes in whitelist
  if (ALLOWED_DATE_FILTER_ROUTES.includes(pathname)) return true;

  // Explicitly allow all Finance OS sub-sections (e.g. /finance/invoices, /finance/expenses, etc.)
  if (pathname.startsWith('/finance/')) return true;

  return false;
};

const DATE_SORT_OPTIONS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Date to Date' },
];

const formatRangeLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const GlobalDateSortBar = () => {
  const location = useLocation();

  const {
    startDate,
    endDate,
    period,
    setPeriod,
    openCustomRange,
    setFromDate,
    setToDate,
    resetDateFilter,
    isFiltered,
  } = useDateFilter();

  // If the current route does not require date filtering, render nothing
  if (!shouldShowGlobalDateFilter(location.pathname)) {
    return null;
  }

  const handleOptionClick = (id) => {
    if (id === 'custom') {
      openCustomRange();
      return;
    }
    if (period === id) {
      resetDateFilter();
      return;
    }
    setPeriod(id);
  };

  return (
    <div
      data-testid="global-date-sort-bar"
      className="mb-4 sm:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-2xl bg-card p-2.5 sm:px-3.5 sm:py-2"
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0 w-full md:w-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Date Filter</span>
        </div>

        {/* Exact 4 options strictly in order: 1. This Month, 2. Previous Month, 3. Yearly, 4. Date to Date */}
        <div className="flex items-center gap-1 rounded-xl bg-secondary/80 p-1 overflow-x-auto max-w-full custom-scrollbar">
          {DATE_SORT_OPTIONS.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleOptionClick(opt.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/70'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Inline Date-to-Date range inputs when Date to Date is active */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-secondary/75 px-2 py-1 w-full sm:w-auto">
            <input
              type="date"
              aria-label="From Date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (_) {}
              }}
              className="h-7 min-w-[120px] flex-1 sm:flex-initial rounded-lg bg-background px-2 text-xs font-medium text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <span className="text-[11px] font-semibold text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="To Date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (_) {}
              }}
              className="h-7 min-w-[120px] flex-1 sm:flex-initial rounded-lg bg-background px-2 text-xs font-medium text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        )}
      </div>

      {/* Right side: active range badge + single reset */}
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto md:ml-auto shrink-0 pt-1 md:pt-0 border-t border-border/40 md:border-none">
        {startDate || endDate ? (
          <span className="rounded-lg bg-brand/12 px-2.5 py-1 text-[11px] font-semibold text-primary tabular-nums">
            {startDate ? formatRangeLabel(startDate) : 'Start'}
            {' – '}
            {endDate ? formatRangeLabel(endDate) : 'Today'}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">All Dates</span>
        )}

        {isFiltered && (
          <button
            type="button"
            onClick={resetDateFilter}
            title="Clear Date Filter"
            aria-label="Clear Date Filter"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GlobalDateSortBar;
