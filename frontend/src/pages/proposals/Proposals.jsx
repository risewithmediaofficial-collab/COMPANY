import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
import { AddProposalModal } from '../../components/modals/AddProposalModal';
import { useProposals } from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';

const statusTone = {
  draft: 'neutral',
  sent: 'info',
  viewed: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};

const Proposals = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const canManage = ['superAdmin', 'manager'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const { data: proposals = [], isLoading } = useProposals(statusFilter ? { status: statusFilter } : {});

  const filtered = proposals.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.title?.toLowerCase().includes(q)
      || p.client?.name?.toLowerCase().includes(q)
      || p.proposalNumber?.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      key: 'title',
      label: 'Proposal',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.title}</div>
          <div className="text-xs text-muted-foreground">{row.proposalNumber}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => row.client?.company || row.client?.name || '—',
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => formatINR(row.amount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={statusTone[row.status] || 'neutral'}>{row.status}</StatusBadge>
      ),
    },
    {
      key: 'acceptedAt',
      label: 'Accepted',
      render: (row) => row.acceptedAt ? new Date(row.acceptedAt).toLocaleString() : '—',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100">
              Proposals
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Client proposal pipeline</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Create and manage client proposals. Accepted proposals can be linked when creating projects and project budgets.</p>
          </div>

          {canManage ? (
            <Button onClick={() => { setSelectedProposal(null); setShowCreateModal(true); }} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 shadow-lg shadow-indigo-950/25 hover:bg-indigo-50">
              <Plus size={16} className="mr-2" />
              Create Proposal
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: proposals.length, tone: 'slate' },
          { label: 'Sent', value: proposals.filter((p) => ['sent', 'viewed', 'accepted'].includes(p.status)).length, tone: 'indigo' },
          { label: 'Accepted', value: proposals.filter((p) => p.status === 'accepted').length, tone: 'emerald' },
          { label: 'Pending', value: proposals.filter((p) => !['accepted', 'rejected', 'expired'].includes(p.status)).length, tone: 'amber' },
        ].map(({ label, value, tone }) => {
          const toneClasses = {
            slate: 'bg-slate-500/70',
            indigo: 'bg-indigo-500/70',
            emerald: 'bg-emerald-500/70',
            amber: 'bg-amber-500/70',
          };

          return (
            <div key={label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className={`mb-3 h-2 w-12 rounded-full ${toneClasses[tone]}`} />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <PageToolbar>
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." />
          <select className="app-input w-full sm:w-auto sm:min-w-[180px] rounded-xl border-slate-200 bg-slate-50 text-sm font-medium" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{filtered.length} proposals</div>
        </PageToolbar>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => navigate(`/proposals/${row._id}`)}
        onEdit={canManage ? (row) => { setSelectedProposal(row); setShowCreateModal(true); } : null}
        emptyTitle="No proposals yet"
        emptyDescription="Create a proposal to send to your client."
        emptyAction={canManage ? (
          <Button onClick={() => { setSelectedProposal(null); setShowCreateModal(true); }}>
            <Plus size={16} className="mr-2" />
            Create Proposal
          </Button>
        ) : null}
      />

      <AddProposalModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setSelectedProposal(null);
        }}
        proposal={selectedProposal}
      />
    </div>
  );
};

export default Proposals;
