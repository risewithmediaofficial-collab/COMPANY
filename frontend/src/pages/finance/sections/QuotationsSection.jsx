import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  FileCheck,
  Calendar,
  Send,
  Eye,
  IndianRupee,
  Building,
} from '@/components/ui/muiIcons';
import { useProposals } from '../../../hooks/useProposals';
import { AddProposalModal } from '../../../components/modals/AddProposalModal';
import { formatINR } from '../../../utils/financeFormatters';

const statusStyles = {
  draft: 'bg-secondary text-muted-foreground border-border',
  sent: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  viewed: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold',
  rejected: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 line-through',
  expired: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
};

export default function QuotationsSection({ onQuickAdd }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: proposals = [], isLoading, refetch } = useProposals(
    statusFilter !== 'all' ? { status: statusFilter } : {}
  );

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.toLowerCase();
      const title = (p.title || '').toLowerCase();
      const client = (p.client?.name || p.client?.company || '').toLowerCase();
      const num = (p.proposalNumber || '').toLowerCase();
      const matchesSearch = !q || title.includes(q) || client.includes(q) || num.includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter]);

  // Statistics
  const totalValue = proposals.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const acceptedProposals = proposals.filter((p) => p.status === 'accepted');
  const acceptedValue = acceptedProposals.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const sentCount = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── KPI METRIC CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Quotations</span>
            <FileText size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {proposals.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total Pipeline: {formatINR(totalValue)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Accepted / Won</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(acceptedValue)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {acceptedProposals.length} quotations approved
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Pending Decision</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {sentCount}
          </div>
          <p className="text-[11px] text-muted-foreground">Awaiting client review</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Acceptance Rate</span>
            <ArrowUpRight size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {proposals.length > 0
              ? `${Math.round((acceptedProposals.length / proposals.length) * 100)}%`
              : '0%'}
          </div>
          <p className="text-[11px] text-muted-foreground">Proposal conversion efficiency</p>
        </div>
      </div>

      {/* ── FILTER & ACTION TOOLBAR ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quotations by title, client, or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl text-xs font-semibold">
            {['all', 'draft', 'sent', 'accepted', 'rejected'].map((st) => (
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

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px]"
          >
            <Plus size={14} />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* ── QUOTATIONS TABLE ────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Title & Scope</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Quoted Amount</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading quotations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No quotations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prop) => (
                  <tr
                    key={prop._id}
                    className="hover:bg-secondary/30 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/proposals/${prop._id}`)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {prop.proposalNumber || 'QTN-—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {prop.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {prop.services?.length || 0} services quoted
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {prop.client?.company || prop.client?.name || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                      {formatINR(prop.totalAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">
                      {prop.validUntil
                        ? new Date(prop.validUntil).toLocaleDateString()
                        : 'No expiry'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          statusStyles[prop.status] || 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/proposals/${prop._id}`)}
                          className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px] transition-colors"
                        >
                          View Scope
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddProposalModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onProposalCreated={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
