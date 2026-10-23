import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Video,
  Code2,
  Building2,
  CheckCircle2,
  Film,
  Palette,
  Share2,
  Calendar,
  Clock,
  ExternalLink,
  User,
  Layers,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Scissors,
  Camera,
  Send,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { useCreateTask } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';

const PLATFORM_OPTIONS = [
  { id: 'Instagram', label: 'Instagram', icon: '📸' },
  { id: 'YouTube', label: 'YouTube', icon: '▶️' },
  { id: 'LinkedIn', label: 'LinkedIn', icon: '💼' },
  { id: 'Facebook', label: 'Facebook', icon: '👥' },
  { id: 'Twitter', label: 'X / Twitter', icon: '🐦' },
  { id: 'TikTok', label: 'TikTok', icon: '🎵' },
];

const CONTENT_TYPE_OPTIONS = [
  { id: 'reel', label: '🎬 Reel / Short', defaultChecklist: ['Hook & Scripting', 'Raw Footage Sourced', 'Edit & Subtitles', 'Sound Design & Final Export'] },
  { id: 'video_content', label: '📹 Long Video', defaultChecklist: ['Outline & Script', 'A-Roll / B-Roll Sourced', 'Rough Cut', 'Color Grading & Final Polish'] },
  { id: 'poster', label: '🎨 Graphic / Poster', defaultChecklist: ['Design Brief / Copy', 'Creative Layout & Visuals', 'Export for Social Specs'] },
  { id: 'carousel', label: '📑 Carousel Post', defaultChecklist: ['Slide 1 Hook Copy', 'Slide Content & Visuals', 'Call To Action Slide', 'Final Multi-slide Export'] },
  { id: 'content', label: '✍️ Script / Copy', defaultChecklist: ['Market Research', 'Hook & Angle Draft', 'Full Body Script', 'Proofread & Review'] },
];

const TECH_TYPE_OPTIONS = [
  { id: 'website_development', label: '💻 Web Feature / Dev', defaultChecklist: ['Spec Review', 'Component / API Implementation', 'Responsive Mobile Check', 'Deploy to Staging'] },
  { id: 'bug_fix', label: '🐞 Bug Fix / Patch', defaultChecklist: ['Reproduce Error', 'Isolate Root Cause', 'Write Code Fix', 'Unit / Integration Test'] },
  { id: 'website_update', label: '⚡ Website Update', defaultChecklist: ['Asset Gathering', 'Apply Updates', 'Cross-browser Verification'] },
  { id: 'seo_work', label: '🔍 SEO & Performance', defaultChecklist: ['Audit & Keyword Plan', 'Meta Tags & Schema', 'Core Web Vitals Test'] },
  { id: 'custom_task', label: '⚙️ Tech Infrastructure', defaultChecklist: ['Scope Definition', 'Implementation', 'Documentation'] },
  { id: 'client_support', label: '📋 Operations / Support', defaultChecklist: ['Review Request', 'Execute Task', 'Notify Client / Manager'] },
];

