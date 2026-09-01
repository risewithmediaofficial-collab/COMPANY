import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Plus, Trash2, Radio, UserPlus, Receipt } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { useCreateRjPromotion, useUpdateRjPromotion } from '../../hooks/useDMCalendar';

const rjPromotionSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  promotionTitle: z.string().min(1, 'Title is required'),
  promotionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  minutesSpoken: z.coerce.number().min(0, 'Minutes spoken must be >= 0'),
  promotionDetails: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  rjMembers: z.array(
    z.object({
      user: z.string().optional().or(z.literal('')),
      name: z.string().optional().or(z.literal('')),
      role: z.string().optional().or(z.literal('')),
    })
  ),
  expensesList: z.array(
    z.object({
      title: z.string().min(1, 'Expense title is required'),
      amount: z.coerce.number().min(0, 'Amount must be >= 0'),
    })
  ),
  totalAmount: z.coerce.number().min(0, 'Total amount must be >= 0'),
  amountPaid: z.coerce.number().min(0, 'Amount paid must be >= 0'),
  remarks: z.string().optional().or(z.literal('')),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed']),
});

const COMMON_EXPENSES = [
  'RJ Artist Fee',
  'Studio Rental',
  'Broadcasting Airtime',
  'Travel Allowance',
  'Food & Refreshments',
];

