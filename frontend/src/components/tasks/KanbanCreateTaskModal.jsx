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
  Link as LinkIcon,
  Mic,
  Music,
  MapPin,
  Check,
} from 'lucide-react';
import { useCreateTask } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useUsers } from '../../hooks/useUsers';
import { contentProductionApi } from '../../api/contentProduction';
import { toast } from 'sonner';

export const PLATFORM_OPTIONS = [
  { id: 'Instagram', label: 'Instagram', icon: '📸' },
  { id: 'YouTube', label: 'YouTube', icon: '▶️' },
  { id: 'LinkedIn', label: 'LinkedIn', icon: '💼' },
  { id: 'Facebook', label: 'Facebook', icon: '👥' },
  { id: 'Twitter', label: 'X / Twitter', icon: '🐦' },
  { id: 'TikTok', label: 'TikTok', icon: '🎵' },
];

export const CONTENT_TYPE_OPTIONS = [
  { id: 'reel', label: '🎬 Reel / Short', defaultChecklist: ['Hook & Scripting', 'Raw Footage Sourced', 'Edit & Subtitles', 'Sound Design & Final Export'] },
  { id: 'video_content', label: '📹 Long Video', defaultChecklist: ['Outline & Script', 'A-Roll / B-Roll Sourced', 'Rough Cut', 'Color Grading & Final Polish'] },
  { id: 'poster', label: '🎨 Graphic / Poster', defaultChecklist: ['Design Brief / Copy', 'Creative Layout & Visuals', 'Export for Social Specs'] },
  { id: 'carousel', label: '📑 Carousel Post', defaultChecklist: ['Slide 1 Hook Copy', 'Slide Content & Visuals', 'Call To Action Slide', 'Final Multi-slide Export'] },
  { id: 'content', label: '✍️ Script / Copy', defaultChecklist: ['Market Research', 'Hook & Angle Draft', 'Full Body Script', 'Proofread & Review'] },
];

export const TECH_TYPE_OPTIONS = [
  { id: 'website_development', label: '💻 Web Feature / Dev', defaultChecklist: ['Spec Review', 'Component / API Implementation', 'Responsive Mobile Check', 'Deploy to Staging'] },
  { id: 'bug_fix', label: '🐞 Bug Fix / Patch', defaultChecklist: ['Reproduce Error', 'Isolate Root Cause', 'Write Code Fix', 'Unit / Integration Test'] },
  { id: 'website_update', label: '⚡ Website Update', defaultChecklist: ['Asset Gathering', 'Apply Updates', 'Cross-browser Verification'] },
  { id: 'seo_work', label: '🔍 SEO & Performance', defaultChecklist: ['Audit & Keyword Plan', 'Meta Tags & Schema', 'Core Web Vitals Test'] },
  { id: 'custom_task', label: '⚙️ Tech Infrastructure', defaultChecklist: ['Scope Definition', 'Implementation', 'Documentation'] },
  { id: 'client_support', label: '📋 Operations / Support', defaultChecklist: ['Review Request', 'Execute Task', 'Notify Client / Manager'] },
];

export const VIDEO_TYPES_OPTIONS = [
  'Montage',
  'Voice-over',
  'CTA',
  'Services',
  'Customer Review',
  'Promotional',
  'Educational',
  'Talking Head',
  'Before & After',
  'Interview',
  'Product Shoot',
];

