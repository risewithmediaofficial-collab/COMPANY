// =============================================
// ADD PROJECT FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CalendarDays,
  IndianRupee,
  Briefcase,
  Target,
  Rocket,
  CheckCircle2,
  Globe,
  Sparkles,
  Layers,
  Code2,
  ArrowRight,
} from '@/components/ui/muiIcons';
import { useAcceptedProposals } from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';
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
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects';
import { useClients } from '../../hooks/useClients';
import {
  useProjectMonthlyDeliverables,
  useBatchSaveProjectMonthlyDeliverables,
} from '../../hooks/useMonthlyDeliverables';
import MonthlyDeliverablesSection from '../projects/MonthlyDeliverablesSection';
import { toast } from 'sonner';
import api from '../../api';
import DuplicateConfirmDialog from './DuplicateConfirmDialog';

const DRAFT_KEY = 'draft:project-modal';

const toDateInputValue = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const normalizeFormStatus = (status) => {
  if (!status) return 'Planning';
  const key = String(status).toLowerCase().replace(/[\s-]+/g, '_');
  const map = {
    planning: 'Planning',
    active: 'In Progress',
    in_progress: 'In Progress',
    on_process: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    done: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  };
  return map[key] || status;
};

const normalizeFormPriority = (priority) => {
  if (!priority) return 'Medium';
  const key = String(priority).toLowerCase();
  const map = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Critical',
    critical: 'Critical',
  };
  return map[key] || priority;
};

