import { useEffect, useState } from 'react';
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
import { Plus, Trash2, Camera, UserPlus, Wrench, IndianRupee, Receipt } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { useCreateVideoShoot, useUpdateVideoShoot } from '../../hooks/useDMCalendar';

const videoShootSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  shootTitle: z.string().min(1, 'Shoot Title is required'),
  shootDate: z.string().min(1, 'Shoot Date is required'),
  startTime: z.string().min(1, 'Start Time is required'),
  endTime: z.string().min(1, 'End Time is required'),
  shootLocation: z.string().optional().or(z.literal('')),
  plannedContents: z.coerce.number().min(0, 'Planned contents must be >= 0'),
  completedContents: z.coerce.number().min(0, 'Completed contents must be >= 0'),
  plannedReels: z.coerce.number().min(0, 'Planned reels must be >= 0'),
  completedReels: z.coerce.number().min(0, 'Completed reels must be >= 0'),
  assignedTeam: z.array(
    z.object({
      user: z.string().optional().or(z.literal('')),
      name: z.string().optional().or(z.literal('')),
      role: z.string().min(1, 'Role is required'),
    })
  ),
  equipment: z.array(z.string()),
  expensesList: z.array(
    z.object({
      title: z.string().min(1, 'Expense title is required'),
      amount: z.coerce.number().min(0, 'Amount must be >= 0'),
    })
  ),
  totalAmount: z.coerce.number().min(0, 'Total amount must be >= 0'),
  amountPaid: z.coerce.number().min(0, 'Amount paid must be >= 0'),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed']),
});

const TEAM_ROLES = [
  'Photographer',
  'Videographer',
  'Editor',
  'Drone Operator',
  'Content Creator',
  'Manager',
  'Assistant',
  'Director',
  'Lighting Specialist',
  'Sound Engineer',
];

const COMMON_EQUIPMENT = [
  'Sony Camera',
  'DJI Drone',
  'Tripod',
  'Wireless Mic',
  'LED Light',
  'Laptop',
  'Battery Pack',
  'Lens 50mm',
  'Gimbal',
  'Reflector',
];

const COMMON_EXPENSES = [
  'Camera Rental',
  'Travel Allowance',
  'Food & Refreshments',
  'Location Fee',
  'Assistant Fee',
  'Transport',
];

