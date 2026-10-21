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
import { Plus, Trash2, Tv, UserPlus, Receipt, X } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { useCreateVjPromotion, useUpdateVjPromotion } from '../../hooks/useDMCalendar';

const vjPromotionSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  promotionTitle: z.string().min(1, 'Title is required'),
  platform: z.enum(['Instagram', 'Facebook', 'YouTube', 'TV', 'Live Event', 'Campaign', 'Other']),
  promotionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  promotionDetails: z.string().optional().or(z.literal('')),
  vjMembers: z.array(
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

const PLATFORM_OPTIONS = ['Instagram', 'Facebook', 'YouTube', 'TV', 'Live Event', 'Campaign', 'Other'];
const COMMON_EXPENSES = [
  'VJ Host Fee',
  'Stage & Lighting',
  'Camera & Live Setup',
  'Travel Allowance',
  'Food & Refreshments',
];

export const AddEditVjPromotionModal = ({ open, onOpenChange, promotion = null }) => {
  const isEditing = Boolean(promotion?._id);

  const form = useForm({
    resolver: zodResolver(vjPromotionSchema),
    defaultValues: {
      client: '',
      promotionTitle: '',
      platform: 'Instagram',
      promotionDate: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '16:00',
      promotionDetails: '',
      vjMembers: [],
      expensesList: [],
      totalAmount: 0,
      amountPaid: 0,
      remarks: '',
      status: 'Scheduled',
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: 'vjMembers',
  });

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
    control: form.control,
    name: 'expensesList',
  });

  const { data: clients = [] } = useClients({}, { enabled: open });
  const { data: users = [] } = useUsers({ enabled: open });

  const createVj = useCreateVjPromotion();
  const updateVj = useUpdateVjPromotion();

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
        const sTime = promotion.startTime ? new Date(promotion.startTime).toTimeString().slice(0, 5) : '14:00';
        const eTime = promotion.endTime ? new Date(promotion.endTime).toTimeString().slice(0, 5) : '16:00';

        form.reset({
          client: promotion.client?._id || promotion.client || '',
          promotionTitle: promotion.promotionTitle || '',
          platform: promotion.platform || 'Instagram',
          promotionDate: pDate,
          startTime: sTime,
          endTime: eTime,
          promotionDetails: promotion.promotionDetails === 'null' || !promotion.promotionDetails ? '' : promotion.promotionDetails,
          vjMembers: promotion.vjMembers
            ? promotion.vjMembers.map((m) => ({
                user: m.user?._id || m.user || '',
                name: m.name || m.user?.name || '',
                role: m.role || 'VJ Host',
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
          platform: 'Instagram',
          promotionDate: new Date().toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '16:00',
          promotionDetails: '',
          vjMembers: [{ user: '', name: '', role: 'VJ Anchor' }],
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

    const formattedMembers = values.vjMembers.map((m) => {
      const foundUser = users.find((u) => u._id === m.user);
      return {
        user: m.user && m.user !== '_none' ? m.user : undefined,
        name: m.name || (foundUser ? foundUser.name : 'VJ Host'),
        role: m.role || 'VJ Host',
      };
    });

    const finalTotalAmount = values.expensesList && values.expensesList.length > 0 ? sumExpenses : Number(values.totalAmount || 0);

    const payload = {
      ...values,
      startTime: startDateTime,
      endTime: endDateTime,
      vjMembers: formattedMembers,
      totalAmount: finalTotalAmount,
    };

    if (isEditing) {
      await updateVj.mutateAsync({ id: promotion._id, data: payload });
    } else {
      await createVj.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createVj.isPending || updateVj.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0 shadow-2xs">
              <Tv size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {isEditing ? 'Edit VJ Promotion' : 'Create VJ Promotion'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Video Jockey appearances, live broadcasts, anchors, and itemized expenses
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
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Client Name *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
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
                      <FormLabel className="text-sm font-semibold text-foreground">Promotion Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Instagram Live Launch & Product Unboxing Host"
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
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Broadcast Platform *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
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
                  name="promotionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Promotion Date *</FormLabel>
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
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Start Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
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
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">End Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Promotion Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
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

                {/* VJ Team Members */}
                <div className="rounded-2xl border border-border/70 bg-secondary/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4 text-purple-500" /> VJ Hosts / Team Members
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Assign internal team members or custom anchor talent</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-9 text-xs font-semibold border-border hover:bg-secondary cursor-pointer"
                      onClick={() => appendMember({ user: '', name: '', role: 'VJ Host' })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Member
                    </Button>
                  </div>

                  {memberFields.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border/80 rounded-xl">
                      No VJ hosts assigned yet. Click "Add Member" above.
                    </div>
                  ) : (
                    memberFields.map((field, index) => {
                      const currentUserId = form.watch(`vjMembers.${index}.user`);
                      return (
                        <div key={field.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
                          <div className="w-full sm:w-[190px]">
                            <Select
                              value={currentUserId || '_none'}
                              onValueChange={(val) => {
                                form.setValue(`vjMembers.${index}.user`, val === '_none' ? '' : val);
                                const selectedU = users.find((u) => u._id === val);
                                if (selectedU) form.setValue(`vjMembers.${index}.name`, selectedU.name);
                              }}
                            >
                              <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border">
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

                          <div className="flex-1 min-w-[140px]">
                            <Input
                              placeholder="Host / Anchor Name..."
                              className="h-10 rounded-xl text-xs bg-background border-border"
                              {...form.register(`vjMembers.${index}.name`)}
                            />
                          </div>

                          <div className="w-full sm:w-[150px]">
                            <Input
                              placeholder="Role (e.g. Lead Anchor)"
                              className="h-10 rounded-xl text-xs bg-background border-border"
                              {...form.register(`vjMembers.${index}.role`)}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 rounded-lg shrink-0 self-end sm:self-center"
                            onClick={() => removeMember(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Expenses List & Fee Tracking */}
                <div className="rounded-2xl border border-border/70 bg-secondary/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-emerald-500" /> Promotion Expenses Breakdown
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Itemized expenses for VJ host fees, lighting, camera setup, and food</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-9 text-xs font-semibold border-border hover:bg-secondary cursor-pointer"
                      onClick={() => appendExpense({ title: '', amount: 1000 })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                    </Button>
                  </div>

                  {/* Quick Suggestions */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-muted-foreground font-semibold mr-1">Quick Add:</span>
                    {COMMON_EXPENSES.map((exp) => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => appendExpense({ title: exp, amount: 2000 })}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        + {exp}
                      </button>
                    ))}
                  </div>

                  {expenseFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
                      <div className="flex-1">
                        <Input
                          placeholder="Expense Title (e.g., VJ Host Fee, Stage & Lighting)"
                          className="h-10 rounded-xl text-xs bg-background border-border"
                          {...form.register(`expensesList.${index}.title`)}
                        />
                      </div>
                      <div className="w-[140px]">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Amount"
                            className="h-10 pl-7 rounded-xl text-xs bg-background border-border"
                            {...form.register(`expensesList.${index}.amount`)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                        onClick={() => removeExpense(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Financial Summary Linear Fields */}
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Total Budget / Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={expenseFields.length > 0 ? sumExpenses : field.value}
                          readOnly={expenseFields.length > 0}
                          className={`h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs ${
                            expenseFields.length > 0 ? 'bg-muted/50 font-bold' : ''
                          }`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Amount Paid (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground block">Balance Due (₹)</label>
                  <div className="h-11 px-4 flex items-center font-bold text-base text-rose-500 bg-background rounded-xl border border-border shadow-2xs">
                    ₹{balanceAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="promotionDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Promotion Details & Broadcast Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          placeholder="Live stream link, broadcast agenda, TV channel slot..."
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
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
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
                  {isLoading ? 'Saving...' : isEditing ? 'Update VJ Promotion' : 'Save VJ Promotion'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
