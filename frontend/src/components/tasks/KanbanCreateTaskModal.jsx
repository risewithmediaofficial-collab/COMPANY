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
  Instagram,
  Youtube,
  Briefcase,
  Users,
  Globe,
  FolderKanban,
} from '@/components/ui/muiIcons';
import { useCreateTask } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useUsers } from '../../hooks/useUsers';
import api from '../../api';
import { devApi } from '../../api/development';
import DuplicateConfirmDialog from '../modals/DuplicateConfirmDialog';
import { toast } from 'sonner';
import { SelectDropdown } from '../ui/SelectDropdown';
import { ProjectTaskTargetsBanner } from '../projects/ProjectTaskTargetsBanner';

export const PLATFORM_OPTIONS = [
  { id: 'Instagram', label: 'Instagram', Icon: Instagram },
  { id: 'YouTube', label: 'YouTube', Icon: Youtube },
  { id: 'LinkedIn', label: 'LinkedIn', Icon: Briefcase },
  { id: 'Facebook', label: 'Facebook', Icon: Users },
  { id: 'Twitter', label: 'X / Twitter', Icon: Globe },
  { id: 'TikTok', label: 'TikTok', Icon: Music },
];

export const CONTENT_TYPE_OPTIONS = [
  { id: 'reel', label: 'Reel / Short', defaultChecklist: ['Hook & Scripting', 'Raw Footage Sourced', 'Edit & Subtitles', 'Sound Design & Final Export'] },
  { id: 'video_content', label: 'Long Video', defaultChecklist: ['Outline & Script', 'A-Roll / B-Roll Sourced', 'Rough Cut', 'Color Grading & Final Polish'] },
  { id: 'poster', label: 'Graphic / Poster', defaultChecklist: ['Design Brief / Copy', 'Creative Layout & Visuals', 'Export for Social Specs'] },
  { id: 'carousel', label: 'Carousel Post', defaultChecklist: ['Slide 1 Hook Copy', 'Slide Content & Visuals', 'Call To Action Slide', 'Final Multi-slide Export'] },
  { id: 'content', label: 'Script / Copy', defaultChecklist: ['Market Research', 'Hook & Angle Draft', 'Full Body Script', 'Proofread & Review'] },
];

