import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCreateExpense, useUpdateExpense } from '../../hooks/useFinance';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  transactionType: z.enum(['Expense', 'Profit']),
  category: z.string().min(1, 'Category is required'),
  customCategory: z.string().optional().or(z.literal('')),
  client: z.string().optional().or(z.literal('')),
  project: z.string().optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().or(z.literal('')),
});

const CATEGORIES = [
  { id: 'rj', label: 'RJ / Voice Over' },
  { id: 'video_shoot', label: 'Video Shoot' },
  { id: 'travel_allowance', label: 'Travel Allowance' },
  { id: 'ads_campaign', label: 'Ads Campaign Spend' },
  { id: 'salary', label: 'Salary' },
  { id: 'tools', label: 'Software Tools' },
  { id: 'office', label: 'Office & Rent' },
  { id: 'freelance', label: 'Freelancer Fees' },
  { id: 'misc', label: 'Miscellaneous' },
  { id: 'other', label: 'Other (Custom Type)' },
];

export const AddExpenseModal = ({ open, onOpenChange, expense = null }) => {
  const isEditing = Boolean(expense?._id);

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: 0,
      transactionType: 'Expense',
      category: 'misc',
      customCategory: '',
      client: '',
      project: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const selectedClientId = form.watch('client');
  const selectedCategory = form.watch('category');

  const clientProjects = selectedClientId && selectedClientId !== '_none'
    ? projects.filter((project) => project.client?._id === selectedClientId || project.client === selectedClientId)
    : [];

  useEffect(() => {
    if (open) {
      if (expense) {
        const formattedDate = expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        form.reset({
          title: expense.title || '',
          amount: Number(expense.amount) || 0,
          transactionType: expense.transactionType || 'Expense',
          category: expense.category || 'misc',
          customCategory: expense.customCategory || '',
          client: expense.client?._id || expense.client || '',
          project: expense.project?._id || expense.project || '',
          date: formattedDate,
          notes: expense.notes || '',
        });
      } else {
        form.reset({
          title: '',
          amount: 0,
          transactionType: 'Expense',
          category: 'misc',
          customCategory: '',
          client: '',
          project: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    }
  }, [open, expense, form]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      client: (values.client && values.client !== '_none') ? values.client : undefined,
      project: (values.project && values.project !== '_none') ? values.project : undefined,
      customCategory: values.category === 'other' ? values.customCategory : '',
      status: 'approved',
    };

    if (isEditing) {
      await updateExpense.mutateAsync({ id: expense._id, data: payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isLoading = createExpense.isPending || updateExpense.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Financial Record' : 'Record Expense / Profit'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update details of this expense or profit entry.'
              : 'Record RJ fees, video shoots, travel allowance, ad campaign spend, profit adjustments, or custom categories.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., RJ charges for July Campaign, Studio Video Shoot, Client Travel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Expense">Expense (Outflow)</SelectItem>
                        <SelectItem value="Profit">Profit / Income (Inflow)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category / Expense Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCategory === 'other' ? (
                <FormField
                  control={form.control}
                  name="customCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Type Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter custom type (e.g., Equipment Repair, Voice Artist)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Client (Optional)</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('project', '');
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>{client.company || client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Project (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {clientProjects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Details</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Description or additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : isEditing ? 'Update Record' : 'Record Entry'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
