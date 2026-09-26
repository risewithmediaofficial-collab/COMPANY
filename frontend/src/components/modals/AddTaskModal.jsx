import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
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
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useUsers } from '../../hooks/useUsers';
import { useClients } from '../../hooks/useClients';
import {
  BRANDING_AVAILABILITY_OPTIONS,
  CONTENT_AVAILABILITY_OPTIONS,
  CONTENT_TASK_TYPE_OPTIONS,
  CONTENT_MEDIA_TYPE_OPTIONS,
  POSTING_PLATFORM_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  NON_CONTENT_TASK_TYPE_OPTIONS,
  PAGE_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_STATUS_OPTIONS,
  WEBSITE_TYPE_OPTIONS,
  formatTaskTypeLabel,
  getTaskCategoryFromType,
  isWebsiteTaskType,
  normalizeTaskStatusLabel,
  uploadFiles,
} from '../../utils/taskFields';
import {
  Trash2,
  Plus,
  Video,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Paperclip,
  X,
  Layers,
  Building2,
  FolderKanban,
  FileText,
  Shield,
  Clock,
  Share2,
} from 'lucide-react';
import { useProjectMonthlyDeliverables } from '../../hooks/useMonthlyDeliverables';
import { MONTH_NAMES } from '../projects/MonthlyDeliverablesSection';
import { toast } from 'sonner';

const TASK_DRAFT_KEY = 'draft:task-modal';
const EMPTY_INITIAL_VALUES = {};

const normalizeDeliverableName = (s = '') => s.toString().trim().toLowerCase().replace(/[\s_-]+/g, '');

const findMatchingDeliverableTarget = (taskType, contentType, videoType, deliverables = []) => {
  if (!deliverables || deliverables.length === 0) return null;
  const nTaskType = normalizeDeliverableName(taskType);
  const nContentType = normalizeDeliverableName(contentType);
  const nVideoType = normalizeDeliverableName(videoType);

  const synonyms = {
    video: ['video', 'videos', 'videocontent', 'youtube', 'longvideo'],
    reel: ['reel', 'reels', 'shorts'],
    poster: ['poster', 'posters', 'posts', 'socialmediapost', 'designs', 'design', 'graphicdesign', 'adcreative'],
    story: ['story', 'stories'],
    carousel: ['carousel', 'carouselpost'],
    blog: ['blog', 'blogs'],
  };

  return deliverables.find((d) => {
    const nTarget = normalizeDeliverableName(d.contentType);
    if (nTarget === nTaskType || nTarget === nContentType || nTarget === nVideoType) return true;

    for (const [groupKey, groupSyns] of Object.entries(synonyms)) {
      if (nTarget === groupKey || groupSyns.includes(nTarget)) {
        if (groupSyns.includes(nTaskType) || groupSyns.includes(nContentType) || groupSyns.includes(nVideoType)) {
          return true;
        }
      }
    }
    return false;
  });
};

const POSTER_TASK_TYPES = ['poster', 'social_media_post', 'ad_creative', 'story', 'carousel_post'];
const VIDEO_TASK_TYPES = ['reel', 'video_content', 'blog'];
const isPosterTask = (t) => POSTER_TASK_TYPES.includes(t);
const isVideoTask = (t) => VIDEO_TASK_TYPES.includes(t);

const BLANK_TASK_TEMPLATE = {
  taskTitle: '',
  taskCategory: 'content',
  contentType: 'posts',
  videoType: 'reels',
  taskType: 'poster',
  assignedTo: '',
  description: '',
  caption: '',
  scriptText: '',
  scriptLink: '',
  referenceLink: '',
  editorGuide: '',
  hashtags: '',
  keywords: '',
  contentIdea: '',
  audioReference: '',
  shootInstructions: '',
  editingInstructions: '',
  websiteType: '',
  websiteRequirements: '',
  pagesNeeded: [],
  contentAvailability: '',
  brandingAvailability: '',
  department: '',
  domainDetails: '',
  hostingDetails: '',
  adminCredentials: '',
  requiredFeatures: '',
  scriptWriterAssigned: '',
  voiceArtistAssigned: '',
  voiceScriptText: '',
  voiceInstructions: '',
  videographerAssigned: '',
  videographerContentNeeded: '',
  editorAssigned: '',
  publisherAssigned: '',
  shootDate: '',
  shootLocation: '',
  rawFootageLink: '',
  postingPlatforms: [],
  publishingDate: '',
  publishingTime: '',
};

const taskFormSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  taskCategory: z.string().default('content'),
  contentType: z.string().optional().default('posts'),
  videoType: z.string().optional().default('reels'),
  contentTitle: z.string().optional(),
  taskType: z.string().optional().default('poster'),
  client: z.string().optional(),
  project: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedManager: z.string().optional(),
  scriptWriterAssigned: z.string().optional(),
  voiceArtistAssigned: z.string().optional(),
  voiceScriptText: z.string().optional(),
  voiceInstructions: z.string().optional(),
  videographerAssigned: z.string().optional(),
  videographerContentNeeded: z.string().optional(),
  editorAssigned: z.string().optional(),
  publisherAssigned: z.string().optional(),
  shootDate: z.string().optional(),
  shootLocation: z.string().optional(),
  rawFootageLink: z.string().optional(),
  postingPlatforms: z.array(z.string()).default([]),
  postingScheduleDate: z.string().optional(),
  publishingDate: z.string().optional(),
  publishingTime: z.string().optional(),
  priority: z.enum(PRIORITY_OPTIONS).default('Medium'),
  dueDate: z.string().optional(),
  status: z.enum(TASK_STATUS_OPTIONS).default('To Do'),
  description: z.string().optional(),
  scriptText: z.string().optional(),
  scriptLink: z.string().optional(),
  caption: z.string().optional(),
  referenceLink: z.string().optional(),
  editorGuide: z.string().optional(),
  hashtags: z.string().optional(),
  keywords: z.string().optional(),
  contentIdea: z.string().optional(),
  audioReference: z.string().optional(),
  shootInstructions: z.string().optional(),
  editingInstructions: z.string().optional(),
  websiteType: z.string().optional(),
  websiteRequirements: z.string().optional(),
  pagesNeeded: z.array(z.string()).default([]),
  contentAvailability: z.string().optional(),
  brandingAvailability: z.string().optional(),
  domainDetails: z.string().optional(),
  hostingDetails: z.string().optional(),
  adminCredentials: z.string().optional(),
  requiredFeatures: z.string().optional(),
  internalNotes: z.string().optional(),
  clientVisibleNotes: z.string().optional(),
  department: z.string().optional(),
  approvalRequired: z.boolean().default(true),
  isClientVisible: z.boolean().default(true),
  duplicateCount: z.preprocess((val) => Number(val) || 1, z.number().min(1).default(1)),
});

const buildDefaultValues = (initialValues = {}) => ({
  taskTitle: '',
  taskCategory: 'content',
  contentType: 'posts',
  videoType: 'reels',
  contentTitle: '',
  taskType: 'poster',
  client: '',
  project: '',
  assignedTo: '',
  assignedManager: '',
  scriptWriterAssigned: '',
  voiceArtistAssigned: '',
  voiceScriptText: '',
  voiceInstructions: '',
  videographerAssigned: '',
  videographerContentNeeded: '',
  editorAssigned: '',
  publisherAssigned: '',
  shootDate: '',
  shootLocation: '',
  rawFootageLink: '',
  postingPlatforms: [],
  postingScheduleDate: '',
  publishingDate: '',
  publishingTime: '',
  priority: 'Medium',
  dueDate: '',
  status: 'To Do',
  description: '',
  scriptText: '',
  scriptLink: '',
  caption: '',
  referenceLink: '',
  editorGuide: '',
  hashtags: '',
  keywords: '',
  contentIdea: '',
  audioReference: '',
  shootInstructions: '',
  editingInstructions: '',
  websiteType: '',
  websiteRequirements: '',
  pagesNeeded: [],
  contentAvailability: '',
  brandingAvailability: '',
  domainDetails: '',
  hostingDetails: '',
  adminCredentials: '',
  requiredFeatures: '',
  internalNotes: '',
  clientVisibleNotes: '',
  approvalRequired: true,
  isClientVisible: true,
  duplicateCount: 1,
  department: initialValues?.department || '',
  ...initialValues,
});