const projectFormSchema = z
  .object({
    name: z.string().min(2, 'Project name is required'),
    description: z.string().optional().or(z.literal('')),
    category: z.string().min(1, 'Project type is required'),
    client: z.string().optional().or(z.literal('')),
    isInternal: z.boolean().default(false),
    status: z.string().default('Planning'),
    priority: z.string().default('Medium'),
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
    paymentStatus: z.string().optional(),
    budgetNotes: z.string().optional().or(z.literal('')),
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
      return Boolean(data.client && data.client.trim().length > 0 && data.client !== 'none');
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

  const navigate = useNavigate();

  const isDevOrSoftwareCategory = (cat) =>
    ['web_development', 'web_design', 'saas_product', 'saas', 'internal_tool', 'internal_product', 'mobile_app', 'e_commerce'].includes(cat);

  const isContentCategory = (cat) =>
    ['social_media', 'video_content', 'video', 'content', 'graphic_design', 'branding', 'paid_ads'].includes(cat);

  const selectedClientId = form.watch('client');
  const selectedCategory = form.watch('category');
  const isInternalValue = form.watch('isInternal');
  const isSaasOrInternal =
    isInternalValue ||
    ['saas_product', 'saas', 'internal_tool', 'internal_product'].includes(selectedCategory);

  const isDevCategory = isDevOrSoftwareCategory(selectedCategory);

  const { data: acceptedProposals = [] } = useAcceptedProposals(selectedClientId);
  const { data: clients = [] } = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const batchSaveDeliverables = useBatchSaveProjectMonthlyDeliverables();
  const isLoading = createProject.isPending || updateProject.isPending || batchSaveDeliverables.isPending;

  const [deliverableMonth, setDeliverableMonth] = useState(new Date().getMonth() + 1);
  const [deliverableYear, setDeliverableYear] = useState(new Date().getFullYear());
  const [monthlyDeliverables, setMonthlyDeliverables] = useState([]);
  const [includeMonthlyDeliverables, setIncludeMonthlyDeliverables] = useState(false);
  const [hasUserToggledDeliverables, setHasUserToggledDeliverables] = useState(false);
  const [moveToDevelopment, setMoveToDevelopment] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    title: 'Duplicate Project Detected',
    message: '',
    existingRecord: null,
    onConfirm: null,
  });

  const { data: existingDeliverablesData } = useProjectMonthlyDeliverables(
    project?._id,
    deliverableMonth,
    deliverableYear
  );

  // Sync deliverables toggle when project category changes (for new projects)
  useEffect(() => {
    if (!project && selectedCategory) {
      if (isDevOrSoftwareCategory(selectedCategory)) {
        if (!hasUserToggledDeliverables) {
          setIncludeMonthlyDeliverables(false);
        }
        setMoveToDevelopment(true);
      } else if (isContentCategory(selectedCategory)) {
        if (!hasUserToggledDeliverables) {
          setIncludeMonthlyDeliverables(true);
        }
        setMoveToDevelopment(false);
      }
    }
  }, [selectedCategory, project, hasUserToggledDeliverables]);

  useEffect(() => {
    if (existingDeliverablesData?.deliverables && existingDeliverablesData.deliverables.length > 0) {
      setMonthlyDeliverables(
        existingDeliverablesData.deliverables.map((d) => ({
          _id: d._id,
          contentType: d.contentType,
          targetQuantity: d.targetQuantity,
        }))
      );
      setIncludeMonthlyDeliverables(true);
    } else if (!project) {
      setMonthlyDeliverables([]);
    }
  }, [existingDeliverablesData, project]);

  useEffect(() => {
    if (project) {
      const isInternalProject = Boolean(
        project.isInternal ||
        ['saas_product', 'saas', 'internal_tool', 'internal_product'].includes(project.category)
      );
      const clientId = project.client?._id || (typeof project.client === 'string' ? project.client : '') || '';

      form.reset({
        name: project.name || '',
        description: project.description || '',
        category: project.category || '',
        client: clientId,
        isInternal: isInternalProject,
        status: normalizeFormStatus(project.status),
        priority: normalizeFormPriority(project.priority),
        startDate: toDateInputValue(project.startDate),
        endDate: toDateInputValue(project.endDate || project.dueDate),
        budget: project.budget || project.budgetDetails?.totalBudget || project.budgetDetails?.quotedAmount || undefined,
        quotedAmount: project.budgetDetails?.quotedAmount ?? project.budget ?? undefined,
        currency: project.currency || 'INR',
        acceptedProposalId: project.acceptedProposalId?._id || (typeof project.acceptedProposalId === 'string' ? project.acceptedProposalId : '') || '',
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
    try {
      const subtotal = [
        data.marketingAmount, data.adsAmount, data.contentAmount, data.designAmount,
        data.developmentAmount, data.printingAmount, data.otherExpenses,
      ].reduce((sum, val) => sum + (Number(val) || 0), 0);
      const parsedBudget = data.budget !== undefined && data.budget !== null && data.budget !== '' && !isNaN(Number(data.budget)) ? Number(data.budget) : undefined;
      const quotedAmount = Number(data.quotedAmount) || parsedBudget || subtotal || 0;
      const totalBudget = Number(data.totalBudget) || subtotal || quotedAmount || 0;
      const amountReceived = Number(data.amountReceived) || 0;

      const isSaasOrInternal =
        data.isInternal ||
        ['saas_product', 'saas', 'internal_tool', 'internal_product'].includes(data.category);

      const clientId = isSaasOrInternal || !data.client || data.client === 'none'
        ? null
        : data.client;

      const payload = {
        ...data,
        client: clientId,
        isInternal: isSaasOrInternal,
        startDate: data.startDate?.trim() ? data.startDate : null,
        endDate: data.endDate?.trim() ? data.endDate : null,
        budget: parsedBudget !== undefined ? parsedBudget : (quotedAmount || totalBudget || 0),
        currency: data.currency || 'INR',
        acceptedProposalId: data.acceptedProposalId?.trim() ? data.acceptedProposalId : null,
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

      const executeSaveProject = async () => {
        let savedProject;
        if (project) {
          savedProject = await updateProject.mutateAsync({ id: project._id, data: payload });
        } else {
          if (moveToDevelopment && payload.status === 'planning') {
            payload.status = 'active';
          }
          savedProject = await createProject.mutateAsync(payload);
        }

        const targetProjectId = project?._id || savedProject?._id || savedProject?.project?._id || savedProject?.data?._id;
        if (includeMonthlyDeliverables && targetProjectId && monthlyDeliverables && monthlyDeliverables.length > 0) {
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

        form.reset();
        setMonthlyDeliverables([]);
        localStorage.removeItem(DRAFT_KEY);
        onOpenChange(false);

        if (!project && moveToDevelopment && targetProjectId) {
          toast.success('Project created and moved directly to Development Board.');
          navigate(`/development/board?project=${targetProjectId}`);
        }
      };

      if (!project) {
        try {
          const res = await api.post('/check-duplicate', {
            type: 'project',
            data: { name: payload.name, client: payload.client },
          });
          if (res.data?.isDuplicate) {
            setDuplicateDialog({
              open: true,
              title: 'Duplicate Project Detected',
              message: res.data.message,
              existingRecord: res.data.existingRecord,
              onConfirm: executeSaveProject,
            });
            return;
          }
        } catch (e) {}
      }

      await executeSaveProject();
    } catch (err) {
      console.error('Failed to save project:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save project');
    }
  };

  const onFormError = (errors) => {
    console.error('Project form validation errors:', errors);
    const firstError = Object.values(errors)[0];
    toast.error(firstError?.message || 'Please check the required fields in the form');
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-background ">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 bg-background shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 pr-4 sm:pr-6 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ">
              <Briefcase size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {project ? 'Edit Project' : 'Create New Project'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {project ? 'Update project scope, deliverables, budget, and timeline' : 'Create a new project pipeline for client deliverables and milestones'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onFormError)}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {/* Scrollable Form Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              {/* Linear One-by-One Field Flow (Google Form Style) */}
              <div className="space-y-6">
              {/* Field 1: Project Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Project Name <span className="text-foreground">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 "
                        placeholder="e.g. Website Redesign & SEO"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Field 2: Project Type / Category Selection */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Project Type <span className="text-foreground">*</span>
                    </FormLabel>
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
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="saas_product" className="font-semibold text-foreground">
                          SaaS Product / Platform (No Client)
                        </SelectItem>
                        <SelectItem value="internal_tool" className="font-semibold text-foreground">
                          Internal Software / Tool (No Client)
                        </SelectItem>
                        <SelectItem value="web_development">Website / Web Development</SelectItem>
                        <SelectItem value="web_design">Web Design / UI-UX</SelectItem>
                        <SelectItem value="social_media">Social Media Marketing</SelectItem>
                        <SelectItem value="seo">Search Engine Optimization (SEO)</SelectItem>
                        <SelectItem value="paid_ads">Paid Ads &amp; Performance Marketing</SelectItem>
                        <SelectItem value="branding">Branding &amp; Identity</SelectItem>
                        <SelectItem value="graphic_design">Graphic Design &amp; Creatives</SelectItem>
                        <SelectItem value="video_content">Video Production &amp; Content</SelectItem>
                        <SelectItem value="mobile_app">Mobile App Development</SelectItem>
                        <SelectItem value="e_commerce">E-Commerce Solutions</SelectItem>
                        <SelectItem value="content">Content Creation &amp; Copywriting</SelectItem>
                        <SelectItem value="other">Other Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Field 3: Client Selection (Optional for SaaS / Internal Projects) */}
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-foreground">
                        Client {isSaasOrInternal ? (
                          <span className="text-xs font-semibold text-muted-foreground ml-1.5">(Optional for SaaS)</span>
                        ) : (
                          <span className="text-foreground">*</span>
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
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                          <SelectValue placeholder={isSaasOrInternal ? 'None (Internal SaaS Product)' : 'Select client'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isSaasOrInternal && (
                          <SelectItem value="none" className="text-muted-foreground font-medium">
                            None (Internal SaaS Product)
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
                <div className="p-3.5 rounded-xl bg-secondary text-xs sm:text-sm text-foreground flex items-center gap-2.5">
                  <Rocket size={16} className="shrink-0" />
                  <span className="font-semibold">
                    SaaS Product Mode Active: You can create and build this SaaS platform without adding an external client.
                  </span>
                </div>
              )}

              {/* Field 4: Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
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

              {/* Field 5: Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
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

              {/* Field 6: Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Start Date <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="date"
                          className="h-11 rounded-xl bg-secondary/75 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Field 7: End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      End Date <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="date"
                          className="h-11 rounded-xl bg-secondary/75 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Field 8: Budget (₹ INR) */}
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Budget (₹ INR) <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IndianRupee className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="e.g. 50000 (optional)"
                          className="h-11 rounded-xl bg-secondary/75 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 "
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

              {/* Field 9: Project Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Project Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[105px] rounded-xl bg-secondary/75 p-3.5 text-sm leading-relaxed focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                        placeholder="Brief summary of goals, milestones, and deliverables..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Field 10: Monthly Deliverables & Targets Toggle Section */}
            <div className="rounded-2xl bg-secondary/20 p-5 space-y-3.5 transition-all ">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                      includeMonthlyDeliverables
                        ? 'bg-primary/10 text-primary '
                        : 'bg-muted/60 text-muted-foreground '
                    }`}
                  >
                    <Target size={17} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">
                        Monthly Deliverables & Content Quotas
                      </h3>
                      {isDevCategory && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-foreground ">
                          Non-content (Optional)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {includeMonthlyDeliverables
                        ? 'Set monthly deliverable quotas (videos, reels, designs) to track quotas & overages'
                        : isDevCategory
                        ? 'Websites & Software projects do not require monthly quotas. Tasks move directly to development sprints.'
                        : 'Optional quotas for monthly retainer tracking. Enable if recurring quotas are needed.'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                  <span className={includeMonthlyDeliverables ? 'text-primary' : 'text-muted-foreground'}>
                    {includeMonthlyDeliverables ? 'Quotas Enabled' : 'Quotas Disabled'}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeMonthlyDeliverables}
                    onChange={(e) => {
                      setHasUserToggledDeliverables(true);
                      setIncludeMonthlyDeliverables(e.target.checked);
                    }}
                    className="h-4 w-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </label>
              </div>

              {includeMonthlyDeliverables ? (
                <div className="pt-2 ">
                  <MonthlyDeliverablesSection
                    deliverables={monthlyDeliverables}
                    onChange={setMonthlyDeliverables}
                    month={deliverableMonth}
                    year={deliverableYear}
                    onMonthChange={setDeliverableMonth}
                    onYearChange={setDeliverableYear}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-secondary/75/70 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-foreground shrink-0" />
                    <span>
                      {isDevCategory
                        ? 'No monthly deliverables needed for website/software projects. Tasks will route directly to development milestones.'
                        : 'Monthly quota tracking disabled. You can manage tasks freely without quota tracking.'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasUserToggledDeliverables(true);
                      setIncludeMonthlyDeliverables(true);
                    }}
                    className="text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer"
                  >
                    Add Quotas
                  </button>
                </div>
              )}
            </div>

            {/* Field 11: Direct Move to Development Pipeline Toggle (for Dev / Software / Web projects) */}
            {isDevCategory && !project && (
              <div className="rounded-2xl bg-secondary/40 p-4 sm:p-4.5 flex items-center justify-between gap-3 ">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                    <Rocket size={17} className="shrink-0" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Directly Move to Development Board</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground ">
                        Dev Workflow
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sets status to Active and automatically routes directly to the Development Kanban Pipeline upon creation
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={moveToDevelopment}
                    onChange={(e) => setMoveToDevelopment(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <span>Move to Dev</span>
                </label>
              </div>
            )}

            {/* Field 12: Budget & Payment Section (Linear Single Column) */}
            <div className="rounded-2xl bg-secondary/20 p-5 space-y-4 ">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" /> Budget & Payment Workflow
              </h3>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
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
                      <FormLabel className="text-sm font-semibold text-foreground">Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
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

                <FormField
                  control={form.control}
                  name="budgetNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Budget Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[85px] rounded-xl bg-secondary/75 p-3.5 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                          placeholder="Payment schedule, milestone terms, invoice notes..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            </div>

            {/* Modern Pinned Bottom Action Footer */}
            <div className="shrink-0 bg-background px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-10 select-none">
              <div className="flex items-center gap-2">
                {isDevCategory && !project ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-secondary text-foreground inline-flex items-center gap-1.5 ">
                    <Code2 size={14} className="shrink-0" />
                    <span>Website &amp; Software Workflow</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                    <span>Press</span>
                    <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                      ESC
                    </kbd>
                    <span>to close</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>

                {isDevCategory && !project && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isLoading}
                    onClick={() => {
                      setMoveToDevelopment(true);
                      form.handleSubmit(onSubmit, onFormError)();
                    }}
                    className="h-11 px-5 rounded-xl text-sm font-bold gap-2 cursor-pointer transition-all"
                  >
                    <Rocket size={15} className="shrink-0" />
                    <span>Create &amp; Move to Dev</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
                >
                  {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

      <DuplicateConfirmDialog
        open={duplicateDialog.open}
        onOpenChange={(isOpen) => setDuplicateDialog((prev) => ({ ...prev, open: isOpen }))}
        title={duplicateDialog.title}
        message={duplicateDialog.message}
        existingRecord={duplicateDialog.existingRecord}
        onConfirm={duplicateDialog.onConfirm}
      />
    </>
  );
};
