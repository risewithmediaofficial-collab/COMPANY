import { useEffect, useState, useMemo } from 'react';
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
import {
  Camera,
  Film,
  Clapperboard,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  X,
  ListTodo,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  Check,
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useCreateVideoShoot, useUpdateVideoShoot } from '../../hooks/useDMCalendar';

const checklistItemSchema = z.object({
  title: z.string().min(1, 'Item title is required'),
  completed: z.boolean().default(false),
});

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
  checklist: z.array(checklistItemSchema).default([]),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed']),
});

export const AddEditVideoShootModal = ({ open, onOpenChange, shoot = null }) => {
  const isEditing = Boolean(shoot?._id);

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
      checklist: [],
      notes: '',
      status: 'Scheduled',
    },
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist, replace: replaceChecklist } = useFieldArray({
    control: form.control,
    name: 'checklist',
  });

  const { data: clients = [] } = useClients({}, { enabled: open });
  const createShoot = useCreateVideoShoot();
  const updateShoot = useUpdateVideoShoot();

  const watchedPlannedContents = form.watch('plannedContents') || 0;
  const watchedPlannedReels = form.watch('plannedReels') || 0;
  const watchedChecklist = form.watch('checklist') || [];

  // Count how many checklist items are marked completed
  const completedCount = useMemo(() => {
    return watchedChecklist.filter((item) => item.completed).length;
  }, [watchedChecklist]);

  const totalChecklistItems = watchedChecklist.length;
  const targetContents = Number(watchedPlannedContents) || totalChecklistItems;
  const completionPct = targetContents > 0 ? Math.round((completedCount / targetContents) * 100) : 0;
  const isTargetMet = targetContents > 0 && completedCount >= targetContents;

  // Initialize or reset form values
  useEffect(() => {
    if (open) {
      if (shoot) {
        const sDate = shoot.shootDate
          ? new Date(shoot.shootDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const sTime = shoot.startTime
          ? new Date(shoot.startTime).toTimeString().slice(0, 5)
          : '09:00';
        const eTime = shoot.endTime
          ? new Date(shoot.endTime).toTimeString().slice(0, 5)
          : '17:00';

        // Load existing checklist or auto-generate if shoot didn't have one
        let initialChecklist = [];
        if (shoot.checklist && Array.isArray(shoot.checklist) && shoot.checklist.length > 0) {
          initialChecklist = shoot.checklist.map((item) => ({
            title: item.title || 'Reel / Content',
            completed: Boolean(item.completed),
          }));
        } else {
          const plannedNum = shoot.plannedContents || 10;
          for (let i = 1; i <= plannedNum; i++) {
            initialChecklist.push({
              title: `Reel / Content #${i}`,
              completed: i <= (shoot.completedContents || 0),
            });
          }
        }

        form.reset({
          client: shoot.client?._id || shoot.client || '',
          shootTitle: shoot.shootTitle || '',
          shootDate: sDate,
          startTime: sTime,
          endTime: eTime,
          shootLocation: shoot.shootLocation || '',
          plannedContents: shoot.plannedContents ?? 10,
          completedContents: shoot.completedContents || initialChecklist.filter((c) => c.completed).length,
          plannedReels: shoot.plannedReels ?? 5,
          completedReels: shoot.completedReels || 0,
          checklist: initialChecklist,
          notes: shoot.notes === 'null' || !shoot.notes ? '' : shoot.notes,
          status: shoot.status || 'Scheduled',
        });
      } else {
        // Default new shoot with 10 planned contents
        const defaultChecklist = [];
        for (let i = 1; i <= 10; i++) {
          defaultChecklist.push({
            title: `Reel / Content #${i}`,
            completed: false,
          });
        }

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
          checklist: defaultChecklist,
          notes: '',
          status: 'Scheduled',
        });
      }
    }
  }, [open, shoot, clients, form]);

  // Adjust checklist when plannedContents count is updated by user
  const handlePlannedContentsChange = (newCount) => {
    const target = Math.max(0, parseInt(newCount, 10) || 0);
    form.setValue('plannedContents', target);

    const currentList = form.getValues('checklist') || [];
    if (target > currentList.length) {
      // Add missing default items without modifying existing ones
      const needed = target - currentList.length;
      const updated = [...currentList];
      for (let i = 1; i <= needed; i++) {
        const itemNumber = currentList.length + i;
        updated.push({
          title: `Reel / Content #${itemNumber}`,
          completed: false,
        });
      }
      replaceChecklist(updated);
    }
  };

  // Toggle completion of a checklist item
  const handleToggleChecklist = (index) => {
    const currentList = form.getValues('checklist') || [];
    const item = currentList[index];
    if (!item) return;

    const newCompleted = !item.completed;
    form.setValue(`checklist.${index}.completed`, newCompleted);

    // Update completed contents
    const nextList = form.getValues('checklist');
    const newCompletedCount = nextList.filter((it) => it.completed).length;
    form.setValue('completedContents', newCompletedCount);

    // Also align completedReels with completed checklist items
    const plannedR = form.getValues('plannedReels') || 0;
    form.setValue('completedReels', Math.min(newCompletedCount, plannedR));
  };

  const onSubmit = async (values) => {
    const startDateTime = new Date(`${values.shootDate}T${values.startTime}:00`);
    const endDateTime = new Date(`${values.shootDate}T${values.endTime}:00`);

    const finalCompletedContents = values.checklist.filter((item) => item.completed).length;
    const finalCompletedReels = Math.min(finalCompletedContents, values.plannedReels || 0);

    const payload = {
      ...values,
      startTime: startDateTime,
      endTime: endDateTime,
      completedContents: finalCompletedContents,
      completedReels: finalCompletedReels,
      // Retain backward-compatible empty arrays for legacy models
      assignedTeam: shoot?.assignedTeam || [],
      equipment: shoot?.equipment || [],
      expensesList: shoot?.expensesList || [],
      totalAmount: shoot?.totalAmount || 0,
      amountPaid: shoot?.amountPaid || 0,
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[92vh]">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <Camera size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {isEditing ? 'Edit Video Shoot & Content Checklist' : 'Schedule Video Shoot & Content Checklist'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Select client, plan reel targets, and track production checklist
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
            {/* Scrollable Form Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              {/* Client & Shoot Title Card */}
              <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Select */}
                  <FormField
                    control={form.control}
                    name="client"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Building2 size={13} className="text-primary" /> Client Name *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((c) => (
                              <SelectItem key={c._id} value={c._id} className="font-medium">
                                {c.company || c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status Select */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Shoot Status *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs">
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
                </div>

                {/* Shoot Title */}
                <FormField
                  control={form.control}
                  name="shootTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clapperboard size={13} className="text-primary" /> Shoot Title / Campaign *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Festive Campaign Shoot & High-Impact Reels"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Timing & Location Alignment */}
              <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4 shadow-2xs">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" /> Schedule & Shoot Timing
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <FormField
                    control={form.control}
                    name="shootDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-11 rounded-xl border-border bg-background px-3.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
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
                        <FormLabel className="text-xs font-semibold text-foreground">Start Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-11 rounded-xl border-border bg-background px-3.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
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
                        <FormLabel className="text-xs font-semibold text-foreground">End Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-11 rounded-xl border-border bg-background px-3.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
                            {...field}
                          />
                        </FormControl>
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
                      <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <MapPin size={12} className="text-rose-500" /> Shoot Location Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Client Showroom / Studio 4, Chennai"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Targets: Reels & Content Planned (Clean Modern Grid Alignment) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planned Contents */}
                <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Film size={14} /> Planned Content
                    </span>
                    <span className="text-[11px] font-semibold text-primary/80">
                      Creates Checklist
                    </span>
                  </div>

                  <FormField
                    control={form.control}
                    name="plannedContents"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="10"
                            value={field.value}
                            onChange={(e) => handlePlannedContentsChange(e.target.value)}
                            className="h-12 rounded-xl border-primary/30 bg-background px-4 text-base font-bold text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground mr-1">Quick:</span>
                    {[5, 8, 10, 12, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handlePlannedContentsChange(num)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          Number(watchedPlannedContents) === num
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-foreground border-border/70'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Planned Reels */}
                <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Clapperboard size={14} /> Planned Reels
                    </span>
                    <span className="text-[11px] font-semibold text-purple-600/80 dark:text-purple-400/80">
                      Target Count
                    </span>
                  </div>

                  <FormField
                    control={form.control}
                    name="plannedReels"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="5"
                            className="h-12 rounded-xl border-purple-500/30 bg-background px-4 text-base font-bold text-foreground focus:ring-2 focus:ring-purple-500/20 shadow-2xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground mr-1">Quick:</span>
                    {[3, 5, 8, 10, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => form.setValue('plannedReels', num)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          Number(watchedPlannedReels) === num
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-background hover:bg-muted text-foreground border-border/70'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHECKLIST SECTION: Dynamic Reel & Content Checklist */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                {/* Header with Live Progress */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ListTodo size={17} className="text-primary" /> Content & Reels Production Checklist
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Edit names and check off finished reels during production
                    </p>
                  </div>

                  {/* Completion Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border ${
                        isTargetMet
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : completedCount > 0
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {isTargetMet ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Sparkles size={13} />}
                      {completedCount} / {targetContents} Finished ({completionPct}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isTargetMet ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(completionPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Items List */}
                <div className="space-y-2.5 pt-1">
                  {checklistFields.map((field, index) => {
                    const isChecked = form.watch(`checklist.${index}.completed`);

                    return (
                      <div
                        key={field.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-background border-border hover:border-border/80'
                        }`}
                      >
                        {/* Checkbox Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(index)}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                              : 'border-muted-foreground/40 hover:border-primary bg-background'
                          }`}
                          title={isChecked ? 'Mark pending' : 'Mark completed'}
                        >
                          {isChecked ? <Check size={14} className="stroke-[3]" /> : null}
                        </button>

                        {/* Number Indicator */}
                        <span className="text-[11px] font-bold text-muted-foreground min-w-[24px]">
                          #{index + 1}
                        </span>

                        {/* Editable Name Input */}
                        <Input
                          placeholder={`Reel / Content #${index + 1} Name`}
                          className={`h-9 flex-1 rounded-lg border-border bg-transparent px-3 text-xs font-medium transition-colors ${
                            isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                          {...form.register(`checklist.${index}.title`)}
                        />

                        {/* Completed Status Pill */}
                        <span
                          className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isChecked
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {isChecked ? 'Finished' : 'Pending'}
                        </span>

                        {/* Delete Item Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                          onClick={() => removeChecklist(index)}
                          title="Remove checklist item"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    );
                  })}

                  {checklistFields.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl">
                      <ListTodo size={24} className="mx-auto text-muted-foreground/60 mb-1.5" />
                      <p className="text-xs text-muted-foreground font-medium">No checklist items created yet.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2.5 h-8 text-xs font-semibold rounded-lg"
                        onClick={() => appendChecklist({ title: 'Reel / Content #1', completed: false })}
                      >
                        <Plus size={13} className="mr-1" /> Add First Item
                      </Button>
                    </div>
                  )}
                </div>

                {/* Add Custom Item Button */}
                <div className="pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendChecklist({
                        title: `Reel / Content #${checklistFields.length + 1}`,
                        completed: false,
                      })
                    }
                    className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Another Content / Reel
                  </Button>

                  <span className="text-[11px] text-muted-foreground">
                    Total: <strong className="text-foreground">{checklistFields.length}</strong> items
                  </span>
                </div>
              </div>

              {/* Production Notes / Instructions */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Production Notes / Instructions
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[85px] rounded-xl border-border bg-background p-3.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 shadow-2xs"
                        placeholder="Theme details, guidelines, reference reels, shot list..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  {isLoading ? 'Saving...' : isEditing ? 'Update Video Shoot' : 'Save Video Shoot'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
