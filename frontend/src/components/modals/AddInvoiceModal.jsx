import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Share2, Plus } from 'lucide-react';
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
import { useCreateInvoice, useUpdateInvoice } from '../../hooks/useFinance';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { exportInvoiceToPDF } from '../../utils/pdfExport';
import { ShareInvoiceModal } from './ShareInvoiceModal';

const invoiceSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  project: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.string().default('Draft'),
  paymentTerms: z.string().optional(),
  paymentLink: z.string().optional(),
  notes: z.string().optional(),
  serviceDetails: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  quotedAmount: z.coerce.number().min(0).default(0),
  allowAssignedPersonAccess: z.boolean().default(false),
  lineItems: z.array(z.object({
    serviceName: z.string().min(1, 'Service name is required'),
    description: z.string().optional(),
    quantity: z.coerce.number().min(1),
    rate: z.coerce.number().min(0),
  })).min(1),
  payments: z.array(z.object({
    amount: z.coerce.number().min(0).default(0),
    method: z.string().default('UPI'),
    reference: z.string().optional(),
    notes: z.string().optional(),
    paidAt: z.string().optional(),
  })).default([]),
});

const defaultValues = {
  client: '',
  project: '',
  invoiceNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  status: 'Draft',
  paymentTerms: '',
  paymentLink: '',
  notes: '',
  serviceDetails: '',
  discount: 0,
  taxRate: 0,
  quotedAmount: 0,
  allowAssignedPersonAccess: false,
  lineItems: [{ serviceName: '', description: '', quantity: 1, rate: 0 }],
  payments: [{ amount: 0, method: 'UPI', reference: '', notes: '', paidAt: new Date().toISOString().split('T')[0] }],
};

