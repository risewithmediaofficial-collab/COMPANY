// =============================================
// ADD PROJECT FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDays, IndianRupee, Briefcase } from 'lucide-react';
import { useAcceptedProposals } from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects';
import { useClients } from '../../hooks/useClients';
import { toast } from 'sonner';

const DRAFT_KEY = 'draft:project-modal';

const projectFormSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Project type is required'),
  client: z.string().min(1, 'Client is required'),
  status: z.enum(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']).default('Planning'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  budget: z.number().optional(),
  quotedAmount: z.number().optional(),
  currency: z.string().default('INR'),
  acceptedProposalId: z.string().optional(),
  marketingAmount: z.number().optional(),
  adsAmount: z.number().optional(),
  contentAmount: z.number().optional(),
  designAmount: z.number().optional(),
  developmentAmount: z.number().optional(),
  printingAmount: z.number().optional(),
  otherExpenses: z.number().optional(),
  totalBudget: z.number().optional(),
  amountReceived: z.number().optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
  budgetNotes: z.string().optional(),
});


export const AddProjectModal = ({ open, onOpenChange, project = null, defaultClientId = '' }) => {
  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      client: defaultClientId || '',
      status: 'Planning',
      priority: 'Medium',
      startDate: '',
      endDate: '',
      budget: undefined,
      quotedAmount: undefined,
      currency: 'INR',
      acceptedProposalId: '',
      marketingAmount: undefined,
      adsAmount: undefined,
      contentAmount: undefined,
      designAmount: undefined,
      developmentAmount: undefined,
      printingAmount: undefined,
      otherExpenses: undefined,
      totalBudget: undefined,
      amountReceived: undefined,
      paymentStatus: 'pending',
      budgetNotes: '',
    },
  });

  const selectedClientId = form.watch('client');
  const { data: acceptedProposals = [] } = useAcceptedProposals(selectedClientId);
  const { data: clients = [] } = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isLoading = createProject.isPending || updateProject.isPending;

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        category: project.category || '',
        client: project.client?._id || '',
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        budget: project.budget || project.budgetDetails?.totalBudget || project.budgetDetails?.quotedAmount || undefined,
        quotedAmount: project.budgetDetails?.quotedAmount ?? project.budget ?? undefined,
        currency: project.currency || 'INR',
        acceptedProposalId: project.acceptedProposalId?._id || project.acceptedProposalId || '',
        marketingAmount: project.budgetDetails?.marketingAmount,
        adsAmount: project.budgetDetails?.adsAmount,
        contentAmount: project.budgetDetails?.contentAmount,
        designAmount: project.budgetDetails?.designAmount,
        developmentAmount: project.budgetDetails?.developmentAmount,
        printingAmount: project.budgetDetails?.printingAmount,
        otherExpenses: project.budgetDetails?.otherExpenses,
        totalBudget: project.budgetDetails?.totalBudget || project.budget,
        amountReceived: project.budgetDetails?.amountReceived,
        paymentStatus: project.budgetDetails?.paymentStatus || 'pending',
        budgetNotes: project.budgetDetails?.budgetNotes || '',
      });
    } else if (open) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && !defaultClientId) {
        try {
          const parsed = JSON.parse(draft);
          form.reset(parsed);
          toast.info('Draft restored');
        } catch {
          form.reset({
            name: '',
            description: '',
            category: '',
            client: defaultClientId || '',
            status: 'Planning',
            priority: 'Medium',
            startDate: '',
            endDate: '',
            budget: undefined,
            quotedAmount: undefined,
            currency: 'INR',
            acceptedProposalId: '',
            marketingAmount: undefined,
            adsAmount: undefined,
            contentAmount: undefined,
            designAmount: undefined,
            developmentAmount: undefined,
            printingAmount: undefined,
            otherExpenses: undefined,
            totalBudget: undefined,
            amountReceived: undefined,
            paymentStatus: 'pending',
            budgetNotes: '',
          });
        }
      } else {
        form.reset({
          name: '',
          description: '',
          category: '',
          client: defaultClientId || '',
          status: 'Planning',
          priority: 'Medium',
          startDate: '',
          endDate: '',
          budget: undefined,
          currency: 'INR',
          acceptedProposalId: '',
          marketingAmount: undefined,
          adsAmount: undefined,
          contentAmount: undefined,
          designAmount: undefined,
          developmentAmount: undefined,
          printingAmount: undefined,
          otherExpenses: undefined,
          totalBudget: undefined,
          amountReceived: undefined,
          paymentStatus: 'pending',
          budgetNotes: '',
        });
      }
    }
  }, [project, open, form, defaultClientId]);

  const onSubmit = async (data) => {
    const subtotal = [
      data.marketingAmount, data.adsAmount, data.contentAmount, data.designAmount,
      data.developmentAmount, data.printingAmount, data.otherExpenses,
    ].reduce((sum, val) => sum + (Number(val) || 0), 0);
    const quotedAmount = Number(data.quotedAmount) || Number(data.budget) || subtotal || 0;
    const totalBudget = Number(data.totalBudget) || subtotal || quotedAmount || 0;
    const amountReceived = Number(data.amountReceived) || 0;

    const payload = {
      ...data,
      budget: quotedAmount || totalBudget || undefined,
      currency: data.currency || 'INR',
      acceptedProposalId: data.acceptedProposalId || undefined,
      budgetDetails: {
        marketingAmount: Number(data.marketingAmount) || 0,
        adsAmount: Number(data.adsAmount) || 0,
        contentAmount: Number(data.contentAmount) || 0,
        designAmount: Number(data.designAmount) || 0,
        developmentAmount: Number(data.developmentAmount) || 0,
        printingAmount: Number(data.printingAmount) || 0,
        otherExpenses: Number(data.otherExpenses) || 0,
        quotedAmount,
        totalBudget,
        amountReceived,
        paymentStatus: data.paymentStatus || 'pending',
        budgetNotes: data.budgetNotes || '',
      },
    };
    delete payload.marketingAmount;
    delete payload.adsAmount;
    delete payload.contentAmount;
    delete payload.designAmount;
    delete payload.developmentAmount;
    delete payload.printingAmount;
    delete payload.otherExpenses;
    delete payload.totalBudget;
    delete payload.quotedAmount;
    delete payload.amountReceived;
    delete payload.paymentStatus;
    delete payload.budgetNotes;

    if (project) {
      await updateProject.mutateAsync({ id: project._id, data: payload });
    } else {
      await createProject.mutateAsync(payload);
    }

    if (!createProject.isError && !updateProject.isError) {
      form.reset();
      localStorage.removeItem(DRAFT_KEY);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (!project && form.formState.isDirty) {
      const data = form.getValues();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      toast.info('Saved as draft');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-4xl max-h-[92vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg shadow-slate-200/70 transition-all hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground"
            aria-label="Close project form"
          >
            <X size={18} />
          </button>

          <div className="border-b border-border bg-gradient-to-r from-slate-50 via-white to-slate-50 px-7 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Briefcase size={20} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {project ? 'Update the project details' : 'Create a new project for a client'}
                </DialogDescription>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Project Name *</FormLabel>
                      <FormControl>
                        <Input className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" placeholder="Website Redesign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Client *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client._id} value={client._id}>
                              {client.name} - {client.company}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Project Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="web_development">Web Development</SelectItem>
                          <SelectItem value="web_design">Web Design</SelectItem>
                          <SelectItem value="mobile_app">Mobile App</SelectItem>
                          <SelectItem value="e_commerce">E-commerce</SelectItem>
                          <SelectItem value="video_content">Video Content</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="content">Content Creation</SelectItem>
                          <SelectItem value="graphic_design">Graphic Design</SelectItem>
                          <SelectItem value="branding">Branding</SelectItem>
                          <SelectItem value="seo">SEO</SelectItem>
                          <SelectItem value="paid_ads">Paid Ads</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.value === 'other' && (
                        <Input
                          className="mt-2 h-11 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                          placeholder="Specify project type..."
                          {...form.register('customCategory')}
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
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
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
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Start Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input type="date" className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">End Date *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input type="date" className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Budget (₹ INR)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="number"
                            placeholder="50000"
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Project description and details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedClientId ? (
                <FormField
                  control={form.control}
                  name="acceptedProposalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Accepted Proposal (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder={acceptedProposals.length ? 'Select accepted proposal' : 'No accepted proposals for this client'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {acceptedProposals.map((proposal) => (
                            <SelectItem key={proposal._id} value={proposal._id}>
                              {proposal.title} — {formatINR(proposal.amount)} — {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleDateString() : 'Accepted'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IndianRupee size={17} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Budget Details</p>
                    <p className="text-xs text-slate-500">Track planned spend, received amount, and payment status.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ['marketingAmount', 'Marketing Amount'],
                    ['adsAmount', 'Ads Budget'],
                    ['contentAmount', 'Content Budget'],
                    ['designAmount', 'Design Budget'],
                    ['developmentAmount', 'Development Budget'],
                    ['printingAmount', 'Printing Budget'],
                    ['otherExpenses', 'Other Expenses'],
                    ['totalBudget', 'Total Project Budget'],
                    ['amountReceived', 'Amount Received'],
                  ].map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-11 rounded-xl border-slate-200 bg-white text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}

                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:ring-4 focus:ring-primary/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="budgetNotes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Budget Notes</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[90px] rounded-xl border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Budget notes..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="h-11 rounded-xl border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90">
                  {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
