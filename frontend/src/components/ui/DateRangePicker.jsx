import { Calendar, Filter, X, RotateCcw } from 'lucide-react';
import { useDateFilter } from '../../context/DateFilterContext';

export const DateRangePicker = ({
  fromDate: propFromDate,
  toDate: propToDate,
  onFromDateChange,
  onToDateChange,
  period: propPeriod,
  onPeriodChange,
  onReset,
  compact = false,
  className = '',
  title = 'Date Filter',
}) => {
  const globalFilter = useDateFilter();

  const fromDate = propFromDate !== undefined ? propFromDate : globalFilter.startDate;
  const toDate = propToDate !== undefined ? propToDate : globalFilter.endDate;
  const period = propPeriod !== undefined ? propPeriod : globalFilter.period;

  const handleFromChange = (e) => {
    const val = e.target.value;
    if (onFromDateChange) {
      onFromDateChange(val);
    } else {
      globalFilter.setFromDate(val);
    }
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    if (onToDateChange) {
      onToDateChange(val);
    } else {
      globalFilter.setToDate(val);
    }
  };

  const handlePeriodChange = (e) => {
    const val = e.target.value;
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      globalFilter.setPeriod(val);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      globalFilter.resetDateFilter();
    }
  };

  const handleShortcut = (type) => {
    const now = new Date();
    if (type === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      if (onFromDateChange && onToDateChange) {
        onFromDateChange(todayStr);
        onToDateChange(todayStr);
      } else {
        globalFilter.setCustomRange(todayStr, todayStr);
      }
    } else if (type === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      if (onFromDateChange && onToDateChange) {
        onFromDateChange(firstDay);
        onToDateChange(todayStr);
      } else {
        globalFilter.setPeriod('monthly');
      }
    } else if (type === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      if (onFromDateChange && onToDateChange) {
        onFromDateChange(firstDay);
        onToDateChange(lastDay);
      } else {
        globalFilter.setPeriod('lastMonth');
      }
    } else if (type === 'thisYear') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      if (onFromDateChange && onToDateChange) {
        onFromDateChange(firstDay);
        onToDateChange(todayStr);
      } else {
        globalFilter.setPeriod('yearly');
      }
    }
  };

  const isFiltered = Boolean(fromDate || toDate || (period && period !== 'allTime'));

  if (compact) {
    return (
      <div className={`inline-flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-1.5 text-xs shadow-sm ${className}`}>
        <div className="flex items-center gap-1 text-muted-foreground px-1 font-semibold">
          <Calendar size={13} className="text-primary" />
          <span className="hidden sm:inline">Dates:</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={fromDate || ''}
            onChange={handleFromChange}
            placeholder="From"
            className="bg-secondary/60 border border-border rounded-lg px-2 py-1 text-[11px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <span className="text-muted-foreground font-bold text-[10px]">to</span>
          <input
            type="date"
            value={toDate || ''}
            onChange={handleToChange}
            placeholder="To"
            className="bg-secondary/60 border border-border rounded-lg px-2 py-1 text-[11px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        {isFiltered && (
          <button
            onClick={handleReset}
            title="Reset Date Filter"
            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border bg-card p-3 md:p-4 shadow-sm space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h4>
            <p className="text-[10px] text-muted-foreground">Select date range (From Date to To Date)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={period || 'allTime'}
            onChange={handlePeriodChange}
            className="app-select !py-1 !px-2.5 !text-xs font-semibold"
          >
            <option value="allTime">All Time</option>
            <option value="today">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="yearly">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-all"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center lg:gap-3">
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-12 shrink-0">From:</label>
          <input
            type="date"
            value={fromDate || ''}
            onChange={handleFromChange}
            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-12 shrink-0">To:</label>
          <input
            type="date"
            value={toDate || ''}
            onChange={handleToChange}
            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 pt-1 sm:pt-0 sm:justify-end">
          <button
            type="button"
            onClick={() => handleShortcut('today')}
            className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-all"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleShortcut('thisMonth')}
            className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-all"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleShortcut('lastMonth')}
            className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-all"
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => handleShortcut('thisYear')}
            className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary/80 transition-all"
          >
            This Year
          </button>
        </div>
      </div>

      {(fromDate || toDate) && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-xl">
          <span className="font-medium text-foreground">
            Active Filter: <strong className="text-primary">{fromDate || 'Start'}</strong> to <strong className="text-primary">{toDate || 'Present'}</strong>
          </span>
          <span className="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px]">
            Filtered View
          </span>
        </div>
      )}
    </div>
  );
};