export const TECH_TYPE_OPTIONS = [
  { id: 'website_development', label: 'Web Feature / Dev', defaultChecklist: ['Spec Review', 'Component / API Implementation', 'Responsive Mobile Check', 'Deploy to Staging'] },
  { id: 'bug_fix', label: 'Bug Fix / Patch', defaultChecklist: ['Reproduce Error', 'Isolate Root Cause', 'Write Code Fix', 'Unit / Integration Test'] },
  { id: 'website_update', label: 'Website Update', defaultChecklist: ['Asset Gathering', 'Apply Updates', 'Cross-browser Verification'] },
  { id: 'seo_work', label: 'SEO & Performance', defaultChecklist: ['Audit & Keyword Plan', 'Meta Tags & Schema', 'Core Web Vitals Test'] },
  { id: 'custom_task', label: 'Tech Infrastructure', defaultChecklist: ['Scope Definition', 'Implementation', 'Documentation'] },
  { id: 'client_support', label: 'Operations / Support', defaultChecklist: ['Review Request', 'Execute Task', 'Notify Client / Manager'] },
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
    setQueuedTasks([]);
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const createTaskMutation = useCreateTask();
  const { data: clientsData = [] } = useClients();
  const { data: projectsData = [] } = useProjects();
  const { data: usersData = [] } = useUsers();

  const clients = useMemo(
    () => (Array.isArray(clientsData) ? clientsData : clientsData?.clients || []),
    [clientsData]
  );
  const projects = useMemo(
    () => (Array.isArray(projectsData) ? projectsData : projectsData?.projects || []),
    [projectsData]
  );
  const users = useMemo(() => {
    const list = Array.isArray(usersData) ? usersData : usersData?.users || [];
    return list.filter((u) => u.role !== 'client');
  }, [usersData]);

  // Mode: 'content' | 'non_content'
  const [taskCategory, setTaskCategory] = useState('content');
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    title: 'Duplicate Task Detected',
    message: '',
    existingRecord: null,
    onConfirm: null,
  });
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
  const [allocatedHours, setAllocatedHours] = useState('');
  const [allocatedMinutes, setAllocatedMinutes] = useState('');
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
  const [extraShootUserIds, setExtraShootUserIds] = useState([]);
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
  const [customEquipmentInput, setCustomEquipmentInput] = useState('');
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
  const [isDevTeamTask, setIsDevTeamTask] = useState(false);

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
    if (!isModalOpen) return;

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
      if (initialValues.allocatedHours !== undefined) setAllocatedHours(initialValues.allocatedHours ?? '');
      if (initialValues.allocatedMinutes !== undefined) setAllocatedMinutes(initialValues.allocatedMinutes ?? '');
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
  }, [isModalOpen, initialUser, initialValues]);

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
        setSingleProjectId((prev) => {
          const alreadyValid = specific.some((p) => p._id === prev);
          return alreadyValid ? prev : specific[0]._id;
        });
      } else {
        setSingleProjectId('');
      }
    }
  }, [singleClientId, projects]);

  if (!isOpen && !open) return null;

  const kanbanTargetDate = postDate ? new Date(postDate) : dueDate ? new Date(dueDate) : new Date();
  const kanbanMonth = !isNaN(kanbanTargetDate.getTime()) ? kanbanTargetDate.getMonth() + 1 : new Date().getMonth() + 1;
  const kanbanYear = !isNaN(kanbanTargetDate.getTime()) ? kanbanTargetDate.getFullYear() : new Date().getFullYear();

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
      taskItem.isDevTeamTask = isDevTeamTask;
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
      taskItem.extraShootPersons = [...extraShootUserIds];
      taskItem.extraShootPersonNames = extraShootUserIds
        .map((id) => users.find((u) => u._id === id)?.name)
        .filter(Boolean);
      taskItem.shootDate = shootDate || undefined;
      taskItem.shootTime = shootTime || undefined;
      taskItem.shootLocation = shootLocation || undefined;
      taskItem.shootLocationLink = shootLocationLink || undefined;
      taskItem.referenceVideoLink = videographerReferenceLink || editingReferenceVideo || undefined;
      taskItem.requiredShots = requiredShots || undefined;
      taskItem.presenterPerson = presenterPerson || undefined;
      taskItem.equipmentRequired = [...equipmentRequired];
      taskItem.equipmentChecklist = equipmentRequired.map((name) => ({
        name,
        checked: false,
      }));
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
        ...extraShootUserIds,
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
  const executeTasksSubmit = async (tasksToSubmit) => {
    try {
      const devTasks = tasksToSubmit.filter((t) => t.isDevTeamTask);
      const regularTasks = tasksToSubmit.filter((t) => !t.isDevTeamTask);

      for (const devItem of devTasks) {
        await devApi.createTask({
          title: devItem.title,
          taskTitle: devItem.title,
          taskType: devItem.taskType || 'feature',
          priority: devItem.priority || 'medium',
          stage: 'backlog',
          dueDate: devItem.dueDate || undefined,
          projectId: devItem.project || undefined,
          project: devItem.project || undefined,
          client: devItem.client || undefined,
          assignedTo: devItem.assignedTo || [],
          description: devItem.description || devItem.requirementDetails || '',
          scope: devItem.requirementDetails || '',
          repoLink: devItem.referenceLink || '',
          checklist: devItem.checklist || [],
        });
      }

      if (regularTasks.length === 1) {
        await createTaskMutation.mutateAsync(regularTasks[0]);
      } else if (regularTasks.length > 1) {
        await createTaskMutation.mutateAsync({ tasks: regularTasks });
      }

      if (devTasks.length > 0 && regularTasks.length === 0) {
        toast.success(`Task assigned to Dev Team and routed directly to Development Board!`);
      } else if (devTasks.length > 0 && regularTasks.length > 0) {
        toast.success(`Tasks created! ${devTasks.length} routed to Dev Board, ${regularTasks.length} created in Tasks.`);
      } else {
        toast.success(`Task created successfully!`);
      }

      setQueuedTasks([]);
      setTitle('');
      if (onTaskCreated) onTaskCreated();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task(s)');
    }
  };

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

    if (tasksToSubmit.length === 1 && tasksToSubmit[0].project) {
      try {
        const res = await api.post('/check-duplicate', {
          type: 'task',
          data: { title: tasksToSubmit[0].title, project: tasksToSubmit[0].project },
        });
        if (res.data?.isDuplicate) {
          setDuplicateDialog({
            open: true,
            title: 'Duplicate Task Detected',
            message: res.data.message,
            existingRecord: res.data.existingRecord,
            onConfirm: () => executeTasksSubmit(tasksToSubmit),
          });
          return;
        }
      } catch (err) {}
    }

    await executeTasksSubmit(tasksToSubmit);
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[999] flex justify-end bg-black/60 animate-in fade-in duration-200"
    >
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex-col bg-background text-foreground shadow-[-24px_0_48px_-12px_rgb(0,0,0,0.12)] dark:shadow-[-24px_0_48px_-12px_rgb(0,0,0,0.5)] animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                Assign &amp; Create Deliverables
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 space-y-6 custom-scrollbar text-left">
          {/* SECTION 1: CORE CLASSIFICATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Category Switcher */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                1. Select Task Stream
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTaskCategory('content');
                    setSubType('reel');
                  }}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all cursor-pointer ${
                    taskCategory === 'content'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/75 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Video className="h-4 w-4 shrink-0" />
                  <span>Content & Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaskCategory('non_content');
                    setSubType('website_development');
                  }}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all cursor-pointer ${
                    taskCategory === 'non_content'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/75 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Code2 className="h-4 w-4 shrink-0" />
                  <span>Tech & Ops</span>
                </button>
              </div>
            </div>

            {/* Sub-Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                2. Deliverable Type
              </label>
              <SelectDropdown
                value={subType}
                onChange={(val) => setSubType(val || 'reel')}
                options={(taskCategory === 'content' ? CONTENT_TYPE_OPTIONS : TECH_TYPE_OPTIONS).map((opt) => ({
                  value: opt.id,
                  label: opt.label,
                }))}
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
              />
            </div>
          </div>

          {/* SECTION 2: TITLE & TARGET CLIENT / PROJECT */}
          <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-5">
            {/* Task Name / Title */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Task Title / Video Title *
              </label>
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
                className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            {/* Client & Project Rows (Max 2 columns, Google Form style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Client Name
                </label>
                <SelectDropdown
                  value={singleClientId}
                  onChange={(val) => setSingleClientId(val || '')}
                  options={clients.map((c) => ({
                    value: c._id,
                    label: c.name || c.company,
                    subLabel: c.company && c.name ? c.company : undefined,
                  }))}
                  placeholder="General / Internal (No Client)"
                  allOptionLabel="General / Internal (No Client)"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Project
                </label>
                <SelectDropdown
                  value={singleProjectId}
                  onChange={(val) => setSingleProjectId(val || '')}
                  options={[
                    ...clientSpecificProjects.map((p) => ({
                      value: p._id,
                      label: p.name,
                      subLabel: 'Client Project',
                    })),
                    ...otherProjects.map((p) => ({
                      value: p._id,
                      label: p.name,
                      subLabel: 'Other Project',
                    })),
                  ]}
                  placeholder="No Project Assigned"
                  allOptionLabel="No Project Assigned"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                />
              </div>
            </div>

            {/* Project Monthly Deliverables Targets Banner */}
            {singleProjectId && (
              <ProjectTaskTargetsBanner
                projectId={singleProjectId}
                month={kanbanMonth}
                year={kanbanYear}
                activeDeliverableType={subType}
                onSelectDeliverable={(item) => {
                  const norm = (item.contentType || '').toLowerCase().trim();
                  setTaskCategory('content');
                  if (norm.includes('reel') || norm.includes('short')) {
                    setSubType('reel');
                  } else if (norm.includes('video') || norm.includes('youtube')) {
                    setSubType('video_content');
                  } else if (norm.includes('story')) {
                    setSubType('content');
                  } else if (norm.includes('carousel')) {
                    setSubType('carousel');
                  } else {
                    setSubType('poster');
                  }
                }}
              />
            )}

            {/* Priority & NF ID (Max 2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Priority
                </label>
                <SelectDropdown
                  value={priority}
                  onChange={(val) => setPriority(val || 'medium')}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm font-normal rounded-xl capitalize"
                />
              </div>

              {/* NF ID (Notion ID / Numbering) */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  NF ID / Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. NF-082"
                  value={nfId}
                  onChange={(e) => setNfId(e.target.value)}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Deadline Date & Due Time (Max 2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Deadline Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Allocated Timer (Duration) (Max 2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Allocated Timer (Duration)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={allocatedHours ?? ''}
                      onChange={(e) => setAllocatedHours(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background pl-4 pr-10 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">hrs</span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={allocatedMinutes ?? ''}
                      onChange={(e) => setAllocatedMinutes(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background pl-4 pr-12 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">mins</span>
                  </div>
                </div>
              </div>

              <div className="flex items-end pb-1">
                <span className="text-xs text-muted-foreground">
                  Total active working time allowed for this task before countdown alert.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: ROLE DETAILS & FORMS */}
          {taskCategory === 'non_content' ? (
            /* NON-CONTENT / TECH FORM */
            <div className="rounded-2xl bg-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Code2 size={16} className="text-muted-foreground shrink-0" /> Developer &amp; Scope Assignment
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Engineering &amp; Ops Workflow
                </span>
              </div>

              {/* Row 1: Assignee Developer & Bug Severity (Max 2 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Lead Developer / Assignee *
                  </label>
                  <SelectDropdown
                    value={selectedUserId}
                    onChange={(val) => setSelectedUserId(val || '')}
                    options={users.map((u) => ({
                      value: u._id,
                      label: u.name,
                      subLabel: u.position || u.role,
                    }))}
                    placeholder="Select Developer..."
                    allowCustom={false}
                    className="w-full"
                    buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                  />
                </div>

                {subType === 'bug_fix' && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Bug Severity
                    </label>
                    <SelectDropdown
                      value={bugSeverity}
                      onChange={(val) => setBugSeverity(val || 'medium')}
                      options={[
                        { value: 'low', label: 'Low Severity' },
                        { value: 'medium', label: 'Medium Severity' },
                        { value: 'high', label: 'High Severity' },
                        { value: 'critical', label: 'Critical (P0 Blocker)' },
                      ]}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Row 2: Repository / Spec Link (Full width) */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Repository / Figma / Spec Link
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://figma.com/..."
                  value={repoLink}
                  onChange={(e) => setRepoLink(e.target.value)}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                />
              </div>

              {/* Row 3: Scope & Requirements (Full width) */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Scope &amp; Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe technical implementation requirements, expected behaviors, acceptance criteria..."
                  value={techScope}
                  onChange={(e) => setTechScope(e.target.value)}
                  className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Dev Team Checkbox / Tick button */}
              <div
                onClick={() => setIsDevTeamTask(!isDevTeamTask)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isDevTeamTask
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border/60 hover:bg-secondary/40 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                      isDevTeamTask
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/50'
                    }`}
                  >
                    {isDevTeamTask && <Check size={14} className="stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-foreground">
                      Assign to Dev Team (Route to Dev Board)
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Directly routes to Development Board (/development/board) &mdash; will not appear in general tasks.
                    </span>
                  </div>
                </div>
                <Code2 className="h-5 w-5 shrink-0 opacity-70" />
              </div>
            </div>
          ) : (
            /* CONTENT DELIVERABLE FORMS (5 TEAM FORMS) */
            <div className="space-y-5">
              {/* ────────────────────────────────────────────────────────── */}
              {/* 1. SCRIPTWRITER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText size={15} className="text-muted-foreground shrink-0" /> Scriptwriter Form
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Hook, Language, Concept &amp; Full Script
                  </span>
                </div>

                {/* Row 1: Scriptwriter & Script Status (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scriptwriter Member */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Scriptwriter
                    </label>
                    <SelectDropdown
                      value={scriptWriterUserId}
                      onChange={(val) => setScriptWriterUserId(val || '')}
                      options={(roleGroups.scriptwriters.length > 0 ? roleGroups.scriptwriters : users).map((u) => ({
                        value: u._id,
                        label: u.name,
                        subLabel: u.position || u.role,
                      }))}
                      placeholder="Unassigned (Optional)"
                      allOptionLabel="Unassigned (Optional)"
                      allowCustom={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Script Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Script Status
                    </label>
                    <SelectDropdown
                      value={scriptStatus}
                      onChange={(val) => setScriptStatus(val || 'Draft')}
                      options={STATUS_SCRIPT_OPTIONS.map((st) => ({ value: st, label: st }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 2: Video Type & Language (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Video Type */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Type
                    </label>
                    <SelectDropdown
                      value={scriptVideoType}
                      onChange={(val) => setScriptVideoType(val || 'Promotional')}
                      options={VIDEO_TYPES_OPTIONS.map((vt) => ({ value: vt, label: vt }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Language
                    </label>
                    <SelectDropdown
                      value={scriptLanguage}
                      onChange={(val) => setScriptLanguage(val || 'English')}
                      options={SCRIPT_LANGUAGES.map((lang) => ({ value: lang, label: lang }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 3: Call To Action (CTA) & Google Docs Script Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CTA */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Call To Action (CTA)
                    </label>
                    <SelectDropdown
                      value={scriptCta}
                      onChange={(val) => setScriptCta(val || 'None')}
                      options={CTA_OPTIONS.map((cta) => ({ value: cta, label: cta }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Google Docs Script Link */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Google Docs Script Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/document/..."
                      value={scriptLink}
                      onChange={(e) => setScriptLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Reference Video Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Reference Video Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/... or YouTube"
                      value={scriptReferenceVideoLink}
                      onChange={(e) => setScriptReferenceVideoLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end pb-1">
                    <span className="text-xs text-muted-foreground">
                      Provide a reference reel or benchmark video for tone, pacing, and visual style.
                    </span>
                  </div>
                </div>

                {/* Row 5: Hook / Opening Line (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Hook / Opening Line
                  </label>
                  <input
                    type="text"
                    placeholder="3-second hook or opening line to grab attention..."
                    value={contentHook}
                    onChange={(e) => setContentHook(e.target.value)}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                  />
                </div>

                {/* Row 6: Full Script (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Full Script
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter complete video script or dialogue lines..."
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Row 7: Scene Instructions & On-screen text (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Scene-by-Scene Instructions
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Scene 1: Close-up of product... Scene 2: Transition..."
                      value={scriptSceneInstructions}
                      onChange={(e) => setScriptSceneInstructions(e.target.value)}
                      className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      On-Screen Text / Captions
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Text popups, bullet points to display on screen..."
                      value={scriptOnScreenText}
                      onChange={(e) => setScriptOnScreenText(e.target.value)}
                      className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 2. VIDEOGRAPHER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Camera size={15} className="text-muted-foreground shrink-0" /> Videographer Form
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Shoot Schedule, Location &amp; Equipment
                  </span>
                </div>

                {/* Row 1: Videographer & Shoot Status (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Videographer */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Videographer
                    </label>
                    <SelectDropdown
                      value={videographerUserId}
                      onChange={(val) => setVideographerUserId(val || '')}
                      options={(roleGroups.videographers.length > 0 ? roleGroups.videographers : users).map((u) => ({
                        value: u._id,
                        label: u.name,
                        subLabel: u.position || u.role,
                      }))}
                      placeholder="Unassigned (Optional)"
                      allOptionLabel="Unassigned (Optional)"
                      allowCustom={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Shoot Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Shoot Status
                    </label>
                    <SelectDropdown
                      value={videographerStatus}
                      onChange={(val) => setVideographerStatus(val || 'Scheduled')}
                      options={STATUS_VIDEOGRAPHER_OPTIONS.map((st) => ({ value: st, label: st }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Extra Shoot Crew / Assistants */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span>Extra Shoot Persons (Crew / Assistants)</span>
                      <span className="text-xs text-muted-foreground font-normal">Add extra team members attending shoot</span>
                    </label>
                    <div className="space-y-2">
                      <SelectDropdown
                        value=""
                        onChange={(val) => {
                          if (val && !extraShootUserIds.includes(val)) {
                            setExtraShootUserIds([...extraShootUserIds, val]);
                          }
                        }}
                        options={users
                          .filter((u) => u._id !== videographerUserId && !extraShootUserIds.includes(u._id))
                          .map((u) => ({
                            value: u._id,
                            label: u.name,
                            subLabel: u.position || u.role,
                          }))}
                        placeholder="+ Select Extra Shoot Member"
                        allowCustom={false}
                        allowDeselect={false}
                        className="w-full"
                        buttonClassName="h-10 bg-background text-xs font-semibold rounded-xl border border-dashed border-border/70 hover:border-primary/50"
                      />

                      {extraShootUserIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {extraShootUserIds.map((uid) => {
                            const uObj = users.find((u) => u._id === uid);
                            return (
                              <span
                                key={uid}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-foreground text-xs font-semibold"
                              >
                                <Users size={12} className="text-primary shrink-0" />
                                <span>{uObj?.name || 'Member'}</span>
                                <button
                                  type="button"
                                  onClick={() => setExtraShootUserIds(extraShootUserIds.filter((id) => id !== uid))}
                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Video Type & Video Format (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Video Type */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Type
                    </label>
                    <SelectDropdown
                      value={videographerVideoType}
                      onChange={(val) => setVideographerVideoType(val || 'Promotional')}
                      options={VIDEO_TYPES_OPTIONS.map((vt) => ({ value: vt, label: vt }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Video Format */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Format
                    </label>
                    <SelectDropdown
                      value={videographerVideoFormat}
                      onChange={(val) => setVideographerVideoFormat(val || 'Vertical')}
                      options={[
                        { value: 'Vertical', label: 'Vertical (9:16)' },
                        { value: 'Horizontal', label: 'Horizontal (16:9)' },
                        { value: 'Square', label: 'Square (1:1)' },
                      ]}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 3: Shoot Date & Shoot Time (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Shoot Date
                    </label>
                    <input
                      type="date"
                      value={shootDate}
                      onChange={(e) => setShootDate(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Shoot Time
                    </label>
                    <input
                      type="time"
                      value={shootTime}
                      onChange={(e) => setShootTime(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Shoot Location & Google Maps Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Shoot Location
                    </label>
                    <input
                      type="text"
                      placeholder="Studio / Client premises..."
                      value={shootLocation}
                      onChange={(e) => setShootLocation(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Google Maps Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={shootLocationLink}
                      onChange={(e) => setShootLocationLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 5: Reference Video Link & Presenter Required (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Reference Video Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/..."
                      value={videographerReferenceLink}
                      onChange={(e) => setVideographerReferenceLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Presenter / Person Required
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CEO John Doe / Model Anna"
                      value={presenterPerson}
                      onChange={(e) => setPresenterPerson(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 6: Raw Footage Drive Link (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Raw Footage Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={videographerRawFootageLink}
                    onChange={(e) => setVideographerRawFootageLink(e.target.value)}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                  />
                </div>

                {/* Row 7: Equipment Required (Full width with custom manual entry) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-foreground">
                      Equipment Required
                    </label>
                    <span className="text-xs text-muted-foreground font-normal">
                      Select standard equipments or enter manual custom gear
                    </span>
                  </div>

                  {/* Standard & Custom Equipment Pills */}
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
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}

                    {/* Custom / Manual equipments */}
                    {equipmentRequired
                      .filter((item) => !EQUIPMENT_OPTIONS.includes(item))
                      .map((customItem) => (
                        <span
                          key={customItem}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground"
                        >
                          <Check className="h-3 w-3 shrink-0" />
                          <span>{customItem}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEquipmentRequired(equipmentRequired.filter((eq) => eq !== customItem))
                            }
                            className="p-0.5 hover:opacity-80 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>

                  {/* Manual Equipment Entry Box */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customEquipmentInput}
                      onChange={(e) => setCustomEquipmentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customEquipmentInput.trim();
                          if (val && !equipmentRequired.includes(val)) {
                            setEquipmentRequired([...equipmentRequired, val]);
                            setCustomEquipmentInput('');
                          }
                        }
                      }}
                      placeholder="Other / Manual enter (e.g. Drone, Teleprompter, Slider, ND Filter)..."
                      className="h-10 flex-1 rounded-xl bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customEquipmentInput.trim();
                        if (val && !equipmentRequired.includes(val)) {
                          setEquipmentRequired([...equipmentRequired, val]);
                          setCustomEquipmentInput('');
                        }
                      }}
                      className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      + Add Other
                    </button>
                  </div>
                </div>

                {/* Row 8: Required Shots & Special Instructions (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Required Shots / Shot List
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Shot 1: Product unboxing... Shot 2: Slow motion spin..."
                      value={requiredShots}
                      onChange={(e) => setRequiredShots(e.target.value)}
                      className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Special Instructions
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Lighting preferences, audio requirements, client instructions..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 3. VIDEO EDITOR DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scissors size={15} className="text-muted-foreground shrink-0" /> Video Editor Form
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Video &amp; Graphic Editing Schedule
                  </span>
                </div>

                {/* Row 1: Editor & Editor Status (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Editor */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Editor
                    </label>
                    <SelectDropdown
                      value={editorUserId}
                      onChange={(val) => setEditorUserId(val || '')}
                      options={(roleGroups.editors.length > 0 ? roleGroups.editors : users).map((u) => ({
                        value: u._id,
                        label: u.name,
                        subLabel: u.position || u.role,
                      }))}
                      placeholder="Unassigned (Optional)"
                      allOptionLabel="Unassigned (Optional)"
                      allowCustom={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* Editor Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Editor Status
                    </label>
                    <SelectDropdown
                      value={editorStatus}
                      onChange={(val) => setEditorStatus(val || 'Pending')}
                      options={STATUS_EDITOR_OPTIONS.map((st) => ({ value: st, label: st }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 2: Edit Start Date & Edit Due Date (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Edit Start Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Edit Due Date
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Edit Reminder & Video Duration (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Edit Reminder
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Draft 2 PM"
                      value={editReminder}
                      onChange={(e) => setEditReminder(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Duration
                    </label>
                    <SelectDropdown
                      value={editorVideoDuration}
                      onChange={(val) => setEditorVideoDuration(val || '30 sec')}
                      options={VIDEO_DURATION_OPTIONS.map((dur) => ({ value: dur, label: dur }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 4: Video Type & Video Format (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Type
                    </label>
                    <SelectDropdown
                      value={editorVideoType}
                      onChange={(val) => setEditorVideoType(val || 'Promotional')}
                      options={VIDEO_TYPES_OPTIONS.map((vt) => ({ value: vt, label: vt }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Video Format
                    </label>
                    <SelectDropdown
                      value={editorVideoFormat}
                      onChange={(val) => setEditorVideoFormat(val || '9:16')}
                      options={VIDEO_FORMAT_OPTIONS.map((fmt) => ({ value: fmt, label: fmt }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 5: Editing Reference Video Link & Raw Footage Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Editing Reference Video Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/reel/..."
                      value={editingReferenceVideo}
                      onChange={(e) => setEditingReferenceVideo(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Raw Footage Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={rawFootageLink}
                      onChange={(e) => setRawFootageLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 6: Final Video Drive Link & Voice-over Audio Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Final Video Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/..."
                      value={finalVideoDriveLink}
                      onChange={(e) => setFinalVideoDriveLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Voice-over Audio Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... or Dropbox"
                      value={voiceOverAudioLink}
                      onChange={(e) => setVoiceOverAudioLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 7: Music Reference Link & Brand Assets Drive Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Music Reference Link
                    </label>
                    <input
                      type="url"
                      placeholder="Spotify, YouTube, or audio drive link"
                      value={musicReferenceLink}
                      onChange={(e) => setMusicReferenceLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Logo / Brand Assets Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={brandAssetsDriveLink}
                      onChange={(e) => setBrandAssetsDriveLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 8: Caption / On-screen Text (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Caption / On-screen Text
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Lower thirds, title cards, captions to embed..."
                    value={captionOnScreenText}
                    onChange={(e) => setCaptionOnScreenText(e.target.value)}
                    className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Row 9: Editing Instructions (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Editing Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cut speed, pacing, color grade LUTs, sound effects..."
                    value={editingInstructions}
                    onChange={(e) => setEditingInstructions(e.target.value)}
                    className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 4. SMM TEAM FORM */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Share2 size={15} className="text-muted-foreground shrink-0" /> SMM Team Form
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Publishing, Platforms, Schedule &amp; Captions
                  </span>
                </div>

                {/* Row 1: SMM Member & SMM Status (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SMM Member */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      SMM Member (Posting)
                    </label>
                    <SelectDropdown
                      value={smmUserId}
                      onChange={(val) => setSmmUserId(val || '')}
                      options={(roleGroups.smmMembers.length > 0 ? roleGroups.smmMembers : users).map((u) => ({
                        value: u._id,
                        label: u.name,
                        subLabel: u.position || u.role,
                      }))}
                      placeholder="Unassigned (Optional)"
                      allOptionLabel="Unassigned (Optional)"
                      allowCustom={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  {/* SMM Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      SMM Status
                    </label>
                    <SelectDropdown
                      value={smmStatus}
                      onChange={(val) => setSmmStatus(val || 'Content Pending')}
                      options={STATUS_SMM_OPTIONS.map((st) => ({ value: st, label: st }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 2: Scheduled Date & Scheduled Time (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={postDate}
                      onChange={(e) => setPostDate(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Scheduled Time
                    </label>
                    <input
                      type="time"
                      value={smmTime}
                      onChange={(e) => setSmmTime(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Content Type & CTA (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Content Type
                    </label>
                    <SelectDropdown
                      value={smmContentType}
                      onChange={(val) => setSmmContentType(val || 'Reel')}
                      options={['Reel', 'Post', 'Carousel', 'Story', 'YouTube Short'].map((ct) => ({ value: ct, label: ct }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      CTA (Call To Action)
                    </label>
                    <SelectDropdown
                      value={smmCta}
                      onChange={(val) => setSmmCta(val || 'None')}
                      options={CTA_OPTIONS.map((cta) => ({ value: cta, label: cta }))}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>
                </div>

                {/* Row 4: Creative Drive Link & Cover Image Link (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Creative Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={smmFinalCreativeLink}
                      onChange={(e) => setSmmFinalCreativeLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Cover Image Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={smmCoverImageLink}
                      onChange={(e) => setSmmCoverImageLink(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 5: Published Post URL (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Published Post URL (Live Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/p/... or YouTube link once published"
                    value={publishedPostUrl}
                    onChange={(e) => setPublishedPostUrl(e.target.value)}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                  />
                </div>

                {/* Row 6: Target Social Platforms (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Target Social Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((plat) => {
                      const isSelected = selectedPlatforms.includes(plat.id);
                      const PlatIcon = plat.Icon;
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
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary text-primary-foreground scale-[1.02]'
                              : ' bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          <PlatIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{plat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 7: Caption (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Caption
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write social post caption..."
                    value={smmCaption}
                    onChange={(e) => setSmmCaption(e.target.value)}
                    className="min-h-[96px] w-full rounded-xl bg-background px-4 py-3 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Row 8: Hashtags (Full width) */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Hashtags
                  </label>
                  <input
                    type="text"
                    placeholder="#agency #marketing #business #growth..."
                    value={smmHashtags}
                    onChange={(e) => setSmmHashtags(e.target.value)}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-brand/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 5. DESIGNER DETAILS CARD */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Palette size={15} className="text-muted-foreground shrink-0" /> Graphic Designer Form
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Graphic &amp; Thumbnail Design
                  </span>
                </div>

                {/* Row 1: Graphic Designer & Design Due Date (Max 2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Graphic Designer
                    </label>
                    <SelectDropdown
                      value={designerUserId}
                      onChange={(val) => setDesignerUserId(val || '')}
                      options={(roleGroups.designers.length > 0 ? roleGroups.designers : users).map((u) => ({
                        value: u._id,
                        label: u.name,
                        subLabel: u.position || u.role,
                      }))}
                      placeholder="Unassigned (Optional)"
                      allOptionLabel="Unassigned (Optional)"
                      allowCustom={false}
                      className="w-full"
                      buttonClassName="h-11 bg-background text-sm font-normal rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Design Due Date
                    </label>
                    <input
                      type="date"
                      value={designDueDate}
                      onChange={(e) => setDesignDueDate(e.target.value)}
                      className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal tabular-nums text-foreground focus:ring-1 focus:ring-brand/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: DELIVERABLE CHECKLIST BUILDER */}
          <div className="rounded-2xl bg-muted/40 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold tabular-nums text-foreground flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-muted-foreground shrink-0" /> Deliverable Checklist ({checklist.length} steps)
              </label>
              <span className="text-xs text-muted-foreground">
                Team members tick off steps during production
              </span>
            </div>

            <div className="space-y-1.5 mb-3">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
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
                className="h-11 flex-1 rounded-xl bg-background px-4 text-sm font-normal text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Step</span>
              </button>
            </div>
          </div>

          {/* SECTION 5: QUEUED TASKS LIST (Multi-Task Builder) */}
          {queuedTasks.length > 0 && (
            <div className="rounded-2xl bg-muted/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold tabular-nums text-primary-foreground ">
                    {queuedTasks.length}
                  </span>
                  <h4 className="text-xs font-bold tabular-nums text-foreground">
                    Queued Tasks ({queuedTasks.length}) — Ready to Create in 1 Click!
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setQueuedTasks([])}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {queuedTasks.map((q, idx) => (
                  <div
                    key={q.queueId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 "
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground">
                          #{idx + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground ">
                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{q.clientName}</span>
                        </span>
                        {q.projectName && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground ">
                            <FolderKanban className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{q.projectName}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground ">
                          <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{q.assignedPersonName}</span>
                        </span>
                        {q.nfId && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums text-foreground ">
                            #{q.nfId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">
                        {q.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedTask(q.queueId)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 cursor-pointer"
                      title="Remove task from queue"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-background px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto h-11 rounded-xl bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/80 text-center cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleAddToQueue}
              className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Another Task</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={createTaskMutation.isPending}
              className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold tabular-nums text-primary-foreground transition-all hover:bg-primary/95 disabled:opacity-60 cursor-pointer"
            >
              {createTaskMutation.isPending ? (
                <span>Creating Task...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" />
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

      <DuplicateConfirmDialog
        open={duplicateDialog.open}
        onOpenChange={(isOpen) => setDuplicateDialog((prev) => ({ ...prev, open: isOpen }))}
        title={duplicateDialog.title}
        message={duplicateDialog.message}
        existingRecord={duplicateDialog.existingRecord}
        onConfirm={duplicateDialog.onConfirm}
      />
    </div>,
    document.body
  );
};

export default KanbanCreateTaskModal;
