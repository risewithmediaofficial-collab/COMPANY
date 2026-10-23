// =============================================
// ADD CLIENT FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
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
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';
import { FolderOpen, X } from 'lucide-react';

const DRAFT_KEY = 'draft:client-modal';

const CLIENT_SECTORS = [
  'Real Estate',
  'Education',
  'Healthcare',
  'Finance',
  'Retail',
  'E-commerce',
  'Hospitality',
  'Food & Beverage',
  'Beauty & Wellness',
  'Fitness',
  'Technology',
  'Manufacturing',
  'Construction',
  'Interior Design',
  'Legal',
  'NGO',
  'Entertainment',
  'Travel',
  'Automotive',
  'Other',
];

const CLIENT_REQUIREMENTS = [
  'Website Content',
  'Website Development',
  'Video Production',
  'SEO',
  'Social Media Marketing',
  'Performance Marketing',
  'Google Ads',
  'Meta Ads',
  'Branding',
  'Graphic Design',
  'Reels / Short Videos',
  'Photography',
  'Content Writing',
  'Lead Generation',
  'Marketing Strategy',
  'Other',
];

const clientFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().min(2, 'Company name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string(),
  website: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      if (!trimmed) return '';
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    },
    z.string().url('Invalid website URL').optional().or(z.literal(''))
  ),
  driveLink: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      if (!trimmed) return '';
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    },
    z.string().url('Invalid Drive URL').optional().or(z.literal(''))
  ),
  industry: z.string().optional(),
  customIndustry: z.string().optional(),
  services: z.array(z.string()).default([]),
  customService: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Prospect', 'Churned', 'Renew']).default('Active'),
  referredByMode: z.enum(['none', 'dropdown', 'manual']).default('none'),
  referredBy: z.string().optional(),
  referredByManual: z.string().optional(),
  notes: z.string().optional(),
  budgetType: z.enum(['monthly', 'overall']).default('monthly'),
  contractValue: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().optional()
  ),
  contractStartDate: z.string().optional().or(z.literal('')),
  contractEndDate: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.referredByMode === 'dropdown' && !data.referredBy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referredBy'], message: 'Select who referred this client' });
  }

  if (data.referredByMode === 'manual' && !data.referredByManual?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referredByManual'], message: 'Enter the referral name' });
  }
});


