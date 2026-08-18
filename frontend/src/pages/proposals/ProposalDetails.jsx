import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle2, CircleDollarSign, Clock3, FileText, Layers3, XCircle, Building2, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useClients } from '../../hooks/useClients';
import { useLeads } from '../../hooks/useLeads';
import {
  useProposal,
  useCreateProposal,
  useUpdateProposal,
  useAcceptProposal,
  useRejectProposal,
} from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';
import LinksEditor, { LinksList } from '../../components/ui/LinksEditor';
import { NotionDetailPage } from '../../components/ui/NotionDetailTemplate';

const SERVICE_CATEGORIES = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'branding', label: 'Branding' },
  { value: 'seo', label: 'SEO' },
  { value: 'ads', label: 'Ads' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'custom', label: 'Custom' },
];

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isNew = id === 'new';
  const isClient = user?.role === 'client';
  const canManage = ['superAdmin', 'manager'].includes(user?.role);

  const { data: proposal, isLoading } = useProposal(isNew ? null : id);
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const acceptProposal = useAcceptProposal();
  const rejectProposal = useRejectProposal();

  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState({
    title: '',
    recipientType: 'client', // 'client' | 'lead'
    client: '',
    lead: '',
    serviceCategory: 'custom',
    proposalType: '',
    description: '',
    scopeOfWork: '',
    deliverables: '',
    timeline: '',
    startDate: '',
    endDate: '',
    amount: '',
    paymentTerms: '',
    revisionLimit: 3,
    termsAndConditions: '',
    notes: '',
    links: [],
    status: 'draft',
  });

  useEffect(() => {
    if (proposal && !isNew) {
      const isLead = Boolean(proposal.lead || proposal.recipientType === 'lead');
      setForm({
        title: proposal.title || '',
        recipientType: isLead ? 'lead' : 'client',
        client: proposal.client?._id || proposal.client || '',
        lead: proposal.lead?._id || proposal.lead || '',
        serviceCategory: proposal.serviceCategory || 'custom',
        proposalType: proposal.proposalType || '',
        description: proposal.description || '',
        scopeOfWork: proposal.scopeOfWork || '',
        deliverables: proposal.deliverables || '',
        timeline: proposal.timeline || '',
        startDate: proposal.startDate ? proposal.startDate.split('T')[0] : '',
        endDate: proposal.endDate ? proposal.endDate.split('T')[0] : '',
        amount: proposal.amount || '',
        paymentTerms: proposal.paymentTerms || '',
        revisionLimit: proposal.revisionLimit || 3,
        termsAndConditions: proposal.termsAndConditions || '',
        notes: proposal.notes || '',
        links: proposal.links || [],
        status: proposal.status || 'draft',
      });
    }
  }, [proposal, isNew]);

  const handleSave = async () => {
    const payload = {
      ...form,
      client: form.recipientType === 'client' ? form.client : null,
      lead: form.recipientType === 'lead' ? form.lead : null,
      amount: Number(form.amount) || 0,
      revisionLimit: Number(form.revisionLimit) || 3,
    };

    if (isNew) {
      const created = await createProposal.mutateAsync(payload);
      navigate(`/proposals/${created._id}`);
      setEditing(false);
    } else {
      await updateProposal.mutateAsync({ id, data: payload });
      setEditing(false);
    }
  };

  if (!isNew && isLoading) {
    return <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />;
  }

  const paperField = (label, value) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || '—'}</p>
    </div>
  );

  const recipientLabel = proposal?.recipientType === 'lead' || proposal?.lead
    ? `🎯 Lead: ${proposal?.lead?.name || 'Lead'}${proposal?.lead?.company ? ` (${proposal.lead.company})` : ''}`
    : `🏢 Client: ${proposal?.client?.company || proposal?.client?.name || 'Client'}`;

  const proposalPages = proposal ? [
    {
      page: '01',
      title: proposal.title || 'Proposal',
      subtitle: proposal.proposalType || 'Service Proposal',
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {paperField('Recipient / Target', recipientLabel)}
            {paperField('Proposal Number', proposal.proposalNumber)}
            {paperField('Service Category', proposal.serviceCategory)}
            {paperField('Project Timeline', proposal.timeline)}
            {paperField('Start Date', proposal.startDate ? new Date(proposal.startDate).toLocaleDateString() : '—')}
            {paperField('End Date', proposal.endDate ? new Date(proposal.endDate).toLocaleDateString() : '—')}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <CircleDollarSign size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Amount</span>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-emerald-900">{formatINR(proposal.amount)}</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock3 size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Status</span>
              </div>
              <p className="mt-4 text-xl font-black capitalize tracking-tight text-amber-900">{proposal.status || 'draft'}</p>
            </div>
            <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
              <div className="flex items-center gap-2 text-sky-700">
                <Layers3 size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Revisions</span>
              </div>
              <p className="mt-4 text-xl font-black tracking-tight text-sky-900">{proposal.revisionLimit || 3} rounds</p>
            </div>
          </div>
          <div className="mt-6">
            {paperField('Proposal Overview', proposal.description)}
          </div>
        </>
      ),
    },
    {
      page: '02',
      title: 'Scope & Deliverables',
      subtitle: 'Work included in this proposal',
      content: (
        <div className="space-y-5">
          {paperField('Scope of Work', proposal.scopeOfWork)}
          {paperField('Deliverables', proposal.deliverables)}
          {paperField('Payment Terms', proposal.paymentTerms)}
        </div>
      ),
    },
    {
      page: '03',
      title: 'Terms & References',
      subtitle: 'Conditions, notes, and supporting links',
      content: (
        <div className="space-y-5">
          {paperField('Terms and Conditions', proposal.termsAndConditions)}
          {paperField('Notes', proposal.notes)}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attachments & Links</p>
            <div className="mt-3 text-sm text-slate-700">
              <LinksList links={proposal.links} />
            </div>
          </div>
          {proposal.acceptedAt ? paperField('Accepted At', new Date(proposal.acceptedAt).toLocaleString()) : null}
        </div>
      ),
    },
  ] : [];

  return (
    <div className="space-y-6">
      <NotionDetailPage
        backTo={isClient ? '/client/proposals' : '/proposals'}
        backLabel="Proposals"
        title={isNew ? 'Create Proposal' : proposal?.title}
        subtitle={proposal?.proposalNumber || form.proposalType || 'Service proposal'}
        icon={FileText}
        status={proposal?.status}
        statusClassName={proposal?.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}
        actions={(
          <>
            {isClient && proposal?.status === 'sent' ? (
              <>
                <Button onClick={() => acceptProposal.mutate(id)} disabled={acceptProposal.isPending}>
                  <CheckCircle2 size={16} className="mr-2" /> Accept
                </Button>
                <Button variant="outline" onClick={() => rejectProposal.mutate(id)}>
                  <XCircle size={16} className="mr-2" /> Reject
                </Button>
              </>
            ) : null}
            {canManage && !editing && !isNew ? <Button onClick={() => setEditing(true)}>Edit</Button> : null}
            {canManage && editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    if (isNew) navigate('/proposals');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createProposal.isPending || updateProposal.isPending}>Save</Button>
              </>
            ) : null}
            {canManage && isNew ? (
              <Button onClick={handleSave} disabled={createProposal.isPending}>Create Proposal</Button>
            ) : null}
          </>
        )}
      />

      {editing && canManage ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Proposal Title *" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
          
          {/* Choose Type: Clients or Leads */}
          <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, recipientType: 'client' }))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                form.recipientType === 'client'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Building2 size={13} />
              Client
            </button>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, recipientType: 'lead' }))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                form.recipientType === 'lead'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <UserCheck size={13} />
              Lead
            </button>
          </div>

          {/* Dynamic Dropdown: Clients or Leads */}
          {form.recipientType === 'client' ? (
            <select
              className="app-input"
              value={form.client}
              onChange={(e) => setForm((current) => ({ ...current, client: e.target.value }))}
            >
              <option value="">Select client *</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.company || client.name}</option>
              ))}
            </select>
          ) : (
            <select
              className="app-input"
              value={form.lead}
              onChange={(e) => setForm((current) => ({ ...current, lead: e.target.value }))}
            >
              <option value="">Select lead *</option>
              {leads.map((lead) => (
                <option key={lead._id} value={lead._id}>
                  {lead.name} {lead.company ? `(${lead.company})` : ''} {lead.email ? `- ${lead.email}` : ''}
                </option>
              ))}
            </select>
          )}
          <select className="app-input" value={form.serviceCategory} onChange={(e) => setForm((current) => ({ ...current, serviceCategory: e.target.value }))}>
            {SERVICE_CATEGORIES.map((service) => (
              <option key={service.value} value={service.value}>{service.label}</option>
            ))}
          </select>
          <Input placeholder="Proposal Type" value={form.proposalType} onChange={(e) => setForm((current) => ({ ...current, proposalType: e.target.value }))} />
          <Input type="number" placeholder="Total Amount (INR)" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} />
          <select className="app-input" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            {['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Input type="date" value={form.startDate} onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))} />
          <Input type="date" value={form.endDate} onChange={(e) => setForm((current) => ({ ...current, endDate: e.target.value }))} />
          <Textarea className="md:col-span-2" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          <Textarea className="md:col-span-2" rows={3} placeholder="Scope of Work" value={form.scopeOfWork} onChange={(e) => setForm((current) => ({ ...current, scopeOfWork: e.target.value }))} />
          <Textarea className="md:col-span-2" rows={3} placeholder="Deliverables" value={form.deliverables} onChange={(e) => setForm((current) => ({ ...current, deliverables: e.target.value }))} />
          <Input placeholder="Timeline / Duration" value={form.timeline} onChange={(e) => setForm((current) => ({ ...current, timeline: e.target.value }))} />
          <Input placeholder="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm((current) => ({ ...current, paymentTerms: e.target.value }))} />
          <Textarea className="md:col-span-2" rows={3} placeholder="Terms and Conditions" value={form.termsAndConditions} onChange={(e) => setForm((current) => ({ ...current, termsAndConditions: e.target.value }))} />
          <Textarea className="md:col-span-2" rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          <div className="md:col-span-2">
            <LinksEditor links={form.links} onChange={(links) => setForm((current) => ({ ...current, links }))} />
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-border bg-secondary/40 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background/80 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Print Layout Preview</p>
              <p className="mt-1 text-sm text-muted-foreground">Proposal pages are shown in A4 order for both team and client viewing.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <FileText size={14} />
              {proposalPages.length} pages
            </div>
          </div>

          <div className="space-y-6">
            {proposalPages.map((page) => (
              <section
                key={page.page}
                className="mx-auto flex w-full max-w-[210mm] flex-col rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.10)] md:min-h-[297mm] md:p-12"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Rise With Media Proposal</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{page.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">{page.subtitle}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-slate-200 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Page</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{page.page}</p>
                  </div>
                </div>

                <div className="py-8">
                  {page.content}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-400">
                  <span>{proposal?.proposalNumber || 'Proposal Draft'}</span>
                  <span>{proposal?.client?.company || proposal?.client?.name || 'Client Proposal'}</span>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalDetails;
