import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useClients } from '../../hooks/useClients';
import { useLeads } from '../../hooks/useLeads';
import { useCreateProposal, useUpdateProposal } from '../../hooks/useProposals';
import LinksEditor from '../ui/LinksEditor';
import { Building2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

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

const emptyForm = {
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
};

const Field = ({ label, required, children }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-semibold text-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </span>
    {children}
  </label>
);

export const AddProposalModal = ({ open, onOpenChange, proposal = null }) => {
  const [form, setForm] = useState(emptyForm);
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const isEditing = Boolean(proposal);
  const isLoading = createProposal.isPending || updateProposal.isPending;

  useEffect(() => {
    if (proposal && open) {
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
        startDate: proposal.startDate ? String(proposal.startDate).split('T')[0] : '',
        endDate: proposal.endDate ? String(proposal.endDate).split('T')[0] : '',
        amount: proposal.amount ?? '',
        paymentTerms: proposal.paymentTerms || '',
        revisionLimit: proposal.revisionLimit ?? 3,
        termsAndConditions: proposal.termsAndConditions || '',
        notes: proposal.notes || '',
        links: proposal.links || [],
        status: proposal.status || 'draft',
      });
    } else if (!proposal && open) {
      setForm(emptyForm);
    }
  }, [proposal, open]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('Proposal title is required');
      return;
    }
    if (form.recipientType === 'client' && !form.client) {
      toast.error('Please select a client');
      return;
    }
    if (form.recipientType === 'lead' && !form.lead) {
      toast.error('Please select a lead');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid proposal amount');
      return;
    }

    const payload = {
      ...form,
      client: form.recipientType === 'client' ? form.client : null,
      lead: form.recipientType === 'lead' ? form.lead : null,
      amount: Number(form.amount),
      revisionLimit: Number(form.revisionLimit) || 3,
    };

    if (isEditing) {
      await updateProposal.mutateAsync({ id: proposal._id, data: payload });
    } else {
      await createProposal.mutateAsync(payload);
    }

    setForm(emptyForm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Proposal' : 'Create Proposal'}</DialogTitle>
          <DialogDescription>
            Fill in the proposal details below. Deliver directly to active clients or pitching leads.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Proposal Title" required>
              <Input
                placeholder="e.g. Social Media Management Package"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>

            {/* Choose Type: Clients or Leads */}
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-foreground">
                Choose Recipient Type <span className="text-destructive">*</span>
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => set('recipientType', 'client')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
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
                  onClick={() => set('recipientType', 'lead')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    form.recipientType === 'lead'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <UserCheck size={13} />
                  Lead
                </button>
              </div>
            </div>

            {/* Dynamic Dropdown: Clients or Leads */}
            {form.recipientType === 'client' ? (
              <Field label="Select Client" required>
                <select
                  className="app-input w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.client}
                  onChange={(e) => set('client', e.target.value)}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Select Lead / Prospect" required>
                <select
                  className="app-input w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.lead}
                  onChange={(e) => set('lead', e.target.value)}
                >
                  <option value="">Select lead</option>
                  {leads.map((lead) => (
                    <option key={lead._id} value={lead._id}>
                      {lead.name} {lead.company ? `(${lead.company})` : ''} {lead.email ? `- ${lead.email}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Service Category" required>
              <select
                className="app-input w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.serviceCategory}
                onChange={(e) => set('serviceCategory', e.target.value)}
              >
                {SERVICE_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Proposal Type">
              <Input placeholder="e.g. Monthly retainer" value={form.proposalType} onChange={(e) => set('proposalType', e.target.value)} />
            </Field>

            <Field label="Total Amount (₹ INR)" required>
              <Input type="number" min="0" placeholder="50000" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            </Field>

            <Field label="Status">
              <select className="app-input w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Field>

            <Field label="Start Date">
              <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </Field>

            <Field label="End Date">
              <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </Field>

            <Field label="Timeline / Duration">
              <Input placeholder="e.g. 3 months" value={form.timeline} onChange={(e) => set('timeline', e.target.value)} />
            </Field>

            <Field label="Revision Limit">
              <Input type="number" min="0" value={form.revisionLimit} onChange={(e) => set('revisionLimit', e.target.value)} />
            </Field>

            <Field label="Payment Terms">
              <Input placeholder="e.g. 50% advance, 50% on delivery" value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
            </Field>
          </div>

          <Field label="Proposal Description">
            <Textarea rows={3} placeholder="Brief overview of the proposal..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <Field label="Scope of Work">
            <Textarea rows={4} placeholder="What is included in this proposal..." value={form.scopeOfWork} onChange={(e) => set('scopeOfWork', e.target.value)} />
          </Field>

          <Field label="Deliverables">
            <Textarea rows={3} placeholder="List deliverables..." value={form.deliverables} onChange={(e) => set('deliverables', e.target.value)} />
          </Field>

          <Field label="Terms and Conditions">
            <Textarea rows={3} placeholder="Terms and conditions..." value={form.termsAndConditions} onChange={(e) => set('termsAndConditions', e.target.value)} />
          </Field>

          <Field label="Notes">
            <Textarea rows={2} placeholder="Internal or client notes..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>

          <LinksEditor links={form.links} onChange={(links) => set('links', links)} />

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Proposal' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProposalModal;
