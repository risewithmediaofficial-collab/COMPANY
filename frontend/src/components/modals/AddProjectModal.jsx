// =============================================
// ADD PROJECT FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
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
import {
  useProjectMonthlyDeliverables,
  useBatchSaveProjectMonthlyDeliverables,
} from '../../hooks/useMonthlyDeliverables';
import MonthlyDeliverablesSection from '../projects/MonthlyDeliverablesSection';
import { toast } from 'sonner';

const DRAFT_KEY = 'draft:project-modal';

const projectFormSchema = z
  .object({
    name: z.string().min(2, 'Project name is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Project type is required'),
    client: z.string().optional().or(z.literal('')),
    isInternal: z.boolean().default(false),
    status: z.enum(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']).default('Planning'),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    budget: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    quotedAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    currency: z.string().default('INR'),
    acceptedProposalId: z.string().optional().or(z.literal('')),
    marketingAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    adsAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    contentAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    designAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    developmentAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    printingAmount: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    otherExpenses: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    totalBudget: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    amountReceived: z.union([z.number(), z.string(), z.nan()]).optional().nullable(),
    paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
    budgetNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      const isSaasOrInternal =
        data.isInternal ||
        data.category === 'saas_product' ||
        data.category === 'saas' ||
        data.category === 'internal_tool' ||
        data.category === 'internal_product';

      if (isSaasOrInternal) return true;
      return Boolean(data.client && data.client.trim().length > 0);
    },
    {
      message: 'Client is required for client projects (or select SaaS Product type)',
      path: ['client'],
    }
  );


export const AddProjectModal = ({ open, onOpenChange, project = null, defaultClientId = '' }) => {
  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      client: defaultClientId || '',
      isInternal: false,
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
  const selectedCategory = form.watch('category');
  const isInternalValue = form.watch('isInternal');
  const isSaasOrInternal =
    isInternalValue ||
    ['saas_product', 'saas', 'internal_tool', 'internal_product'].includes(selectedCategory);

  const { data: acceptedProposals = [] } = useAcceptedProposals(selectedClientId);
  const { data: clients = [] } = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const batchSaveDeliverables = useBatchSaveProjectMonthlyDeliverables();
  const isLoading = createProject.isPending || updateProject.isPending || batchSaveDeliverables.isPending;

  const [deliverableMonth, setDeliverableMonth] = useState(new Date().getMonth() + 1);
  const [deliverableYear, setDeliverableYear] = useState(new Date().getFullYear());
  const [monthlyDeliverables, setMonthlyDeliverables] = useState([]);

  const { data: existingDeliverablesData } = useProjectMonthlyDeliverables(
    project?._id,
    deliverableMonth,
    deliverableYear
  );

  useEffect(() => {
    if (existingDeliverablesData?.deliverables) {
      setMonthlyDeliverables(
        existingDeliverablesData.deliverables.map((d) => ({
          _id: d._id,
          contentType: d.contentType,
          targetQuantity: d.targetQuantity,
        }))
      );
    } else if (!project) {
      setMonthlyDeliverables([]);
    }
  }, [existingDeliverablesData, project]);

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
    const parsedBudget = data.budget !== undefined && data.budget !== null && data.budget !== '' && !isNaN(Number(data.budget)) ? Number(data.budget) : undefined;
    const quotedAmount = Number(data.quotedAmount) || parsedBudget || subtotal || 0;
    const totalBudget = Number(data.totalBudget) || subtotal || quotedAmount || 0;
    const amountReceived = Number(data.amountReceived) || 0;

    const payload = {
      ...data,
      startDate: data.startDate?.trim() ? data.startDate : null,
      endDate: data.endDate?.trim() ? data.endDate : null,
      budget: parsedBudget !== undefined ? parsedBudget : (quotedAmount || totalBudget || 0),
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

    let savedProject;
    if (project) {
      savedProject = await updateProject.mutateAsync({ id: project._id, data: payload });
    } else {
      savedProject = await createProject.mutateAsync(payload);
    }

    const targetProjectId = project?._id || savedProject?._id || savedProject?.project?._id;
    if (targetProjectId && monthlyDeliverables !== undefined) {
      try {
        await batchSaveDeliverables.mutateAsync({
          projectId: targetProjectId,
          month: deliverableMonth,
          year: deliverableYear,
          deliverables: monthlyDeliverables,
        });
      } catch (err) {
        console.error('Failed to save monthly deliverables in project modal', err);
      }
    }

    if (!createProject.isError && !updateProject.isError) {
      form.reset();
      setMonthlyDeliverables([]);
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
      <DialogContent size="xl" noPadding className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl">
        <DialogHeader className="px-6 py-4.5 border-b border-border bg-card shrink-0 pr-24 select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {project ? 'Update project scope, deliverables, budget, and timeline' : 'Create a new project pipeline for client deliverables and milestones'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="text-xs font-semibold text-foreground/90">Project Name *</FormLabel>
                    <FormControl>
                      <Input className="h-9 rounded-xl border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20" placeholder="e.g. Website Redesign & SEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Type / Category Selection */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Project Type *</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (['saas_product', 'saas', 'internal_tool', 'internal_product'].includes(val)) {
                          form.setValue('isInternal', true);
                          if (!form.getValues('client')) {
                            form.setValue('client', '');
                          }
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="saas_product" className="font-semibold text-primary">
                          🚀 SaaS Product / Platform (No Client)
                        </SelectItem>
                        <SelectItem value="internal_tool" className="font-semibold text-indigo-500">
                          🛠️ Internal Software / Tool (No Client)
                        </SelectItem>
                        <SelectItem value="web_development">🌐 Website / Web Development</SelectItem>
                        <SelectItem value="web_design">💻 Web Design / UI-UX</SelectItem>
                        <SelectItem value="social_media">📱 Social Media Marketing</SelectItem>
                        <SelectItem value="seo">🔍 Search Engine Optimization (SEO)</SelectItem>
                        <SelectItem value="paid_ads">🎯 Paid Ads & Performance Marketing</SelectItem>
                        <SelectItem value="branding">🎨 Branding & Identity</SelectItem>
                        <SelectItem value="graphic_design">🖌️ Graphic Design & Creatives</SelectItem>
                        <SelectItem value="video_content">🎬 Video Production & Content</SelectItem>
                        <SelectItem value="mobile_app">📲 Mobile App Development</SelectItem>
                        <SelectItem value="e_commerce">🛒 E-Commerce Solutions</SelectItem>
                        <SelectItem value="content">✍️ Content Creation & Copywriting</SelectItem>
                        <SelectItem value="other">📁 Other Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Selection (Optional for SaaS / Internal Projects) */}
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-semibold text-foreground/90">
                        Client {isSaasOrInternal ? (
                          <span className="text-[11px] font-bold text-emerald-500 ml-1">(Optional for SaaS)</span>
                        ) : (
                          <span className="text-destructive">*</span>
                        )}
                      </FormLabel>
                    </div>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val === 'none' ? '' : val);
                      }}
                      value={field.value || (isSaasOrInternal ? 'none' : '')}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder={isSaasOrInternal ? 'None (Internal SaaS Product)' : 'Select client'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isSaasOrInternal && (
                          <SelectItem value="none" className="text-muted-foreground font-medium">
                            🏢 None (Internal SaaS Product)
                          </SelectItem>
                        )}
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

              {/* SaaS Mode Helpful Notice */}
              {isSaasOrInternal && (
                <div className="md:col-span-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-200">
                  <span>🚀</span>
                  <span className="font-semibold">
                    SaaS Product Mode Active: You can create and build this SaaS platform without adding an external client.
                  </span>
                </div>
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs focus:ring-2 focus:ring-primary/20">
                          <SelectValue />
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
                    <FormLabel className="text-xs font-semibold text-foreground/90">Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs focus:ring-2 focus:ring-primary/20">
                          <SelectValue />
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
                    <FormLabel className="text-xs font-semibold text-foreground/90">
                      Start Date <span className="text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" className="h-9 rounded-xl border-border bg-background pl-9 text-xs focus:ring-2 focus:ring-primary/20" {...field} />
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
                    <FormLabel className="text-xs font-semibold text-foreground/90">
                      End Date <span className="text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" className="h-9 rounded-xl border-border bg-background pl-9 text-xs focus:ring-2 focus:ring-primary/20" {...field} />
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
                    <FormLabel className="text-xs font-semibold text-foreground/90">
                      Budget (₹ INR) <span className="text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="e.g. 50000 (optional)"
                          className="h-9 rounded-xl border-border bg-background pl-9 text-xs focus:ring-2 focus:ring-primary/20"
                          {...field}
                          value={field.value ?? ''}
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
                  <FormLabel className="text-xs font-semibold text-foreground/90">Project Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[75px] rounded-xl border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20" placeholder="Brief summary of goals and deliverables..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monthly Deliverables & Targets Section */}
            <MonthlyDeliverablesSection
              deliverables={monthlyDeliverables}
              onChange={setMonthlyDeliverables}
              month={deliverableMonth}
              year={deliverableYear}
              onMonthChange={setDeliverableMonth}
              onYearChange={setDeliverableYear}
            />

            {/* Budget & Payment Section */}
            <div className="rounded-2xl border border-border/80 bg-secondary/25 p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-primary" /> Budget & Payment Workflow
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground/90">Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground/90">Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs">
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
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Budget Notes</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[60px] rounded-xl border-border bg-background px-3 py-2 text-xs" placeholder="Payment schedule, milestone terms..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="h-9 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90">
                {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
