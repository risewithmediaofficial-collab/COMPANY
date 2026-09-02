import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DateFilterContext = createContext(null);

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    // Return dummy fallback if component is used outside provider
    return {
      startDate: '',
      endDate: '',
      period: 'allTime',
      setFromDate: () => {},
      setToDate: () => {},
      setPeriod: () => {},
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
  const [period, setPeriodState] = useState('allTime'); // 'allTime' | 'today' | 'weekly' | 'monthly' | 'lastMonth' | 'yearly' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const setPeriod = useCallback((newPeriod) => {
    setPeriodState(newPeriod);
    const now = new Date();
    
    if (newPeriod === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (newPeriod === 'weekly') {
      const day = now.getDay();
      const first = new Date(now);
      first.setDate(now.getDate() - day);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    } else if (newPeriod === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(today);
    } else if (newPeriod === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (newPeriod === 'yearly') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(today);
    } else if (newPeriod === 'allTime') {
      setStartDate('');
      setEndDate('');
    }
  }, []);

  const setFromDate = useCallback((val) => {
    setStartDate(val);
    setPeriodState('custom');
  }, []);

  const setToDate = useCallback((val) => {
    setEndDate(val);
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

  const isDateInRange = useCallback((dateValue) => {
    if (!startDate && !endDate) return true;
    if (!dateValue) return false;

    // Support array of fallback dates (e.g. [dueDate, startDate, createdAt])
    if (Array.isArray(dateValue)) {
      const validDates = dateValue.filter(Boolean);
      if (validDates.length === 0) return false;
      return validDates.some((d) => isDateInRange(d));
    }

    // Extract candidate date representations
    const candidates = [];
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        candidates.push(trimmed.substring(0, 10));
      }
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        candidates.push(d.toISOString().split('T')[0]);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        candidates.push(`${y}-${m}-${day}`);
      }
    } else if (dateValue instanceof Date) {
      if (!Number.isNaN(dateValue.getTime())) {
        candidates.push(dateValue.toISOString().split('T')[0]);
        const y = dateValue.getFullYear();
        const m = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        candidates.push(`${y}-${m}-${day}`);
      }
    } else if (typeof dateValue === 'number') {
      const d = new Date(dateValue);
      if (!Number.isNaN(d.getTime())) {
        candidates.push(d.toISOString().split('T')[0]);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        candidates.push(`${y}-${m}-${day}`);
      }
    }

    if (candidates.length === 0) return false;

    return candidates.some((targetStr) => {
      if (startDate && targetStr < startDate) return false;
      if (endDate && targetStr > endDate) return false;
      return true;
    });
  }, [startDate, endDate]);

  const filterByDateRange = useCallback((items = [], datePropOrGetter = 'createdAt') => {
    if (!Array.isArray(items)) return [];
    if (!startDate && !endDate) return items;

    return items.filter((item) => {
      if (!item) return false;
      let rawDate;
      if (typeof datePropOrGetter === 'function') {
        rawDate = datePropOrGetter(item);
      } else {
        rawDate = item[datePropOrGetter] || item.createdAt || item.date || item.startDate || item.updatedAt;
      }
      return isDateInRange(rawDate);
    });
  }, [startDate, endDate, isDateInRange]);

  const value = useMemo(() => ({
    startDate,
    endDate,
    period,
    setStartDate: setFromDate,
    setEndDate: setToDate,
    setFromDate,
    setToDate,
    setPeriod,
    setCustomRange,
    resetDateFilter,
    isDateInRange,
    filterByDateRange,
    isFiltered: Boolean(startDate || endDate || (period && period !== 'allTime')),
  }), [startDate, endDate, period, setFromDate, setToDate, setPeriod, setCustomRange, resetDateFilter, isDateInRange, filterByDateRange]);

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
};
