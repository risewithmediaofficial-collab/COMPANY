import { useEffect, useMemo } from 'react';
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
  Clapperboard,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  ListTodo,
  Calendar,
  MapPin,
  Building2,
  Sparkles,
  Check,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useCreateVideoShoot, useUpdateVideoShoot } from '../../hooks/useDMCalendar';
import { normalizeShootChecklist } from '../../utils/dmChecklist';

const checklistItemSchema = z.object({
  title: z.string().min(1, 'Item title is required'),
  completed: z.boolean().default(false),
  type: z.enum(['reel', 'post']).default('reel'),
});

const videoShootSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  shootTitle: z.string().min(1, 'Shoot Title is required'),
  shootDate: z.string().min(1, 'Shoot Date is required'),
  startTime: z.string().min(1, 'Start Time is required'),
  endTime: z.string().min(1, 'End Time is required'),
  shootLocation: z.string().optional().or(z.literal('')),
  contentType: z.enum(['reels_and_posts', 'reels', 'posts']).default('reels_and_posts'),
  plannedReels: z.coerce.number().min(0, 'Planned reels must be >= 0'),
  plannedPosts: z.coerce.number().min(0, 'Planned posts must be >= 0'),
  reelsChecklist: z.array(checklistItemSchema).default([]),
  postsChecklist: z.array(checklistItemSchema).default([]),
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
      contentType: 'reels_and_posts',
      plannedReels: 5,
      plannedPosts: 5,
      reelsChecklist: [],
      postsChecklist: [],
      notes: '',
      status: 'Scheduled',
    },
  });

  const {
    fields: reelsFields,
    append: appendReel,
    remove: removeReel,
    replace: replaceReels,
  } = useFieldArray({
    control: form.control,
    name: 'reelsChecklist',
  });

  const {
    fields: postsFields,
    append: appendPost,
    remove: removePost,
    replace: replacePosts,
  } = useFieldArray({
    control: form.control,
    name: 'postsChecklist',
  });

  const { data: clients = [] } = useClients({}, { enabled: open });
  const createShoot = useCreateVideoShoot();
  const updateShoot = useUpdateVideoShoot();

  const watchedContentType = form.watch('contentType') || 'reels_and_posts';
  const watchedPlannedReels = form.watch('plannedReels') || 0;
  const watchedPlannedPosts = form.watch('plannedPosts') || 0;
  const watchedReelsChecklist = form.watch('reelsChecklist') || [];
  const watchedPostsChecklist = form.watch('postsChecklist') || [];

  const showReels = watchedContentType === 'reels_and_posts' || watchedContentType === 'reels';
  const showPosts = watchedContentType === 'reels_and_posts' || watchedContentType === 'posts';

  const completedReelsCount = useMemo(
    () => watchedReelsChecklist.filter((item) => item.completed).length,
    [watchedReelsChecklist]
  );
  const completedPostsCount = useMemo(
    () => watchedPostsChecklist.filter((item) => item.completed).length,
    [watchedPostsChecklist]
  );

  const targetReels = Number(watchedPlannedReels) || watchedReelsChecklist.length;
  const targetPosts = Number(watchedPlannedPosts) || watchedPostsChecklist.length;

  const reelsCompletionPct = targetReels > 0 ? Math.round((completedReelsCount / targetReels) * 100) : 0;
  const postsCompletionPct = targetPosts > 0 ? Math.round((completedPostsCount / targetPosts) * 100) : 0;

  const isReelsTargetMet = targetReels > 0 && completedReelsCount >= targetReels;
  const isPostsTargetMet = targetPosts > 0 && completedPostsCount >= targetPosts;

  // Initialize or reset form values when modal opens or selected shoot changes
  useEffect(() => {
    if (!open) return;

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

      const normalized = normalizeShootChecklist(shoot, { synthesizeDefaults: true });
      const initialReelsList = normalized.reelItems.map(({ _origIndex, _id, completedAt, completedBy, ...rest }) => rest);
      const initialPostsList = normalized.postItems.map(({ _origIndex, _id, completedAt, completedBy, ...rest }) => rest);

      let detectedType = shoot.contentType;
      if (!detectedType) {
        if (initialReelsList.length > 0 && initialPostsList.length > 0) {
          detectedType = 'reels_and_posts';
        } else if (initialPostsList.length > 0 && initialReelsList.length === 0) {
          detectedType = 'posts';
        } else if (initialReelsList.length > 0 && initialPostsList.length === 0 && !normalized.targetPosts) {
          detectedType = 'reels';
        } else {
          detectedType = 'reels_and_posts';
        }
      }

      form.reset({
        client: shoot.client?._id || shoot.client || '',
        shootTitle: shoot.shootTitle || '',
        shootDate: sDate,
        startTime: sTime,
        endTime: eTime,
        shootLocation: shoot.shootLocation || '',
        contentType: detectedType,
        plannedReels: shoot.plannedReels !== undefined ? normalized.targetReels : initialReelsList.length,
        plannedPosts: normalized.targetPosts,
        reelsChecklist: initialReelsList,
        postsChecklist: initialPostsList,
        notes: shoot.notes === 'null' || !shoot.notes ? '' : shoot.notes,
        status: shoot.status || 'Scheduled',
      });
    } else {
      const defaultReels = Array.from({ length: 5 }, (_, i) => ({
        title: `Reel Content #${i + 1}`,
        completed: false,
        type: 'reel',
      }));

      const defaultPosts = Array.from({ length: 5 }, (_, i) => ({
        title: `Post #${i + 1}`,
        completed: false,
        type: 'post',
      }));

      form.reset({
        client: clients[0]?._id || '',
        shootTitle: '',
        shootDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        shootLocation: '',
        contentType: 'reels_and_posts',
        plannedReels: 5,
        plannedPosts: 5,
        reelsChecklist: defaultReels,
        postsChecklist: defaultPosts,
        notes: '',
        status: 'Scheduled',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shoot, form]);

  // Populate default client for new shoots once clients finish loading without resetting user edits
  useEffect(() => {
    if (open && !shoot && clients.length > 0 && !form.getValues('client')) {
      form.setValue('client', clients[0]._id);
    }
  }, [open, shoot, clients, form]);

  // Adjust Reels checklist when plannedReels count is updated
  const handlePlannedReelsChange = (newCount) => {
    const target = Math.max(0, parseInt(newCount, 10) || 0);
    form.setValue('plannedReels', target);

    const currentList = form.getValues('reelsChecklist') || [];
    if (target > currentList.length) {
      const needed = target - currentList.length;
      const updated = [...currentList];
      for (let i = 1; i <= needed; i++) {
        updated.push({
          title: `Reel Content #${currentList.length + i}`,
          completed: false,
          type: 'reel',
        });
      }
      replaceReels(updated);
    }
  };

  // Adjust Posts checklist when plannedPosts count is updated
  const handlePlannedPostsChange = (newCount) => {
    const target = Math.max(0, parseInt(newCount, 10) || 0);
    form.setValue('plannedPosts', target);

    const currentList = form.getValues('postsChecklist') || [];
    if (target > currentList.length) {
      const needed = target - currentList.length;
      const updated = [...currentList];
      for (let i = 1; i <= needed; i++) {
        updated.push({
          title: `Post #${currentList.length + i}`,
          completed: false,
          type: 'post',
        });
      }
      replacePosts(updated);
    }
  };

  // When switching contentType via Select, ensure active checklist has default items if empty
  const handleContentTypeChange = (newType) => {
    form.setValue('contentType', newType);

    if (newType === 'reels' || newType === 'reels_and_posts') {
      const currentReels = form.getValues('reelsChecklist') || [];
      const currentPlannedReels = Number(form.getValues('plannedReels') || 0);
      if (currentPlannedReels === 0 && currentReels.length === 0) {
        const defaultReels = Array.from({ length: 5 }, (_, idx) => ({
          title: `Reel Content #${idx + 1}`,
          completed: false,
          type: 'reel',
        }));
        form.setValue('plannedReels', 5);
        replaceReels(defaultReels);
      }
    }

    if (newType === 'posts' || newType === 'reels_and_posts') {
      const currentPosts = form.getValues('postsChecklist') || [];
      const currentPlannedPosts = Number(form.getValues('plannedPosts') || 0);
      if (currentPlannedPosts === 0 && currentPosts.length === 0) {
        const defaultPosts = Array.from({ length: 5 }, (_, idx) => ({
          title: `Post #${idx + 1}`,
          completed: false,
          type: 'post',
        }));
        form.setValue('plannedPosts', 5);
        replacePosts(defaultPosts);
      }
    }
  };

  const handleToggleReel = (index) => {
    const currentList = form.getValues('reelsChecklist') || [];
    const item = currentList[index];
    if (!item) return;
    form.setValue(`reelsChecklist.${index}.completed`, !item.completed);
  };

  const handleTogglePost = (index) => {
    const currentList = form.getValues('postsChecklist') || [];
    const item = currentList[index];
    if (!item) return;
    form.setValue(`postsChecklist.${index}.completed`, !item.completed);
  };

  const onSubmit = async (values) => {
    const startDateTime = new Date(`${values.shootDate}T${values.startTime}:00`);
    const endDateTime = new Date(`${values.shootDate}T${values.endTime}:00`);

    const includeReels = values.contentType === 'reels_and_posts' || values.contentType === 'reels';
    const includePosts = values.contentType === 'reels_and_posts' || values.contentType === 'posts';

    const finalReelsList = includeReels
      ? values.reelsChecklist.map((item) => ({
          title: item.title,
          type: 'reel',
          completed: Boolean(item.completed),
        }))
      : [];

    const finalPostsList = includePosts
      ? values.postsChecklist.map((item) => ({
          title: item.title,
          type: 'post',
          completed: Boolean(item.completed),
        }))
      : [];

    const finalPlannedReels = includeReels ? Number(values.plannedReels || 0) : 0;
    const finalPlannedPosts = includePosts ? Number(values.plannedPosts || 0) : 0;

    const finalCompletedReels = finalReelsList.filter((i) => i.completed).length;
    const finalCompletedPosts = finalPostsList.filter((i) => i.completed).length;

    const combinedChecklist = [...finalReelsList, ...finalPostsList];

    const payload = {
      client: values.client,
      shootTitle: values.shootTitle,
      shootDate: values.shootDate,
      startTime: startDateTime,
      endTime: endDateTime,
      shootLocation: values.shootLocation,
      contentType: values.contentType,
      plannedReels: finalPlannedReels,
      completedReels: finalCompletedReels,
      plannedPosts: finalPlannedPosts,
      completedPosts: finalCompletedPosts,
      plannedContents: finalPlannedReels + finalPlannedPosts,
      completedContents: finalCompletedReels + finalCompletedPosts,
      checklist: combinedChecklist,
      notes: values.notes,
      status: values.status,
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
              <DialogDescription className="sr-only">
                Select content type (Reels and/or Posts), set target counts, and manage production checklists
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

              {/* Content Format Selection (Reels & Posts Select Option) */}
              <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4 shadow-2xs">
                <FormField
                  control={form.control}
                  name="contentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers size={13} className="text-primary" /> Content Deliverables Type (Reels & Posts) *
                      </FormLabel>
                      <Select onValueChange={handleContentTypeChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select Reels, Posts, or Both" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="reels_and_posts" className="font-semibold">
                            Reels & Posts (Both Separate Sections)
                          </SelectItem>
                          <SelectItem value="reels" className="font-semibold">
                            Reels Content Only
                          </SelectItem>
                          <SelectItem value="posts" className="font-semibold">
                            Posts Only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Separate Targets Grid: Reels Content & Posts */}
                <div className={`grid grid-cols-1 ${showReels && showPosts ? 'sm:grid-cols-2' : ''} gap-4`}>
                  {/* Planned Reels Content */}
                  {showReels && (
                    <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <Clapperboard size={14} /> Planned Reels Content
                        </span>
                        <span className="text-[11px] font-semibold text-purple-600/80 dark:text-purple-400/80">
                          Reels Checklist
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
                                value={field.value}
                                onChange={(e) => handlePlannedReelsChange(e.target.value)}
                                className="h-12 rounded-xl border-purple-500/30 bg-background px-4 text-base font-bold text-foreground focus:ring-2 focus:ring-purple-500/20 shadow-2xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quick Select Buttons for Reels */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">Quick:</span>
                        {[3, 5, 8, 10, 12].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handlePlannedReelsChange(num)}
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
                  )}

                  {/* Planned Posts */}
                  {showPosts && (
                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <LayoutGrid size={14} /> Planned Posts
                        </span>
                        <span className="text-[11px] font-semibold text-primary/80">
                          Posts Checklist
                        </span>
                      </div>

                      <FormField
                        control={form.control}
                        name="plannedPosts"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="5"
                                value={field.value}
                                onChange={(e) => handlePlannedPostsChange(e.target.value)}
                                className="h-12 rounded-xl border-primary/30 bg-background px-4 text-base font-bold text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quick Select Buttons for Posts */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">Quick:</span>
                        {[3, 5, 8, 10, 12].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handlePlannedPostsChange(num)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                              Number(watchedPlannedPosts) === num
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-background hover:bg-muted text-foreground border-border/70'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SEPARATE CHECKLIST 1: Reels Content Production Checklist */}
              {showReels && (
                <div className="p-5 rounded-2xl border border-purple-500/20 bg-card space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Clapperboard size={17} className="text-purple-600 dark:text-purple-400" /> Reels Content Production Checklist
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Track reel scripts, shoots, and completed reel videos separately
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border ${
                          isReelsTargetMet
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : completedReelsCount > 0
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isReelsTargetMet ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Sparkles size={13} />}
                        {completedReelsCount} / {targetReels} Reels ({reelsCompletionPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Reels Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isReelsTargetMet ? 'bg-emerald-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${Math.min(reelsCompletionPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Reels Items List */}
                  <div className="space-y-2.5 pt-1">
                    {reelsFields.map((field, index) => {
                      const isChecked = form.watch(`reelsChecklist.${index}.completed`);

                      return (
                        <div
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-background border-border hover:border-purple-500/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleReel(index)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'border-muted-foreground/40 hover:border-purple-500 bg-background'
                            }`}
                            title={isChecked ? 'Mark pending' : 'Mark completed'}
                          >
                            {isChecked ? <Check size={14} className="stroke-[3]" /> : null}
                          </button>

                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 min-w-[26px]">
                            R#{index + 1}
                          </span>

                          <Input
                            placeholder={`Reel Content #${index + 1} Title`}
                            className={`h-9 flex-1 rounded-lg border-border bg-transparent px-3 text-xs font-medium transition-colors ${
                              isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                            {...form.register(`reelsChecklist.${index}.title`)}
                          />

                          <span
                            className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isChecked
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            {isChecked ? 'Finished' : 'Pending'}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                            onClick={() => removeReel(index)}
                            title="Remove reel item"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      );
                    })}

                    {reelsFields.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-purple-500/30 rounded-xl">
                        <Clapperboard size={24} className="mx-auto text-purple-500/60 mb-1.5" />
                        <p className="text-xs text-muted-foreground font-medium">No reel items added yet.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2.5 h-8 text-xs font-semibold rounded-lg"
                          onClick={() => appendReel({ title: 'Reel Content #1', completed: false, type: 'reel' })}
                        >
                          <Plus size={13} className="mr-1" /> Add First Reel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Add Custom Reel Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendReel({
                          title: `Reel Content #${reelsFields.length + 1}`,
                          completed: false,
                          type: 'reel',
                        })
                      }
                      className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-purple-500/30 hover:bg-purple-500/5"
                    >
                      <Plus size={14} className="text-purple-600 dark:text-purple-400" /> Add Another Reel
                    </Button>

                    <span className="text-[11px] text-muted-foreground">
                      Reels Total: <strong className="text-foreground">{reelsFields.length}</strong> items
                    </span>
                  </div>
                </div>
              )}

              {/* SEPARATE CHECKLIST 2: Posts Production Checklist */}
              {showPosts && (
                <div className="p-5 rounded-2xl border border-primary/20 bg-card space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <LayoutGrid size={17} className="text-primary" /> Posts Production Checklist
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Track static posts, carousels, and graphic creatives separately
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border ${
                          isPostsTargetMet
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : completedPostsCount > 0
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isPostsTargetMet ? <CheckCircle2 size={13} className="text-emerald-500" /> : <ListTodo size={13} />}
                        {completedPostsCount} / {targetPosts} Posts ({postsCompletionPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Posts Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isPostsTargetMet ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(postsCompletionPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Posts Items List */}
                  <div className="space-y-2.5 pt-1">
                    {postsFields.map((field, index) => {
                      const isChecked = form.watch(`postsChecklist.${index}.completed`);

                      return (
                        <div
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-background border-border hover:border-primary/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleTogglePost(index)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'border-muted-foreground/40 hover:border-primary bg-background'
                            }`}
                            title={isChecked ? 'Mark pending' : 'Mark completed'}
                          >
                            {isChecked ? <Check size={14} className="stroke-[3]" /> : null}
                          </button>

                          <span className="text-[11px] font-bold text-primary min-w-[26px]">
                            P#{index + 1}
                          </span>

                          <Input
                            placeholder={`Post #${index + 1} Title`}
                            className={`h-9 flex-1 rounded-lg border-border bg-transparent px-3 text-xs font-medium transition-colors ${
                              isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                            {...form.register(`postsChecklist.${index}.title`)}
                          />

                          <span
                            className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isChecked
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {isChecked ? 'Finished' : 'Pending'}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                            onClick={() => removePost(index)}
                            title="Remove post item"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      );
                    })}

                    {postsFields.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-primary/30 rounded-xl">
                        <LayoutGrid size={24} className="mx-auto text-primary/60 mb-1.5" />
                        <p className="text-xs text-muted-foreground font-medium">No post items added yet.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2.5 h-8 text-xs font-semibold rounded-lg"
                          onClick={() => appendPost({ title: 'Post #1', completed: false, type: 'post' })}
                        >
                          <Plus size={13} className="mr-1" /> Add First Post
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Add Custom Post Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendPost({
                          title: `Post #${postsFields.length + 1}`,
                          completed: false,
                          type: 'post',
                        })
                      }
                      className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-primary/30 hover:bg-primary/5"
                    >
                      <Plus size={14} className="text-primary" /> Add Another Post
                    </Button>

                    <span className="text-[11px] text-muted-foreground">
                      Posts Total: <strong className="text-foreground">{postsFields.length}</strong> items
                    </span>
                  </div>
                </div>
              )}

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