export const AddEditRjPromotionModal = ({ open, onOpenChange, promotion = null }) => {
  const isEditing = Boolean(promotion?._id);

  const form = useForm({
    resolver: zodResolver(rjPromotionSchema),
    defaultValues: {
      client: '',
      promotionTitle: '',
      promotionDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '12:00',
      minutesSpoken: 30,
      promotionDetails: '',
      notes: '',
      rjMembers: [],
      expensesList: [],
      totalAmount: 0,
      amountPaid: 0,
      remarks: '',
      status: 'Scheduled',
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: 'rjMembers',
  });

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
    control: form.control,
    name: 'expensesList',
  });

  const { data: clients = [] } = useClients({}, { enabled: open });
  const { data: users = [] } = useUsers({ enabled: open });

  const createRj = useCreateRjPromotion();
  const updateRj = useUpdateRjPromotion();

  const watchedExpenses = form.watch('expensesList') || [];
  const watchedTotalAmount = form.watch('totalAmount') || 0;
  const amountPaid = form.watch('amountPaid') || 0;

  const sumExpenses = watchedExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const effectiveTotalAmount = watchedExpenses.length > 0 ? sumExpenses : Number(watchedTotalAmount || 0);
  const balanceAmount = Math.max(effectiveTotalAmount - Number(amountPaid), 0);

  useEffect(() => {
    if (watchedExpenses.length > 0) {
      form.setValue('totalAmount', sumExpenses);
    }
  }, [sumExpenses, watchedExpenses.length, form]);

  useEffect(() => {
    if (open) {
      if (promotion) {
        const pDate = promotion.promotionDate ? new Date(promotion.promotionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const sTime = promotion.startTime ? new Date(promotion.startTime).toTimeString().slice(0, 5) : '10:00';
        const eTime = promotion.endTime ? new Date(promotion.endTime).toTimeString().slice(0, 5) : '12:00';

        form.reset({
          client: promotion.client?._id || promotion.client || '',
          promotionTitle: promotion.promotionTitle || '',
          promotionDate: pDate,
          startTime: sTime,
          endTime: eTime,
          minutesSpoken: promotion.minutesSpoken || 0,
          promotionDetails: promotion.promotionDetails === 'null' || !promotion.promotionDetails ? '' : promotion.promotionDetails,
          notes: promotion.notes === 'null' || !promotion.notes ? '' : promotion.notes,
          rjMembers: promotion.rjMembers
            ? promotion.rjMembers.map((m) => ({
                user: m.user?._id || m.user || '',
                name: m.name || m.user?.name || '',
                role: m.role || 'RJ Member',
              }))
            : [],
          expensesList: promotion.expensesList || [],
          totalAmount: promotion.totalAmount || 0,
          amountPaid: promotion.amountPaid || 0,
          remarks: promotion.remarks || '',
          status: promotion.status || 'Scheduled',
        });
      } else {
        form.reset({
          client: clients[0]?._id || '',
          promotionTitle: '',
          promotionDate: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '12:00',
          minutesSpoken: 30,
          promotionDetails: '',
          notes: '',
          rjMembers: [{ user: '', name: '', role: 'Lead RJ' }],
          expensesList: [],
          totalAmount: 0,
          amountPaid: 0,
          remarks: '',
          status: 'Scheduled',
        });
      }
    }
  }, [open, promotion, clients, form]);

  const onSubmit = async (values) => {
    const startDateTime = new Date(`${values.promotionDate}T${values.startTime}:00`);
    const endDateTime = new Date(`${values.promotionDate}T${values.endTime}:00`);

    const formattedMembers = values.rjMembers.map((m) => {
      const foundUser = users.find((u) => u._id === m.user);
      return {
        user: m.user && m.user !== '_none' ? m.user : undefined,
        name: m.name || (foundUser ? foundUser.name : 'RJ Member'),
        role: m.role || 'RJ Member',
      };
    });

    const finalTotalAmount = values.expensesList && values.expensesList.length > 0 ? sumExpenses : Number(values.totalAmount || 0);

    const payload = {
      ...values,
      startTime: startDateTime,
      endTime: endDateTime,
      rjMembers: formattedMembers,
      totalAmount: finalTotalAmount,
    };

    if (isEditing) {
      await updateRj.mutateAsync({ id: promotion._id, data: payload });
    } else {
      await createRj.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createRj.isPending || updateRj.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-500" />
            {isEditing ? 'Edit RJ Promotion' : 'Create RJ Promotion Activity'}
          </DialogTitle>
          <DialogDescription>
            Schedule Radio Jockey (RJ) talk shows, audio promotions, live broadcasts, and itemized expenses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.company || c.name}
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
                name="promotionTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Morning RJ Live Spot & Brand Mention" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promotionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="minutesSpoken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes Spoken (mins) *</FormLabel>
                    <FormControl><Input type="number" min="0" placeholder="E.g., 45" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        <SelectItem value="Postponed">Postponed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* RJ Team Members */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-amber-500" /> RJ Team Members
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => appendMember({ user: '', name: '', role: 'RJ Artist' })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add RJ Member
                </Button>
              </div>

              {memberFields.map((field, index) => {
                const currentUserId = form.watch(`rjMembers.${index}.user`);
                return (
                  <div key={field.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/40 bg-background">
                    <div className="w-[180px]">
                      <Select
                        value={currentUserId || '_none'}
                        onValueChange={(val) => {
                          form.setValue(`rjMembers.${index}.user`, val === '_none' ? '' : val);
                          const selectedU = users.find((u) => u._id === val);
                          if (selectedU) form.setValue(`rjMembers.${index}.name`, selectedU.name);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Manual Name</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 min-w-[160px]">
                      <Input
                        placeholder="Type RJ Artist Name..."
                        className="h-9"
                        {...form.register(`rjMembers.${index}.name`)}
                      />
                    </div>

                    <div className="w-[160px]">
                      <Input
                        placeholder="Role (e.g., Lead RJ, Voice)"
                        className="h-9"
                        {...form.register(`rjMembers.${index}.role`)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-destructive"
                      onClick={() => removeMember(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Expenses List & Fee Tracking */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-emerald-500" /> Promotion Expenses Breakdown List
                  </h3>
                  <p className="text-xs text-muted-foreground">Add specific expenses like RJ Artist Fee, Studio Rental, Travel, Food, etc.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => appendExpense({ title: '', amount: 1000 })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Expense Item
                </Button>
              </div>

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold mr-1">Quick Add:</span>
                {COMMON_EXPENSES.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => appendExpense({ title: exp, amount: 2000 })}
                    className="text-[11px] px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    + {exp}
                  </button>
                ))}
              </div>

              {expenseFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background">
                  <div className="flex-1">
                    <Input
                      placeholder="Expense Title (e.g., RJ Artist Fee, Studio Rental)"
                      className="h-9"
                      {...form.register(`expensesList.${index}.title`)}
                    />
                  </div>
                  <div className="w-[160px]">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        className="h-9 pl-7"
                        {...form.register(`expensesList.${index}.amount`)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-destructive"
                    onClick={() => removeExpense(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="pt-3 border-t border-border/40 grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={expenseFields.length > 0 ? sumExpenses : field.value}
                          readOnly={expenseFields.length > 0}
                          className={expenseFields.length > 0 ? 'bg-muted/50 font-bold' : ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (₹)</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Balance Amount (₹)</FormLabel>
                  <div className="h-10 px-3 flex items-center font-bold text-lg text-rose-500 bg-background rounded-md border border-border/60 mt-2">
                    ₹{balanceAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="promotionDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Details & Script Notes</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" placeholder="Script points, RJ talk time slots, offer codes..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes / Remarks</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-20" placeholder="Internal production notes, RJ feedback..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update RJ Promotion' : 'Save RJ Promotion'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
