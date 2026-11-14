import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle2, CircleDollarSign, Clock3, FileText, Layers3, XCircle, Building2, UserCheck, Trash2 } from '@/components/ui/muiIcons';
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
  useDeleteProposal,
} from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';
import LinksEditor, { LinksList } from '../../components/ui/LinksEditor';
import { NotionDetailPage } from '../../components/ui/NotionDetailTemplate';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const canManage = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  const { data: proposal, isLoading } = useProposal(isNew ? null : id);
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const acceptProposal = useAcceptProposal();
  const rejectProposal = useRejectProposal();
  const deleteProposal = useDeleteProposal();

  const [editing, setEditing] = useState(isNew);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    return <div className="h-64 rounded-3xl bg-card" />;
  }

  const paperField = (label, value) => (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-800 tabular-nums">{value || '—'}</p>
    </div>
  );

  const recipientLabel = proposal?.recipientType === 'lead' || proposal?.lead
    ? `Lead: ${proposal?.lead?.name || 'Lead'}${proposal?.lead?.company ? ` (${proposal.lead.company})` : ''}`
    : `Client: ${proposal?.client?.company || proposal?.client?.name || 'Client'}`;

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
          <div className="mt-6 grid gap-4 md:grid-cols-3 tabular-nums">
            <div className="rounded-3xl bg-neutral-100 p-5">
              <div className="flex items-center gap-2 text-neutral-700">
                <CircleDollarSign size={18} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Amount</span>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-neutral-900">{formatINR(proposal.amount)}</p>
            </div>
            <div className="rounded-3xl bg-neutral-100 p-5">
              <div className="flex items-center gap-2 text-neutral-700">
                <Clock3 size={18} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Status</span>
              </div>
              <p className="mt-4 text-xl font-black capitalize tracking-tight text-neutral-900">{proposal.status || 'draft'}</p>
            </div>
            <div className="rounded-3xl bg-neutral-100 p-5">
              <div className="flex items-center gap-2 text-neutral-700">
                <Layers3 size={18} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Revisions</span>
              </div>
              <p className="mt-4 text-xl font-black tracking-tight text-neutral-900">{proposal.revisionLimit || 3} rounds</p>
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
          <div className="rounded-2xl bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Attachments & Links</p>
            <div className="mt-3 text-sm text-neutral-700">
              <LinksList links={proposal.links} />
            </div>
          </div>
          {proposal.acceptedAt ? paperField('Accepted At', new Date(proposal.acceptedAt).toLocaleString()) : null}
        </div>
      ),
    },
  ] : [];

  return (
    <div className="space-y-4">
      <NotionDetailPage
        backTo={isClient ? '/client/proposals' : '/proposals'}
        backLabel="Proposals"
        title={isNew ? 'Create Proposal' : proposal?.title}
        subtitle={proposal?.proposalNumber || form.proposalType || 'Service proposal'}
        icon={FileText}
        status={proposal?.status}
        statusClassName={proposal?.status === 'accepted' ? 'bg-primary text-primary-foreground ' : 'bg-secondary text-foreground '}
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
            {canManage && !editing && !isNew ? (
              <>
                <Button onClick={() => setEditing(true)}>Edit</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-foreground hover:bg-secondary"
                >
                  <Trash2 size={15} className="mr-1.5" />
                  <span>Delete</span>
                </Button>
              </>
            ) : null}
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
          <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl ">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, recipientType: 'client' }))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                form.recipientType === 'client'
                  ? 'bg-primary text-primary-foreground '
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
                  ? 'bg-primary text-primary-foreground '
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <UserCheck size={13} />
              Lead
            </button>
          </div>

          {/* Dynamic Dropdown: Clients or Leads */}
          {form.recipientType === 'client' ? (
            <SelectDropdown
              value={form.client}
              onChange={(val) => setForm((current) => ({ ...current, client: val || '' }))}
              options={clients.map((client) => ({
                value: client._id,
                label: client.company || client.name,
              }))}
              placeholder="Select client *"
              allowCustom={false}
              className="w-full"
              buttonClassName="h-10 bg-background text-sm rounded-xl border border-border/50"
            />
          ) : (
            <SelectDropdown
              value={form.lead}
              onChange={(val) => setForm((current) => ({ ...current, lead: val || '' }))}
              options={leads.map((lead) => ({
                value: lead._id,
                label: `${lead.name} ${lead.company ? `(${lead.company})` : ''}`,
                subLabel: lead.email || undefined,
              }))}
              placeholder="Select lead *"
              allowCustom={false}
              className="w-full"
              buttonClassName="h-10 bg-background text-sm rounded-xl border border-border/50"
            />
          )}
          <SelectDropdown
            value={form.serviceCategory}
            onChange={(val) => setForm((current) => ({ ...current, serviceCategory: val || 'social_media' }))}
            options={SERVICE_CATEGORIES.map((service) => ({
              value: service.value,
              label: service.label,
            }))}
            placeholder="Service Category"
            allowCustom={false}
            allowDeselect={false}
            className="w-full"
            buttonClassName="h-10 bg-background text-sm rounded-xl border border-border/50"
          />
          <Input placeholder="Proposal Type" value={form.proposalType} onChange={(e) => setForm((current) => ({ ...current, proposalType: e.target.value }))} />
          <Input type="number" placeholder="Total Amount (INR)" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} />
          <SelectDropdown
            value={form.status || 'draft'}
            onChange={(val) => setForm((current) => ({ ...current, status: val || 'draft' }))}
            options={['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map((status) => ({
              value: status,
              label: status.charAt(0).toUpperCase() + status.slice(1),
            }))}
            placeholder="Proposal Status"
            allowCustom={false}
            allowDeselect={false}
            className="w-full"
            buttonClassName="h-10 bg-background text-sm rounded-xl border border-border/50"
          />
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
        <div className="rounded-[2rem] bg-secondary/40 p-2.5 sm:p-4 md:p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-background/80 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Print Layout Preview</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary self-start sm:self-auto">
              <FileText size={14} />
              {proposalPages.length} pages
            </div>
          </div>

          <div className="space-y-6">
            {proposalPages.map((page) => (
              <section
                key={page.page}
                className="mx-auto flex w-full max-w-[210mm] flex-col rounded-[24px] sm:rounded-[28px] bg-white p-4 sm:p-6 md:p-12 text-neutral-900 shadow-[0_18px_60px_rgba(0,0,0,0.08)] md:min-h-[297mm]"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4 pb-5 sm:pb-6">
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-neutral-400">Rise With Media Proposal</p>
                    <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-neutral-900 break-words">{page.title}</h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 break-words">{page.subtitle}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-right tabular-nums">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Page</p>
                    <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-black tracking-tight text-neutral-900">{page.page}</p>
                  </div>
                </div>

                <div className="py-8">
                  {page.content}
                </div>

                <div className="mt-auto flex items-center justify-between pt-5 text-xs text-neutral-400">
                  <span>{proposal?.proposalNumber || 'Proposal Draft'}</span>
                  <span>{proposal?.client?.company || proposal?.client?.name || 'Client Proposal'}</span>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialogContent className="rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete Proposal "{proposal?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Are you sure you want to delete proposal "{proposal?.title}" ({proposal?.proposalNumber || 'Proposal'})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteProposal.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteProposal.mutateAsync(id);
                  navigate('/proposals');
                } catch {
                  // handled by mutation
                }
              }}
              disabled={deleteProposal.isPending}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {deleteProposal.isPending ? 'Deleting...' : 'Delete Proposal'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProposalDetails;