export const AddClientModal = ({ open, onOpenChange, client = null, initialStatus = 'Active' }) => {
  const form = useForm({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      website: '',
      driveLink: '',
      industry: undefined,
      customIndustry: '',
      services: [],
      customService: '',
      status: initialStatus || 'Active',
      referredByMode: 'none',
      referredBy: '',
      referredByManual: '',
      notes: '',
      budgetType: 'monthly',
      contractValue: undefined,
      contractStartDate: '',
      contractEndDate: '',
    },
  });

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { data: users = [] } = useUsers({ enabled: open });
  const isLoading = createClient.isPending || updateClient.isPending;
  const referralOptions = users.filter((user) => user.role !== 'client');

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        company: client.company || '',
        email: client.email,
        phone: client.phone || '',
        website: client.website || '',
        driveLink: client.driveLink || '',
        industry: client.industry || undefined,
        customIndustry: client.customIndustry || '',
        services: Array.isArray(client.services) ? client.services : [],
        customService: client.customService || '',
        status: client.status || 'Active',
        referredByMode: client.referredByManual ? 'manual' : client.referredBy ? 'dropdown' : 'none',
        referredBy: client.referredBy?._id || client.referredBy || '',
        referredByManual: client.referredByManual || '',
        notes: client.notes || '',
        budgetType: client.budgetType || 'monthly',
        contractValue: client.contractValue || undefined,
        contractStartDate: client.contractStartDate ? new Date(client.contractStartDate).toISOString().split('T')[0] : '',
        contractEndDate: client.contractEndDate ? new Date(client.contractEndDate).toISOString().split('T')[0] : '',
      });
    } else if (open) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          form.reset(parsed);
          toast.info('Draft restored');
        } catch {
          form.reset({
            name: '',
            company: '',
            email: '',
            phone: '',
            website: '',
            driveLink: '',
            industry: undefined,
            customIndustry: '',
            services: [],
            customService: '',
            status: initialStatus || 'Active',
            referredByMode: 'none',
            referredBy: '',
            referredByManual: '',
            notes: '',
            budgetType: 'monthly',
            contractValue: undefined,
            contractStartDate: '',
            contractEndDate: '',
          });
        }
      } else {
        form.reset({
          name: '',
          company: '',
          email: '',
          phone: '',
          website: '',
          driveLink: '',
          industry: undefined,
          customIndustry: '',
          services: [],
          customService: '',
          status: initialStatus || 'Active',
          referredByMode: 'none',
          referredBy: '',
          referredByManual: '',
          notes: '',
          budgetType: 'monthly',
          contractValue: undefined,
          contractStartDate: '',
          contractEndDate: '',
        });
      }
    }
  }, [client, open, form, initialStatus]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      website: data.website || '',
      industry: data.industry || '',
      customIndustry: data.industry === 'Other' ? (data.customIndustry?.trim() || '') : '',
      services: data.services || [],
      customService: data.services?.includes('Other') ? (data.customService?.trim() || '') : '',
      referredBy: data.referredByMode === 'dropdown' ? (data.referredBy || null) : null,
      referredByManual: data.referredByMode === 'manual' ? data.referredByManual?.trim() || '' : '',
      budgetType: data.budgetType || 'monthly',
      contractValue: data.contractValue ? Number(data.contractValue) : 0,
      contractStartDate: data.contractStartDate || null,
      contractEndDate: data.contractEndDate || null,
    };

    if (client) {
      await updateClient.mutateAsync({ id: client._id, data: payload });
    } else {
      await createClient.mutateAsync(payload);
    }

    if (!createClient.isError && !updateClient.isError) {
      form.reset();
      localStorage.removeItem(DRAFT_KEY);
      onOpenChange(false);
    }
  };

  const handleClose = (isOpen) => {
    if (!isOpen && !client) {
      const currentValues = form.getValues();
      const hasAnyValue = currentValues.name?.trim() || currentValues.company?.trim() || currentValues.email?.trim();
      if (hasAnyValue) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(currentValues));
        toast.success('Draft Saved', { description: 'Client data saved as draft — it will be here when you return.' });
      }
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="center" size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <FolderOpen size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {client ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                {client ? 'Update client profile, budget, contract and requirements' : 'Fill in client profile details, contract terms, and deliverables'}
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
                      <FormLabel className="text-sm font-semibold text-foreground">Contact Name *</FormLabel>
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
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Company Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Corporation"
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
                      <FormLabel className="text-sm font-semibold text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="e.g. john@acme.com"
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
                      <FormLabel className="text-sm font-semibold text-foreground">Phone *</FormLabel>
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
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Website (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. https://www.company.com"
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
                  name="driveLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Google Drive Folder Link</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/drive/folders/..."
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        All files, creatives, and assets for this client will link to this Drive folder.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Type / Sector</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLIENT_SECTORS.map((sector) => (
                            <SelectItem key={sector} value={sector}>
                              {sector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value === 'Other' && (
                        <FormField
                          control={form.control}
                          name="customIndustry"
                          render={({ field: customField }) => (
                            <FormItem className="mt-2">
                              <FormControl>
                                <Input
                                  placeholder="Specify your sector..."
                                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                                  {...customField}
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
                      <FormLabel className="text-sm font-semibold text-foreground">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Prospect">Prospect</SelectItem>
                          <SelectItem value="Churned">Churned</SelectItem>
                          <SelectItem value="Renew">Renew</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Budget & Contract */}
                <FormField
                  control={form.control}
                  name="budgetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Budget Type / Retainer Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select budget type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly Budget (Social Media / Retainer)</SelectItem>
                          <SelectItem value="overall">Overall Budget (One-time Project)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        {form.watch('budgetType') === 'overall' ? 'Overall Budget Amount (₹)' : 'Monthly Budget Amount (₹)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 50000"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contract Dates */}
                <FormField
                  control={form.control}
                  name="contractStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Contract Start Date</FormLabel>
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
                  name="contractEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Contract End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank for ongoing monthly retainers or SMM contracts.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referredByMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Referred By Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select input mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No referral</SelectItem>
                          <SelectItem value="dropdown">Choose from dropdown</SelectItem>
                          <SelectItem value="manual">Enter manually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('referredByMode') === 'dropdown' && (
                  <FormField
                    control={form.control}
                    name="referredBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Referred By User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                              <SelectValue placeholder="Select a team member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referralOptions.map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name} {user.role ? `- ${user.role}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('referredByMode') === 'manual' && (
                  <FormField
                    control={form.control}
                    name="referredByManual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Referral Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter referrer name"
                            className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => {
                    const selected = field.value || [];

                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Client Requirements</FormLabel>
                        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card/50 p-4">
                          {CLIENT_REQUIREMENTS.map((requirement) => {
                            const checked = selected.includes(requirement);

                            return (
                              <label
                                key={requirement}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    if (event.target.checked) {
                                      field.onChange([...selected, requirement]);
                                    } else {
                                      field.onChange(selected.filter((item) => item !== requirement));
                                    }
                                  }}
                                  className="h-4.5 w-4.5 rounded border-border accent-primary cursor-pointer"
                                />
                                <span>{requirement}</span>
                              </label>
                            );
                          })}
                        </div>
                        {selected.includes('Other') && (
                          <FormField
                            control={form.control}
                            name="customService"
                            render={({ field: customField }) => (
                              <FormItem className="mt-2">
                                <FormControl>
                                  <Input
                                    placeholder="Specify other requirement..."
                                    className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                                    {...customField}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes about this client..."
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
                  onClick={() => handleClose(false)}
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
                  {isLoading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
