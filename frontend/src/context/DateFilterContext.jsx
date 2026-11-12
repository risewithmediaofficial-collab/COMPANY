import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DateFilterContext = createContext(null);

export const toLocalYMD = (input) => {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const normalizeDatePeriod = (rawPeriod) => {
  if (!rawPeriod || rawPeriod === 'all' || rawPeriod === 'allTime') return 'allTime';
  if (rawPeriod === 'monthly' || rawPeriod === 'this_month') return 'this_month';
  if (rawPeriod === 'lastMonth' || rawPeriod === 'previous_month') return 'previous_month';
  if (rawPeriod === 'yearly' || rawPeriod === 'this_year') return 'yearly';
  if (rawPeriod === 'custom') return 'custom';
  return rawPeriod;
};

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    return {
      startDate: '',
      endDate: '',
      period: 'allTime',
      setStartDate: () => {},
      setEndDate: () => {},
      setFromDate: () => {},
      setToDate: () => {},
      setPeriod: () => {},
      openCustomRange: () => {},
      setCustomRange: () => {},
      resetDateFilter: () => {},
      isDateInRange: () => true,
      filterByDateRange: (items) => items,
      isFiltered: false,
    };
  }
  return context;
};

export const DateFilterProvider = ({ children }) => {
  // 'allTime' | 'this_month' | 'previous_month' | 'yearly' | 'custom'
  const [period, setPeriodState] = useState('allTime');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const setPeriod = useCallback((rawPeriod) => {
    const normalized = normalizeDatePeriod(rawPeriod);
    const now = new Date();

    if (normalized === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPeriodState('this_month');
      setStartDate(toLocalYMD(firstDay));
      setEndDate(toLocalYMD(lastDay));
      return;
    }

    if (normalized === 'previous_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setPeriodState('previous_month');
      setStartDate(toLocalYMD(firstDay));
      setEndDate(toLocalYMD(lastDay));
      return;
    }

    if (normalized === 'yearly') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setPeriodState('yearly');
      setStartDate(toLocalYMD(firstDay));
      setEndDate(toLocalYMD(lastDay));
      return;
    }

    if (normalized === 'today') {
      const todayStr = toLocalYMD(now);
      setPeriodState('today');
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (normalized === 'weekly') {
      const day = now.getDay();
      const first = new Date(now);
      first.setDate(now.getDate() - day);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      setPeriodState('weekly');
      setStartDate(toLocalYMD(first));
      setEndDate(toLocalYMD(last));
      return;
    }

    if (normalized === 'custom') {
      setPeriodState('custom');
      return;
    }

    setPeriodState('allTime');
    setStartDate('');
    setEndDate('');
  }, []);

  const openCustomRange = useCallback(() => {
    if (period === 'custom') {
      setPeriodState('allTime');
      setStartDate('');
      setEndDate('');
      return;
    }
    if (period !== 'allTime') {
      setStartDate('');
      setEndDate('');
    }
    setPeriodState('custom');
  }, [period]);

  const setFromDate = useCallback((val) => {
    setStartDate(val || '');
    setPeriodState('custom');
  }, []);

  const setToDate = useCallback((val) => {
    setEndDate(val || '');
    setPeriodState('custom');
  }, []);

  const setCustomRange = useCallback((from, to) => {
    setStartDate(from || '');
    setEndDate(to || '');
    setPeriodState('custom');
  }, []);

  const resetDateFilter = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setPeriodState('allTime');
  }, []);

  const isDateInRange = useCallback(
    (dateValue) => {
      if (!startDate && !endDate) return true;
      if (!dateValue) return false;

      if (Array.isArray(dateValue)) {
        const validDates = dateValue.filter(Boolean);
        if (validDates.length === 0) return false;
        return validDates.some((d) => isDateInRange(d));
      }

      let targetStr = '';
      if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          targetStr = trimmed;
        } else {
          targetStr = toLocalYMD(trimmed);
        }
      } else {
        targetStr = toLocalYMD(dateValue);
      }

      if (!targetStr) return false;
      if (startDate && targetStr < startDate) return false;
      if (endDate && targetStr > endDate) return false;
      return true;
    },
    [startDate, endDate]
  );

  const filterByDateRange = useCallback(
    (items = [], datePropOrGetter = 'createdAt') => {
      if (!Array.isArray(items)) return [];
      if (!startDate && !endDate) return items;

      return items.filter((item) => {
        if (!item) return false;
        let rawDate;
        if (typeof datePropOrGetter === 'function') {
          rawDate = datePropOrGetter(item);
        } else {
          rawDate =
            item[datePropOrGetter] ||
            item.createdAt ||
            item.date ||
            item.startDate ||
            item.updatedAt;
        }
        return isDateInRange(rawDate);
      });
    },
    [startDate, endDate, isDateInRange]
  );

  const value = useMemo(
    () => ({
      startDate,
      endDate,
      period,
      setStartDate: setFromDate,
      setEndDate: setToDate,
      setFromDate,
      setToDate,
      setPeriod,
      openCustomRange,
      setCustomRange,
      resetDateFilter,
      isDateInRange,
      filterByDateRange,
      isFiltered: Boolean(startDate || endDate || (period && period !== 'allTime')),
    }),
    [
      startDate,
      endDate,
      period,
      setFromDate,
      setToDate,
      setPeriod,
      openCustomRange,
      setCustomRange,
      resetDateFilter,
      isDateInRange,
      filterByDateRange,
    ]
  );

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
};
