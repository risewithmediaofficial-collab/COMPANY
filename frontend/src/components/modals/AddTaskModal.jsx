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
import { Trash2, Plus, Video, Image, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'sonner';

const TASK_DRAFT_KEY = 'draft:task-modal';

const EMPTY_INITIAL_VALUES = {};

// Task type categorisation
const POSTER_TASK_TYPES = ['poster', 'social_media_post', 'ad_creative', 'story', 'carousel_post'];
const VIDEO_TASK_TYPES  = ['reel', 'video_content', 'blog'];
const isPosterTask = (t) => POSTER_TASK_TYPES.includes(t);
const isVideoTask  = (t) => VIDEO_TASK_TYPES.includes(t);
const taskTypeBadgeCls = (taskType) => {
  if (isPosterTask(taskType)) return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300';
  if (isVideoTask(taskType))  return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300';
  return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
};
const getRoleHint = (taskType) => {
  if (isPosterTask(taskType)) return { label: 'Designer / Graphics Person', icon: '\ud83c\udfa8' };
  if (isVideoTask(taskType))  return { label: 'Video Editor / Creator', icon: '\ud83c\udfac' };
  return { label: 'Team Member', icon: '\ud83d\udc64' };
};

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
  domainDetails: '',
  hostingDetails: '',
  adminCredentials: '',
  requiredFeatures: '',
  scriptWriterAssigned: '',
  videographerAssigned: '',
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
  taskTitle: z.string().optional(),
  taskCategory: z.string().optional(),
  contentType: z.string().optional(),
  videoType: z.string().optional(),
  contentTitle: z.string().optional(),
  taskType: z.string().optional(),
  client: z.string().min(1, 'Client is required'),
  project: z.string().min(1, 'Select a project first'),
  assignedTo: z.string().optional(),
  assignedManager: z.string().optional(),
  scriptWriterAssigned: z.string().optional(),
  videographerAssigned: z.string().optional(),
  editorAssigned: z.string().optional(),
  publisherAssigned: z.string().optional(),
  shootDate: z.string().optional(),
  shootLocation: z.string().optional(),
  rawFootageLink: z.string().optional(),
  postingPlatforms: z.array(z.string()).default([]),
  postingScheduleDate: z.string().optional(),
  publishingDate: z.string().optional(),
  publishingTime: z.string().optional(),
  priority: z.enum(PRIORITY_OPTIONS),
  dueDate: z.string().optional(),
  status: z.enum(TASK_STATUS_OPTIONS),
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
  videographerAssigned: '',
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
  ...initialValues,
});

const deriveTaskCategory = (task) => {
  if (task?.taskCategory) return task.taskCategory;
  return isWebsiteTaskType(task?.taskType) || NON_CONTENT_TASK_TYPE_OPTIONS.some((item) => item.value === task?.taskType)
    ? 'non_content'
    : 'content';
};