export const AddInvoiceModal = ({ open, onOpenChange, invoice = null }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [currentShareInvoice, setCurrentShareInvoice] = useState(null);

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'lineItems' });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, replace: replacePayments } = useFieldArray({ control: form.control, name: 'payments' });
  const selectedClientId = form.watch('client');
  const clientProjects = selectedClientId
    ? projects.filter((project) => project.client?._id === selectedClientId || project.client === selectedClientId)
    : projects;

  useEffect(() => {
    if (invoice) {
      replace((invoice.invoiceItems || invoice.lineItems || [{ serviceName: '', description: invoice.description || '', quantity: 1, rate: invoice.amount || 0 }]).map((item) => ({
        serviceName: item.serviceName || 'Service',
        description: item.description || '',
        quantity: Number(item.quantity || 1),
        rate: Number(item.rate ?? item.unitPrice ?? 0),
      })));
      form.reset({
        client: invoice.client?._id || invoice.client || '',
        project: invoice.project?._id || invoice.project || '',
        invoiceNumber: invoice.invoiceNumber || '',
        issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        status: invoice.status || 'Draft',
        paymentTerms: invoice.paymentTerms || invoice.terms || '',
        paymentLink: invoice.paymentLink || '',
        notes: invoice.notes || '',
        serviceDetails: invoice.serviceDetails || invoice.description || '',
        discount: Number(invoice.discount || 0),
        taxRate: Number(invoice.taxRate || 0),
        quotedAmount: Number(invoice.quotedAmount || invoice.totalAmount || invoice.total || 0),
        allowAssignedPersonAccess: Boolean(invoice.allowAssignedPersonAccess),
        lineItems: (invoice.invoiceItems || invoice.lineItems || []).map((item) => ({
          serviceName: item.serviceName || 'Service',
          description: item.description || '',
          quantity: Number(item.quantity || 1),
          rate: Number(item.rate ?? item.unitPrice ?? 0),
        })),
        payments: Array.isArray(invoice.payments) && invoice.payments.length
          ? invoice.payments.map((payment) => ({
              amount: Number(payment.amount || 0),
              method: payment.method || 'UPI',
              reference: payment.reference || '',
              notes: payment.notes || '',
              paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            }))
          : [{ amount: 0, method: 'UPI', reference: '', notes: '', paidAt: new Date().toISOString().split('T')[0] }],
      });
      return;
    }

    replace(defaultValues.lineItems);
    replacePayments(defaultValues.payments);
    form.reset(defaultValues);
  }, [invoice, open, form, replace, replacePayments]);

  const isLoading = createInvoice.isPending || updateInvoice.isPending;

  const constructInvoiceData = (values) => {
    const matchedClient = clients.find((c) => c._id === values.client);
    const matchedProject = projects.find((p) => p._id === values.project);
    const lineItems = (values.lineItems || []).map((item) => ({
      ...item,
      amount: Number(item.quantity || 1) * Number(item.rate || 0),
    }));

    const rawSubtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discount = Number(values.discount || 0);
    const taxRate = Number(values.taxRate || 0);
    const quotedAmount = Number(values.quotedAmount || 0) || rawSubtotal;
    const subtotalAfterDiscount = Math.max(rawSubtotal - discount, 0);
    const taxAmount = taxRate > 0 ? (subtotalAfterDiscount * taxRate) / 100 : 0;
    const totalAmount = subtotalAfterDiscount + taxAmount;
    const manualPayments = (values.payments || []).map((payment) => ({
      ...payment,
      amount: Number(payment.amount || 0),
    })).filter((payment) => Number(payment.amount || 0) > 0);
    const paidAmount = manualPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      _id: invoice?._id,
      invoiceNumber: values.invoiceNumber || invoice?.invoiceNumber || 'INV-PREVIEW',
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      status: values.status,
      paymentTerms: values.paymentTerms,
      paymentLink: values.paymentLink,
      notes: values.notes,
      serviceDetails: values.serviceDetails,
      discount,
      taxRate,
      quotedAmount,
      lineItems,
      invoiceItems: lineItems,
      totalAmount,
      total: totalAmount,
      paidAmount: paidAmount || Number(invoice?.paidAmount || 0),
      balanceAmount: Math.max(quotedAmount - (paidAmount || Number(invoice?.paidAmount || 0)), 0),
      payments: manualPayments,
      client: matchedClient,
      clientDetails: {
        businessName: matchedClient?.company || matchedClient?.name || '',
        name: matchedClient?.name || '',
        email: matchedClient?.email || '',
        phone: matchedClient?.phone || '',
      },
      project: matchedProject,
      projectName: matchedProject?.name || '',
      invoicePublicLink: invoice?.invoicePublicLink,
    };
  };

  const handleDownloadPDF = () => {
    const values = form.getValues();
    const data = constructInvoiceData(values);
    exportInvoiceToPDF(data, { save: true });
  };

  const handleOpenShareModal = () => {
    const values = form.getValues();
    const data = constructInvoiceData(values);
    setCurrentShareInvoice(data);
    setShareModalOpen(true);
  };

  const onSubmit = async (values, action = 'save') => {
    const manualPayments = (values.payments || []).filter((payment) => Number(payment.amount || 0) > 0).map((payment) => ({
      ...payment,
      amount: Number(payment.amount || 0),
      paidAt: payment.paidAt || new Date().toISOString().split('T')[0],
    }));
    const payload = {
      ...values,
      quotedAmount: Number(values.quotedAmount || 0),
      payments: manualPayments,
      invoiceItems: values.lineItems.map((item) => ({
        ...item,
        amount: Number(item.quantity) * Number(item.rate),
      })),
      description: values.serviceDetails,
      paidAmount: manualPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };

    let resultInvoice = null;

    if (invoice?._id) {
      const res = await updateInvoice.mutateAsync({ id: invoice._id, data: payload });
      resultInvoice = res?.invoice || constructInvoiceData(values);
    } else {
      const res = await createInvoice.mutateAsync(payload);
      resultInvoice = res?.invoice || constructInvoiceData(values);
    }

    if (action === 'download') {
      exportInvoiceToPDF(resultInvoice || constructInvoiceData(values), { save: true });
    } else if (action === 'share') {
      setCurrentShareInvoice(resultInvoice || constructInvoiceData(values));
      setShareModalOpen(true);
      return;
    }

    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>{invoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
                <DialogDescription>
                  Create a detailed invoice with line items, balance tracking, and client-facing payment information.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5 text-xs">
                  <Download size={14} /> PDF
                </Button>
                {invoice && (
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenShareModal} className="gap-1.5 text-xs text-primary">
                    <Share2 size={14} /> Share
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => onSubmit(values, 'save'))} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="client" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('project', '');
                    }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>{client.name} - {client.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || 'none'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No linked project</SelectItem>
                        {clientProjects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="issueDate" render={({ field }) => (
                  <FormItem><FormLabel>Invoice Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Cancelled'].map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="paymentLink" render={({ field }) => (
                  <FormItem><FormLabel>Payment Link</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="discount" render={({ field }) => (
                  <FormItem><FormLabel>Discount</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="taxRate" render={({ field }) => (
                  <FormItem><FormLabel>Tax / GST (%)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quotedAmount" render={({ field }) => (
                  <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="serviceDetails" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Details</FormLabel>
                  <FormControl><Textarea className="min-h-24" placeholder="Service details or summary shown on the invoice..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">Invoice Items</h3>
                    <p className="text-sm text-muted-foreground">Add service rows with quantity and rate.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => append({ serviceName: '', description: '', quantity: 1, rate: 0 })}>
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <label className="mb-2 block text-sm font-medium text-foreground">Service Name</label>
                        <Input {...form.register(`lineItems.${index}.serviceName`)} />
                      </div>
                      <div className="md:col-span-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">Description</label>
                        <Input {...form.register(`lineItems.${index}.description`)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Qty</label>
                        <Input type="number" min="1" {...form.register(`lineItems.${index}.quantity`)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Rate</label>
                        <Input type="number" min="0" step="0.01" {...form.register(`lineItems.${index}.rate`)} />
                      </div>
                      <div className="flex items-end md:col-span-1">
                        <Button type="button" variant="outline" onClick={() => remove(index)} disabled={fields.length === 1}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">Partial Payments</h3>
                    <p className="text-sm text-muted-foreground">Add each payment received and the remaining balance updates automatically.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => appendPayment({ amount: 0, method: 'UPI', reference: '', notes: '', paidAt: new Date().toISOString().split('T')[0] })} className="gap-1.5">
                    <Plus size={14} /> Add Payment
                  </Button>
                </div>

                <div className="space-y-4">
                  {paymentFields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-12">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Amount</label>
                        <Input type="number" min="0" step="0.01" {...form.register(`payments.${index}.amount`)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Method</label>
                        <select className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50/70 dark:bg-card/70 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15" {...form.register(`payments.${index}.method`)}>
                          {['UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other'].map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Date</label>
                        <Input type="date" {...form.register(`payments.${index}.paidAt`)} />
                      </div>
                      <div className="md:col-span-3">
                        <label className="mb-2 block text-sm font-medium text-foreground">Reference</label>
                        <Input {...form.register(`payments.${index}.reference`)} placeholder="UTR / ref" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
                        <Input {...form.register(`payments.${index}.notes`)} placeholder="Notes" />
                      </div>
                      <div className="flex items-end md:col-span-1">
                        <Button type="button" variant="outline" onClick={() => removePayment(index)} disabled={paymentFields.length === 1}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl><Textarea className="min-h-24" placeholder="Payment instructions, bank details, GST terms..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea className="min-h-24" placeholder="Additional notes visible on invoice..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="allowAssignedPersonAccess"
                render={({ field }) => (
                  <FormItem className="rounded-2xl border border-border bg-background px-4 py-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                      Allow assigned person to view invoice status
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={form.handleSubmit((values) => onSubmit(values, 'download'))}
                  className="gap-1.5"
                >
                  <Download size={14} /> Save & Download PDF
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={form.handleSubmit((values) => onSubmit(values, 'share'))}
                  className="gap-1.5 text-primary border-primary/30"
                >
                  <Share2 size={14} /> Save & Share
                </Button>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {shareModalOpen && currentShareInvoice && (
        <ShareInvoiceModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          invoice={currentShareInvoice}
        />
      )}
    </>
  );
};

