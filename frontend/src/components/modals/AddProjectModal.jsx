// =============================================
// ADD PROJECT FORM - React Hook Form + Zod
// =============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
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
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().optional(),
  currency: z.string().default('INR'),
  acceptedProposalId: z.string().optional(),
  nextMeetupDate: z.string().optional(),
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
      currency: 'INR',
      acceptedProposalId: '',
      nextMeetupDate: '',
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
        budget: project.budget || undefined,
        currency: project.currency || 'INR',
        acceptedProposalId: project.acceptedProposalId?._id || project.acceptedProposalId || '',
        nextMeetupDate: project.nextMeetupDate ? new Date(project.nextMeetupDate).toISOString().split('T')[0] : '',
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
            currency: 'INR',
            acceptedProposalId: '',
            nextMeetupDate: '',
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
          nextMeetupDate: '',
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
    const totalBudget = Number(data.totalBudget) || subtotal || Number(data.budget) || 0;
    const amountReceived = Number(data.amountReceived) || 0;

    const payload = {
      ...data,
      budget: totalBudget || undefined,
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
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update the project details' : 'Create a new project for a client'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Website Redesign" {...field} />
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
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Project Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                        className="mt-1"
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Budget (₹ INR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextMeetupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Meetup Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Project description and details..." {...field} />
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
                    <FormLabel>Accepted Proposal (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
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

            <div className="rounded-2xl border border-border p-4 space-y-4">
              <p className="font-semibold text-sm">Budget Details (₹ INR)</p>
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
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <FormLabel>Budget Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Budget notes..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
