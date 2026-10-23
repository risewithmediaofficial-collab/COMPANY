import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  IndianRupee,
  Layers,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { useProposals } from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';
import { Button } from '../../components/ui/button';

export default function ClientProposals() {
  const navigate = useNavigate();
  const { data: proposals = [], isLoading } = useProposals();
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'accepted'
  const [searchQuery, setSearchQuery] = useState('');

  // Summary Metrics
  const metrics = useMemo(() => {
    const list = Array.isArray(proposals) ? proposals : [];
    const total = list.length;
    const accepted = list.filter((p) => p.status === 'accepted').length;
    const pending = list.filter((p) => ['sent', 'viewed', 'draft', 'pending'].includes(p.status)).length;
    const totalValue = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { total, accepted, pending, totalValue };
  }, [proposals]);

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const isAccepted = p.status === 'accepted';
      const isPending = ['sent', 'viewed', 'draft', 'pending'].includes(p.status);

      if (statusFilter === 'accepted' && !isAccepted) return false;
      if (statusFilter === 'pending' && !isPending) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (p.title || '').toLowerCase();
        const num = (p.proposalNumber || '').toLowerCase();
        const category = (p.serviceCategory || p.proposalType || '').toLowerCase();
        return title.includes(q) || num.includes(q) || category.includes(q);
      }

      return true;
    });
  }, [proposals, statusFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Sparkles size={12} />
            Client Scope Agreements
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">• Official Project Contracts</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Proposals & Agreements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Review formal project proposals, scope of work, deliverables, and confirm agreement sign-offs.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Proposals */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'all'
              ? 'border-amber-500 bg-amber-500/[0.04] shadow-sm'
              : 'border-border bg-card/70 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Proposals</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <FileText size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{metrics.total}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Official documents sent</p>
        </motion.div>

        {/* Accepted & Active */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('accepted')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'accepted'
              ? 'border-emerald-500 bg-emerald-500/[0.04] shadow-sm'
              : 'border-border bg-card/70 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Accepted & Active</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{metrics.accepted}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Signed agreements</p>
        </motion.div>

        {/* Awaiting Decision */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'pending'
              ? 'border-blue-500 bg-blue-500/[0.06] shadow-sm'
              : metrics.pending > 0
              ? 'border-blue-500/40 bg-blue-500/[0.02]'
              : 'border-border bg-card/70 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Awaiting Decision</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-foreground">{metrics.pending}</p>
            {metrics.pending > 0 && (
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 animate-pulse">
                Needs Sign-off
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pending your review</p>
        </motion.div>

        {/* Total Proposal Value */}
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-border bg-card/70 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Agreement Value</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{formatINR(metrics.totalValue)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Cumulative proposal value</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Proposals', count: metrics.total },
            { id: 'pending', label: 'Awaiting Decision', count: metrics.pending, alert: metrics.pending > 0 },
            { id: 'accepted', label: 'Accepted', count: metrics.accepted },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 min-h-[36px] whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.alert
                    ? 'bg-blue-500/15 text-blue-600 font-extrabold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals..."
            className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Proposals Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 animate-pulse rounded-3xl border border-border bg-card/60" />
          <div className="h-56 animate-pulse rounded-3xl border border-border bg-card/60" />
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
            <FileText size={28} />
          </div>
          <h3 className="text-base font-bold text-foreground">No proposals found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'No proposals match your search or filter. Try clearing your filters.'
              : 'You do not have any active proposals yet. Formal proposals sent by RiseWithMedia will be shown here.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProposals.map((prop) => {
            const isAccepted = prop.status === 'accepted';
            const isRejected = prop.status === 'rejected';

            return (
              <motion.div
                key={prop._id}
                whileHover={{ y: -2 }}
                onClick={() => navigate(`/proposals/${prop._id}`)}
                className={`cursor-pointer relative overflow-hidden rounded-3xl border p-4 sm:p-6 transition-all shadow-xs hover:shadow-md bg-card flex flex-col justify-between gap-5 ${
                  isAccepted
                    ? 'border-emerald-500/30'
                    : 'border-border hover:border-amber-500/40'
                }`}
              >
                {/* Top status accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{
                    background: isAccepted
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : isRejected
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : 'linear-gradient(90deg, #f59e0b, #d97706)',
                  }}
                />

                <div>
                  {/* Top line with Number and Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {prop.proposalNumber || 'PROP-OFFICIAL'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        isAccepted
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}
                    >
                      {isAccepted ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} />}
                      <span>{(prop.status || 'Draft').toUpperCase()}</span>
                    </span>
                  </div>

                  {/* Proposal Title */}
                  <h3 className="mt-3 text-lg font-bold text-foreground tracking-tight">
                    {prop.title}
                  </h3>

                  {/* Service Category Tag */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {(prop.serviceCategory || prop.proposalType || 'Custom Scope').replace(/_/g, ' ')}
                    </span>
                    {prop.timeline && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar size={12} /> {prop.timeline}
                      </span>
                    )}
                  </div>

                  {/* Scope of Work Snippet if available */}
                  {(prop.scopeOfWork || prop.description) && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {prop.scopeOfWork || prop.description}
                    </p>
                  )}
                </div>

                {/* Footer with Amount & Action Button */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Total Agreement
                    </span>
                    <p className="text-lg font-black text-foreground">
                      {formatINR(prop.amount)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className={`gap-1.5 rounded-xl font-bold text-xs h-9 px-4 ${
                      isAccepted
                        ? 'bg-secondary text-foreground hover:bg-secondary/80'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                    }`}
                  >
                    <span>{isAccepted ? 'View Agreement' : 'Review & Sign'}</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