export const AddTaskModal = ({ open, onOpenChange, task = null, initialValues = EMPTY_INITIAL_VALUES, pageMode = false }) => {
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
  const assignableUsers = users.filter((user) => ['superAdmin', 'manager', 'employee'].includes(user.role));
  const managerOptions = users.filter((user) => user.role === 'manager');
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [tasksList, setTasksList] = useState([{ ...BLANK_TASK_TEMPLATE }]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [additionalTasks, setAdditionalTasks] = useState([]);

  const handleAddAdditionalTask = () => {
    setAdditionalTasks((prev) => [
      ...prev,
      {
        ...BLANK_TASK_TEMPLATE,
        taskTitle: '',
        taskCategory: 'content',
        taskType: 'poster',
        assignedTo: form.getValues('assignedTo') || task?.assignedTo?.[0]?._id || '',
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

  const toggleExpand = (index) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const updateTaskField = (index, field, value) => {
    setTasksList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleCategoryChange = (index, category) => {
    setTasksList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        taskCategory: category,
        taskType: category === 'content' ? 'poster' : 'website_development',
        contentType: category === 'content' ? 'posts' : '',
        videoType: category === 'content' ? 'reels' : '',
      };
      return next;
    });
  };

  const handleTaskCountChange = (count) => {
    const n = Math.max(1, Number(count) || 1);
    setTasksList((prev) => {
      if (n === prev.length) return prev;
      if (n > prev.length) {
        const added = Array.from({ length: n - prev.length }, () => ({ ...BLANK_TASK_TEMPLATE }));
        return [...prev, ...added];
      } else {
        return prev.slice(0, n);
      }
    });
  };

  const handleAddTask = () => {
    setTasksList((prev) => [...prev, { ...BLANK_TASK_TEMPLATE }]);
  };

  const handleDeleteTask = (index) => {
    setTasksList((prev) => prev.filter((_, i) => i !== index));
    setExpandedTasks((prev) => {
      const next = { ...prev };
      delete next[index];
      // Shift indices in expandedTasks map
      const shifted = {};
      Object.keys(next).forEach((k) => {
        const keyVal = Number(k);
        if (keyVal > index) {
          shifted[keyVal - 1] = next[k];
        } else {
          shifted[keyVal] = next[k];
        }
      });
      return shifted;
    });
  };

  const taskCategory = form.watch('taskCategory');
  const contentType = form.watch('contentType');
  const videoType = form.watch('videoType');
  const taskType = form.watch('taskType');
  const selectedClientId = form.watch('client');
  const selectedProject = form.watch('project');
  const isVideoReelFlow = taskCategory === 'content' && contentType === 'videos';

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects;
    return projects.filter((project) => (project.client?._id || project.client) === selectedClientId);
  }, [projects, selectedClientId]);

  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (task) {
      const taskCategory = getTaskCategoryFromType(task.taskType);
      form.reset({
        taskTitle: task.taskTitle || task.title || '',
        taskCategory,
        contentType: task.contentType || (taskCategory === 'content' ? 'posts' : ''),
        videoType: task.videoType || (taskCategory === 'content' ? 'reels' : ''),
        contentTitle: task.contentTitle || '',
        taskType: task.taskType || (taskCategory === 'content' ? 'poster' : 'website_development'),
        client: task.client?._id || task.client || '',
        project: task.project?._id || task.project || '',
        assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0]?._id || task.assignedTo[0] || '' : task.assignedTo || '',
        assignedManager: task.assignedManager?._id || task.assignedManager || '',
        scriptWriterAssigned: task.scriptWriterAssigned?._id || task.scriptWriterAssigned || '',
        videographerAssigned: task.videographerAssigned?._id || task.videographerAssigned || '',
        editorAssigned: task.editorAssigned?._id || task.editorAssigned || '',
        publisherAssigned: task.publisherAssigned?._id || task.publisherAssigned || '',
        shootDate: task.shootDate ? new Date(task.shootDate).toISOString().split('T')[0] : '',
        shootLocation: task.shootLocation || '',
        rawFootageLink: task.rawFootageLink || '',
        postingPlatforms: task.postingPlatforms || [],
        postingScheduleDate: task.postingScheduleDate ? new Date(task.postingScheduleDate).toISOString().split('T')[0] : '',
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
      });
      setExistingAttachments(task.attachments || []);
      setAttachmentFiles([]);
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
    }
  }, [task, open, form, initialValues]);

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

  useEffect(() => {
    if (taskCategory === 'content' && !CONTENT_TASK_TYPE_OPTIONS.some((item) => item.value === taskType)) {
      form.setValue('taskType', 'reel');
    }
    if (taskCategory === 'non_content' && !NON_CONTENT_TASK_TYPE_OPTIONS.some((item) => item.value === taskType)) {
      form.setValue('taskType', 'website_development');
    }
  }, [taskCategory, taskType, form]);

  const togglePageNeeded = (page) => {
    const current = form.getValues('pagesNeeded') || [];
    const next = current.includes(page)
      ? current.filter((item) => item !== page)
      : [...current, page];
    form.setValue('pagesNeeded', next, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    const uploadedAttachments = await uploadFiles(attachmentFiles);

    if (task) {
      // Edit Mode manual validation
      if (!data.taskTitle?.trim()) {
        toast.error('Task title is required');
        return;
      }

      const payload = {
        ...data,
        title: data.taskTitle,
        taskTitle: data.taskTitle,
        project: data.project || undefined,
        attachments: [...existingAttachments, ...uploadedAttachments],
        dueDate: data.dueDate || undefined,
        deadline: data.dueDate || undefined,
        assignedTo: data.assignedTo,
        assignedManager: data.assignedManager || undefined,
        pagesNeeded: data.pagesNeeded || [],
      };
      await updateTask.mutateAsync({ id: task._id, data: payload });

      // Create additional tasks if added during edit
      if (additionalTasks.length > 0) {
        for (let i = 0; i < additionalTasks.length; i++) {
          const addT = additionalTasks[i];
          if (!addT.taskTitle?.trim()) {
            toast.error(`Additional Task #${i + 2}: Title is required`);
            return;
          }
          if (!addT.assignedTo) {
            toast.error(`Additional Task #${i + 2}: Please select an assignee`);
            return;
          }
        }

        const additionalPayload = additionalTasks.map((t) => ({
          ...t,
          title: t.taskTitle,
          taskTitle: t.taskTitle,
          client: data.client || task.client?._id || task.client,
          project: data.project || task.project?._id || task.project,
          assignedTo: t.assignedTo || data.assignedTo,
          assignedManager: data.assignedManager || undefined,
          priority: data.priority,
          status: 'To Do',
          dueDate: data.dueDate || undefined,
          deadline: data.dueDate || undefined,
          description: t.description || '',
        }));

        await createTask.mutateAsync({ tasks: additionalPayload });
        toast.success(`Task updated and ${additionalTasks.length} additional task(s) assigned!`);
      }
    } else {
      // Create Mode – validate per-task
      for (let i = 0; i < tasksList.length; i++) {
        const t = tasksList[i];
        if (!t.taskTitle?.trim()) {
          toast.error(`Task #${i + 1}: Title is required`);
          return;
        }
        if (!t.assignedTo) {
          toast.error(`Task #${i + 1}: Please assign a team member`);
          return;
        }
      }

      // Map the tasks array to be sent to backend
      const tasksPayload = tasksList.map((t) => ({
        ...t,
        title: t.taskTitle,
        project: data.project || undefined,
        client: data.client || undefined,
        attachments: [...existingAttachments, ...uploadedAttachments],
        dueDate: data.dueDate || undefined,
        deadline: data.dueDate || undefined,
        assignedTo: t.assignedTo,
        assignedManager: data.assignedManager || undefined,
        priority: data.priority,
        status: data.status,
        internalNotes: data.internalNotes,
        clientVisibleNotes: data.clientVisibleNotes,
        isClientVisible: data.isClientVisible,
        approvalRequired: data.approvalRequired,
        scriptWriterAssigned: t.scriptWriterAssigned || undefined,
        videographerAssigned: t.videographerAssigned || undefined,
        editorAssigned: t.editorAssigned || undefined,
        publisherAssigned: t.publisherAssigned || undefined,
      }));

      await createTask.mutateAsync({
        tasks: tasksPayload,
      });
    }

    if (!createTask.isError && !updateTask.isError) {
      form.reset(buildDefaultValues(initialValues));
      setAttachmentFiles([]);
      setExistingAttachments([]);
      setTasksList([{ ...BLANK_TASK_TEMPLATE }]);
      setAdditionalTasks([]);
      setExpandedTasks({});
      onOpenChange(false);
    }
  };

  const renderCommonAssignmentFields = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="taskTitle"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Task Title *</FormLabel>
            <FormControl>
              <Input placeholder="Enter task title" {...field} />
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
                    {client.name} {client.company ? `- ${client.company}` : ''}
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
        name="project"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select project first" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filteredProjects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {currentUser?.role === 'superAdmin' && (
        <FormField
          control={form.control}
          name="assignedManager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Manager</FormLabel>
              <Select onValueChange={(val) => field.onChange(val === '_unassigned' ? '' : val)} value={field.value || '_unassigned'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {managerOptions.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="assignedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Main Lead Assignee *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Assign team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assignableUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notion-Style Multi-Role Workflow Sub-Assignments & Production Details */}
      <div className="md:col-span-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4 my-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            ⚡ Notion-Style Production Pipeline & Multi-Person Assignments
          </h3>
          <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
            1-Time Multi-Role Assign
          </span>
        </div>

        {/* 4 Workflow Roles */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Script By (Writer) */}
          <FormField
            control={form.control}
            name="scriptWriterAssigned"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  ✍️ Script By (Writer)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Script Writer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>{user.name} ({user.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Shoot By (Videographer) */}
          <FormField
            control={form.control}
            name="videographerAssigned"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  🎥 Shoot By (Videographer)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Videographer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>{user.name} ({user.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Editing By (Editor) */}
          <FormField
            control={form.control}
            name="editorAssigned"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  ✂️ Editing By (Editor)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Editor" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>{user.name} ({user.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Posting By (Publisher) */}
          <FormField
            control={form.control}
            name="publisherAssigned"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  📱 Posting By (Publisher)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Publisher" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>{user.name} ({user.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Production Details (Shoot Date, Location, Raw Footage Link) */}
        <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-border/40">
          <FormField
            control={form.control}
            name="shootDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground">📅 Shoot Scheduled Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" className="bg-background" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shootLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground">📍 Shoot Location / Studio</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Studio 2, Client Office" className="bg-background" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rawFootageLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground">📁 Raw Footage Drive Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://drive.google.com/..." className="bg-background" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Target Posting Platforms & Schedule Date */}
        <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">Target Social Media Posting Platforms</label>
            <div className="flex flex-wrap gap-2">
              {POSTING_PLATFORM_OPTIONS.map((plat) => {
                const currentPlatforms = form.watch('postingPlatforms') || [];
                const isSelected = currentPlatforms.includes(plat.value);

                return (
                  <button
                    key={plat.value}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? currentPlatforms.filter((p) => p !== plat.value)
                        : [...currentPlatforms, plat.value];
                      form.setValue('postingPlatforms', updated);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {plat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="postingScheduleDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground">🗓️ Posting Schedule Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" className="bg-background" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="publishingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">📅 Publishing Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publishingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">⏰ Publishing Time</FormLabel>
                    <FormControl>
                      <Input type="time" className="bg-background" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Priority *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="dueDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
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
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TASK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {!task && (
        <FormField
          control={form.control}
          name="duplicateCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duplicate Count (Create multiple copies)</FormLabel>
              <FormControl>
                <Input type="number" min={1} placeholder="e.g. 30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  const SectionHeader = ({ title, subtitle }) => (
    <div className="border-b border-border/70 pb-2">
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
    </div>
  );

  const renderContentFields = () => (
    <div className="space-y-6 rounded-2xl border border-border bg-secondary/20 p-5">
      <SectionHeader title="Content Task Setup" subtitle="Select content type, then video format if applicable." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="contentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'videos'}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select content type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTENT_MEDIA_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value === 'custom' && (
                <Input
                  placeholder="Describe custom content type..."
                  className="mt-1"
                  {...form.register('customContentType')}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {isVideoReelFlow && (
          <FormField
            control={form.control}
            name="videoType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'reels'}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select video type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VIDEO_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value === 'custom' && (
                  <Input
                    placeholder="Describe custom video type..."
                    className="mt-1"
                    {...form.register('customVideoType')}
                  />
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="taskType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Format</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTENT_TASK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value === 'custom_content' && (
                <Input
                  placeholder="Describe custom task format..."
                  className="mt-1"
                  {...form.register('customTaskType')}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {isVideoReelFlow && (
        <>
          <SectionHeader title="Reel / Video Brief" subtitle="Structured fields for editors and creators." />

          <FormField
            control={form.control}
            name="contentTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reel / Video Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Product launch hook reel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contentIdea"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Content Idea</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" placeholder="Core idea, hook, angle..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scriptText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Script</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-28" placeholder="Full script or talking points..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scriptLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Script Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Google Doc / Notion link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="editorGuide"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Editor Guide</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Style, fonts, transitions, pacing..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="editingInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Editing Instructions</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Cuts, overlays, text placement..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shootInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shoot Instructions</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Location, framing, props, talent notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Input placeholder="SEO / topic keywords" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Links</FormLabel>
                  <FormControl>
                    <Input placeholder="Inspiration / sample video link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audioReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio / Music Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Track name or audio link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Caption <span className="text-xs font-normal text-muted-foreground">(Optional)</span></FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" placeholder="Post caption for this reel..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hashtags"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Hashtags</FormLabel>
                  <FormControl>
                    <Input placeholder="#brand #reels #marketing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {!isVideoReelFlow && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="referenceLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Link</FormLabel>
                <FormControl>
                  <Input placeholder="Inspiration / brand / sample link" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scriptText"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Script / Copy</FormLabel>
                <FormControl>
                  <Textarea className="min-h-28" placeholder="Enter script or copy..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="caption"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Caption <span className="text-xs font-normal text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl>
                  <Textarea className="min-h-24" placeholder="Enter caption..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea className="min-h-20" placeholder="Additional notes..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderWebsiteFields = () => (
    <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="taskType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NON_CONTENT_TASK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="websiteType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select website type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {WEBSITE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
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
        name="websiteRequirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website Requirements *</FormLabel>
            <FormControl>
              <Textarea className="min-h-28" placeholder="Describe full website requirements..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <FormLabel>Pages Needed</FormLabel>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {PAGE_OPTIONS.map((page) => {
            const checked = (form.watch('pagesNeeded') || []).includes(page);
            return (
              <label key={page} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePageNeeded(page)}
                />
                <span>{page}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="referenceLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Design Reference Link</FormLabel>
              <FormControl>
                <Input placeholder="Reference design / inspiration link" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contentAvailability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Availability</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTENT_AVAILABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brandingAvailability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo / Branding Availability</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branding status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BRANDING_AVAILABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domainDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain Details</FormLabel>
              <FormControl>
                <Input placeholder="Domain details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hostingDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hosting Details</FormLabel>
              <FormControl>
                <Input placeholder="Hosting details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminCredentials"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Credentials</FormLabel>
              <FormControl>
                <Textarea className="min-h-24" placeholder="Admin credentials or access notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requiredFeatures"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Features</FormLabel>
              <FormControl>
                <Textarea className="min-h-24" placeholder="Contact form, payment gateway, booking form..." {...field} />
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
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea className="min-h-24" placeholder="Additional notes for the website task..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderNonContentCommonFields = () => (
    <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
      <FormField
        control={form.control}
        name="taskType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Task Type *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {NON_CONTENT_TASK_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.value === 'custom_task' && (
              <Input
                placeholder="Describe the custom task type..."
                className="mt-1"
                {...form.register('customTaskType')}
              />
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Requirements / Description *</FormLabel>
            <FormControl>
              <Textarea className="min-h-28" placeholder="Describe the work required..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="referenceLink"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reference Link</FormLabel>
            <FormControl>
              <Input placeholder="Reference link" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderSharedAssignmentFields = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
        name="client"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name} {client.company ? `- ${client.company}` : ''}
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
        name="project"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select project first" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filteredProjects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
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
        name="assignedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assigned Person *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Assign team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assignableUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
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
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Priority *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="dueDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl>
              <Input type="date" className="rounded-xl" {...field} />
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
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TASK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {task ? (
          // EDIT MODE (Original fields)
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="taskCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Task Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select task category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Selected Type</p>
                <p className="mt-1">{formatTaskTypeLabel(taskType)}</p>
              </div>
            </div>

            {renderCommonAssignmentFields()}

            {taskCategory === 'content' && renderContentFields()}
            {taskCategory === 'non_content' && (isWebsiteTaskType(taskType) ? renderWebsiteFields() : renderNonContentCommonFields())}
          </>
        ) : (
          // CREATE MODE – Smart multi-task assignment
          <>
            {/* Step 1: Client + Project */}
            <div className="rounded-2xl border border-border/80 bg-secondary/25 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 text-primary text-xs font-bold border border-primary/20">
                    1
                  </span>
                  <span className="text-xs font-bold text-foreground">Project Scope & Properties</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">— Select client and project to add deliverables</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-background px-2.5 py-0.5 rounded-full border border-border/80">
                  Required Step
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormField control={form.control} name="client" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Client <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); form.setValue('project', ''); }} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl h-9 text-xs bg-background border-border"><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                      <SelectContent>{clients.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Project <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!selectedClientId}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-9 text-xs bg-background border-border disabled:opacity-50">
                          <SelectValue placeholder={selectedClientId ? 'Select project' : 'Select client first'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredProjects.length === 0
                          ? <SelectItem value="_empty" disabled>No projects for this client</SelectItem>
                          : filteredProjects.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {currentUser?.role === 'superAdmin' && (
                  <FormField control={form.control} name="assignedManager" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground/90">Assigned Manager</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === '_unassigned' ? '' : val)} value={field.value || '_unassigned'}>
                        <FormControl><SelectTrigger className="rounded-xl h-9 text-xs bg-background border-border"><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="_unassigned">Unassigned</SelectItem>
                          {managerOptions.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Priority <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl h-9 text-xs bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Status <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl h-9 text-xs bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{TASK_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground/90">Due Date</FormLabel>
                    <FormControl><Input type="date" className="rounded-xl h-9 text-xs bg-background border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Step 2: Task Cards – shown only after client + project selected */}
            {selectedClientId && selectedProject ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 text-primary text-xs font-bold border border-primary/20">
                      2
                    </span>
                    <span className="text-xs font-bold text-foreground">Deliverables & Multi-Role Pipeline</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">— customize each deliverable's format & assignee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">Deliverable Count:</label>
                    <Input type="number" min={1} className="w-14 rounded-xl h-7 text-xs text-center font-bold"
                      value={tasksList.length}
                      onChange={(e) => handleTaskCountChange(e.target.value)} />
                  </div>
                </div>

                {/* Role legend badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[11px] font-semibold">
                    <Image size={12} /> Poster / Graphic → Designer
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-semibold">
                    <Video size={12} /> Video / Reel → Video Person
                  </span>
                </div>

                {/* Task Cards */}
                <div className="space-y-5">
                  {tasksList.map((taskItem, index) => {
                    const isExpanded = !!expandedTasks[index];
                    const isPoster   = isPosterTask(taskItem.taskType);
                    const isVideo    = isVideoTask(taskItem.taskType);
                    const roleHint   = getRoleHint(taskItem.taskType);
                    const cardBorder = isPoster ? 'rgba(167,139,250,0.4)' : isVideo ? 'rgba(56,189,248,0.4)' : undefined;
                    const cardBg     = isPoster
                      ? 'linear-gradient(135deg,hsl(var(--background)) 0%,rgba(167,139,250,0.04) 100%)'
                      : isVideo
                      ? 'linear-gradient(135deg,hsl(var(--background)) 0%,rgba(56,189,248,0.04) 100%)'
                      : undefined;

                    return (
                      <div key={index} className="rounded-2xl border shadow-sm overflow-hidden transition-all duration-200"
                        style={{ borderColor: cardBorder, background: cardBg }}>

                        {/* Card Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${taskTypeBadgeCls(taskItem.taskType)}`}>
                              {isPoster ? <Image size={12} /> : isVideo ? <Video size={12} /> : null}
                              Task #{index + 1}
                            </span>
                            {taskItem.taskTitle && (
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]">— {taskItem.taskTitle}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => toggleExpand(index)}
                              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-secondary/60 transition-colors">
                              {isExpanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More Fields</>}
                            </button>
                            {tasksList.length > 1 && (
                              <button type="button" onClick={() => handleDeleteTask(index)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 w-7 flex items-center justify-center rounded-lg transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-5">
                          {/* Row 1: Title + Category */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-xs font-bold text-foreground">Task Title <span className="text-rose-500">*</span></label>
                              <Input
                                placeholder={isPoster ? 'e.g. June Week 1 – Offer Poster' : isVideo ? 'e.g. Product Launch Reel' : 'Enter task title'}
                                className="rounded-xl font-medium"
                                value={taskItem.taskTitle}
                                onChange={(e) => updateTaskField(index, 'taskTitle', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground">Category <span className="text-rose-500">*</span></label>
                              <Select value={taskItem.taskCategory} onValueChange={(v) => handleCategoryChange(index, v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{TASK_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Row 2: Format + Content Type + Video Type */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground">Task Format <span className="text-rose-500">*</span></label>
                              <Select value={taskItem.taskType} onValueChange={(v) => {
                                updateTaskField(index, 'taskType', v);
                                if (VIDEO_TASK_TYPES.includes(v)) updateTaskField(index, 'contentType', 'videos');
                                if (POSTER_TASK_TYPES.includes(v)) updateTaskField(index, 'contentType', 'posts');
                              }}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(taskItem.taskCategory === 'content' ? CONTENT_TASK_TYPE_OPTIONS : NON_CONTENT_TASK_TYPE_OPTIONS)
                                    .map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {taskItem.taskCategory === 'content' && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Content Type</label>
                                <Select value={taskItem.contentType} onValueChange={(v) => updateTaskField(index, 'contentType', v)}>
                                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                  <SelectContent>{CONTENT_MEDIA_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            )}
                            {taskItem.taskCategory === 'content' && taskItem.contentType === 'videos' && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Video Type</label>
                                <Select value={taskItem.videoType} onValueChange={(v) => updateTaskField(index, 'videoType', v)}>
                                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                  <SelectContent>{VIDEO_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Smart Assignment Section */}
                          <div className="rounded-2xl border p-4 space-y-3"
                            style={{
                              borderColor: isPoster ? 'rgba(167,139,250,0.4)' : isVideo ? 'rgba(56,189,248,0.4)' : 'hsl(var(--border))',
                              background: isPoster ? 'rgba(167,139,250,0.06)' : isVideo ? 'rgba(56,189,248,0.06)' : 'hsl(var(--secondary)/0.2)',
                            }}>
                            <div className="flex items-center gap-2">
                              <Users size={13} className={isPoster ? 'text-violet-500' : isVideo ? 'text-sky-500' : 'text-amber-500'} />
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                {roleHint.icon} Assign — {roleHint.label}
                              </span>
                              <span className="ml-auto text-[10px] text-rose-500 font-semibold">Required *</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                  {isPoster ? '🎨 Designer (Assigned To)' : isVideo ? '🎬 Video Person (Assigned To)' : '👤 Assigned To'}
                                  <span className="text-rose-500 ml-1">*</span>
                                </label>
                                <Select value={taskItem.assignedTo || '_none'} onValueChange={(v) => updateTaskField(index, 'assignedTo', v === '_none' ? '' : v)}>
                                  <SelectTrigger className="rounded-xl bg-background">
                                    <SelectValue placeholder={isPoster ? 'Select Designer' : isVideo ? 'Select Video Editor' : 'Select Team Member'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">— Select Person —</SelectItem>
                                    {assignableUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              {isVideo && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-foreground">✍️ Script Writer</label>
                                  <Select value={taskItem.scriptWriterAssigned || '_none'} onValueChange={(v) => updateTaskField(index, 'scriptWriterAssigned', v === '_none' ? '' : v)}>
                                    <SelectTrigger className="rounded-xl bg-background"><SelectValue placeholder="Script Writer" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_none">Unassigned</SelectItem>
                                      {assignableUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {isVideo && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-foreground">🎥 Videographer</label>
                                  <Select value={taskItem.videographerAssigned || '_none'} onValueChange={(v) => updateTaskField(index, 'videographerAssigned', v === '_none' ? '' : v)}>
                                    <SelectTrigger className="rounded-xl bg-background"><SelectValue placeholder="Videographer" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_none">Unassigned</SelectItem>
                                      {assignableUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {isPoster && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-foreground">✂️ Revision / Editor</label>
                                  <Select value={taskItem.editorAssigned || '_none'} onValueChange={(v) => updateTaskField(index, 'editorAssigned', v === '_none' ? '' : v)}>
                                    <SelectTrigger className="rounded-xl bg-background"><SelectValue placeholder="Select Editor" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_none">Unassigned</SelectItem>
                                      {assignableUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">📱 Publisher / Poster</label>
                                <Select value={taskItem.publisherAssigned || '_none'} onValueChange={(v) => updateTaskField(index, 'publisherAssigned', v === '_none' ? '' : v)}>
                                  <SelectTrigger className="rounded-xl bg-background"><SelectValue placeholder="Select Publisher" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">Unassigned</SelectItem>
                                    {assignableUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Required Content Fields */}
                          {taskItem.taskCategory === 'content' && (
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">
                                  Caption / Copy Text
                                  <span className="text-[10px] font-normal text-muted-foreground ml-1">(optional)</span>
                                </label>
                                <Textarea
                                  className="min-h-[75px] rounded-xl resize-none"
                                  placeholder={isPoster ? 'Caption for this poster...' : isVideo ? 'Caption for this reel/video...' : 'Post caption...'}
                                  value={taskItem.caption || ''}
                                  onChange={(e) => updateTaskField(index, 'caption', e.target.value)}
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-foreground">
                                    {isPoster ? '🖼️ Design Reference Link' : '🔗 Reference Link'}
                                  </label>
                                  <Input
                                    placeholder={isPoster ? 'Figma / Canva / Drive link' : 'Inspiration / sample link'}
                                    className="rounded-xl"
                                    value={taskItem.referenceLink || ''}
                                    onChange={(e) => updateTaskField(index, 'referenceLink', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-foreground">Hashtags</label>
                                  <Input placeholder="#brand #marketing #reels" className="rounded-xl"
                                    value={taskItem.hashtags || ''}
                                    onChange={(e) => updateTaskField(index, 'hashtags', e.target.value)} />
                                </div>
                              </div>

                              {/* Video production fields */}
                              {(isVideo || taskItem.contentType === 'videos') && (
                                <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 dark:bg-sky-950/20 dark:border-sky-800/40 p-4 space-y-3">
                                  <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Video size={12} /> Video Production Details
                                  </p>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-foreground">📅 Shoot Date & Time</label>
                                      <Input type="datetime-local" className="rounded-xl bg-background text-xs"
                                        value={taskItem.shootDate || ''}
                                        onChange={(e) => updateTaskField(index, 'shootDate', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-foreground">📍 Shoot Location</label>
                                      <Input placeholder="Studio / Client location" className="rounded-xl bg-background"
                                        value={taskItem.shootLocation || ''}
                                        onChange={(e) => updateTaskField(index, 'shootLocation', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-xs font-semibold text-foreground">Content Idea / Hook</label>
                                      <Textarea className="min-h-[55px] rounded-xl bg-background resize-none"
                                        placeholder="Core idea, hook, angle for the video..."
                                        value={taskItem.contentIdea || ''}
                                        onChange={(e) => updateTaskField(index, 'contentIdea', e.target.value)} />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Poster design fields */}
                              {isPoster && (
                                <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 dark:bg-violet-950/20 dark:border-violet-800/40 p-4 space-y-3">
                                  <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Image size={12} /> Design / Poster Brief
                                  </p>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-xs font-semibold text-foreground">Design Concept / Brief</label>
                                      <Textarea className="min-h-[55px] rounded-xl bg-background resize-none"
                                        placeholder="Design concept, color scheme, messaging..."
                                        value={taskItem.contentIdea || ''}
                                        onChange={(e) => updateTaskField(index, 'contentIdea', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-foreground">Brand Theme / Reference</label>
                                      <Input placeholder="Brand colors, theme reference..."
                                        className="rounded-xl bg-background"
                                        value={taskItem.audioReference || ''}
                                        onChange={(e) => updateTaskField(index, 'audioReference', e.target.value)} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Non-content main field */}
                          {taskItem.taskCategory === 'non_content' && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground">Requirements / Description <span className="text-rose-500">*</span></label>
                              <Textarea className="min-h-[80px] rounded-xl resize-none"
                                placeholder="Describe the work required..."
                                value={taskItem.description || ''}
                                onChange={(e) => updateTaskField(index, 'description', e.target.value)} />
                            </div>
                          )}

                          {/* Expandable advanced fields */}
                          {isExpanded && (
                            <div className="border-t border-border/60 pt-4 space-y-4">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Advanced / Optional Fields</p>
                              {taskItem.taskCategory === 'content' ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">Content Title</label>
                                      <Input placeholder="e.g. Product launch hook reel" className="rounded-xl"
                                        value={taskItem.contentTitle || ''}
                                        onChange={(e) => updateTaskField(index, 'contentTitle', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">Keywords</label>
                                      <Input placeholder="SEO / topic keywords" className="rounded-xl"
                                        value={taskItem.keywords || ''}
                                        onChange={(e) => updateTaskField(index, 'keywords', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">Script / Copy</label>
                                      <Textarea className="min-h-[65px] rounded-xl resize-none"
                                        placeholder="Full script or talking points..."
                                        value={taskItem.scriptText || ''}
                                        onChange={(e) => updateTaskField(index, 'scriptText', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">Script Link</label>
                                      <Input placeholder="Google Doc / Notion link" className="rounded-xl"
                                        value={taskItem.scriptLink || ''}
                                        onChange={(e) => updateTaskField(index, 'scriptLink', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">Editor Guide</label>
                                      <Input placeholder="Style, fonts, transitions..." className="rounded-xl"
                                        value={taskItem.editorGuide || ''}
                                        onChange={(e) => updateTaskField(index, 'editorGuide', e.target.value)} />
                                    </div>
                                    {isVideo && (
                                      <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">🎵 Audio / Music Reference</label>
                                        <Input placeholder="Track name or audio link" className="rounded-xl"
                                          value={taskItem.audioReference || ''}
                                          onChange={(e) => updateTaskField(index, 'audioReference', e.target.value)} />
                                      </div>
                                    )}
                                    <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-xs font-bold text-foreground">Shoot Instructions</label>
                                      <Textarea className="min-h-[55px] rounded-xl resize-none"
                                        placeholder="Framing, location, lighting..."
                                        value={taskItem.shootInstructions || ''}
                                        onChange={(e) => updateTaskField(index, 'shootInstructions', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-xs font-bold text-foreground">Editing Instructions</label>
                                      <Textarea className="min-h-[55px] rounded-xl resize-none"
                                        placeholder="Pacing, transitions, graphics..."
                                        value={taskItem.editingInstructions || ''}
                                        onChange={(e) => updateTaskField(index, 'editingInstructions', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-foreground">📁 Raw Footage Link</label>
                                      <Input placeholder="https://drive.google.com/..." className="rounded-xl"
                                        value={taskItem.rawFootageLink || ''}
                                        onChange={(e) => updateTaskField(index, 'rawFootageLink', e.target.value)} />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-foreground">Target Posting Platforms</label>
                                    <div className="flex flex-wrap gap-2">
                                      {POSTING_PLATFORM_OPTIONS.map((plat) => {
                                        const isSel = (taskItem.postingPlatforms || []).includes(plat.value);
                                        return (
                                          <button key={plat.value} type="button"
                                            onClick={() => updateTaskField(index, 'postingPlatforms', isSel
                                              ? (taskItem.postingPlatforms || []).filter((p) => p !== plat.value)
                                              : [...(taskItem.postingPlatforms || []), plat.value])}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${isSel ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                                            {plat.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                isWebsiteTaskType(taskItem.taskType) && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Website Type</label>
                                        <Select value={taskItem.websiteType} onValueChange={(v) => updateTaskField(index, 'websiteType', v)}>
                                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                                          <SelectContent>{WEBSITE_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Content Availability</label>
                                        <Select value={taskItem.contentAvailability} onValueChange={(v) => updateTaskField(index, 'contentAvailability', v)}>
                                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Content status" /></SelectTrigger>
                                          <SelectContent>{CONTENT_AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Domain Details</label>
                                        <Input placeholder="Domain details" className="rounded-xl"
                                          value={taskItem.domainDetails || ''}
                                          onChange={(e) => updateTaskField(index, 'domainDetails', e.target.value)} />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Hosting Details</label>
                                        <Input placeholder="Hosting details" className="rounded-xl"
                                          value={taskItem.hostingDetails || ''}
                                          onChange={(e) => updateTaskField(index, 'hostingDetails', e.target.value)} />
                                      </div>
                                      <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-foreground">Website Requirements</label>
                                        <Textarea className="min-h-[70px] rounded-xl resize-none"
                                          placeholder="Full website requirements..."
                                          value={taskItem.websiteRequirements || ''}
                                          onChange={(e) => updateTaskField(index, 'websiteRequirements', e.target.value)} />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-xs font-bold text-foreground">Pages Needed</label>
                                      <div className="flex flex-wrap gap-2">
                                        {PAGE_OPTIONS.map((page) => {
                                          const isChecked = (taskItem.pagesNeeded || []).includes(page);
                                          return (
                                            <label key={page} className={`flex items-center gap-1.5 cursor-pointer border rounded-xl px-3 py-1.5 text-xs transition ${isChecked ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-secondary/40 border-border'}`}>
                                              <input type="checkbox" className="hidden" checked={isChecked}
                                                onChange={() => {
                                                  const current = taskItem.pagesNeeded || [];
                                                  updateTaskField(index, 'pagesNeeded', current.includes(page)
                                                    ? current.filter((p) => p !== page)
                                                    : [...current, page]);
                                                }} />
                                              <span className="font-medium">{page}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button type="button" variant="outline" onClick={handleAddTask}
                  className="rounded-xl flex items-center gap-2 w-full border-dashed">
                  <Plus size={16} /> Add Another Task
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/15 p-8 text-center">
                <div className="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                    ✨
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Select Client & Project to configure deliverables</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Once selected, deliverable cards will appear with automatic multi-role assignment for Script Writers, Videographers, Editors, and Graphic Designers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Notes & Client Portal Visibility ── */}
        <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/25 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 text-primary text-xs font-bold border border-primary/20">
              3
            </span>
            <span className="text-xs font-bold text-foreground">Notes & Client Portal Synchronization</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">— Manage access permissions and instructions</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/90">Internal Admin & Team Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20 rounded-xl text-xs bg-background border-border" placeholder="Private internal notes (hidden from client)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientVisibleNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/90">Client Visible Portal Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20 rounded-xl text-xs bg-background border-border" placeholder="Public briefing visible in the client portal..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="isClientVisible"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border/80 bg-background px-4 py-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-primary focus:ring-primary/20"
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <div>
                      <FormLabel className="cursor-pointer text-xs font-semibold text-foreground">Visible in Client Dashboard</FormLabel>
                      <p className="text-[11px] text-muted-foreground">Client can view real-time progress and milestones in their portal.</p>
                    </div>
                  </label>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="approvalRequired"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border/80 bg-background px-4 py-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-primary focus:ring-primary/20"
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <div>
                      <FormLabel className="cursor-pointer text-xs font-semibold text-foreground">Client Approval Required</FormLabel>
                      <p className="text-[11px] text-muted-foreground">Require client sign-off before marking deliverables complete.</p>
                    </div>
                  </label>
                </FormItem>
              )}
            />
          </div>

          {/* Attachments */}
          <div>
            <FormLabel>Attachments</FormLabel>
            <Input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              className="rounded-xl mt-1"
              onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
            />
            {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
                {existingAttachments.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground">Existing files</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {existingAttachments.map((f, i) => (
                        <li key={`${f.url || f.name}-${i}`}>{f.name || 'Attachment'}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {attachmentFiles.length > 0 && (
                  <div className={existingAttachments.length > 0 ? 'mt-3' : ''}>
                    <p className="font-semibold text-foreground">New files to upload</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {attachmentFiles.map((f) => (
                        <li key={`${f.name}-${f.size}`}>{f.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Tasks Section (when editing or assigning extra tasks) */}
          {task && (
            <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" /> Assign Additional Tasks
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Need to assign another task for this project or team member? Add extra tasks below.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAdditionalTask}
                  className="gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs"
                >
                  <Plus size={14} /> Add Another Task
                </Button>
              </div>

              {additionalTasks.map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Additional Task #{idx + 2}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdditionalTask(idx)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground block mb-1">Task Title *</label>
                      <Input
                        placeholder="Enter additional task title..."
                        value={item.taskTitle}
                        onChange={(e) => updateAdditionalTaskField(idx, 'taskTitle', e.target.value)}
                        className="bg-background text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Task Category</label>
                      <select
                        value={item.taskCategory}
                        onChange={(e) => updateAdditionalTaskField(idx, 'taskCategory', e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="content">Content Task</option>
                        <option value="non_content">Non-Content Task</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Assign To *</label>
                      <select
                        value={item.assignedTo}
                        onChange={(e) => updateAdditionalTaskField(idx, 'assignedTo', e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Select team member</option>
                        {assignableUsers.map((u) => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground block mb-1">Task Description / Instructions</label>
                      <Textarea
                        placeholder="Specific instructions for this additional task..."
                        value={item.description}
                        onChange={(e) => updateAdditionalTaskField(idx, 'description', e.target.value)}
                        className="bg-background text-sm min-h-16"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          {task && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAdditionalTask}
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 text-xs"
              disabled={isLoading}
            >
              <Plus size={14} /> Assign Another Task
            </Button>
          )}
          <Button type="submit" className="rounded-xl" disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : task
              ? additionalTasks.length > 0
                ? `Update Task & Assign ${additionalTasks.length} New`
                : 'Update Task'
              : `Create ${tasksList.length > 1 ? `${tasksList.length} Tasks` : 'Task'}`}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (pageMode) return <div className="space-y-6">{formBody}</div>;

  const handleModalClose = (isOpen) => {
    if (!isOpen && !task) {
      const currentValues = form.getValues();
      const hasAnyValue = Object.values(currentValues).some((v) =>
        Array.isArray(v) ? v.length > 0 : (typeof v === 'string' ? v.trim() !== '' : Boolean(v))
      );
      if (hasAnyValue) {
        localStorage.setItem(TASK_DRAFT_KEY, JSON.stringify(currentValues));
        setHasDraft(true);
        toast.success('Draft Saved', { description: 'Your task data has been saved as a draft. It will be here when you return.' });
      }
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent size="xl" noPadding className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl">
        <DialogHeader className="px-6 py-4.5 border-b border-border bg-card shrink-0 pr-24 select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-bold">
                {task ? '✍️' : '✨'}
              </span>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {task ? 'Edit Task & Deliverable' : 'Create Tasks & Deliverables'}
              </DialogTitle>
            </div>
            {form.formState.isDirty && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                Draft
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {task
              ? 'Update task properties, deliverable scope, and multi-role production assignments.'
              : 'Select client & project, configure deliverable formats (Poster / Reel / Video), and assign team roles.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Modal Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 custom-scrollbar">
          {formBody}
        </div>
      </DialogContent>
    </Dialog>
  );
};
