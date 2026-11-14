import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Percent,
} from '@/components/ui/muiIcons';
import { useProjects } from '../../../hooks/useProjects';
import { useTasks } from '../../../hooks/useTasks';
import { useModuleExpenses } from '../../../hooks/useFinance';
import { formatINR } from '../../../utils/financeFormatters';

export default function ProjectsFinanceSection() {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState('projects'); // 'projects' | 'tasks_billing'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: expenses = [] } = useModuleExpenses();
  const { data: tasks = [] } = useTasks();

  // Compute financial metrics per project
  const projectFinancials = useMemo(() => {
    return projects.map((p) => {
      const budgetDetails = p.budgetDetails || {};
      const totalValue = Number(p.budget || budgetDetails.totalBudget || 0);
      const received = Number(budgetDetails.amountReceived || 0);

      // Sum direct expenses tagged to this project
      const directCosts = expenses
        .filter((e) => {
          const isProjectMatch = e.project?._id === p._id || e.project === p._id;
          const isDirect = e.costType === 'client_project' || isProjectMatch;
          return isProjectMatch || (isDirect && (e.client?._id === p.client?._id || e.client === p.client?._id));
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const billed = totalValue; // Agreed contract billing
      const grossProfit = Math.max(0, received - directCosts);
      const profitMargin = received > 0 ? Math.round((grossProfit / received) * 100) : 0;
      const pendingPayment = Math.max(0, totalValue - received);

      return {
        ...p,
        totalValue,
        received,
        billed,
        directCosts,
        grossProfit,
        profitMargin,
        pendingPayment,
      };
    });
  }, [projects, expenses]);

  const filteredProjects = useMemo(() => {
    return projectFinancials.filter((p) => {
      const q = search.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const client = (p.client?.name || p.client?.company || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || client.includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projectFinancials, search, statusFilter]);

  // Aggregate Portfolio Totals
  const totalPortfolioValue = projectFinancials.reduce((sum, p) => sum + p.totalValue, 0);
  const totalReceived = projectFinancials.reduce((sum, p) => sum + p.received, 0);
  const totalDirectCosts = projectFinancials.reduce((sum, p) => sum + p.directCosts, 0);
  const totalGrossProfit = Math.max(0, totalReceived - totalDirectCosts);
  const overallMargin = totalReceived > 0 ? Math.round((totalGrossProfit / totalReceived) * 100) : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── SUB-TABS NAVIGATION ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('projects')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'projects'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Briefcase size={14} />
          <span>Project Financials & Profit</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tasks_billing')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'tasks_billing'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Layers size={14} />
          <span>Tasks & Deliverables Billing</span>
        </button>
      </div>

      {subTab === 'projects' ? (
        <>
          {/* ── KPI METRICS CARDS ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Project Value</span>
                <Briefcase size={16} className="text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                {formatINR(totalPortfolioValue)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {projects.length} client projects contracted
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Revenue Collected</span>
                <IndianRupee size={16} className="text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(totalReceived)}
              </div>
              <p className="text-[11px] text-muted-foreground">Cash received from clients</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Direct Project Costs</span>
                <Clock size={16} className="text-rose-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatINR(totalDirectCosts)}
              </div>
              <p className="text-[11px] text-muted-foreground">Shoots, ads, travel, production</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Project Gross Profit</span>
                <TrendingUp size={16} className="text-sky-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums flex items-center gap-2">
                <span>{formatINR(totalGrossProfit)}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ({overallMargin}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Before agency overheads</p>
            </div>
          </div>

          {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
          <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects by name or client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl text-xs font-semibold">
                {['all', 'Planning', 'In Progress', 'Completed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-card text-foreground font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── PROJECTS FINANCIAL TABLE ─────────────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                    <th className="py-3 px-4">Project & Client</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-4">Contract Value</th>
                    <th className="py-3 px-4">Collected</th>
                    <th className="py-3 px-4">Direct Costs</th>
                    <th className="py-3 px-4">Gross Profit</th>
                    <th className="py-3 px-4">Margin</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {projectsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Loading project financials...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-secondary/30 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/projects/${p._id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.client?.company || p.client?.name || 'Internal'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground tabular-nums">
                          {p.startDate ? new Date(p.startDate).toLocaleDateString() : 'TBD'} –{' '}
                          {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'TBD'}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                          {formatINR(p.totalValue)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatINR(p.received)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatINR(p.directCosts)}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                          {formatINR(p.grossProfit)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.profitMargin >= 50
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : p.profitMargin > 0
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.profitMargin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/${p._id}`)}
                            className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px]"
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ── TASKS & WORK BILLING VIEW ───────────────────────────────── */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Important Note on Deliverables Billing:</strong> A task or deliverable amount (e.g. ₹5,000 per reel, ₹2,000 per poster) is a planned production target. Revenue is officially recognised through agreed project contracts and client invoicing.
          </div>

          <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                    <th className="py-3 px-4">Task / Deliverable</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Assigned Person</th>
                    <th className="py-3 px-4">Planned Value</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tasks.slice(0, 50).map((t) => (
                    <tr key={t._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {t.title}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {t.project?.name || 'General Task'}
                      </td>
                      <td className="py-3 px-4">
                        {t.assignees && t.assignees.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">
                              {t.assignees[0].name || t.assignees[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                        {t.estimatedAmount ? formatINR(t.estimatedAmount) : 'Deliverable Quota'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground tabular-nums">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground">
                          {t.status || 'todo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
