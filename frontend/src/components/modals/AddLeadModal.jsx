// =============================================
// ADD LEAD FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLead, useUpdateLead } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { UserPlus, X } from 'lucide-react';

const leadFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceInterest: z.string().optional(),
  decisionMaker: z.string().optional(),
  source: z.enum(['Website', 'Referral', 'Cold Call', 'Email', 'Social Media', 'Event', 'Other']).default('Other'),
  customSource: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Meeting Booked', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Refollow Later']).default('New'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  budget: z.number().optional(),
  currency: z.string().default('INR'),
  expectedCloseDate: z.string().optional(),
  refollowDate: z.string().optional(),
  proposalStatus: z.enum(['Not Sent', 'Sent', 'Viewed', 'Revision Needed', 'Accepted', 'Rejected']).default('Not Sent'),
  lostReason: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});


export const AddLeadModal = ({ open, onOpenChange, lead = null }) => {
  const form = useForm({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      serviceInterest: '',
      decisionMaker: '',
      source: 'Other',
      customSource: '',
      status: 'New',
      priority: 'medium',
      currency: 'INR',
      proposalStatus: 'Not Sent',
      notes: '',
    },
  });

  const { data: users = [] } = useUsers({ enabled: open });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isLoading = createLead.isPending || updateLead.isPending;

  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        company: lead.company || '',
        serviceInterest: lead.serviceInterest || '',
        decisionMaker: lead.decisionMaker || '',
        source: lead.source,
        status: lead.status,
        priority: lead.priority || 'medium',
        budget: lead.budget || 0,
        currency: lead.currency || 'INR',
        expectedCloseDate: lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toISOString().split('T')[0] : '',
        refollowDate: lead.refollowDate ? new Date(lead.refollowDate).toISOString().split('T')[0] : '',
        proposalStatus: lead.proposalStatusLabel || 'Not Sent',
        lostReason: lead.lostReason || '',
        assignedTo: lead.assignedTo?._id || '',
        notes: lead.notes || '',
      });
    } else {
      form.reset();
    }
  }, [lead, open, form]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      email: data.email || undefined,
      budget: data.budget ? Number(data.budget) : undefined,
      currency: data.currency || 'INR',
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      refollowDate: data.refollowDate ? new Date(data.refollowDate) : undefined,
    };

    if (lead) {
      await updateLead.mutateAsync({ id: lead._id, data: payload });
    } else {
      await createLead.mutateAsync(payload);
    }

    if (!createLead.isError && !updateLead.isError) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="center" size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <UserPlus size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {lead ? 'Edit Lead' : 'Add New Lead'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                {lead ? 'Update lead profile, pipeline status, and next follow-up' : 'Create a new prospective lead in your CRM pipeline'}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Lead / Contact Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. John Doe"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="e.g. john@example.com"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. +91 98765 43210"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Company Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Innovations"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Service Interested In</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Social media marketing, Website development, Performance ads..."
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decisionMaker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Key Decision Maker</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Founder, CEO, Marketing VP..."
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select lead source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Cold Call">Cold Call</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.value === 'Other' && (
                        <FormField
                          control={form.control}
                          name="customSource"
                          render={({ field: cf }) => (
                            <FormItem className="mt-2">
                              <FormControl>
                                <Input
                                  placeholder="Specify lead source..."
                                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                                  {...cf}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Pipeline Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Qualified">Qualified</SelectItem>
                          <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
                          <SelectItem value="Proposal">Proposal</SelectItem>
                          <SelectItem value="Negotiation">Negotiation</SelectItem>
                          <SelectItem value="Won">Won</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                          <SelectItem value="Refollow Later">Refollow Later</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Estimated Budget (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 50000"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'INR'}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">₹ Indian Rupees (INR)</SelectItem>
                          <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                          <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Next Follow-up Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refollowDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Refollow Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Proposal Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select proposal status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Not Sent">Not Sent</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Viewed">Viewed</SelectItem>
                          <SelectItem value="Revision Needed">Revision Needed</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Assign To Team Member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lostReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Lost / Refollow Reason</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Budget constraint, postponed to next quarter..."
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Notes & Key Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any conversation notes, key requirements, or client background..."
                          className="min-h-[100px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 z-10 shadow-xs select-none">
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
                  {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