export const KanbanCreateTaskModal = ({
  isOpen,
  open,
  onClose,
  onOpenChange,
  initialUser = null,
  initialValues = null,
  onTaskCreated,
}) => {
  const isModalOpen = isOpen !== undefined ? Boolean(isOpen) : Boolean(open);
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const createTaskMutation = useCreateTask();
  const { data: clientsData = [] } = useClients();
  const { data: projectsData = [] } = useProjects();
  const { data: usersData = [] } = useUsers();

  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.clients || [];
  const projects = Array.isArray(projectsData) ? projectsData : projectsData?.projects || [];
  const users = (Array.isArray(usersData) ? usersData : usersData?.users || []).filter(
    (u) => u.role !== 'client'
  );

  // Mode: 'content' | 'non_content'
  const [taskCategory, setTaskCategory] = useState('content');
  const [subType, setSubType] = useState('reel');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [nfId, setNfId] = useState('');

  // Client & Project Selection
  const [singleClientId, setSingleClientId] = useState('');
  const [singleProjectId, setSingleProjectId] = useState('');

  // Common Assignee (used for Non-Content lead assignee, or optional general assignee)
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // ==========================================
  // Notion Details (One by One) State:
  // ==========================================

  // 1. Editor Details
  const [editorUserId, setEditorUserId] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReminder, setEditReminder] = useState('');

  // 2. Videographer Details
  const [videographerUserId, setVideographerUserId] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [shootLocation, setShootLocation] = useState('');

  // 3. SMM Details
  const [smmUserId, setSmmUserId] = useState('');
  const [postDate, setPostDate] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Instagram']);

  // 4. Designer Details
  const [designerUserId, setDesignerUserId] = useState('');
  const [designDueDate, setDesignDueDate] = useState('');

  // 5. Brief & Concept / Script
  const [contentHook, setContentHook] = useState('');
  const [scriptLink, setScriptLink] = useState('');

  // 6. Non-Content / Tech Specific
  const [techScope, setTechScope] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [bugSeverity, setBugSeverity] = useState('medium');

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Multi-Task Queue State
  const [queuedTasks, setQueuedTasks] = useState([]);

  // Filtered Role Users for Dropdowns
  const roleGroups = useMemo(() => {
    const editors = [];
    const videographers = [];
    const smmMembers = [];
    const designers = [];
    const developers = [];

    users.forEach((u) => {
      const dept = (u.department || '').toLowerCase();
      const pos = (u.position || u.designation || u.role || '').toLowerCase();

      if (pos.includes('editor') || dept.includes('edit') || pos.includes('video editor') || pos.includes('cut')) {
        editors.push(u);
      }
      if (pos.includes('video') || dept.includes('shoot') || pos.includes('shoot') || pos.includes('camera') || pos.includes('vj')) {
        videographers.push(u);
      }
      if (dept.includes('smm') || dept.includes('social') || dept.includes('market') || pos.includes('smm') || pos.includes('social') || pos.includes('publish')) {
        smmMembers.push(u);
      }
      if (dept.includes('design') || dept.includes('creative') || pos.includes('design') || pos.includes('graphic') || pos.includes('ui') || pos.includes('ux')) {
        designers.push(u);
      }
      if (dept.includes('dev') || dept.includes('tech') || dept.includes('engineer') || pos.includes('dev') || pos.includes('engineer') || pos.includes('frontend') || pos.includes('backend')) {
        developers.push(u);
      }
    });

    return { editors, videographers, smmMembers, designers, developers };
  }, [users]);

  // Keyboard listener for Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (initialValues) {
        if (initialValues.client) {
          const cId = typeof initialValues.client === 'object' ? initialValues.client._id : initialValues.client;
          setSingleClientId(cId || '');
        }
        if (initialValues.project) {
          const pId = typeof initialValues.project === 'object' ? initialValues.project._id : initialValues.project;
          setSingleProjectId(pId || '');
        }
        if (initialValues.assignedTo) {
          const aId = Array.isArray(initialValues.assignedTo)
            ? (initialValues.assignedTo[0]?._id || initialValues.assignedTo[0])
            : (initialValues.assignedTo?._id || initialValues.assignedTo);
          if (aId) setSelectedUserId(aId);
        }
        if (initialValues.priority) setPriority(initialValues.priority.toLowerCase());
        if (initialValues.title || initialValues.taskTitle) setTitle(initialValues.title || initialValues.taskTitle);
        if (initialValues.dueDate) setDueDate(new Date(initialValues.dueDate).toISOString().split('T')[0]);
        if (initialValues.taskCategory) {
          setTaskCategory(initialValues.taskCategory);
          if (initialValues.subType) {
            setSubType(initialValues.subType);
          } else if (initialValues.taskCategory === 'non_content') {
            setSubType('website_development');
          } else {
            setSubType('reel');
          }
        }
      }

      if (initialUser?._id) {
        setSelectedUserId(initialUser._id);
        const userDept = (initialUser.department || '').toLowerCase();
        const userPos = (initialUser.position || initialUser.designation || '').toLowerCase();

        if (
          userDept.includes('dev') ||
          userDept.includes('tech') ||
          userPos.includes('dev') ||
          userPos.includes('engineer') ||
          userPos.includes('program')
        ) {
          setTaskCategory('non_content');
          setSubType('website_development');
        } else if (userPos.includes('editor')) {
          setTaskCategory('content');
          setSubType('reel');
          setEditorUserId(initialUser._id);
        } else if (userPos.includes('design')) {
          setTaskCategory('content');
          setSubType('poster');
          setDesignerUserId(initialUser._id);
        } else if (userDept.includes('smm') || userPos.includes('smm')) {
          setTaskCategory('content');
          setSubType('reel');
          setSmmUserId(initialUser._id);
        } else if (userPos.includes('video') || userDept.includes('shoot')) {
          setTaskCategory('content');
          setSubType('video_content');
          setVideographerUserId(initialUser._id);
        } else {
          setTaskCategory('content');
          setSubType('reel');
        }
      } else if (users.length > 0 && !selectedUserId && !initialValues?.assignedTo) {
        setSelectedUserId(users[0]._id);
      }
    } else {
      setQueuedTasks([]);
    }
  }, [isModalOpen, initialUser, initialValues, users, clients]);

  // Update default checklist when subtype changes
  useEffect(() => {
    const list =
      taskCategory === 'content'
        ? CONTENT_TYPE_OPTIONS.find((t) => t.id === subType)?.defaultChecklist
        : TECH_TYPE_OPTIONS.find((t) => t.id === subType)?.defaultChecklist;

    if (list) {
      setChecklist(list.map((item) => ({ title: item, isCompleted: false })));
    }
  }, [subType, taskCategory]);

  // Robust client ID extractor for projects
  const getProjectClientId = (p) => {
    if (!p) return null;
    if (p.client) {
      if (typeof p.client === 'object' && p.client._id) {
        return p.client._id.toString();
      }
      return p.client.toString();
    }
    if (p.clientId) {
      return p.clientId.toString();
    }
    return null;
  };

  const isProjectMatchClient = (p, clientId) => {
    if (!p || !clientId) return false;
    const pCid = getProjectClientId(p);
    return pCid === clientId.toString();
  };

  // Projects strictly matching selected client in single mode
  const clientSpecificProjects = useMemo(() => {
    if (!singleClientId) return [];
    return projects.filter((p) => isProjectMatchClient(p, singleClientId));
  }, [projects, singleClientId]);

  // Other projects (or all projects if no client selected)
  const otherProjects = useMemo(() => {
    if (!singleClientId) return projects;
    return projects.filter((p) => !isProjectMatchClient(p, singleClientId));
  }, [projects, singleClientId]);

  // Set default project when single client changes
  useEffect(() => {
    if (singleClientId) {
      const specific = projects.filter((p) => isProjectMatchClient(p, singleClientId));
      if (specific.length > 0) {
        setSingleProjectId(specific[0]._id);
      } else {
        setSingleProjectId('');
      }
    }
  }, [singleClientId, projects]);

  if (!isOpen && !open) return null;

  // Checklist Handlers
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([...checklist, { title: newChecklistText.trim(), isCompleted: false }]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  // Build task payload for submission or queue
  const buildCurrentTaskItem = () => {
    if (!title.trim()) {
      toast.error('Please enter a task name/title');
      return null;
    }

    const assignedUserObj = users.find((u) => u._id === selectedUserId);
    const editorUserObj = users.find((u) => u._id === editorUserId);
    const videographerUserObj = users.find((u) => u._id === videographerUserId);
    const smmUserObj = users.find((u) => u._id === smmUserId);
    const designerUserObj = users.find((u) => u._id === designerUserId);
    const clientObj = clients.find((c) => c._id === singleClientId);
    const projectObj = projects.find((p) => p._id === singleProjectId);

    const taskItem = {
      queueId: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      taskTitle: title.trim(),
      taskCategory,
      taskType: subType,
      priority,
      status: 'todo',
      dueDate: taskCategory === 'non_content' ? dueDate : (editDueDate || dueDate || postDate || new Date().toISOString().split('T')[0]),
      client: singleClientId || undefined,
      clientName: clientObj?.name || (singleClientId ? 'Selected Client' : 'General / Internal'),
      project: singleProjectId || undefined,
      projectName: projectObj?.name || '',
      nfId: nfId.trim() || undefined,
      checklist: checklist.map((c) => ({ title: c.title, isCompleted: false })),
    };

    if (taskCategory === 'non_content') {
      if (!selectedUserId) {
        toast.error('Please assign an employee for the non-content task');
        return null;
      }
      taskItem.assignedTo = [selectedUserId];
      taskItem.assignedPersonName = assignedUserObj?.name || 'Assigned Member';
      taskItem.requirementDetails = techScope;
      taskItem.description = techScope;
      taskItem.referenceLink = repoLink;
      taskItem.development = {
        isDevTask: true,
        stage: 'backlog',
        bugSeverity: subType === 'bug_fix' ? bugSeverity : undefined,
        isBug: subType === 'bug_fix',
      };
    } else {
      // Content deliverable
      taskItem.contentType = subType === 'poster' ? 'posts' : (subType === 'video_content' || subType === 'reel') ? 'videos' : 'custom';
      taskItem.videoType = subType === 'reel' ? 'reels' : subType === 'video_content' ? 'long_video' : '';
      taskItem.postingPlatforms = [...selectedPlatforms];
      taskItem.contentIdea = contentHook;
      taskItem.scriptText = contentHook;
      taskItem.scriptLink = scriptLink || undefined;
      taskItem.rawFootageLink = rawFootageLink || undefined;
      taskItem.driveLink = rawFootageLink || undefined;
      taskItem.referenceLink = rawFootageLink || undefined;

      // Editor Details
      taskItem.editorAssigned = editorUserId || undefined;
      taskItem.editorName = editorUserObj?.name || '';
      taskItem.editDueDate = editDueDate || undefined;
      taskItem.editDate = editDate || undefined;
      taskItem.editReminder = editReminder || undefined;

      // Videographer Details
      taskItem.videographerAssigned = videographerUserId || undefined;
      taskItem.videographerName = videographerUserObj?.name || '';
      taskItem.shootDate = shootDate || undefined;
      taskItem.shootLocation = shootLocation || undefined;
      taskItem.videographerContentNeeded = shootLocation || undefined;

      // SMM Details
      taskItem.publisherAssigned = smmUserId || undefined;
      taskItem.publisherName = smmUserObj?.name || '';
      taskItem.postingScheduleDate = postDate || undefined;
      taskItem.publishingDate = postDate || undefined;

      // Designer Details
      taskItem.designerAssigned = designerUserId || undefined;
      taskItem.designerName = designerUserObj?.name || '';
      taskItem.designDueDate = designDueDate || undefined;

      // Auto-collect all assigned roles for task.assignedTo
      const subIds = [
        editorUserId,
        designerUserId,
        smmUserId,
        videographerUserId,
        selectedUserId,
      ].filter(Boolean);
      const uniqueSubIds = [...new Set(subIds)];
      taskItem.assignedTo = uniqueSubIds;
      taskItem.assignedPersonName = uniqueSubIds
        .map((id) => users.find((u) => u._id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'Unassigned';
    }

    return taskItem;
  };

  // Add Current Task to Queue (supports multi-task creation)
  const handleAddToQueue = () => {
    const item = buildCurrentTaskItem();
    if (!item) return;

    setQueuedTasks((prev) => [...prev, item]);
    toast.success(`Task "${item.title}" queued! Configure another task or assign all.`);

    // Reset title, hook, and links for next task
    setTitle('');
    setContentHook('');
    setRawFootageLink('');
    setTechScope('');
    setRepoLink('');
  };

  const handleRemoveQueuedTask = (queueId) => {
    setQueuedTasks((prev) => prev.filter((item) => item.queueId !== queueId));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    let tasksToSubmit = [...queuedTasks];

    // If user has a title typed in current form, include it too!
    if (title.trim()) {
      const currentItem = buildCurrentTaskItem();
      if (!currentItem) return;
      tasksToSubmit.push(currentItem);
    }

    if (tasksToSubmit.length === 0) {
      toast.error('Please enter a task name/title');
      return;
    }

    try {
      if (tasksToSubmit.length === 1) {
        await createTaskMutation.mutateAsync(tasksToSubmit[0]);
        toast.success(`Task created successfully!`);
      } else {
        await createTaskMutation.mutateAsync({ tasks: tasksToSubmit });
        toast.success(`Successfully created & assigned ${tasksToSubmit.length} tasks!`);
      }

      setQueuedTasks([]);
      setTitle('');
      if (onTaskCreated) onTaskCreated();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task(s)');
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[999] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                Create Task & Assign Deliverable
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                <span>Configure details one-by-one</span>
                <span>•</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Lands directly in To Do</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 custom-scrollbar">
          {/* 1. Deliverable Mode Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Deliverable Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTaskCategory('content');
                  setSubType('reel');
                }}
                className={`flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
                  taskCategory === 'content'
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-sm ring-2 ring-fuchsia-500/30 dark:border-fuchsia-400 dark:bg-fuchsia-950/30'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                    taskCategory === 'content'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🎨 Content Deliverable</span>
                    {taskCategory === 'content' && (
                      <span className="h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Reels, Videos, Posters, Carousels & Social Scripts
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskCategory('non_content');
                  setSubType('website_development');
                }}
                className={`flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
                  taskCategory === 'non_content'
                    ? 'border-sky-500 bg-sky-500/10 shadow-sm ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/30'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                    taskCategory === 'non_content'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>💻 Non-Content Task</span>
                    {taskCategory === 'non_content' && (
                      <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Web Development, Bug Fixes, SEO & Infrastructure
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Core Task Info (Title, Client, Project, Priority, NF ID) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3.5">
            {/* Title & Priority & NF ID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Task Name / Title *
                </label>
                <input
                  type="text"
                  placeholder={
                    taskCategory === 'content'
                      ? 'e.g. Product Launch Reel #1 - Hook & Showcase'
                      : 'e.g. Implement Mobile Navbar Animation & Clean up Layout'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  autoFocus
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                  <Hash size={12} className="text-slate-400" /> NF ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 81"
                  value={nfId}
                  onChange={(e) => setNfId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Client & Project Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-indigo-500" /> Select Client
                </label>
                <select
                  value={singleClientId}
                  onChange={(e) => setSingleClientId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">General / Internal Task (No Client)</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company || c.companyName ? `(${c.company || c.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-500" /> Select Project
                  </span>
                  {singleClientId && clientSpecificProjects.length > 0 && (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {clientSpecificProjects.length} linked to client
                    </span>
                  )}
                </label>
                <select
                  value={singleProjectId}
                  onChange={(e) => setSingleProjectId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">— No Project Linked (General) —</option>
                  {clientSpecificProjects.length > 0 && (
                    <optgroup label="Client Linked Projects">
                      {clientSpecificProjects.map((p) => (
                        <option key={p._id} value={p._id}>
                          📁 {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherProjects.length > 0 && (
                    <optgroup label={clientSpecificProjects.length > 0 ? 'Other Workspace Projects' : 'All Workspace Projects'}>
                      {otherProjects.map((p) => {
                        const cName = typeof p.client === 'object' ? p.client?.name : '';
                        return (
                          <option key={p._id} value={p._id}>
                            📁 {p.name} {cName ? `(${cName})` : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 3A: NON-CONTENT TASK DETAILS (Matches Notion Image 2)
             ======================================================== */}
          {taskCategory === 'non_content' ? (
            <div className="rounded-2xl border border-sky-300/80 bg-sky-50/20 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/15 space-y-4">
              <div className="flex items-center justify-between border-b border-sky-200/60 pb-2.5 dark:border-sky-900/40">
                <span className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-2">
                  <Code2 size={16} className="text-sky-600 dark:text-sky-400" /> Non-Content Task Details
                </span>
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  Assignee & Technical Specifications
                </span>
              </div>

              {/* Assignee & Due Date & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Assignee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Assignee *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">Select Assignee...</option>
                    {roleGroups.developers.length > 0 && (
                      <optgroup label="💻 Developers & Engineers">
                        {roleGroups.developers.map((u) => (
                          <option key={u._id} value={u._id}>
                            💻 {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="All Team Members">
                      {users
                        .filter((u) => !roleGroups.developers.some((d) => d._id === u._id))
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                {/* SubType */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Tech Category
                  </label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    {TECH_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bug Severity (if bug) */}
              {subType === 'bug_fix' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Bug Severity Level
                  </label>
                  <select
                    value={bugSeverity}
                    onChange={(e) => setBugSeverity(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="low">Low Impact</option>
                    <option value="medium">Medium Impact</option>
                    <option value="high">High Severity</option>
                    <option value="critical">Critical Blocker</option>
                  </select>
                </div>
              )}

              {/* Technical Scope & Implementation Requirements */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Technical Scope & Implementation Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify exact behavior, reproduction steps, technical notes, or page requirements..."
                  value={techScope}
                  onChange={(e) => setTechScope(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Repository / Figma / Spec Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Repository / Figma / Spec Link
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://figma.com/..."
                  value={repoLink}
                  onChange={(e) => setRepoLink(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          ) : (
            /* ========================================================
                SECTION 3B: CONTENT DELIVERABLE DETAILS (Matches Notion Image 2)
               ======================================================== */
            <div className="space-y-4">
              {/* 1. EDITOR DETAILS CARD (Matches Image 2 "Editor Details") */}
              <div className="rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4 sm:p-5 dark:border-purple-900/60 dark:bg-purple-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2 dark:border-purple-900/40">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors size={15} className="text-purple-600 dark:text-purple-400" /> Editor Details
                  </span>
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                    Video & Graphic Editing Schedule
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Editor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Editor
                    </label>
                    <select
                      value={editorUserId}
                      onChange={(e) => setEditorUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Unassigned (Optional)</option>
                      {roleGroups.editors.length > 0 && (
                        <optgroup label="✂️ Video / Graphic Editors">
                          {roleGroups.editors.map((u) => (
                            <option key={u._id} value={u._id}>
                              ✂️ {u.name} ({u.position || u.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Team Members">
                        {users
                          .filter((u) => !roleGroups.editors.some((e) => e._id === u._id))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.position || u.role})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Edit Due */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Edit Due Date
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Edit Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Edit Start Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Edit Reminder */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Edit Reminder
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Draft 2 PM"
                      value={editReminder}
                      onChange={(e) => setEditReminder(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Raw Footage Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Raw Footage / Assets Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={rawFootageLink}
                    onChange={(e) => setRawFootageLink(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* 2. VIDEOGRAPHER DETAILS CARD (Matches Image 2 "Videographer Details") */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-4 sm:p-5 dark:border-blue-900/60 dark:bg-blue-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2 dark:border-blue-900/40">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={15} className="text-blue-600 dark:text-blue-400" /> Videographer Details
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    Shoot Schedule & Location
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Videographer */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Videographer
                    </label>
                    <select
                      value={videographerUserId}
                      onChange={(e) => setVideographerUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Unassigned (Optional)</option>
                      {roleGroups.videographers.length > 0 && (
                        <optgroup label="🎥 Videographers & Creators">
                          {roleGroups.videographers.map((u) => (
                            <option key={u._id} value={u._id}>
                              🎥 {u.name} ({u.position || u.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Team Members">
                        {users
                          .filter((u) => !roleGroups.videographers.some((v) => v._id === u._id))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.position || u.role})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Shoot Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Shoot Date
                    </label>
                    <input
                      type="date"
                      value={shootDate}
                      onChange={(e) => setShootDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Shoot Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Shoot Location / Shot Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Studio / Client premises..."
                      value={shootLocation}
                      onChange={(e) => setShootLocation(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SMM DETAILS CARD (Matches Image 2 "SMM Details") */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2 dark:border-emerald-900/40">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 size={15} className="text-emerald-600 dark:text-emerald-400" /> SMM Details
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Publishing, Schedule & Format
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SMM Member */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMM Member (Posting)
                    </label>
                    <select
                      value={smmUserId}
                      onChange={(e) => setSmmUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Unassigned (Optional)</option>
                      {roleGroups.smmMembers.length > 0 && (
                        <optgroup label="📱 SMM Specialists">
                          {roleGroups.smmMembers.map((u) => (
                            <option key={u._id} value={u._id}>
                              📱 {u.name} ({u.position || u.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Team Members">
                        {users
                          .filter((u) => !roleGroups.smmMembers.some((s) => s._id === u._id))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.position || u.role})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Post Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Post Date & Schedule
                    </label>
                    <input
                      type="datetime-local"
                      value={postDate}
                      onChange={(e) => setPostDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Content Type
                    </label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {CONTENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Social Platforms */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Target Social Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((plat) => {
                      const isSelected = selectedPlatforms.includes(plat.id);
                      return (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPlatforms(selectedPlatforms.filter((p) => p !== plat.id));
                            } else {
                              setSelectedPlatforms([...selectedPlatforms, plat.id]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span>{plat.icon}</span>
                          <span>{plat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. DESIGNER DETAILS CARD (Matches Image 2 "Designer Details") */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 dark:border-amber-900/40">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={15} className="text-amber-600 dark:text-amber-400" /> Designer Details
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Graphic & Thumbnail Design
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Graphic Designer */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Graphic Designer
                    </label>
                    <select
                      value={designerUserId}
                      onChange={(e) => setDesignerUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Unassigned (Optional)</option>
                      {roleGroups.designers.length > 0 && (
                        <optgroup label="🎨 Graphic Designers">
                          {roleGroups.designers.map((u) => (
                            <option key={u._id} value={u._id}>
                              🎨 {u.name} ({u.position || u.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Team Members">
                        {users
                          .filter((u) => !roleGroups.designers.some((d) => d._id === u._id))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.position || u.role})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Design Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Design Due Date
                    </label>
                    <input
                      type="date"
                      value={designDueDate}
                      onChange={(e) => setDesignDueDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* 5. BRIEF & SCRIPT HOOK CARD */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-500" /> Hook / Core Concept & Script Link
                </span>

                <div>
                  <textarea
                    rows={2}
                    placeholder="3-second hook or angle: 'Stop making this mistake with your agency ads...' followed by product showcase"
                    value={contentHook}
                    onChange={(e) => setContentHook(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <input
                    type="url"
                    placeholder="Google Docs / Notion Script Link (e.g. https://docs.google.com/...)"
                    value={scriptLink}
                    onChange={(e) => setScriptLink(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Deliverable Checklist Builder */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-indigo-500" /> Deliverable Checklist ({checklist.length} steps)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Team members tick off [✓] during production
              </span>
            </div>

            <div className="space-y-1.5 mb-3">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add checklist input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add next checklist step (e.g. Export 4K, Color Grade, Verify Links)..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Step</span>
              </button>
            </div>
          </div>

          {/* 5. Queued Tasks List (Multi-Task Builder) */}
          {queuedTasks.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-xs">
                    {queuedTasks.length}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Queued Tasks ({queuedTasks.length}) — Ready to Create in 1 Click!
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setQueuedTasks([])}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {queuedTasks.map((q, idx) => (
                  <div
                    key={q.queueId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          #{idx + 1}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          🏢 {q.clientName}
                        </span>
                        {q.projectName && (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            📁 {q.projectName}
                          </span>
                        )}
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                          👤 {q.assignedPersonName}
                        </span>
                        {q.nfId && (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            #{q.nfId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {q.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedTask(q.queueId)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                      title="Remove task from queue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-center cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={handleAddToQueue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition-all dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Another Task</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={createTaskMutation.isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              {createTaskMutation.isPending ? (
                <span>Creating Task...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {queuedTasks.length > 0
                      ? `Assign All ${queuedTasks.length + (title.trim() ? 1 : 0)} Tasks`
                      : 'Assign Task to To-Do'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KanbanCreateTaskModal;
