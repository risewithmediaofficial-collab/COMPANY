import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import {
  Code,
  Kanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  GitPullRequest,
  Bug,
  Users,
  RefreshCcw,
  ArrowRight,
  ShieldAlert,
  Flame,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STAGE_LABELS = {
  backlog: 'Backlog',
  analysis: 'Analysis',
  ready_for_dev: 'Ready for Dev',
  in_development: 'In Development',
  code_review: 'Code Review',
  qa_testing: 'QA / Testing',
  client_uat: 'Client / UAT',
  approved: 'Approved',
  deployment: 'Deployment',
  live: 'Live',
  closed: 'Closed',
  blocked: 'Blocked',
};

const STAGE_COLORS = {
  backlog: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  analysis: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  ready_for_dev: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  in_development: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  code_review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  qa_testing: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  client_uat: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  deployment: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  live: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  blocked: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

export default function DevelopmentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.getDashboard();
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dev dashboard:', err);
      toast.error('Failed to load development metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stages = Object.keys(STAGE_LABELS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Development Management"
        subtitle="Agile pipeline, sprint progression, code reviews, QA tracking, and developer workload"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              to="/development/board"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md shadow-primary/25 hover:opacity-95 transition-all min-h-[38px]"
            >
              <Kanban size={14} />
              Open Dev Board
            </Link>
          </div>
        }
      />

      <DevelopmentSubNav />

      {/* ── Top KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{data?.totalTasks || 0}</p>
          <p className="text-[11px] text-muted-foreground">In development stream</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">
            {(data?.stageCounts?.in_development || 0) + (data?.stageCounts?.code_review || 0) + (data?.stageCounts?.qa_testing || 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Dev + Review + QA</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocked</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{data?.totalBlocked || 0}</p>
          <p className="text-[11px] text-muted-foreground">Require unblocking</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live & Closed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">
            {(data?.stageCounts?.live || 0) + (data?.stageCounts?.closed || 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Shipped to production</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugs Logged</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
              <Bug size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{data?.totalBugs || 0}</p>
          <p className="text-[11px] text-muted-foreground">
            {data?.bugSeverityCounts?.critical || 0} critical, {data?.bugSeverityCounts?.high || 0} high
          </p>
        </div>
      </div>

      {/* ── Pipeline Breakdown Grid ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Kanban size={18} className="text-primary" />
            <h3 className="font-bold text-foreground text-sm">Pipeline Stage Distribution</h3>
          </div>
          <Link
            to="/development/board"
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
          >
            Go to Board <ChevronRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {stages.map((stageKey) => {
            const count = data?.stageCounts?.[stageKey] || 0;
            const style = STAGE_COLORS[stageKey] || 'bg-secondary text-foreground';

            return (
              <Link
                key={stageKey}
                to={`/development/board?stage=${stageKey}`}
                className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${style}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  {STAGE_LABELS[stageKey]}
                </span>
                <span className="text-xl font-black block mt-1">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Active Sprint Progress ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <h3 className="font-bold text-foreground text-sm">Active Sprint</h3>
            </div>
            <Link to="/development/sprints" className="text-xs text-primary font-bold hover:underline">
              View Sprints
            </Link>
          </div>

          {data?.activeSprint ? (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-sm">{data.activeSprint.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    Active
                  </span>
                </div>
                {data.activeSprint.goal && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.activeSprint.goal}</p>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Sprint Completion</span>
                  <span className="font-bold text-foreground font-mono">
                    {data.activeSprint.total > 0
                      ? Math.round((data.activeSprint.completed / data.activeSprint.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        data.activeSprint.total > 0
                          ? (data.activeSprint.completed / data.activeSprint.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Stats pill list */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-secondary/20 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground font-bold block">TOTAL</span>
                  <span className="font-mono font-black text-foreground text-sm">{data.activeSprint.total}</span>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <span className="text-[10px] font-bold block">DONE</span>
                  <span className="font-mono font-black text-sm">{data.activeSprint.completed}</span>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] font-bold block">REMAINING</span>
                  <span className="font-mono font-black text-sm">{data.activeSprint.remaining}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <Zap size={28} className="mx-auto opacity-30 text-amber-500" />
              <p className="text-xs font-semibold">No active sprint running</p>
              <Link
                to="/development/sprints"
                className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
              >
                Create Sprint <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* ── Developer Workload Matrix ──────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <h3 className="font-bold text-foreground text-sm">Developer Workload Distribution</h3>
            </div>
          </div>

          {!data?.developerWorkload || data.developerWorkload.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No developer assignments recorded yet
            </div>
          ) : (
            <div className="responsive-table-container overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 font-semibold">Developer</th>
                    <th className="text-center py-2 font-semibold">Assigned</th>
                    <th className="text-center py-2 font-semibold">In Progress</th>
                    <th className="text-center py-2 font-semibold">Completed</th>
                    <th className="text-center py-2 font-semibold">Blocked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.developerWorkload.map((dev) => (
                    <tr key={dev.id} className="hover:bg-secondary/20">
                      <td className="py-2.5 font-bold text-foreground flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {dev.name.charAt(0)}
                        </div>
                        <span>{dev.name}</span>
                      </td>
                      <td className="text-center py-2.5 font-mono font-semibold">{dev.total}</td>
                      <td className="text-center py-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {dev.inProgress}
                      </td>
                      <td className="text-center py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {dev.completed}
                      </td>
                      <td className="text-center py-2.5 font-mono font-bold">
                        {dev.blocked > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px]">
                            {dev.blocked}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
