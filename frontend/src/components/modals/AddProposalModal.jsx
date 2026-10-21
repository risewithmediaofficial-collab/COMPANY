import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useClients } from '../../hooks/useClients';
import { useLeads } from '../../hooks/useLeads';
import { useCreateProposal, useUpdateProposal } from '../../hooks/useProposals';
import LinksEditor from '../ui/LinksEditor';
import { Building2, UserCheck, FileText, X } from 'lucide-react';
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {isEditing ? 'Edit Proposal' : 'Create Proposal'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Deliver proposals directly to active clients or pitching leads
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Google Form Linear Stack */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div className="space-y-6">
              <Field label="Proposal Title" required>
                <Input
                  placeholder="e.g. Social Media Management Package"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              {/* Choose Type: Clients or Leads */}
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Choose Recipient Type <span className="text-destructive">*</span>
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/50 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => set('recipientType', 'client')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      form.recipientType === 'client'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Building2 size={15} />
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => set('recipientType', 'lead')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      form.recipientType === 'lead'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <UserCheck size={15} />
                    Lead / Prospect
                  </button>
                </div>
              </div>

              {/* Dynamic Dropdown: Clients or Leads */}
              {form.recipientType === 'client' ? (
                <Field label="Select Client" required>
                  <select
                    className="app-input w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
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
                    className="app-input w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
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
                  className="app-input w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                  value={form.serviceCategory}
                  onChange={(e) => set('serviceCategory', e.target.value)}
                >
                  {SERVICE_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Proposal Type">
                <Input
                  placeholder="e.g. Monthly retainer, Project fixed price"
                  value={form.proposalType}
                  onChange={(e) => set('proposalType', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Total Amount (₹ INR)" required>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Proposal Status">
                <select
                  className="app-input w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map((status) => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </select>
              </Field>

              <Field label="Contract / Work Start Date">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Contract / Work End Date">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Timeline / Duration">
                <Input
                  placeholder="e.g. 3 months, 6 weeks"
                  value={form.timeline}
                  onChange={(e) => set('timeline', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Revision Limit">
                <Input
                  type="number"
                  min="0"
                  value={form.revisionLimit}
                  onChange={(e) => set('revisionLimit', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Payment Terms">
                <Input
                  placeholder="e.g. 50% advance, 50% on delivery"
                  value={form.paymentTerms}
                  onChange={(e) => set('paymentTerms', e.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Proposal Description">
                <Textarea
                  rows={3}
                  placeholder="Brief overview of the proposal..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Scope of Work">
                <Textarea
                  rows={4}
                  placeholder="What is included in this proposal..."
                  value={form.scopeOfWork}
                  onChange={(e) => set('scopeOfWork', e.target.value)}
                  className="rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Deliverables">
                <Textarea
                  rows={3}
                  placeholder="List specific deliverables..."
                  value={form.deliverables}
                  onChange={(e) => set('deliverables', e.target.value)}
                  className="rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Terms and Conditions">
                <Textarea
                  rows={3}
                  placeholder="Terms and conditions..."
                  value={form.termsAndConditions}
                  onChange={(e) => set('termsAndConditions', e.target.value)}
                  className="rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <Field label="Internal Notes">
                <Textarea
                  rows={2}
                  placeholder="Internal or client notes..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </Field>

              <div className="pt-2">
                <LinksEditor links={form.links} onChange={(links) => set('links', links)} />
              </div>
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
            <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                ESC
              </kbd>
              <span>to close</span>
            </span>

            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
              >
                {isLoading ? 'Saving...' : isEditing ? 'Update Proposal' : 'Create Proposal'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProposalModal;