export const VIDEO_FORMAT_OPTIONS = ['9:16', '16:9', '1:1', 'Vertical', 'Horizontal', 'Square'];
export const VIDEO_DURATION_OPTIONS = ['15 sec', '30 sec', '60 sec', '90 sec', 'Custom'];
export const CTA_OPTIONS = ['None', 'Call Now', 'WhatsApp', 'Visit Website', 'Send DM', 'Book Now', 'Learn More'];
export const SCRIPT_LANGUAGES = ['English', 'Tamil', 'Kannada', 'Telugu', 'Hindi', 'Other'];
export const EQUIPMENT_OPTIONS = ['Camera', 'Mobile', 'Gimbal', 'Tripod', 'Microphone', 'Lighting'];
export const STATUS_EDITOR_OPTIONS = ['Pending', 'Editing', 'Review', 'Revision Required', 'Completed'];
export const STATUS_VIDEOGRAPHER_OPTIONS = ['Scheduled', 'In Progress', 'Completed', 'Retake Required'];
export const STATUS_SMM_OPTIONS = ['Content Pending', 'Approval Pending', 'Scheduled', 'Published'];
export const STATUS_SCRIPT_OPTIONS = ['Draft', 'Internal Review', 'Client Approval', 'Approved', 'Revision Required'];

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
  const [allocatedHours, setAllocatedHours] = useState(2);
  const [allocatedMinutes, setAllocatedMinutes] = useState(0);
  const [dueTime, setDueTime] = useState('');

  // ==========================================
  // Notion Details (One by One) State:
  // ==========================================

  // 1. Editor Details
  const [editorUserId, setEditorUserId] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReminder, setEditReminder] = useState('');
  const [editorVideoType, setEditorVideoType] = useState('Promotional');
  const [editorVideoFormat, setEditorVideoFormat] = useState('9:16');
  const [editorVideoDuration, setEditorVideoDuration] = useState('30 sec');
  const [editingReferenceVideo, setEditingReferenceVideo] = useState('');
  const [voiceOverAudioLink, setVoiceOverAudioLink] = useState('');
  const [musicReferenceLink, setMusicReferenceLink] = useState('');
  const [brandAssetsDriveLink, setBrandAssetsDriveLink] = useState('');
  const [finalVideoDriveLink, setFinalVideoDriveLink] = useState('');
  const [captionOnScreenText, setCaptionOnScreenText] = useState('');
  const [editingInstructions, setEditingInstructions] = useState('');
  const [editorStatus, setEditorStatus] = useState('Pending');

  // 2. Videographer Details
  const [videographerUserId, setVideographerUserId] = useState('');
  const [videographerVideoType, setVideographerVideoType] = useState('Promotional');
  const [videographerVideoFormat, setVideographerVideoFormat] = useState('Vertical');
  const [shootDate, setShootDate] = useState('');
  const [shootTime, setShootTime] = useState('');
  const [shootLocation, setShootLocation] = useState('');
  const [shootLocationLink, setShootLocationLink] = useState('');
  const [videographerReferenceLink, setVideographerReferenceLink] = useState('');
  const [requiredShots, setRequiredShots] = useState('');
  const [presenterPerson, setPresenterPerson] = useState('');
  const [equipmentRequired, setEquipmentRequired] = useState(['Camera', 'Microphone', 'Lighting']);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [videographerRawFootageLink, setVideographerRawFootageLink] = useState('');
  const [videographerStatus, setVideographerStatus] = useState('Scheduled');

  // 3. SMM Details
  const [smmUserId, setSmmUserId] = useState('');
  const [postDate, setPostDate] = useState('');
  const [smmTime, setSmmTime] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Instagram']);
  const [smmContentType, setSmmContentType] = useState('Reel');
  const [smmCaption, setSmmCaption] = useState('');
  const [smmHashtags, setSmmHashtags] = useState('');
  const [smmCta, setSmmCta] = useState('None');
  const [smmFinalCreativeLink, setSmmFinalCreativeLink] = useState('');
  const [smmCoverImageLink, setSmmCoverImageLink] = useState('');
  const [publishedPostUrl, setPublishedPostUrl] = useState('');
  const [smmStatus, setSmmStatus] = useState('Content Pending');

  // 4. Scriptwriter Details
  const [scriptWriterUserId, setScriptWriterUserId] = useState('');
  const [scriptVideoType, setScriptVideoType] = useState('Promotional');
  const [scriptLanguage, setScriptLanguage] = useState('English');
  const [contentHook, setContentHook] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [scriptSceneInstructions, setScriptSceneInstructions] = useState('');
  const [scriptOnScreenText, setScriptOnScreenText] = useState('');
  const [scriptCta, setScriptCta] = useState('None');
  const [scriptReferenceVideoLink, setScriptReferenceVideoLink] = useState('');
  const [scriptLink, setScriptLink] = useState('');
  const [scriptStatus, setScriptStatus] = useState('Draft');

  // 5. Designer Details
  const [designerUserId, setDesignerUserId] = useState('');
  const [designDueDate, setDesignDueDate] = useState('');

  // 6. Non-Content / Tech Specific
  const [techScope, setTechScope] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [bugSeverity, setBugSeverity] = useState('medium');

  // 7. Saved Client Assets (Scripts & Reference Videos)
  const [clientSavedScripts, setClientSavedScripts] = useState([]);
  const [clientSavedRefVideos, setClientSavedRefVideos] = useState([]);

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
    const scriptwriters = [];

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
      if (pos.includes('script') || dept.includes('script') || pos.includes('writer') || dept.includes('content') || pos.includes('copy')) {
        scriptwriters.push(u);
      }
    });

    return { editors, videographers, smmMembers, designers, developers, scriptwriters };
  }, [users]);

  // Load saved scripts and reference videos for selected client
  useEffect(() => {
    if (singleClientId) {
      contentProductionApi
        .getScriptsAndReferences({ clientId: singleClientId })
        .then((res) => {
          if (res.data?.success) {
            setClientSavedScripts(res.data.scripts || []);
            setClientSavedRefVideos(res.data.referenceVideos || []);
          }
        })
        .catch(() => {
          setClientSavedScripts([]);
          setClientSavedRefVideos([]);
        });
    } else {
      setClientSavedScripts([]);
      setClientSavedRefVideos([]);
    }
  }, [singleClientId]);

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
        if (initialValues.allocatedHours !== undefined) setAllocatedHours(Number(initialValues.allocatedHours) || 0);
        if (initialValues.allocatedMinutes !== undefined) setAllocatedMinutes(Number(initialValues.allocatedMinutes) || 0);
        if (initialValues.dueTime) setDueTime(initialValues.dueTime);
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
        } else if (userPos.includes('script') || userPos.includes('writer') || userDept.includes('script')) {
          setTaskCategory('content');
          setSubType('content');
          setScriptWriterUserId(initialUser._id);
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

  // Projects strictly matching selected client
  const clientSpecificProjects = useMemo(() => {
    if (!singleClientId) return [];
    return projects.filter((p) => isProjectMatchClient(p, singleClientId));
  }, [projects, singleClientId]);

  // Other projects
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
    const scriptWriterUserObj = users.find((u) => u._id === scriptWriterUserId);
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
      allocatedHours: Math.max(0, Number(allocatedHours) || 0),
      allocatedMinutes: Math.max(0, Math.min(59, Number(allocatedMinutes) || 0)),
      dueTime: dueTime || undefined,
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
      taskItem.videoType = editorVideoType || videographerVideoType || scriptVideoType || (subType === 'reel' ? 'reels' : subType === 'video_content' ? 'long_video' : '');
      taskItem.videoFormat = editorVideoFormat || videographerVideoFormat || '9:16';
      taskItem.videoDuration = editorVideoDuration || '30 sec';
      taskItem.editingReferenceVideo = editingReferenceVideo || undefined;
      taskItem.referenceLink = editingReferenceVideo || videographerReferenceLink || scriptReferenceVideoLink || rawFootageLink || undefined;
      taskItem.rawFootageLink = rawFootageLink || videographerRawFootageLink || undefined;
      taskItem.driveLink = rawFootageLink || videographerRawFootageLink || finalVideoDriveLink || undefined;
      taskItem.voiceOverAudioLink = voiceOverAudioLink || undefined;
      taskItem.musicReferenceLink = musicReferenceLink || undefined;
      taskItem.brandAssetsDriveLink = brandAssetsDriveLink || undefined;
      taskItem.finalVideoDriveLink = finalVideoDriveLink || undefined;
      taskItem.captionOnScreenText = captionOnScreenText || scriptOnScreenText || undefined;
      taskItem.editingInstructions = editingInstructions || undefined;
      taskItem.editingStatus = editorStatus || 'pending';

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
      taskItem.shootTime = shootTime || undefined;
      taskItem.shootLocation = shootLocation || undefined;
      taskItem.shootLocationLink = shootLocationLink || undefined;
      taskItem.referenceVideoLink = videographerReferenceLink || editingReferenceVideo || undefined;
      taskItem.requiredShots = requiredShots || undefined;
      taskItem.presenterPerson = presenterPerson || undefined;
      taskItem.equipmentRequired = [...equipmentRequired];
      taskItem.specialInstructions = specialInstructions || undefined;
      taskItem.shootStatus = videographerStatus || 'pending';
      taskItem.videographerContentNeeded = [requiredShots, shootLocation, presenterPerson].filter(Boolean).join(' • ') || undefined;

      // SMM Details
      taskItem.publisherAssigned = smmUserId || undefined;
      taskItem.publisherName = smmUserObj?.name || '';
      taskItem.postingScheduleDate = postDate || undefined;
      taskItem.publishingDate = postDate || undefined;
      taskItem.publishingTime = smmTime || undefined;
      taskItem.postingPlatforms = [...selectedPlatforms];
      taskItem.caption = smmCaption || undefined;
      taskItem.hashtags = smmHashtags || undefined;
      taskItem.cta = smmCta || 'None';
      taskItem.coverImageDriveLink = smmCoverImageLink || undefined;
      taskItem.publishedPostUrl = publishedPostUrl || undefined;
      taskItem.postingStatus = smmStatus || 'pending';

      // Scriptwriter Details
      taskItem.scriptWriterAssigned = scriptWriterUserId || undefined;
      taskItem.scriptWriterName = scriptWriterUserObj?.name || '';
      taskItem.language = scriptLanguage || 'English';
      taskItem.hookOpeningLine = contentHook || undefined;
      taskItem.contentIdea = contentHook || undefined;
      taskItem.fullScript = scriptText || undefined;
      taskItem.scriptText = scriptText || contentHook || undefined;
      taskItem.sceneBySceneInstructions = scriptSceneInstructions || undefined;
      taskItem.onScreenText = scriptOnScreenText || captionOnScreenText || undefined;
      taskItem.scriptLink = scriptLink || undefined;
      taskItem.voiceScriptText = scriptText || undefined;

      // Designer Details
      taskItem.designerAssigned = designerUserId || undefined;
      taskItem.designerName = designerUserObj?.name || '';
      taskItem.designDueDate = designDueDate || undefined;

      // Auto-collect all assigned roles for task.assignedTo
      const subIds = [
        editorUserId,
        videographerUserId,
        scriptWriterUserId,
        designerUserId,
        smmUserId,
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
    setScriptText('');
    setRawFootageLink('');
    setEditingReferenceVideo('');
    setVideographerReferenceLink('');
    setScriptReferenceVideoLink('');
    setFinalVideoDriveLink('');
    setVoiceOverAudioLink('');
    setMusicReferenceLink('');
    setCaptionOnScreenText('');
    setEditingInstructions('');
    setShootLocation('');
    setRequiredShots('');
    setPresenterPerson('');
    setSmmCaption('');
    setSmmHashtags('');
    setPublishedPostUrl('');
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
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Assign & Create Deliverables
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure team assignments with video types, reference links, and schedules
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* SECTION 1: CORE CLASSIFICATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Category Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                1. Select Task Stream
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTaskCategory('content');
                    setSubType('reel');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                    taskCategory === 'content'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  <span>🎬 Content & Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaskCategory('non_content');
                    setSubType('website_development');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                    taskCategory === 'non_content'
                      ? 'border-sky-600 bg-sky-50/80 text-sky-700 shadow-xs dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Code2 className="h-4 w-4" />
                  <span>💻 Tech & Ops</span>
                </button>
              </div>
            </div>

            {/* Sub-Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                2. Deliverable Type
              </label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
              >
                {(taskCategory === 'content' ? CONTENT_TYPE_OPTIONS : TECH_TYPE_OPTIONS).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 2: TITLE & TARGET CLIENT / PROJECT */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 space-y-4">
            {/* Task Name / Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Task Title / Video Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Descriptive title for Kanban & reports
                </span>
              </div>
              <input
                type="text"
                placeholder={
                  taskCategory === 'content'
                    ? 'e.g. 5 Signs You Need CRM Automation (Reel #14)'
                    : 'e.g. Implement Responsive Navbar & Footer Redesign'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Client & Project Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Name
                </label>
                <select
                  value={singleClientId}
                  onChange={(e) => setSingleClientId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">General / Internal (No Client)</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      🏢 {c.name || c.company}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project
                </label>
                <select
                  value={singleProjectId}
                  onChange={(e) => setSingleProjectId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">No Project Assigned</option>
                  {clientSpecificProjects.length > 0 && (
                    <optgroup label="Client Projects">
                      {clientSpecificProjects.map((p) => (
                        <option key={p._id} value={p._id}>
                          📁 {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherProjects.length > 0 && (
                    <optgroup label="Other Projects">
                      {otherProjects.map((p) => (
                        <option key={p._id} value={p._id}>
                          📁 {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer capitalize"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>

              {/* NF ID (Notion ID / Numbering) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NF ID / Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. NF-082"
                  value={nfId}
                  onChange={(e) => setNfId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Timer Allocation & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deadline Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allocated Timer
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={allocatedHours}
                    onChange={(e) => setAllocatedHours(e.target.value)}
                    className="h-9 w-16 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <span className="text-xs text-slate-500">hrs</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={allocatedMinutes}
                    onChange={(e) => setAllocatedMinutes(e.target.value)}
                    className="h-9 w-16 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <span className="text-xs text-slate-500">mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ROLE DETAILS & FORMS */}
          {taskCategory === 'non_content' ? (
            /* NON-CONTENT / TECH FORM */
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/20 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/15 space-y-4">
              <div className="flex items-center justify-between border-b border-sky-200/60 pb-2 dark:border-sky-900/40">
                <span className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 size={15} className="text-sky-600 dark:text-sky-400" /> Developer & Scope Assignment
                </span>
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  Engineering & Ops Workflow
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Developer / Assignee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">Select Developer...</option>
                    {roleGroups.developers.length > 0 && (
                      <optgroup label="💻 Software & Web Engineers">
                        {roleGroups.developers.map((u) => (
                          <option key={u._id} value={u._id}>
                            💻 {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="All Team Members">
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.position || u.role})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {subType === 'bug_fix' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bug Severity
                    </label>
                    <select
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="low">Low Severity</option>
                      <option value="medium">Medium Severity</option>
                      <option value="high">High Severity</option>
                      <option value="critical">Critical (P0 Blocker)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Scope & Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe technical implementation requirements, expected behaviors, acceptance criteria..."
                  value={techScope}
                  onChange={(e) => setTechScope(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

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
            /* CONTENT DELIVERABLE FORMS (4 TEAM FORMS) */
            <div className="space-y-4">
              {/* ────────────────────────────────────────────────────────── */}
              {/* 1. SCRIPTWRITER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 dark:border-amber-900/40">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} className="text-amber-600 dark:text-amber-400" /> Scriptwriter Form
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Hook, Language, Concept & Full Script
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Scriptwriter Member */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scriptwriter
                    </label>
                    <select
                      value={scriptWriterUserId}
                      onChange={(e) => setScriptWriterUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="">Unassigned (Optional)</option>
                      {roleGroups.scriptwriters.length > 0 && (
                        <optgroup label="✍️ Scriptwriters / Copywriters">
                          {roleGroups.scriptwriters.map((u) => (
                            <option key={u._id} value={u._id}>
                              ✍️ {u.name} ({u.position || u.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Team Members">
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Video Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Type
                    </label>
                    <select
                      value={scriptVideoType}
                      onChange={(e) => setScriptVideoType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {VIDEO_TYPES_OPTIONS.map((vt) => (
                        <option key={vt} value={vt}>{vt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Language
                    </label>
                    <select
                      value={scriptLanguage}
                      onChange={(e) => setScriptLanguage(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {SCRIPT_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  {/* CTA */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Call To Action (CTA)
                    </label>
                    <select
                      value={scriptCta}
                      onChange={(e) => setScriptCta(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {CTA_OPTIONS.map((cta) => (
                        <option key={cta} value={cta}>{cta}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Reference Video Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reference Video Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/... or YouTube"
                      value={scriptReferenceVideoLink}
                      onChange={(e) => setScriptReferenceVideoLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Google Docs Script Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Google Docs Script Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/document/..."
                      value={scriptLink}
                      onChange={(e) => setScriptLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Script Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Script Status
                    </label>
                    <select
                      value={scriptStatus}
                      onChange={(e) => setScriptStatus(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {STATUS_SCRIPT_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Hook / Opening Line */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hook / Opening Line
                  </label>
                  <input
                    type="text"
                    placeholder="3-second hook or opening line to grab attention..."
                    value={contentHook}
                    onChange={(e) => setContentHook(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Full Script */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Script
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter complete video script or dialogue lines..."
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Scene Instructions & On-screen text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scene-by-Scene Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Scene 1: Close-up of product... Scene 2: Transition..."
                      value={scriptSceneInstructions}
                      onChange={(e) => setScriptSceneInstructions(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      On-Screen Text / Captions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Text popups, bullet points to display on screen..."
                      value={scriptOnScreenText}
                      onChange={(e) => setScriptOnScreenText(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 2. VIDEOGRAPHER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-4 sm:p-5 dark:border-blue-900/60 dark:bg-blue-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2 dark:border-blue-900/40">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={15} className="text-blue-600 dark:text-blue-400" /> Videographer Form
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    Shoot Schedule, Location & Equipment
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Video Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Type
                    </label>
                    <select
                      value={videographerVideoType}
                      onChange={(e) => setVideographerVideoType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {VIDEO_TYPES_OPTIONS.map((vt) => (
                        <option key={vt} value={vt}>{vt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Video Format */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Format
                    </label>
                    <select
                      value={videographerVideoFormat}
                      onChange={(e) => setVideographerVideoFormat(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="Vertical">Vertical (9:16)</option>
                      <option value="Horizontal">Horizontal (16:9)</option>
                      <option value="Square">Square (1:1)</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Shoot Status
                    </label>
                    <select
                      value={videographerStatus}
                      onChange={(e) => setVideographerStatus(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {STATUS_VIDEOGRAPHER_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

                  {/* Shoot Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Shoot Time
                    </label>
                    <input
                      type="time"
                      value={shootTime}
                      onChange={(e) => setShootTime(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Shoot Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Shoot Location
                    </label>
                    <input
                      type="text"
                      placeholder="Studio / Client premises..."
                      value={shootLocation}
                      onChange={(e) => setShootLocation(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Google Maps Location Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Google Maps Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={shootLocationLink}
                      onChange={(e) => setShootLocationLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Reference Video Link with Saved Reference Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reference Video Link
                    </label>
                    {clientSavedRefVideos.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setVideographerReferenceLink(e.target.value);
                        }}
                        className="h-7 w-full mb-1.5 rounded-lg border border-blue-200 bg-white px-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                      >
                        <option value="">Choose saved reference...</option>
                        {clientSavedRefVideos.map((r) => (
                          <option key={r.id} value={r.url}>{r.title}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/..."
                      value={videographerReferenceLink}
                      onChange={(e) => setVideographerReferenceLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Presenter / Person Required */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Presenter / Person Required
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CEO John Doe / Model Anna"
                      value={presenterPerson}
                      onChange={(e) => setPresenterPerson(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Raw Footage Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Raw Footage Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={videographerRawFootageLink}
                      onChange={(e) => setVideographerRawFootageLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Equipment Required (multi-select toggle pills) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Equipment Required
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((item) => {
                      const isSelected = equipmentRequired.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEquipmentRequired(equipmentRequired.filter((eq) => eq !== item));
                            } else {
                              setEquipmentRequired([...equipmentRequired, item]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Required Shots & Special Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Required Shots / Shot List
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Shot 1: Product unboxing... Shot 2: Slow motion spin..."
                      value={requiredShots}
                      onChange={(e) => setRequiredShots(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lighting preferences, audio requirements, client instructions..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 3. VIDEO EDITOR DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4 sm:p-5 dark:border-purple-900/60 dark:bg-purple-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2 dark:border-purple-900/40">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors size={15} className="text-purple-600 dark:text-purple-400" /> Video Editor Form
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
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Edit Due Date */}
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

                  {/* Edit Start Date */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Video Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Type
                    </label>
                    <select
                      value={editorVideoType}
                      onChange={(e) => setEditorVideoType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {VIDEO_TYPES_OPTIONS.map((vt) => (
                        <option key={vt} value={vt}>{vt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Video Format */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Format
                    </label>
                    <select
                      value={editorVideoFormat}
                      onChange={(e) => setEditorVideoFormat(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {VIDEO_FORMAT_OPTIONS.map((fmt) => (
                        <option key={fmt} value={fmt}>{fmt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Video Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Video Duration
                    </label>
                    <select
                      value={editorVideoDuration}
                      onChange={(e) => setEditorVideoDuration(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {VIDEO_DURATION_OPTIONS.map((dur) => (
                        <option key={dur} value={dur}>{dur}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Editor Status
                    </label>
                    <select
                      value={editorStatus}
                      onChange={(e) => setEditorStatus(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {STATUS_EDITOR_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Editing Reference Video Link with Saved Reference Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Editing Reference Video Link
                    </label>
                    {clientSavedRefVideos.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setEditingReferenceVideo(e.target.value);
                        }}
                        className="h-7 w-full mb-1.5 rounded-lg border border-purple-200 bg-white px-2 text-[11px] text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                      >
                        <option value="">Select saved reference...</option>
                        {clientSavedRefVideos.map((r) => (
                          <option key={r.id} value={r.url}>{r.title}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/..."
                      value={editingReferenceVideo}
                      onChange={(e) => setEditingReferenceVideo(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Raw Footage Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Raw Footage Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={rawFootageLink}
                      onChange={(e) => setRawFootageLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Final Video Drive Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Final Video Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/..."
                      value={finalVideoDriveLink}
                      onChange={(e) => setFinalVideoDriveLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Voice-over Audio Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Voice-over Audio Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... or dropbox"
                      value={voiceOverAudioLink}
                      onChange={(e) => setVoiceOverAudioLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Music Reference Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Music Reference Link
                    </label>
                    <input
                      type="url"
                      placeholder="Spotify, YouTube, or audio drive link"
                      value={musicReferenceLink}
                      onChange={(e) => setMusicReferenceLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Logo / Brand Assets Drive Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Logo / Brand Assets Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={brandAssetsDriveLink}
                      onChange={(e) => setBrandAssetsDriveLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Caption / On-screen Text
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lower thirds, title cards, captions to embed..."
                      value={captionOnScreenText}
                      onChange={(e) => setCaptionOnScreenText(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Editing Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Cut speed, pacing, color grade LUTs, sound effects..."
                      value={editingInstructions}
                      onChange={(e) => setEditingInstructions(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 4. SMM DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2 dark:border-emerald-900/40">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 size={15} className="text-emerald-600 dark:text-emerald-400" /> SMM Team Form
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Publishing, Schedule & Format
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={postDate}
                      onChange={(e) => setPostDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Scheduled Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scheduled Time
                    </label>
                    <input
                      type="time"
                      value={smmTime}
                      onChange={(e) => setSmmTime(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* SMM Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMM Status
                    </label>
                    <select
                      value={smmStatus}
                      onChange={(e) => setSmmStatus(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {STATUS_SMM_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Content Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Content Type
                    </label>
                    <select
                      value={smmContentType}
                      onChange={(e) => setSmmContentType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {['Reel', 'Post', 'Carousel', 'Story', 'YouTube Short'].map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  {/* CTA */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CTA (Call To Action)
                    </label>
                    <select
                      value={smmCta}
                      onChange={(e) => setSmmCta(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      {CTA_OPTIONS.map((cta) => (
                        <option key={cta} value={cta}>{cta}</option>
                      ))}
                    </select>
                  </div>

                  {/* Final Creative / Video Drive Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Creative Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={smmFinalCreativeLink}
                      onChange={(e) => setSmmFinalCreativeLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>

                  {/* Cover Image Drive Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cover Image Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={smmCoverImageLink}
                      onChange={(e) => setSmmCoverImageLink(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Published Post URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Published Post URL (Live Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/p/... or YouTube link once published"
                    value={publishedPostUrl}
                    onChange={(e) => setPublishedPostUrl(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
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

                {/* Caption & Hashtags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Caption
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Write social post caption..."
                      value={smmCaption}
                      onChange={(e) => setSmmCaption(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hashtags
                    </label>
                    <textarea
                      rows={2}
                      placeholder="#agency #marketing #business #growth..."
                      value={smmHashtags}
                      onChange={(e) => setSmmHashtags(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 5. DESIGNER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800/40">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={15} className="text-pink-500" /> Graphic Designer Details
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Graphic & Thumbnail Design
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Graphic Designer
                    </label>
                    <select
                      value={designerUserId}
                      onChange={(e) => setDesignerUserId(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
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
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.position || u.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Design Due Date
                    </label>
                    <input
                      type="date"
                      value={designDueDate}
                      onChange={(e) => setDesignDueDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: DELIVERABLE CHECKLIST BUILDER */}
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

          {/* SECTION 5: QUEUED TASKS LIST (Multi-Task Builder) */}
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
