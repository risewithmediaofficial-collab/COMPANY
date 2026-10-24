import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Plus,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  IndianRupee,
  Calendar,
  Send,
  XCircle,
  FileCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AddProposalModal } from '../../components/modals/AddProposalModal';
import { useProposals, useUpdateProposal, useDeleteProposal } from '../../hooks/useProposals';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
import { formatINR } from '../../utils/currency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusTone = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  viewed: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  expired: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const Proposals = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const canManage = ['superAdmin', 'admin', 'manager'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const updateProposalMutation = useUpdateProposal();
  const deleteProposalMutation = useDeleteProposal();

  const { data: proposals = [], isLoading } = useProposals(statusFilter !== 'all' ? { status: statusFilter } : {});

  const handleDeleteProposal = async () => {
    if (!proposalToDelete?._id) return;
    try {
      await deleteProposalMutation.mutateAsync(proposalToDelete._id);
      setProposalToDelete(null);
    } catch {
      // toast is handled in useDeleteProposal mutation
    }
  };

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
  const total = proposals.length;
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const sentCount = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
  const totalValue = proposals.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  // Table Columns
  const tableColumns = [
    {
      key: 'title',
      label: 'Proposal / ID',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <FileText size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground">{row.title}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{row.proposalNumber || 'PROP-001'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Recipient / Client',
      render: (row) => {
        if (row.recipientType === 'lead' || row.lead) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">Lead</span>
              <span className="font-semibold text-xs text-foreground">
                {row.lead?.name || row.lead?.company || 'Lead Prospect'}
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold text-[10px]">Client</span>
            <span className="font-semibold text-xs text-foreground">
              {row.client?.company || row.client?.name || 'Client Account'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Proposal Value',
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          {row.amount || row.totalAmount ? formatINR(row.amount || row.totalAmount) : '—'}
        </span>
      ),
    },
    {
      key: 'validUntil',
      label: 'Valid Until',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.validUntil || row.endDate ? new Date(row.validUntil || row.endDate).toLocaleDateString() : 'No expiry'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusTone[row.status] || statusTone.draft}`}>
          {row.status || 'draft'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/proposals/${row._id}`)}
            className="h-8 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View Pitch</span>
            <ExternalLink size={12} />
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setProposalToDelete(row);
              }}
              title="Delete Proposal"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
            >
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Kanban Card Renderer
  const renderKanbanCard = (row) => (
    <div
      onClick={() => navigate(`/proposals/${row._id}`)}
      className="group relative space-y-2.5 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary font-mono">
          {row.proposalNumber || 'PROP'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-emerald-600">
            {row.amount || row.totalAmount ? formatINR(row.amount || row.totalAmount) : '—'}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProposalToDelete(row);
              }}
              title="Delete Proposal"
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm text-foreground line-clamp-1">{row.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {row.recipientType === 'lead' || row.lead
            ? `🎯 Lead: ${row.lead?.name || 'Lead'}${row.lead?.company ? ` (${row.lead.company})` : ''}`
            : `🏢 Client: ${row.client?.company || row.client?.name || 'Client'}`}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
        <span className="flex items-center gap-1">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>{row.createdAt ? `Created ${new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</span>
        </span>
        {(row.validUntil || row.endDate) && (
          <span>Valid: {new Date(row.validUntil || row.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </div>
  );

  const kanbanColumns = [
    { key: 'draft', label: 'Drafts' },
    { key: 'sent', label: 'Sent to Client' },
    { key: 'viewed', label: 'Under Review' },
    { key: 'accepted', label: 'Signed / Won' },
    { key: 'rejected', label: 'Declined' },
  ];

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Growth & Sales', 'Proposals']}
      title="Client Proposals & Pitch Decks"
      subtitle="Draft high-converting client proposals, send interactive pitches, and monitor client acceptance."
      icon="📄"
      properties={[
        { label: 'Total Proposals', value: total, icon: FileText },
        { label: 'Signed / Won', value: acceptedCount, tone: 'success', icon: FileCheck },
        { label: 'Under Review', value: sentCount, tone: sentCount > 0 ? 'warning' : 'neutral', icon: Clock },
        { label: 'Pipeline Value', value: formatINR(totalValue), tone: 'info', icon: IndianRupee },
      ]}
      actions={
        canManage && (
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Create Proposal</span>
          </Button>
        )
      }
    >
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {['all', 'draft', 'sent', 'viewed', 'accepted', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap shrink-0 min-h-[36px] ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {st === 'all' ? 'All Proposals' : st}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_proposals_view_v1"
        views={['kanban', 'table']}
        items={filteredProposals}
        totalCount={filteredProposals.length}
        searchPlaceholder="Search proposals by title, client, or number..."
        columns={tableColumns}
        kanbanColumns={kanbanColumns}
        groupBy="status"
        renderKanbanCard={renderKanbanCard}
        onSearchChange={setSearch}
        onStatusChange={(proposalId, newStatus) => {
          updateProposalMutation.mutate({ id: proposalId, data: { status: newStatus } });
        }}
      />

      <AddProposalModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(proposalToDelete)}
        onOpenChange={(open) => {
          if (!open) setProposalToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete Proposal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete proposal{' '}
              <strong className="text-foreground font-semibold">"{proposalToDelete?.title}"</strong>{' '}
              ({proposalToDelete?.proposalNumber || 'Proposal'})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => setProposalToDelete(null)}
              disabled={deleteProposalMutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProposal}
              disabled={deleteProposalMutation.isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
            >
              {deleteProposalMutation.isPending ? 'Deleting...' : 'Delete Proposal'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Proposals;
