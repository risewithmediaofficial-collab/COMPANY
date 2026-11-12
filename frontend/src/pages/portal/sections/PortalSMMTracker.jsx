import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../api';
import { useSocket } from '../../../context/SocketContext';
import {
  Calendar, Film, Layers, Sparkles, CheckCircle2, Clock, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw, Filter, Share2, Check,
  TrendingUp, Activity, BarChart2
} from '@/components/ui/muiIcons';
import { motion } from 'framer-motion';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PortalSMMTracker() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [trackerData, setTrackerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'done', 'pending', 'todo'
  const socket = useSocket();

  const fetchTracker = async (m = selectedMonth, y = selectedYear) => {
    try {
      setLoading(true);
      const res = await api.get(`/smm/tracker?month=${m}&year=${y}`);
      if (res.data?.success && res.data?.data) {
        setTrackerData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load SMM Tracker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracker(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchTracker(selectedMonth, selectedYear);
    };
    socket.on('trackerUpdated', handleUpdate);
    socket.on('smmTrackerUpdated', handleUpdate);
    socket.on('portalUpdated', handleUpdate);

    return () => {
      socket.off('trackerUpdated', handleUpdate);
      socket.off('smmTrackerUpdated', handleUpdate);
      socket.off('portalUpdated', handleUpdate);
    };
  }, [socket, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const cur = new Date();
    setSelectedMonth(cur.getMonth() + 1);
    setSelectedYear(cur.getFullYear());
  };

  const clientRow = trackerData?.rows?.[0] || null;
  const days = clientRow?.days || [];
  const daysInMonth = trackerData?.daysInMonth || new Date(selectedYear, selectedMonth, 0).getDate();

  // Metrics computation
  const metrics = useMemo(() => {
    let reelsPlanned = 0;
    let postsPlanned = 0;
    let storiesPlanned = 0;
    let reelsDone = 0;
    let postsDone = 0;
    let storiesDone = 0;

    const planStr = clientRow?.plan || '';
    const rMatch = planStr.match(/(\d+)\s*R/i);
    if (rMatch) reelsPlanned = parseInt(rMatch[1], 10);
    const pMatch = planStr.match(/(\d+)\s*P/i);
    if (pMatch) postsPlanned = parseInt(pMatch[1], 10);

    const sPlanStr = clientRow?.storyPlan || '';
    const sMatch = sPlanStr.match(/(\d+)/);
    storiesPlanned = sMatch ? parseInt(sMatch[1], 10) : daysInMonth;

    days.forEach((day) => {
      if (Array.isArray(day.items) && day.items.length > 0) {
        day.items.forEach((item) => {
          if (item.status === 'done') {
            if (item.type === 'reel') reelsDone++;
            else if (item.type === 'post') postsDone++;
            else if (item.type === 'story') storiesDone++;
          }
        });
      } else {
        if (day.postStatus === 'done') {
          if (/R/i.test(day.postLabel || '')) reelsDone++;
          else postsDone++;
        }
        if (day.storyStatus === 'done') {
          storiesDone++;
        }
      }
    });

    const totalPlanned = reelsPlanned + postsPlanned + storiesPlanned;
    const totalDone = reelsDone + postsDone + storiesDone;
    const completionRate = totalPlanned > 0 ? Math.min(100, Math.round((totalDone / totalPlanned) * 100)) : 0;

    return {
      reelsPlanned,
      reelsDone,
      reelsPending: Math.max(0, reelsPlanned - reelsDone),
      postsPlanned,
      postsDone,
      postsPending: Math.max(0, postsPlanned - postsDone),
      storiesPlanned,
      storiesDone,
      storiesPending: Math.max(0, storiesPlanned - storiesDone),
      totalPlanned,
      totalDone,
      totalPending: Math.max(0, totalPlanned - totalDone),
      completionRate,
    };
  }, [clientRow, days, daysInMonth]);

  // Filtered days list
  const filteredDays = useMemo(() => {
    return days.filter((day) => {
      if (filterType === 'all') return true;
      if (filterType === 'done') {
        return day.postStatus === 'done' || day.storyStatus === 'done';
      }
      if (filterType === 'pending') {
        return day.postStatus === 'pending' || day.storyStatus === 'pending';
      }
      if (filterType === 'todo') {
        return (
          (!day.postStatus || day.postStatus === 'todo') &&
          (!day.storyStatus || day.storyStatus === 'todo')
        );
      }
      return true;
    });
  }, [days, filterType]);

  const isToday = (dayNum) => {
    const cur = new Date();
    return (
      cur.getFullYear() === selectedYear &&
      cur.getMonth() + 1 === selectedMonth &&
      cur.getDate() === dayNum
    );
  };

  const getWeekday = (dayNum) => {
    const d = new Date(selectedYear, selectedMonth - 1, dayNum);
    return DAYS_SHORT[d.getDay()];
  };

  const isSunday = (dayNum) => {
    const d = new Date(selectedYear, selectedMonth - 1, dayNum);
    return d.getDay() === 0;
  };

  const renderBadge = (status) => {
    const s = String(status || 'todo').toLowerCase();
    if (s === 'done') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground">
          <CheckCircle2 size={11} className="shrink-0" /> DONE
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-secondary text-foreground border border-border">
          <Clock size={11} className="shrink-0" /> PENDING
        </span>
      );
    }
    if (s === 'skip') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/60 text-muted-foreground border border-border">
          SKIP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
        PLANNED
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* ── Page Header & Month Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-secondary text-foreground border border-border shrink-0">
              <Calendar size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                SMM Tracker Sheet
                {clientRow?.client?.companyName && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-secondary text-foreground border border-border font-bold">
                    {clientRow.client.companyName}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Day-by-day status of your brand's posts, reels, and stories scheduled & published this month
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto bg-card border border-border/60 p-1 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-3 text-xs font-bold text-foreground min-w-[120px] text-center tabular-nums">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="ml-1 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-h-[36px]"
          >
            Current
          </button>
        </div>
      </div>

      {/* ── Deliverables Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deliverables */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
            <span className="text-xs font-black text-foreground tabular-nums">{metrics.completionRate}%</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-black text-foreground tabular-nums">
              {metrics.totalDone} <span className="text-xs font-semibold text-muted-foreground">/ {metrics.totalPlanned} posted</span>
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {metrics.totalPending} pending
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        {/* Reels / Videos */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-foreground">
              <Film size={15} className="shrink-0 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reels / Shorts</span>
            </div>
            <span className="text-xs font-black text-foreground tabular-nums">
              {metrics.reelsPlanned > 0 ? Math.round((metrics.reelsDone / metrics.reelsPlanned) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-black text-foreground tabular-nums">
              {metrics.reelsDone} <span className="text-xs font-semibold text-muted-foreground">/ {metrics.reelsPlanned} posted</span>
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {metrics.reelsPending} to post
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${metrics.reelsPlanned > 0 ? Math.min(100, Math.round((metrics.reelsDone / metrics.reelsPlanned) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Feed Posts */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-foreground">
              <Layers size={15} className="shrink-0 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feed Posts</span>
            </div>
            <span className="text-xs font-black text-foreground tabular-nums">
              {metrics.postsPlanned > 0 ? Math.round((metrics.postsDone / metrics.postsPlanned) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-black text-foreground tabular-nums">
              {metrics.postsDone} <span className="text-xs font-semibold text-muted-foreground">/ {metrics.postsPlanned} posted</span>
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {metrics.postsPending} to post
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${metrics.postsPlanned > 0 ? Math.min(100, Math.round((metrics.postsDone / metrics.postsPlanned) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Daily Stories */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-foreground">
              <Sparkles size={15} className="shrink-0 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Stories</span>
            </div>
            <span className="text-xs font-black text-foreground tabular-nums">
              {metrics.storiesPlanned > 0 ? Math.round((metrics.storiesDone / metrics.storiesPlanned) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-black text-foreground tabular-nums">
              {metrics.storiesDone} <span className="text-xs font-semibold text-muted-foreground">/ {metrics.storiesPlanned} posted</span>
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {metrics.storiesPending} to post
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${metrics.storiesPlanned > 0 ? Math.min(100, Math.round((metrics.storiesDone / metrics.storiesPlanned) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Tracker Sheet Table Card ── */}
      <div className="rounded-3xl bg-card border border-border/60 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>{MONTHS[selectedMonth - 1]} Content Calendar</span>
              {clientRow?.plan && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border font-bold">
                  {clientRow.plan}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Day-by-day deliverables breakdown for {clientRow?.client?.companyName || 'your brand'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto bg-secondary/50 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Days' },
              { id: 'done', label: 'Done' },
              { id: 'pending', label: 'Pending' },
              { id: 'todo', label: 'Planned' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg min-h-[32px] transition-all ${
                  filterType === f.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Day-by-Day Table */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading your SMM Tracker Sheet...
          </div>
        ) : filteredDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No deliverables found matching the selected filter.
          </div>
        ) : (
          <div className="responsive-table-container overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase">
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-4">Post / Reel Topic</th>
                  <th className="py-3 px-4 w-32 text-center">Post Status</th>
                  <th className="py-3 px-4">Story Update</th>
                  <th className="py-3 px-4 w-32 text-center">Story Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredDays.map((day) => {
                  const today = isToday(day.day);
                  const sunday = isSunday(day.day);

                  return (
                    <tr
                      key={day.day}
                      className={`transition-colors ${
                        today
                          ? 'bg-muted/70 font-medium'
                          : sunday
                          ? 'bg-muted/30'
                          : 'hover:bg-secondary/30'
                      }`}
                    >
                      {/* Date & Weekday */}
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black tabular-nums ${
                              today
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : sunday
                                ? 'bg-secondary text-foreground border border-border'
                                : 'bg-secondary text-foreground'
                            }`}
                          >
                            {day.day}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {getWeekday(day.day)}
                            {today && <span className="ml-1 text-[10px] text-foreground font-black">(Today)</span>}
                          </span>
                        </div>
                      </td>

                      {/* Post / Reel Topic */}
                      <td className="py-3 px-4 font-medium text-foreground">
                        {day.postLabel ? (
                          <div className="flex items-center gap-2">
                            {/R/i.test(day.postLabel) ? (
                              <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border font-bold text-[10px] shrink-0">
                                Reel
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border font-bold text-[10px] shrink-0">
                                Post
                              </span>
                            )}
                            <span className="truncate max-w-xs">{day.postLabel}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">—</span>
                        )}
                      </td>

                      {/* Post Status */}
                      <td className="py-3 px-4 text-center">
                        {renderBadge(day.postStatus)}
                      </td>

                      {/* Story Label */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {day.storyLabel || <span className="text-muted-foreground/60 italic">—</span>}
                      </td>

                      {/* Story Status */}
                      <td className="py-3 px-4 text-center">
                        {renderBadge(day.storyStatus)}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {day.note || <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
