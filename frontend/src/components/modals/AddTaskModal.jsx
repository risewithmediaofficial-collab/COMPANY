import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
  VIDEO_TYPE_OPTIONS,
  NON_CONTENT_TASK_TYPE_OPTIONS,
  PAGE_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_STATUS_OPTIONS,
  WEBSITE_TYPE_OPTIONS,
  formatTaskTypeLabel,
  isWebsiteTaskType,
  normalizeTaskStatusLabel,
  uploadFiles,
} from '../../utils/taskFields';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_INITIAL_VALUES = {};

const BLANK_TASK_TEMPLATE = {
  taskTitle: '',
  taskCategory: 'content',
  contentType: 'videos',
  videoType: 'reels',
  taskType: 'reel',
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
  assignedTo: z.string().min(1, 'Assigned person is required'),
  assignedManager: z.string().optional(),
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
  contentType: 'videos',
  videoType: 'reels',
  contentTitle: '',
  taskType: 'reel',
  client: '',
  project: '',
  assignedTo: '',
  assignedManager: '',
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
  const [tasksList, setTasksList] = useState([
    {
      taskTitle: '',
      taskCategory: 'content',
      contentType: 'videos',
      videoType: 'reels',
      taskType: 'reel',
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
    }
  ]);
  const [expandedTasks, setExpandedTasks] = useState({});

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
        taskType: category === 'content' ? 'reel' : 'website_development',
        contentType: category === 'content' ? 'videos' : '',
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
  const isVideoReelFlow = taskCategory === 'content' && contentType === 'videos';

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects;
    return projects.filter((project) => (project.client?._id || project.client) === selectedClientId);
  }, [projects, selectedClientId]);

  useEffect(() => {
    if (task) {
      form.reset({
        taskTitle: task.taskTitle || task.title || '',
        taskCategory: deriveTaskCategory(task),
        contentType: task.contentType || 'videos',
        videoType: task.videoType || 'reels',
        contentTitle: task.contentTitle || '',
        taskType: task.taskType || 'reel',
        client: task.client?._id || task.client || '',
        project: task.project?._id || task.project || '',
        assignedTo: task.assignedTo?.[0]?._id || task.assignedTo?.[0] || '',
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
    } else {
      form.reset(buildDefaultValues(initialValues));
      setExistingAttachments([]);
      setAttachmentFiles([]);
    }
  }, [task, open, form, initialValues]);

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
      const category = deriveTaskCategory(task);
      if (category === 'content') {
        if (!data.caption?.trim()) {
          toast.error('Caption is required for content tasks');
          return;
        }
        if (!data.scriptText?.trim() && !data.scriptLink?.trim()) {
          toast.error('Add script text or provide a script link');
          return;
        }
      } else {
        if (isWebsiteTaskType(data.taskType || task.taskType)) {
          if (!data.websiteType?.trim()) {
            toast.error('Website type is required');
            return;
          }
          if (!data.websiteRequirements?.trim()) {
            toast.error('Website requirements are required');
            return;
          }
        } else if (!data.description?.trim()) {
          toast.error('Requirements / description is required');
          return;
        }
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
    } else {
      // Create Mode (Bulk/Multi) validation
      for (let i = 0; i < tasksList.length; i++) {
        const t = tasksList[i];
        if (!t.taskTitle?.trim()) {
          toast.error(`Task #${i + 1}: Title is required`);
          return;
        }
        if (t.taskCategory === 'content') {
          if (!t.caption?.trim()) {
            toast.error(`Task #${i + 1} (${t.taskTitle}): Caption is required for content tasks`);
            return;
          }
          if (!t.scriptText?.trim() && !t.scriptLink?.trim()) {
            toast.error(`Task #${i + 1} (${t.taskTitle}): Add script text or provide a script link`);
            return;
          }
        } else {
          if (isWebsiteTaskType(t.taskType)) {
            if (!t.websiteType?.trim()) {
              toast.error(`Task #${i + 1} (${t.taskTitle}): Website type is required`);
              return;
            }
            if (!t.websiteRequirements?.trim()) {
              toast.error(`Task #${i + 1} (${t.taskTitle}): Website requirements are required`);
              return;
            }
          } else if (!t.description?.trim()) {
            toast.error(`Task #${i + 1} (${t.taskTitle}): Description is required`);
            return;
          }
        }
      }

      // Map the tasks array to be sent to backend
      const tasksPayload = tasksList.map((t) => ({
        ...t,
        title: t.taskTitle,
        project: data.project || undefined,
        attachments: [...existingAttachments, ...uploadedAttachments],
        dueDate: data.dueDate || undefined,
        deadline: data.dueDate || undefined,
        assignedTo: data.assignedTo,
        assignedManager: data.assignedManager || undefined,
        priority: data.priority,
        status: data.status,
        internalNotes: data.internalNotes,
        clientVisibleNotes: data.clientVisibleNotes,
        isClientVisible: data.isClientVisible,
        approvalRequired: data.approvalRequired,
      }));

      await createTask.mutateAsync({
        tasks: tasksPayload,
      });
    }

    if (!createTask.isError && !updateTask.isError) {
      form.reset(buildDefaultValues(initialValues));
      setAttachmentFiles([]);
      setExistingAttachments([]);
      setTasksList([
        {
          taskTitle: '',
          taskCategory: 'content',
          contentType: 'videos',
          videoType: 'reels',
          taskType: 'reel',
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
        }
      ]);
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
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
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
            <FormLabel>Assigned Person *</FormLabel>
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
                  <FormLabel>Caption *</FormLabel>
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
                <FormLabel>Caption *</FormLabel>
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
          // CREATE MODE (Dynamic multi-tasks assignment)
          <>
            {renderSharedAssignmentFields()}

            <div className="border-t border-border/60 pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Tasks to Assign</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Specify duplicate count to generate multiple fields, or click the plus button to add dynamic tasks.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-foreground whitespace-nowrap">Number of Tasks:</label>
                  <Input
                    type="number"
                    min={1}
                    className="w-20 rounded-xl"
                    value={tasksList.length}
                    onChange={(e) => handleTaskCountChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-6">
                {tasksList.map((taskItem, index) => {
                  const isExpanded = !!expandedTasks[index];
                  const isVideoReel = taskItem.taskCategory === 'content' && taskItem.contentType === 'videos';

                  return (
                    <div key={index} className="p-5 rounded-[22px] border border-border bg-secondary/10 space-y-4 shadow-sm relative transition-all duration-200">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-sm font-bold text-primary">Task #{index + 1} Details</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs font-semibold h-8 rounded-xl px-3 hover:bg-secondary/40"
                            onClick={() => toggleExpand(index)}
                          >
                            {isExpanded ? 'Hide Advanced Details' : 'Show Advanced Details'}
                          </Button>
                          {tasksList.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 rounded-xl"
                              onClick={() => handleDeleteTask(index)}
                              aria-label="Delete task"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Task Title */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-foreground">Task Title *</label>
                          <Input
                            placeholder="Enter task title"
                            className="rounded-xl"
                            value={taskItem.taskTitle}
                            onChange={(e) => updateTaskField(index, 'taskTitle', e.target.value)}
                          />
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Task Category *</label>
                          <Select
                            value={taskItem.taskCategory}
                            onValueChange={(val) => handleCategoryChange(index, val)}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Task Type / Format */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Format / Task Format *</label>
                          <Select
                            value={taskItem.taskType}
                            onValueChange={(val) => updateTaskField(index, 'taskType', val)}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select Format" />
                            </SelectTrigger>
                            <SelectContent>
                              {(taskItem.taskCategory === 'content'
                                ? CONTENT_TASK_TYPE_OPTIONS
                                : NON_CONTENT_TASK_TYPE_OPTIONS
                              ).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(taskItem.taskType === 'custom_content' || taskItem.taskType === 'custom_task') && (
                            <Input
                              placeholder="Describe the custom task format..."
                              className="rounded-xl mt-1"
                              value={taskItem.customTaskType || ''}
                              onChange={(e) => updateTaskField(index, 'customTaskType', e.target.value)}
                            />
                          )}
                        </div>

                        {/* If Content, show Content Type */}
                        {taskItem.taskCategory === 'content' && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground">Content Type *</label>
                            <Select
                              value={taskItem.contentType}
                              onValueChange={(val) => updateTaskField(index, 'contentType', val)}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select Content Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTENT_MEDIA_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {taskItem.contentType === 'custom' && (
                              <Input
                                placeholder="Describe custom content type..."
                                className="rounded-xl mt-1"
                                value={taskItem.customContentType || ''}
                                onChange={(e) => updateTaskField(index, 'customContentType', e.target.value)}
                              />
                            )}
                          </div>
                        )}

                        {/* If Content & Videos, show Video Type */}
                        {isVideoReel && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground">Video Type *</label>
                            <Select
                              value={taskItem.videoType}
                              onValueChange={(val) => updateTaskField(index, 'videoType', val)}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select Video Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {VIDEO_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {taskItem.videoType === 'custom' && (
                              <Input
                                placeholder="Describe custom video type..."
                                className="rounded-xl mt-1"
                                value={taskItem.customVideoType || ''}
                                onChange={(e) => updateTaskField(index, 'customVideoType', e.target.value)}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Caption – Always visible for content tasks */}
                      {taskItem.taskCategory === 'content' && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Caption * <span className="font-normal text-muted-foreground">(required)</span></label>
                          <Textarea
                            className="min-h-16 rounded-xl"
                            placeholder="Caption / copy text for this post..."
                            value={taskItem.caption || ''}
                            onChange={(e) => updateTaskField(index, 'caption', e.target.value)}
                          />
                        </div>
                      )}

                      {/* Collapsible Advanced Details */}
                      {isExpanded && (
                        <div className="border-t border-border/60 pt-4 space-y-4">
                          {taskItem.taskCategory === 'content' ? (
                            // Content Advanced Fields
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground">Content Title</label>
                                <Input
                                  placeholder="e.g. Product launch hook reel"
                                  className="rounded-xl"
                                  value={taskItem.contentTitle || ''}
                                  onChange={(e) => updateTaskField(index, 'contentTitle', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-xs font-bold text-foreground">Content Idea</label>
                                  <Textarea
                                    className="min-h-16 rounded-xl"
                                    placeholder="Core idea, hook, angle..."
                                    value={taskItem.contentIdea || ''}
                                    onChange={(e) => updateTaskField(index, 'contentIdea', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Script *</label>
                                  <Textarea
                                    className="min-h-20 rounded-xl"
                                    placeholder="Full script or talking points..."
                                    value={taskItem.scriptText || ''}
                                    onChange={(e) => updateTaskField(index, 'scriptText', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Script Link</label>
                                  <Input
                                    placeholder="Google Doc / Notion link"
                                    className="rounded-xl"
                                    value={taskItem.scriptLink || ''}
                                    onChange={(e) => updateTaskField(index, 'scriptLink', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Reference Link</label>
                                  <Input
                                    placeholder="https://..."
                                    className="rounded-xl"
                                    value={taskItem.referenceLink || ''}
                                    onChange={(e) => updateTaskField(index, 'referenceLink', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Editor Guide</label>
                                  <Input
                                    placeholder="Editor notes..."
                                    className="rounded-xl"
                                    value={taskItem.editorGuide || ''}
                                    onChange={(e) => updateTaskField(index, 'editorGuide', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Hashtags</label>
                                  <Input
                                    placeholder="#marketing, #leads"
                                    className="rounded-xl"
                                    value={taskItem.hashtags || ''}
                                    onChange={(e) => updateTaskField(index, 'hashtags', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Keywords</label>
                                  <Input
                                    placeholder="keywords..."
                                    className="rounded-xl"
                                    value={taskItem.keywords || ''}
                                    onChange={(e) => updateTaskField(index, 'keywords', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-foreground">Audio Reference</label>
                                  <Input
                                    placeholder="Audio reference link/name"
                                    className="rounded-xl"
                                    value={taskItem.audioReference || ''}
                                    onChange={(e) => updateTaskField(index, 'audioReference', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-xs font-bold text-foreground">Shoot Instructions</label>
                                  <Textarea
                                    className="min-h-16 rounded-xl"
                                    placeholder="Framing, location, lighting instructions..."
                                    value={taskItem.shootInstructions || ''}
                                    onChange={(e) => updateTaskField(index, 'shootInstructions', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-xs font-bold text-foreground">Editing Instructions</label>
                                  <Textarea
                                    className="min-h-16 rounded-xl"
                                    placeholder="Pacing, transition styles, graphics instructions..."
                                    value={taskItem.editingInstructions || ''}
                                    onChange={(e) => updateTaskField(index, 'editingInstructions', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Non-Content Advanced Fields
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground">Requirements / Description *</label>
                                <Textarea
                                  className="min-h-24 rounded-xl"
                                  placeholder="Describe the work required..."
                                  value={taskItem.description || ''}
                                  onChange={(e) => updateTaskField(index, 'description', e.target.value)}
                                />
                              </div>

                              {isWebsiteTaskType(taskItem.taskType) ? (
                                // Website-specific fields
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Website Type *</label>
                                      <Select
                                        value={taskItem.websiteType}
                                        onValueChange={(val) => updateTaskField(index, 'websiteType', val)}
                                      >
                                        <SelectTrigger className="rounded-xl">
                                          <SelectValue placeholder="Select website type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {WEBSITE_TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Content Availability</label>
                                      <Select
                                        value={taskItem.contentAvailability}
                                        onValueChange={(val) => updateTaskField(index, 'contentAvailability', val)}
                                      >
                                        <SelectTrigger className="rounded-xl">
                                          <SelectValue placeholder="Content status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CONTENT_AVAILABILITY_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Branding Availability</label>
                                      <Select
                                        value={taskItem.brandingAvailability}
                                        onValueChange={(val) => updateTaskField(index, 'brandingAvailability', val)}
                                      >
                                        <SelectTrigger className="rounded-xl">
                                          <SelectValue placeholder="Branding status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BRANDING_AVAILABILITY_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Domain Details</label>
                                      <Input
                                        placeholder="e.g. Registered at GoDaddy, transfer needed"
                                        className="rounded-xl"
                                        value={taskItem.domainDetails || ''}
                                        onChange={(e) => updateTaskField(index, 'domainDetails', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Hosting Details</label>
                                      <Input
                                        placeholder="e.g. Hostinger, cPanel details"
                                        className="rounded-xl"
                                        value={taskItem.hostingDetails || ''}
                                        onChange={(e) => updateTaskField(index, 'hostingDetails', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-foreground">Admin Credentials</label>
                                      <Input
                                        placeholder="WP Admin link, user, pass..."
                                        className="rounded-xl"
                                        value={taskItem.adminCredentials || ''}
                                        onChange={(e) => updateTaskField(index, 'adminCredentials', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                      <label className="text-xs font-bold text-foreground">Required Features / Integrations</label>
                                      <Textarea
                                        className="min-h-16 rounded-xl"
                                        placeholder="e.g. Stripe payment, WhatsApp chat, contact form..."
                                        value={taskItem.requiredFeatures || ''}
                                        onChange={(e) => updateTaskField(index, 'requiredFeatures', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                      <label className="text-xs font-bold text-foreground">Website Requirements *</label>
                                      <Textarea
                                        className="min-h-20 rounded-xl"
                                        placeholder="Core functionalities, styling preferences, competitor examples..."
                                        value={taskItem.websiteRequirements || ''}
                                        onChange={(e) => updateTaskField(index, 'websiteRequirements', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  {/* Pages Needed */}
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-foreground">Pages Needed</label>
                                    <div className="flex flex-wrap gap-2">
                                      {PAGE_OPTIONS.map((page) => {
                                        const isChecked = (taskItem.pagesNeeded || []).includes(page);
                                        return (
                                          <label key={page} className={`flex items-center gap-2 cursor-pointer border rounded-xl px-3 py-1.5 transition ${isChecked ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-secondary/40 border-border'}`}>
                                            <input
                                              type="checkbox"
                                              className="hidden"
                                              checked={isChecked}
                                              onChange={() => {
                                                const current = taskItem.pagesNeeded || [];
                                                const next = current.includes(page)
                                                  ? current.filter(item => item !== page)
                                                  : [...current, page];
                                                updateTaskField(index, 'pagesNeeded', next);
                                              }}
                                            />
                                            <span className="text-xs font-medium">{page}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Plus Button */}
              <div className="mt-4 flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl flex items-center gap-2"
                  onClick={handleAddTask}
                >
                  <Plus size={16} />
                  Add Another Task
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24 rounded-xl" placeholder="Internal admin/team notes..." {...field} />
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
                  <FormLabel>Client Visible Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24 rounded-xl" placeholder="Notes the client can see..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="isClientVisible"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border bg-background px-4 py-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    <div>
                      <FormLabel className="cursor-pointer">Visible in client dashboard</FormLabel>
                      <p className="text-xs text-muted-foreground">Client can track this task in the portal.</p>
                    </div>
                  </label>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approvalRequired"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border bg-background px-4 py-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    <div>
                      <FormLabel className="cursor-pointer">Client confirmation required</FormLabel>
                      <p className="text-xs text-muted-foreground">Enable Yes / No response workflow for the client.</p>
                    </div>
                  </label>
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormLabel>Attachments</FormLabel>
            <Input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              className="rounded-xl mt-1"
              onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
            />
            {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
                {existingAttachments.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground">Existing files</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {existingAttachments.map((file, index) => (
                        <li key={`${file.url || file.name}-${index}`}>{file.name || 'Attachment'}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {attachmentFiles.length > 0 && (
                  <div className={existingAttachments.length > 0 ? 'mt-3' : ''}>
                    <p className="font-semibold text-foreground">New files to upload</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {attachmentFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-xl" disabled={isLoading}>
            {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (pageMode) {
    if (!open) return null;
    return formBody;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Advanced Task'}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
};
