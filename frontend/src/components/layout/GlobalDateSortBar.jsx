import { Calendar, X } from '@/components/ui/muiIcons';
import { useDateFilter } from '@/context/DateFilterContext';

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
      className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-2xs"
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
          <Calendar className="h-3.5 w-3.5 text-foreground shrink-0" />
          <span>Date Filter</span>
        </div>

        {/* Exact 4 options strictly in order: 1. This Month, 2. Previous Month, 3. Yearly, 4. Date to Date */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-secondary/70 border border-border p-0.5">
          {DATE_SORT_OPTIONS.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleOptionClick(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Inline Date-to-Date range inputs when Date to Date is active */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2 py-1">
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
              className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground tabular-nums cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Right side: active range badge + single reset */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {startDate || endDate ? (
          <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground tabular-nums">
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
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GlobalDateSortBar;