export const AddTaskModal = ({
  open,
  onOpenChange,
  task = null,
  initialValues = EMPTY_INITIAL_VALUES,
  pageMode = false,
}) => {
  const form = useForm({
    resolver: zodResolver(taskFormSchema),
    defaultValues: buildDefaultValues(initialValues),
  });

  const { data: projects = [] } = useProjects({}, { enabled: open });
  const { data: users = [] } = useUsers({ enabled: open });
  const { data: clients = [] } = useClients({}, { enabled: open });
  const { user: currentUser } = useSelector((state) => state.auth);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isLoading = createTask.isPending || updateTask.isPending;

  const assignableUsers = useMemo(
    () => users.filter((u) => ['superAdmin', 'admin', 'manager', 'employee'].includes(u.role)),
    [users]
  );
  const managerOptions = useMemo(() => users.filter((u) => u.role === 'manager'), [users]);

  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);

  // Collapsible accordion sections for a neat, minimalist Kanban form
  const [showBriefSection, setShowBriefSection] = useState(true);
  const [showPipelineSection, setShowPipelineSection] = useState(false);
  const [showNotesSection, setShowNotesSection] = useState(false);
  const [showBatchSection, setShowBatchSection] = useState(false);

  // Extra batch tasks in create mode or additional tasks in edit mode
  const [batchTasks, setBatchTasks] = useState([]);
  const [additionalTasks, setAdditionalTasks] = useState([]);

  const taskCategory = form.watch('taskCategory') || 'content';
  const contentType = form.watch('contentType') || 'posts';
  const videoType = form.watch('videoType') || 'reels';
  const taskType = form.watch('taskType') || 'poster';
  const selectedClientId = form.watch('client') || '';
  const selectedProjectId = form.watch('project') || '';
  const formDueDate = form.watch('dueDate');
  const formPostingDate = form.watch('postingScheduleDate');
  const isVideoReel = taskCategory === 'content' && (contentType === 'videos' || isVideoTask(taskType));

  // Projects filtered by selected client (if client chosen)
  const filteredProjects = useMemo(() => {
    if (!selectedClientId || selectedClientId === '_none') return projects;
    if (selectedClientId === '__saas_internal__') {
      return projects.filter(
        (project) =>
          project.isInternal ||
          project.productType === 'saas_product' ||
          project.productType === 'internal_tool' ||
          !project.client
      );
    }
    return projects.filter((project) => (project.client?._id || project.client) === selectedClientId);
  }, [projects, selectedClientId]);

  // Project deliverables targets check
  const targetDate = formDueDate ? new Date(formDueDate) : formPostingDate ? new Date(formPostingDate) : new Date();
  const taskMonth = !isNaN(targetDate.getTime()) ? targetDate.getMonth() + 1 : new Date().getMonth() + 1;
  const taskYear = !isNaN(targetDate.getTime()) ? targetDate.getFullYear() : new Date().getFullYear();

  const { data: projectDeliverablesData } = useProjectMonthlyDeliverables(
    selectedProjectId && selectedProjectId !== '_none' ? selectedProjectId : null,
    taskMonth,
    taskYear
  );
  const projectDeliverables = projectDeliverablesData?.deliverables || [];

  const matchedDeliverableTarget = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === '_none' || taskCategory !== 'content') return null;
    return findMatchingDeliverableTarget(taskType, contentType, videoType, projectDeliverables);
  }, [selectedProjectId, taskCategory, taskType, contentType, videoType, projectDeliverables]);

  // Sync / Reset on open or task change
  useEffect(() => {
    if (task) {
      const derivedCategory = getTaskCategoryFromType(task.taskType);
      form.reset({
        taskTitle: task.taskTitle || task.title || '',
        taskCategory: derivedCategory,
        contentType: task.contentType || (derivedCategory === 'content' ? 'posts' : ''),
        videoType: task.videoType || (derivedCategory === 'content' ? 'reels' : ''),
        contentTitle: task.contentTitle || '',
        taskType: task.taskType || (derivedCategory === 'content' ? 'poster' : 'website_development'),
        client: task.client?._id || task.client || '',
        project: task.project?._id || task.project || '',
        assignedTo: Array.isArray(task.assignedTo)
          ? task.assignedTo[0]?._id || task.assignedTo[0] || ''
          : task.assignedTo || '',
        assignedManager: task.assignedManager?._id || task.assignedManager || '',
        scriptWriterAssigned: task.scriptWriterAssigned?._id || task.scriptWriterAssigned || '',
        voiceArtistAssigned: task.voiceArtistAssigned?._id || task.voiceArtistAssigned || '',
        voiceScriptText: task.voiceScriptText || '',
        voiceInstructions: task.voiceInstructions || '',
        videographerAssigned: task.videographerAssigned?._id || task.videographerAssigned || '',
        videographerContentNeeded: task.videographerContentNeeded || '',
        editorAssigned: task.editorAssigned?._id || task.editorAssigned || '',
        publisherAssigned: task.publisherAssigned?._id || task.publisherAssigned || '',
        shootDate: task.shootDate ? new Date(task.shootDate).toISOString().split('T')[0] : '',
        shootLocation: task.shootLocation || '',
        rawFootageLink: task.rawFootageLink || '',
        postingPlatforms: task.postingPlatforms || [],
        postingScheduleDate: task.postingScheduleDate
          ? new Date(task.postingScheduleDate).toISOString().slice(0, 16)
          : '',
        publishingDate: task.publishingDate ? new Date(task.publishingDate).toISOString().split('T')[0] : '',
        publishingTime: task.publishingTime || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        status: normalizeTaskStatusLabel(task.status),
        description: task.description || '',
        scriptText: task.scriptText || '',
        scriptLink: task.scriptLink || '',
        caption: task.caption || '',
        referenceLink: task.referenceLink || '',
        editorGuide: task.editorGuide || '',
        hashtags: task.hashtags || '',
        keywords: task.keywords || '',
        contentIdea: task.contentIdea || '',
        audioReference: task.audioReference || '',
        shootInstructions: task.shootInstructions || '',
        editingInstructions: task.editingInstructions || '',
        websiteType: task.websiteType || '',
        websiteRequirements: task.websiteRequirements || '',
        pagesNeeded: task.pagesNeeded || [],
        contentAvailability: task.contentAvailability || '',
        brandingAvailability: task.brandingAvailability || '',
        domainDetails: task.domainDetails || '',
        hostingDetails: task.hostingDetails || '',
        adminCredentials: task.adminCredentials || '',
        requiredFeatures: task.requiredFeatures || '',
        internalNotes: task.internalNotes || '',
        clientVisibleNotes: task.clientVisibleNotes || '',
        approvalRequired: task.approvalRequired ?? true,
        isClientVisible: task.isClientVisible ?? true,
        department: task.department || '',
      });
      setExistingAttachments(task.attachments || []);
      setAttachmentFiles([]);
      setAdditionalTasks([]);
      setBatchTasks([]);
    } else if (open) {
      const savedDraft = localStorage.getItem(TASK_DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          form.reset(parsed);
          setHasDraft(true);
        } catch {
          form.reset(buildDefaultValues(initialValues));
          setHasDraft(false);
        }
      } else {
        form.reset(buildDefaultValues(initialValues));
        setHasDraft(false);
      }
      setExistingAttachments([]);
      setAttachmentFiles([]);
      setBatchTasks([]);
      setAdditionalTasks([]);
    }
  }, [task, open, form, initialValues]);

  // Draft auto-saving
  const watchedValues = form.watch();
  useEffect(() => {
    if (!task && open && form.formState.isDirty) {
      localStorage.setItem(TASK_DRAFT_KEY, JSON.stringify(watchedValues));
      setHasDraft(true);
    }
  }, [watchedValues, task, open, form.formState.isDirty]);

  const handleClearDraft = () => {
    localStorage.removeItem(TASK_DRAFT_KEY);
    form.reset(buildDefaultValues(initialValues));
    setHasDraft(false);
    toast.success('Draft cleared');
  };

  const handleCategorySwitch = (category) => {
    form.setValue('taskCategory', category);
    if (category === 'content') {
      form.setValue('taskType', 'poster');
      form.setValue('contentType', 'posts');
    } else {
      form.setValue('taskType', 'website_development');
      form.setValue('publisherAssigned', '');
    }
  };

  const togglePageNeeded = (page) => {
    const current = form.getValues('pagesNeeded') || [];
    const next = current.includes(page) ? current.filter((p) => p !== page) : [...current, page];
    form.setValue('pagesNeeded', next, { shouldValidate: true });
  };

  const togglePlatform = (platValue) => {
    const current = form.getValues('postingPlatforms') || [];
    const next = current.includes(platValue)
      ? current.filter((p) => p !== platValue)
      : [...current, platValue];
    form.setValue('postingPlatforms', next, { shouldValidate: true });
  };

  // Batch task helpers
  const handleAddBatchTask = () => {
    setShowBatchSection(true);
    setBatchTasks((prev) => [
      ...prev,
      {
        ...BLANK_TASK_TEMPLATE,
        taskTitle: '',
        taskCategory,
        taskType: taskCategory === 'content' ? 'poster' : 'website_development',
        assignedTo: form.getValues('assignedTo') || '',
        description: '',
      },
    ]);
  };

  const handleRemoveBatchTask = (idx) => {
    setBatchTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBatchTaskField = (idx, field, value) => {
    setBatchTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Additional tasks for Edit mode
  const handleAddAdditionalTask = () => {
    setAdditionalTasks((prev) => [
      ...prev,
      {
        ...BLANK_TASK_TEMPLATE,
        taskTitle: '',
        taskCategory: 'content',
        taskType: 'poster',
        assignedTo: form.getValues('assignedTo') || '',
        description: '',
      },
    ]);
  };

  const handleRemoveAdditionalTask = (index) => {
    setAdditionalTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAdditionalTaskField = (index, field, value) => {
    setAdditionalTasks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Form Submission
  const onSubmit = async (data) => {
    try {
      const uploadedAttachments = await uploadFiles(attachmentFiles);
      const sanitizeId = (val) =>
        val && val !== '_none' && val !== '__saas_internal__' && val !== 'none' && val !== '_unassigned'
          ? val
          : undefined;

      const resolvedClient = sanitizeId(data.client);
      const resolvedProject = sanitizeId(data.project);

      if (task) {
        // Edit Mode
        const payload = {
          ...data,
          title: data.taskTitle,
          taskTitle: data.taskTitle,
          client: resolvedClient,
          project: resolvedProject,
          attachments: [...existingAttachments, ...uploadedAttachments],
          dueDate: data.dueDate || undefined,
          deadline: data.dueDate || undefined,
          assignedTo: sanitizeId(data.assignedTo),
          assignedManager: sanitizeId(data.assignedManager),
          scriptWriterAssigned: sanitizeId(data.scriptWriterAssigned),
          voiceArtistAssigned: sanitizeId(data.voiceArtistAssigned),
          videographerAssigned: sanitizeId(data.videographerAssigned),
          editorAssigned: sanitizeId(data.editorAssigned),
          publisherAssigned: sanitizeId(data.publisherAssigned),
          department: data.department || '',
          pagesNeeded: data.pagesNeeded || [],
        };

        await updateTask.mutateAsync({ id: task._id, data: payload });

        if (additionalTasks.length > 0) {
          const additionalPayload = additionalTasks.map((t) => ({
            ...t,
            title: t.taskTitle || `${data.taskTitle} (Extra)`,
            taskTitle: t.taskTitle || `${data.taskTitle} (Extra)`,
            client: resolvedClient,
            project: resolvedProject,
            assignedTo: sanitizeId(t.assignedTo) || sanitizeId(data.assignedTo),
            assignedManager: sanitizeId(data.assignedManager),
            priority: data.priority,
            status: 'To Do',
            dueDate: data.dueDate || undefined,
            description: t.description || '',
          }));
          await createTask.mutateAsync({ tasks: additionalPayload });
        }
      } else {
        // Create Mode (supports single task or batch tasks)
        const primaryTask = {
          ...data,
          title: data.taskTitle,
          client: resolvedClient,
          project: resolvedProject,
          attachments: [...existingAttachments, ...uploadedAttachments],
          dueDate: data.dueDate || undefined,
          deadline: data.dueDate || undefined,
          assignedTo: sanitizeId(data.assignedTo),
          assignedManager: sanitizeId(data.assignedManager),
          scriptWriterAssigned: sanitizeId(data.scriptWriterAssigned),
          voiceArtistAssigned: sanitizeId(data.voiceArtistAssigned),
          videographerAssigned: sanitizeId(data.videographerAssigned),
          editorAssigned: sanitizeId(data.editorAssigned),
          publisherAssigned: sanitizeId(data.publisherAssigned),
          duplicateCount: Math.max(1, Number(data.duplicateCount) || 1),
        };

        const allTasksToCreate = [primaryTask];

        if (batchTasks.length > 0) {
          batchTasks.forEach((bTask, idx) => {
            if (bTask.taskTitle?.trim()) {
              allTasksToCreate.push({
                ...data,
                ...bTask,
                title: bTask.taskTitle,
                client: resolvedClient,
                project: resolvedProject,
                assignedTo: sanitizeId(bTask.assignedTo) || sanitizeId(data.assignedTo),
                scriptWriterAssigned: sanitizeId(bTask.scriptWriterAssigned),
                voiceArtistAssigned: sanitizeId(bTask.voiceArtistAssigned),
                videographerAssigned: sanitizeId(bTask.videographerAssigned),
                editorAssigned: sanitizeId(bTask.editorAssigned),
                publisherAssigned: sanitizeId(bTask.publisherAssigned),
                attachments: [],
                duplicateCount: 1,
              });
            }
          });
        }

        await createTask.mutateAsync({ tasks: allTasksToCreate });
      }

      localStorage.removeItem(TASK_DRAFT_KEY);
      form.reset(buildDefaultValues(initialValues));
      setAttachmentFiles([]);
      setExistingAttachments([]);
      setBatchTasks([]);
      setAdditionalTasks([]);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ========================================================
            CARD HEADER & TITLE (Minimalist & Focused Kanban Style)
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3.5 transition-all">
          {/* Top meta pill row: Status & Priority */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                {task ? '✍️' : '📋'}
              </span>
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                {task ? 'Edit Task Card' : 'New Task Card'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Status Pill */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-8 rounded-full px-3 text-xs font-bold bg-secondary/60 border-border hover:bg-secondary transition-colors">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5 shrink-0" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {/* Quick Priority Pill */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={`h-8 rounded-full px-3 text-xs font-bold border transition-colors ${field.value === 'Urgent'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : field.value === 'High'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : field.value === 'Medium'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/30'
                        }`}
                    >
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs font-semibold">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Prominent Task Title Input */}
          <FormField
            control={form.control}
            name="taskTitle"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormControl>
                  <Input
                    placeholder="What needs to be done? Enter task title..."
                    className="h-11 sm:h-12 text-base sm:text-lg font-bold rounded-xl bg-background border-border/80 px-3.5 focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/45 transition-all"
                    {...field}
                    autoFocus={!pageMode}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* ========================================================
            CORE PROPERTIES GRID (Clean, Minimalist, In Natural Order)
           ======================================================== */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Main Lead Assignee */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
                    <Users size={13} className="text-primary" /> Assignee
                  </FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border">
                        <SelectValue placeholder="Assign team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none" className="text-muted-foreground">
                        — Unassigned —
                      </SelectItem>
                      {assignableUsers.map((user) => (
                        <SelectItem key={user._id} value={user._id} className="text-xs">
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* 2. Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-500" /> Due Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 rounded-xl text-xs bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* 3. Client (OPTIONAL) */}
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-foreground/90 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-amber-500" /> Client
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val === '_none' ? '' : val);
                      form.setValue('project', '');
                    }}
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border truncate">
                        <SelectValue placeholder="No Client (General)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none" className="text-muted-foreground font-medium">
                        — No Client (General / Internal) —
                      </SelectItem>
                      <SelectItem
                        key="__saas_internal__"
                        value="__saas_internal__"
                        className="font-semibold text-primary"
                      >
                        🚀 SaaS & Internal Agency (No Client)
                      </SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id} className="text-xs">
                          {c.name} {c.company ? `— ${c.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* 4. Project (OPTIONAL) */}
            <FormField
              control={form.control}
              name="project"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-foreground/90 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban size={13} className="text-indigo-500" /> Project
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border truncate">
                        <SelectValue placeholder="No Project (General)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none" className="text-muted-foreground font-medium">
                        — No Project (General Task) —
                      </SelectItem>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p._id} value={p._id} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Department & Assigned Manager (Optional secondary row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 border-t border-border/40">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-muted-foreground">Department</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 rounded-xl text-xs bg-background border-border">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">General / Unspecified</SelectItem>
                      <SelectItem value="Development">💻 Development & Tech</SelectItem>
                      <SelectItem value="Marketing">📈 Marketing & SMM</SelectItem>
                      <SelectItem value="Creative">🎨 Creative & Design</SelectItem>
                      <SelectItem value="Operations">⚙️ Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {['superAdmin', 'admin'].includes(currentUser?.role) && (
              <FormField
                control={form.control}
                name="assignedManager"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Shield size={12} /> Assigned Manager
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '_unassigned' ? '' : val)}
                      value={field.value || '_unassigned'}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-background border-border">
                          <SelectValue placeholder="Manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_unassigned">Unassigned</SelectItem>
                        {managerOptions.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {!task && (
              <FormField
                control={form.control}
                name="duplicateCount"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Batch Copies (Repeat Task)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        className="h-8 rounded-xl text-xs bg-background border-border"
                        placeholder="1"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* ========================================================
            CATEGORY & DELIVERABLE FORMAT SWITCHER
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Minimalist Segmented Tabs: Content vs Non-Content */}
            <div className="inline-flex rounded-xl bg-secondary/80 p-1 border border-border/60">
              <button
                type="button"
                onClick={() => handleCategorySwitch('content')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${taskCategory === 'content'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>🎨</span> Content Deliverable
              </button>
              <button
                type="button"
                onClick={() => handleCategorySwitch('non_content')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${taskCategory === 'non_content'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>⚙️</span> Development / General
              </button>
            </div>

            {/* Quick format selector */}
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (VIDEO_TASK_TYPES.includes(val)) form.setValue('contentType', 'videos');
                      if (POSTER_TASK_TYPES.includes(val)) form.setValue('contentType', 'posts');
                    }}
                    value={field.value}
                  >
                    <SelectTrigger className="h-8 rounded-xl text-xs font-bold bg-background border-border min-w-[140px]">
                      <SelectValue placeholder="Select Format" />
                    </SelectTrigger>
                    <SelectContent>
                      {(taskCategory === 'content'
                        ? CONTENT_TASK_TYPE_OPTIONS
                        : NON_CONTENT_TASK_TYPE_OPTIONS
                      ).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {taskCategory === 'content' && isVideoReel && (
                <FormField
                  control={form.control}
                  name="videoType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-8 rounded-xl text-xs font-semibold bg-background border-border">
                        <SelectValue placeholder="Video Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>
          </div>

          {/* Deliverables quota target badge if project is chosen */}
          {matchedDeliverableTarget && (
            <div
              className={`rounded-xl border p-2.5 text-xs font-medium flex items-center justify-between gap-3 ${matchedDeliverableTarget.currentCount >= matchedDeliverableTarget.targetQuantity
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Target size={14} className="shrink-0" />
                <span>
                  <strong>{matchedDeliverableTarget.contentType}</strong> target: {matchedDeliverableTarget.currentCount} / {matchedDeliverableTarget.targetQuantity}
                </span>
              </div>
              <span className="text-[11px] font-bold">
                {matchedDeliverableTarget.currentCount >= matchedDeliverableTarget.targetQuantity
                  ? '⚠ Target Reached'
                  : `✨ ${matchedDeliverableTarget.targetQuantity - matchedDeliverableTarget.currentCount} remaining`}
              </span>
            </div>
          )}
        </div>

        {/* ========================================================
            ACCORDION 1: BRIEF & INSTRUCTIONS (Clean, Simple, Ordered)
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowBriefSection((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 bg-secondary/15 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                <FileText size={13} />
              </span>
              <div>
                <span className="text-xs font-bold text-foreground">
                  {taskCategory === 'content' ? 'Content Brief & Copy' : 'Requirements & Scope Details'}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {taskCategory === 'content'
                    ? 'Captions, reference links, hashtags & instructions'
                    : 'Specifications, page requirements & technical notes'}
                </p>
              </div>
            </div>
            {showBriefSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showBriefSection && (
            <div className="p-4 sm:p-5 space-y-4 border-t border-border/60">
              {taskCategory === 'content' ? (
                /* Content Brief Fields */
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <FormField
                      control={form.control}
                      name="referenceLink"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            🔗 Reference / Inspiration Link
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Figma / Canva / Drive / Instagram link..."
                              className="h-9 rounded-xl text-xs bg-background"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hashtags"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            🏷️ Target Hashtags
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="#marketing #branding #trending"
                              className="h-9 rounded-xl text-xs bg-background"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="caption"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          📝 Caption / Post Copy
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write the post caption or marketing text here..."
                            className="min-h-[75px] rounded-xl text-xs bg-background resize-y"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contentIdea"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          💡 Content Idea / Hook Angle
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Core concept, hook, angle, or design brief..."
                            className="min-h-[60px] rounded-xl text-xs bg-background resize-y"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ) : isWebsiteTaskType(taskType) ? (
                /* Website Development Fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <FormField
                      control={form.control}
                      name="websiteType"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">Website Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Select website type" />
                            </SelectTrigger>
                            <SelectContent>
                              {WEBSITE_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-xs">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="referenceLink"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">Reference Design</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Figma / Website reference URL..."
                              className="h-9 rounded-xl text-xs bg-background"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="websiteRequirements"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          Website Requirements & Features
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe layout, responsive design, integrations, forms..."
                            className="min-h-[80px] rounded-xl text-xs bg-background resize-y"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Pages Needed checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90 block">Pages Needed</label>
                    <div className="flex flex-wrap gap-2">
                      {PAGE_OPTIONS.map((page) => {
                        const checked = (form.watch('pagesNeeded') || []).includes(page);
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => togglePageNeeded(page)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${checked
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* General Non-Content Task */
                <div className="space-y-3.5">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          Description & Requirements
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Specify task deliverables, bug report, or instructions..."
                            className="min-h-[85px] rounded-xl text-xs bg-background resize-y"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceLink"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">Reference URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Link to document, ticket, or reference..."
                            className="h-9 rounded-xl text-xs bg-background"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            ACCORDION 2: MULTI-ROLE PIPELINE (Content Tasks)
           ======================================================== */}
        {taskCategory === 'content' && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowPipelineSection((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 bg-secondary/15 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  ⚡
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Multi-Role Pipeline (Script, RJ, Shoot, Edit, Publish)
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Assign specific team members for each step of production
                  </p>
                </div>
              </div>
              {showPipelineSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showPipelineSection && (
              <div className="p-4 sm:p-5 space-y-4 border-t border-border/60">
                {/* 5 Workflow Roles in a responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Script Writer */}
                  <FormField
                    control={form.control}
                    name="scriptWriterAssigned"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          ✍️ Script Writer
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                          value={field.value || '_none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Script Writer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id} className="text-xs">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* RJ / Voice Artist */}
                  <FormField
                    control={form.control}
                    name="voiceArtistAssigned"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          🎙️ RJ / Voice Artist
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                          value={field.value || '_none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Voice Artist" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id} className="text-xs">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Videographer */}
                  <FormField
                    control={form.control}
                    name="videographerAssigned"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          🎥 Videographer
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                          value={field.value || '_none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Videographer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id} className="text-xs">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Editor */}
                  <FormField
                    control={form.control}
                    name="editorAssigned"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          ✂️ Video / Graphic Editor
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                          value={field.value || '_none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Editor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id} className="text-xs">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Publisher / Poster */}
                  <FormField
                    control={form.control}
                    name="publisherAssigned"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          📱 Publisher / Poster
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === '_none' ? '' : val)}
                          value={field.value || '_none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Publisher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id} className="text-xs">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Posting Schedule */}
                  <FormField
                    control={form.control}
                    name="postingScheduleDate"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-foreground/90">
                          🗓️ Publishing Schedule
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-9 rounded-xl text-xs bg-background"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Social Posting Platforms */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <label className="text-xs font-semibold text-foreground/90 block">
                    Target Social Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POSTING_PLATFORM_OPTIONS.map((plat) => {
                      const isSelected = (form.watch('postingPlatforms') || []).includes(plat.value);
                      return (
                        <button
                          key={plat.value}
                          type="button"
                          onClick={() => togglePlatform(plat.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                            }`}
                        >
                          {plat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shoot & Footage Details (if Video) */}
                {isVideoReel && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                    <FormField
                      control={form.control}
                      name="shootDate"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground">
                            📅 Shoot Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" className="h-8 rounded-xl text-xs bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shootLocation"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground">
                            📍 Shoot Location
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Studio / Client premises..."
                              className="h-8 rounded-xl text-xs bg-background"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rawFootageLink"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground">
                            📁 Raw Footage Link
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Google Drive link..."
                              className="h-8 rounded-xl text-xs bg-background"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ACCORDION 3: NOTES, PERMISSIONS & ATTACHMENTS
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowNotesSection((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 bg-secondary/15 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <Paperclip size={13} />
              </span>
              <div>
                <span className="text-xs font-bold text-foreground">
                  Attachments, Notes & Portal Access
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Internal notes, client visibility, and file attachments
                </p>
              </div>
            </div>
            {showNotesSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showNotesSection && (
            <div className="p-4 sm:p-5 space-y-4 border-t border-border/60">
              {/* Internal & Client Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-foreground/90">
                        🔒 Internal Team Notes (Private)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Private admin/team instructions..."
                          className="min-h-[70px] rounded-xl text-xs bg-background resize-y"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientVisibleNotes"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-foreground/90">
                        🌐 Client Portal Notes (Public)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief visible to client on their portal..."
                          className="min-h-[70px] rounded-xl text-xs bg-background resize-y"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField
                  control={form.control}
                  name="isClientVisible"
                  render={({ field }) => (
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary/20"
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Visible in Client Portal
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Client can track this deliverable live
                        </span>
                      </div>
                    </label>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approvalRequired"
                  render={({ field }) => (
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary/20"
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Client Approval Required
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Requires client sign-off before completion
                        </span>
                      </div>
                    </label>
                  )}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <FormLabel className="text-xs font-semibold text-foreground/90">Attachments</FormLabel>
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  className="rounded-xl text-xs bg-background"
                  onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
                />

                {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
                  <div className="rounded-xl border border-border bg-background p-3 text-xs space-y-2">
                    {existingAttachments.length > 0 && (
                      <div>
                        <span className="font-bold text-foreground block mb-1">Existing files:</span>
                        <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                          {existingAttachments.map((f, i) => (
                            <li key={i}>{f.name || 'Attachment'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {attachmentFiles.length > 0 && (
                      <div>
                        <span className="font-bold text-foreground block mb-1">New files to upload:</span>
                        <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                          {attachmentFiles.map((f, i) => (
                            <li key={i}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            ACCORDION 4: BATCH QUEUE / ADDITIONAL TASKS
           ======================================================== */}
        {!task && (
          <div className="space-y-3">
            {batchTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Batch Tasks Queue ({batchTasks.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBatchTask}
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    <Plus size={12} /> Add Another
                  </Button>
                </div>

                {batchTasks.map((bItem, bIdx) => (
                  <div
                    key={bIdx}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Deliverable #{bIdx + 2}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchTask(bIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        placeholder="Task title..."
                        className="h-8 rounded-lg text-xs bg-background"
                        value={bItem.taskTitle}
                        onChange={(e) => updateBatchTaskField(bIdx, 'taskTitle', e.target.value)}
                      />
                      <Select
                        value={bItem.assignedTo || '_none'}
                        onValueChange={(val) =>
                          updateBatchTaskField(bIdx, 'assignedTo', val === '_none' ? '' : val)
                        }
                      >
                        <SelectTrigger className="h-8 rounded-lg text-xs bg-background">
                          <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Unassigned</SelectItem>
                          {assignableUsers.map((u) => (
                            <SelectItem key={u._id} value={u._id} className="text-xs">
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {batchTasks.length === 0 && (
              <button
                type="button"
                onClick={handleAddBatchTask}
                className="w-full py-2.5 rounded-xl border border-dashed border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add Another Deliverable to Batch
              </button>
            )}
          </div>
        )}

        {/* Additional tasks when in Edit Mode */}
        {task && (
          <div className="space-y-3">
            {additionalTasks.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-primary/15">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Additional Task #{idx + 2}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalTask(idx)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Additional task title..."
                      value={item.taskTitle}
                      onChange={(e) => updateAdditionalTaskField(idx, 'taskTitle', e.target.value)}
                      className="bg-background text-xs h-9 rounded-xl"
                    />
                  </div>
                  <div>
                    <Select
                      value={item.assignedTo || '_none'}
                      onValueChange={(v) =>
                        updateAdditionalTaskField(idx, 'assignedTo', v === '_none' ? '' : v)
                      }
                    >
                      <SelectTrigger className="bg-background text-xs h-9 rounded-xl">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Unassigned</SelectItem>
                        {assignableUsers.map((u) => (
                          <SelectItem key={u._id} value={u._id} className="text-xs">
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="Brief notes..."
                      value={item.description}
                      onChange={(e) => updateAdditionalTaskField(idx, 'description', e.target.value)}
                      className="bg-background text-xs h-9 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Space buffer so content doesn't hide behind sticky footer */}
        <div className="h-4" />

        {/* ========================================================
            STICKY BOTTOM ACTION BAR (Ultra Clean & Mobile Accessible)
           ======================================================== */}
        <div className="sticky bottom-0 z-20 -mx-5 -mb-5 px-5 py-3 sm:px-6 sm:py-3.5 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-between gap-3 shadow-lg select-none">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-9 px-3.5"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {hasDraft && !task && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors underline"
              >
                Clear Draft
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAdditionalTask}
                className="rounded-xl text-xs h-9 border-primary/30 text-primary hover:bg-primary/10 gap-1 hidden sm:inline-flex"
                disabled={isLoading}
              >
                <Plus size={13} /> Add Task
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs h-9 px-5 font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/95 transition-all"
              disabled={isLoading}
            >
              {isLoading
                ? 'Saving...'
                : task
                  ? additionalTasks.length > 0
                    ? `Update & Add ${additionalTasks.length}`
                    : 'Update Task'
                  : batchTasks.length > 0
                    ? `Create ${batchTasks.length + 1} Tasks`
                    : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );

  if (pageMode) return <div className="space-y-4">{formBody}</div>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="side"
        size="lg"
        noPadding
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-background border-l border-border shadow-2xl"
      >
        {/* Modal Top Header */}
        <DialogHeader className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-border bg-card shrink-0 pr-20 select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                {task ? '✍️' : '✨'}
              </span>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                {task ? 'Edit Task Deliverable' : 'Create Task'}
              </DialogTitle>
            </div>
            {hasDraft && !task && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Draft Saved
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {task
              ? 'Update task details, deliverable parameters, and assignees.'
              : 'Simple, minimalist task card. Client & project are optional.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 custom-scrollbar">
          {formBody}
        </div>
      </DialogContent>
    </Dialog>
  );
};