export const AddEditVideoShootModal = ({ open, onOpenChange, shoot = null }) => {
  const isEditing = Boolean(shoot?._id);
  const [equipmentInput, setEquipmentInput] = useState('');

  const form = useForm({
    resolver: zodResolver(videoShootSchema),
    defaultValues: {
      client: '',
      shootTitle: '',
      shootDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      shootLocation: '',
      plannedContents: 10,
      completedContents: 0,
      plannedReels: 5,
      completedReels: 0,
      assignedTeam: [],
      equipment: [],
      expensesList: [],
      totalAmount: 0,
      amountPaid: 0,
      notes: '',
      status: 'Scheduled',
    },
  });

  const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
    control: form.control,
    name: 'assignedTeam',
  });

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
    control: form.control,
    name: 'expensesList',
  });

  const { data: clients = [] } = useClients({}, { enabled: open });
  const { data: users = [] } = useUsers({ enabled: open });

  const createShoot = useCreateVideoShoot();
  const updateShoot = useUpdateVideoShoot();

  const watchedExpenses = form.watch('expensesList') || [];
  const watchedTotalAmount = form.watch('totalAmount') || 0;
  const amountPaid = form.watch('amountPaid') || 0;

  // Calculate sum of itemized expenses
  const sumExpenses = watchedExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const effectiveTotalAmount = watchedExpenses.length > 0 ? sumExpenses : Number(watchedTotalAmount || 0);
  const balanceAmount = Math.max(effectiveTotalAmount - Number(amountPaid), 0);

  const plannedContents = form.watch('plannedContents') || 0;
  const completedContents = form.watch('completedContents') || 0;
  const contentPct = plannedContents > 0 ? Math.round((completedContents / plannedContents) * 100) : 0;
  const isContentBelowScheduled = completedContents < plannedContents;

  const plannedReels = form.watch('plannedReels') || 0;
  const completedReels = form.watch('completedReels') || 0;
  const reelsPct = plannedReels > 0 ? Math.round((completedReels / plannedReels) * 100) : 0;
  const isReelsBelowScheduled = completedReels < plannedReels;

  const currentEquipment = form.watch('equipment') || [];

  // Synchronize totalAmount when expenses change
  useEffect(() => {
    if (watchedExpenses.length > 0) {
      form.setValue('totalAmount', sumExpenses);
    }
  }, [sumExpenses, watchedExpenses.length, form]);

  useEffect(() => {
    if (open) {
      if (shoot) {
        const sDate = shoot.shootDate ? new Date(shoot.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const sTime = shoot.startTime ? new Date(shoot.startTime).toTimeString().slice(0, 5) : '09:00';
        const eTime = shoot.endTime ? new Date(shoot.endTime).toTimeString().slice(0, 5) : '17:00';

        form.reset({
          client: shoot.client?._id || shoot.client || '',
          shootTitle: shoot.shootTitle || '',
          shootDate: sDate,
          startTime: sTime,
          endTime: eTime,
          shootLocation: shoot.shootLocation || '',
          plannedContents: shoot.plannedContents || 0,
          completedContents: shoot.completedContents || 0,
          plannedReels: shoot.plannedReels || 0,
          completedReels: shoot.completedReels || 0,
          assignedTeam: shoot.assignedTeam
            ? shoot.assignedTeam.map((t) => ({
                user: t.user?._id || t.user || '',
                name: t.name || t.user?.name || '',
                role: t.role || 'Videographer',
              }))
            : [],
          equipment: shoot.equipment || [],
          expensesList: shoot.expensesList || [],
          totalAmount: shoot.totalAmount || 0,
          amountPaid: shoot.amountPaid || 0,
          notes: shoot.notes === 'null' || !shoot.notes ? '' : shoot.notes,
          status: shoot.status || 'Scheduled',
        });
      } else {
        form.reset({
          client: clients[0]?._id || '',
          shootTitle: '',
          shootDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '17:00',
          shootLocation: '',
          plannedContents: 10,
          completedContents: 0,
          plannedReels: 5,
          completedReels: 0,
          assignedTeam: [{ user: '', name: '', role: 'Videographer' }],
          equipment: ['Sony Camera', 'Tripod', 'Wireless Mic'],
          expensesList: [{ title: 'Camera Rental', amount: 2000 }],
          totalAmount: 2000,
          amountPaid: 0,
          notes: '',
          status: 'Scheduled',
        });
      }
    }
  }, [open, shoot, clients, form]);

  const handleAddEquipment = (item) => {
    const trimmed = item.trim();
    if (trimmed && !currentEquipment.includes(trimmed)) {
      form.setValue('equipment', [...currentEquipment, trimmed]);
      setEquipmentInput('');
    }
  };

  const handleRemoveEquipment = (index) => {
    const updated = currentEquipment.filter((_, i) => i !== index);
    form.setValue('equipment', updated);
  };

  const onSubmit = async (values) => {
    const startDateTime = new Date(`${values.shootDate}T${values.startTime}:00`);
    const endDateTime = new Date(`${values.shootDate}T${values.endTime}:00`);

    const formattedTeam = values.assignedTeam.map((t) => {
      const foundUser = users.find((u) => u._id === t.user);
      return {
        user: t.user && t.user !== '_none' ? t.user : undefined,
        name: t.name || (foundUser ? foundUser.name : 'Team Member'),
        role: t.role,
      };
    });

    const finalTotalAmount = values.expensesList && values.expensesList.length > 0 ? sumExpenses : Number(values.totalAmount || 0);

    const payload = {
      ...values,
      startTime: startDateTime,
      endTime: endDateTime,
      assignedTeam: formattedTeam,
      totalAmount: finalTotalAmount,
    };

    if (isEditing) {
      await updateShoot.mutateAsync({ id: shoot._id, data: payload });
    } else {
      await createShoot.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createShoot.isPending || updateShoot.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {isEditing ? 'Edit Video Shoot Schedule' : 'Create Video Shoot Schedule'}
          </DialogTitle>
          <DialogDescription>
            Plan video production, assign crew members, manage equipment & itemized expenses list, and track completion progress.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* General Info */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Basic Shoot Details</h3>
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
                  name="shootTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shoot Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Brand Promotional Reel & Campaign Shoot" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shootDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shoot Date *</FormLabel>
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
                        <FormMessage />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shootLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shoot Location</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Studio 4 / Client Factory Site" {...field} />
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
            </div>

            {/* Content & Reels Progress Section - Dynamic Red / Green colors */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Content & Reels Planning Progress</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Contents Progress */}
                <div className={`p-3.5 rounded-xl border space-y-3 ${isContentBelowScheduled ? 'border-rose-500/40 bg-rose-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-foreground">Contents Progress</span>
                    <span className={`font-bold ${isContentBelowScheduled ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {completedContents} / {plannedContents} ({contentPct}%) {isContentBelowScheduled ? '• Below Scheduled' : '• Target Met'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isContentBelowScheduled ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(contentPct, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <FormField
                      control={form.control}
                      name="plannedContents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px]">Planned Contents</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="completedContents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px]">Completed Contents</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Reels Progress */}
                <div className={`p-3.5 rounded-xl border space-y-3 ${isReelsBelowScheduled ? 'border-rose-500/40 bg-rose-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-foreground">Reels Progress</span>
                    <span className={`font-bold ${isReelsBelowScheduled ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {completedReels} / {plannedReels} ({reelsPct}%) {isReelsBelowScheduled ? '• Below Scheduled' : '• Target Met'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isReelsBelowScheduled ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(reelsPct, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <FormField
                      control={form.control}
                      name="plannedReels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px]">Planned Reels</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="completedReels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px]">Completed Reels</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Assignment - Select or Manual Type */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-primary" /> Team Assignment
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => appendTeam({ user: '', name: '', role: 'Videographer' })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Team Member
                </Button>
              </div>

              {teamFields.map((field, index) => {
                const currentUserId = form.watch(`assignedTeam.${index}.user`);
                const isManual = !currentUserId || currentUserId === '_none';

                return (
                  <div key={field.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/40 bg-background">
                    <div className="w-[180px]">
                      <Select
                        value={currentUserId || '_none'}
                        onValueChange={(val) => {
                          form.setValue(`assignedTeam.${index}.user`, val === '_none' ? '' : val);
                          const selectedU = users.find((u) => u._id === val);
                          if (selectedU) {
                            form.setValue(`assignedTeam.${index}.name`, selectedU.name);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Employee" />
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
                        placeholder="Type Employee / Crew Name..."
                        className="h-9"
                        {...form.register(`assignedTeam.${index}.name`)}
                      />
                    </div>

                    <div className="w-[160px]">
                      <Select
                        value={form.watch(`assignedTeam.${index}.role`)}
                        onValueChange={(val) => form.setValue(`assignedTeam.${index}.role`, val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeTeam(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {teamFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">No team members assigned yet. Click Add Team Member.</p>
              ) : null}
            </div>

            {/* Equipment Section */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-primary" /> Equipment Section
              </h3>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type equipment (e.g., Sony A7IV, Wireless Lapel Mic)..."
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEquipment(equipmentInput);
                    }
                  }}
                  className="h-9"
                />
                <Button type="button" size="sm" onClick={() => handleAddEquipment(equipmentInput)}>
                  Add
                </Button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground font-semibold mr-1">Suggestions:</span>
                {COMMON_EQUIPMENT.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => handleAddEquipment(eq)}
                    className="text-[11px] px-2 py-0.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground transition-colors"
                  >
                    + {eq}
                  </button>
                ))}
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {currentEquipment.map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                  >
                    {item}
                    <button
                      type="button"
                      className="hover:text-destructive text-primary/70 ml-1"
                      onClick={() => handleRemoveEquipment(i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Itemized Shoot Expenses List (Before Total Amount) */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-emerald-500" /> Shoot Expenses Breakdown List
                  </h3>
                  <p className="text-xs text-muted-foreground">Add specific expenses like Camera Rental, Travel Allowance, Food & Catering, etc.</p>
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

              {/* Quick Expense Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold mr-1">Quick Add:</span>
                {COMMON_EXPENSES.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => appendExpense({ title: exp, amount: 1500 })}
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
                      placeholder="Expense Title (e.g., Camera Rental, Travel, Food)"
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

              {expenseFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">No itemized expenses added. You can type total amount manually below.</p>
              ) : null}

              {/* Expense & Financial Summary */}
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

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Notes / Instructions</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Specific guidelines, client requirements, theme details..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Video Shoot' : 'Save Video Shoot'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
