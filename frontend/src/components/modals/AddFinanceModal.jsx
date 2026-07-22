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
import { useCreateFinanceRecord, useUpdateFinanceRecord } from '../../hooks/useFinance';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';

const financeSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().min(1, 'Project is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  totalProjectAmount: z.coerce.number().min(0, 'Amount must be positive'),
  paymentMode: z.string().default('Other'),
  paymentDueDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  paymentNotesText: z.string().optional(),
  invoiceStatus: z.string().default('Draft'),
  allowAssignedPersonAccess: z.boolean().default(false),
});

export const AddFinanceModal = ({ open, onOpenChange, entry = null }) => {
  const form = useForm({
    resolver: zodResolver(financeSchema),
    defaultValues: {
      clientId: '',
      projectId: '',
      serviceName: '',
      totalProjectAmount: 0,
      paymentMode: 'Other',
      paymentDueDate: '',
      nextFollowUpDate: '',
      paymentNotesText: '',
      invoiceStatus: 'Draft',
      allowAssignedPersonAccess: false,
    },
  });

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const createFinanceRecord = useCreateFinanceRecord();
  const updateFinanceRecord = useUpdateFinanceRecord();
  const selectedClientId = form.watch('clientId');
  const clientProjects = selectedClientId
    ? projects.filter((project) => project.client?._id === selectedClientId || project.client === selectedClientId)
    : projects;

  useEffect(() => {
    if (entry) {
      form.reset({
        clientId: entry.clientId?._id || entry.clientId || '',
        projectId: entry.projectId?._id || entry.projectId || '',
        serviceName: entry.serviceName || '',
        totalProjectAmount: Number(entry.totalProjectAmount || entry.totalAmount || 0),
        paymentMode: entry.paymentMode || 'Other',
        paymentDueDate: entry.paymentDueDate ? new Date(entry.paymentDueDate).toISOString().split('T')[0] : '',
        nextFollowUpDate: entry.nextFollowUpDate ? new Date(entry.nextFollowUpDate).toISOString().split('T')[0] : '',
        paymentNotesText: entry.paymentNotesText || '',
        invoiceStatus: entry.invoiceStatus || 'Draft',
        allowAssignedPersonAccess: Boolean(entry.allowAssignedPersonAccess),
      });
      return;
    }

    form.reset({
      clientId: '',
      projectId: '',
      serviceName: '',
      totalProjectAmount: 0,
      paymentMode: 'Other',
      paymentDueDate: '',
      nextFollowUpDate: '',
      paymentNotesText: '',
      invoiceStatus: 'Draft',
      allowAssignedPersonAccess: false,
    });
  }, [entry, open, form]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      paymentDueDate: values.paymentDueDate || undefined,
      nextFollowUpDate: values.nextFollowUpDate || undefined,
    };

    if (entry?._id) {
      await updateFinanceRecord.mutateAsync({ id: entry._id, data: payload });
    } else {
      await createFinanceRecord.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createFinanceRecord.isPending || updateFinanceRecord.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Finance Record' : 'Create Finance Record'}</DialogTitle>
          <DialogDescription>
            Manage total amount, due date, finance visibility, and follow-up schedule for a client project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('projectId', '');
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientProjects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl><Input placeholder="Website Development" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalProjectAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Project Amount *</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'].map((mode) => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value === 'Other' && (
                      <FormField
                        control={form.control}
                        name="customPaymentMode"
                        render={({ field: cf }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input placeholder="Specify payment mode..." {...cf} />
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
                name="invoiceStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select invoice status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Cancelled'].map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextFollowUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Follow-up Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentNotesText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Notes</FormLabel>
                  <FormControl><Textarea className="min-h-28" placeholder="Advance paid, balance pending, next client commitment..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowAssignedPersonAccess"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-border bg-background px-4 py-3">
                  <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    Allow assigned person to view finance and invoice status
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : entry ? 'Update Record' : 'Create Record'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
