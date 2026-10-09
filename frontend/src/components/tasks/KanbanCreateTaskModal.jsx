import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Video,
  Code2,
  Building2,
  CheckCircle2,
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
  { id: 'website_development', label: '💻 Web Feature', defaultChecklist: ['Spec Review', 'Component / API Implementation', 'Responsive Mobile Check', 'Deploy to Staging'] },
  { id: 'bug_fix', label: '🐞 Bug Fix / Patch', defaultChecklist: ['Reproduce Error', 'Isolate Root Cause', 'Write Code Fix', 'Unit / Integration Test'] },
  { id: 'website_update', label: '⚡ Website Update', defaultChecklist: ['Asset Gathering', 'Apply Updates', 'Cross-browser Verification'] },
  { id: 'seo_work', label: '🔍 SEO & Performance', defaultChecklist: ['Audit & Keyword Plan', 'Meta Tags & Schema', 'Core Web Vitals Test'] },
  { id: 'custom_task', label: '⚙️ Tech Infrastructure', defaultChecklist: ['Scope Definition', 'Implementation', 'Documentation'] },
];

export const KanbanCreateTaskModal = ({
  isOpen,
  onClose,
  initialUser = null,
  onTaskCreated,
}) => {
  const createTaskMutation = useCreateTask();
  const { data: clientsData = [] } = useClients();
  const { data: projectsData = [] } = useProjects();
  const { data: usersData = [] } = useUsers();

  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.clients || [];
  const projects = Array.isArray(projectsData) ? projectsData : projectsData?.projects || [];
  const users = (Array.isArray(usersData) ? usersData : usersData?.users || []).filter(
    (u) => u.role !== 'client'
  );

  // Form State
  const [taskCategory, setTaskCategory] = useState('content'); // 'content' | 'non_content'
  const [subType, setSubType] = useState('reel');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  // Multi-Client Batch Mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [singleClientId, setSingleClientId] = useState('');
  const [singleProjectId, setSingleProjectId] = useState('');
  // Batch state: array of { clientId, projectId }
  const [batchSelections, setBatchSelections] = useState([]);

  // Content specific
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Instagram']);
  const [contentHook, setContentHook] = useState('');
  const [driveLink, setDriveLink] = useState('');

  // Tech specific
  const [techScope, setTechScope] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [bugSeverity, setBugSeverity] = useState('medium');

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Reset or initialize when modal opens or initialUser changes
  useEffect(() => {
    if (isOpen) {
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
        } else {
          setTaskCategory('content');
          setSubType('reel');
        }
      } else if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(users[0]._id);
      }

      // Default client if available
      if (clients.length > 0 && !singleClientId) {
        setSingleClientId(clients[0]._id);
      }
    }
  }, [isOpen, initialUser, users, clients]);

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

  // Filter projects by selected client in single mode
  const availableProjects = useMemo(() => {
    if (!singleClientId) return projects;
    return projects.filter(
      (p) =>
        (typeof p.client === 'object' ? p.client?._id : p.client)?.toString() ===
        singleClientId.toString()
    );
  }, [projects, singleClientId]);

  // Set default project when client changes
  useEffect(() => {
    if (availableProjects.length > 0) {
      setSingleProjectId(availableProjects[0]._id);
    } else {
      setSingleProjectId('');
    }
  }, [availableProjects]);

  if (!isOpen) return null;

  // Checklist Handlers
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([...checklist, { title: newChecklistText.trim(), isCompleted: false }]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  // Batch Selection Handlers
  const toggleBatchClient = (client) => {
    const cid = client._id;
    const exists = batchSelections.find((item) => item.clientId === cid);

    if (exists) {
      setBatchSelections(batchSelections.filter((item) => item.clientId !== cid));
    } else {
      // Find matching project for this client
      const clientProject = projects.find(
        (p) =>
          (typeof p.client === 'object' ? p.client?._id : p.client)?.toString() === cid.toString()
      );
      setBatchSelections([
        ...batchSelections,
        {
          clientId: cid,
          clientName: client.name,
          projectId: clientProject ? clientProject._id : null,
          projectName: clientProject ? clientProject.name : '',
        },
      ]);
    }
  };

  const updateBatchProject = (clientId, projectId) => {
    setBatchSelections(
      batchSelections.map((item) => {
        if (item.clientId === clientId) {
          const prj = projects.find((p) => p._id === projectId);
          return {
            ...item,
            projectId,
            projectName: prj ? prj.name : '',
          };
        }
        return item;
      })
    );
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!selectedUserId) {
      toast.error('Please select an employee to assign this task');
      return;
    }

    const assignedUserObj = users.find((u) => u._id === selectedUserId);
    const assignedPersonName = assignedUserObj?.name || 'Assigned Member';

    // Base fields
    const baseData = {
      title: title.trim(),
      taskTitle: title.trim(),
      taskCategory,
      taskType: subType,
      priority,
      dueDate,
      status: 'todo', // Kanban flow: lands in To Do
      assignedTo: [selectedUserId],
      assignedPersonName,
      checklist: checklist.map((c) => ({ title: c.title, isCompleted: false })),
    };

    if (taskCategory === 'content') {
      baseData.postingPlatforms = selectedPlatforms;
      baseData.contentIdea = contentHook;
      baseData.scriptText = contentHook;
      baseData.rawFootageLink = driveLink;
      baseData.referenceLink = driveLink;
    } else {
      baseData.requirementDetails = techScope;
      baseData.referenceLink = repoLink;
      baseData.development = {
        isDevTask: true,
        stage: 'backlog',
        bugSeverity: subType === 'bug_fix' ? bugSeverity : undefined,
        isBug: subType === 'bug_fix',
      };
    }

    try {
      if (isBatchMode) {
        if (batchSelections.length === 0) {
          toast.error('Please select at least one client in batch mode');
          return;
        }

        // Create tasks simultaneously for all selected clients
        const tasksPayload = batchSelections.map((sel) => ({
          ...baseData,
          client: sel.clientId,
          project: sel.projectId || undefined,
          clientName: sel.clientName,
        }));

        await createTaskMutation.mutateAsync({ tasks: tasksPayload });
        toast.success(`Successfully assigned ${batchSelections.length} tasks to ${assignedPersonName}!`);
      } else {
        // Single client task
        const singleClientObj = clients.find((c) => c._id === singleClientId);
        const payload = {
          ...baseData,
          client: singleClientId || undefined,
          project: singleProjectId || undefined,
          clientName: singleClientObj?.name || '',
        };

        await createTaskMutation.mutateAsync(payload);
        toast.success(`Task created and assigned to ${assignedPersonName}!`);
      }

      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Kanban Task & Assign
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks land directly in the <span className="font-semibold text-indigo-600 dark:text-indigo-400">To Do</span> column with clear checklists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. Category Switcher: Content vs Non-Content */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Deliverable Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTaskCategory('content');
                  setSubType('reel');
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  taskCategory === 'content'
                    ? 'border-fuchsia-500 bg-fuchsia-50/50 shadow-sm ring-1 ring-fuchsia-500 dark:border-fuchsia-400 dark:bg-fuchsia-950/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    taskCategory === 'content'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    🎨 Content Deliverable
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  taskCategory === 'non_content'
                    ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500 dark:border-sky-400 dark:bg-sky-950/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    taskCategory === 'non_content'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    💻 Non-Content / Tech Task
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Web Development, Bug Fixes, SEO & Infrastructure
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Assignee & Priority & Due Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign To Employee *
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">Select Employee...</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.position || u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🔵 Medium Priority</option>
                <option value="high">🟠 High Priority</option>
                <option value="urgent">🔴 Urgent / Critical</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* 3. Task Title & Sub-Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {taskCategory === 'content' ? 'Content Type' : 'Tech Category'}
              </label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {taskCategory === 'content'
                  ? CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))
                  : TECH_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* 4. Client & Project: Single vs Multi-Client Batch Mode */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Client & Project Assignment
                </span>
              </div>

              {/* Multi-Client Batch Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBatchMode}
                  onChange={(e) => setIsBatchMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  ⚡ Multi-Client Batch Mode (e.g. 3 Clients at once)
                </span>
              </label>
            </div>

            {!isBatchMode ? (
              /* Single Client & Project View */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Select Client
                  </label>
                  <select
                    value={singleClientId}
                    onChange={(e) => setSingleClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">General / Internal Task</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Select Project
                  </label>
                  <select
                    value={singleProjectId}
                    onChange={(e) => setSingleProjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">No Project Linked</option>
                    {availableProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Multi-Client Batch Selector */
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select multiple clients and their respective projects below. A copy of this task will be generated for each selected client simultaneously!
                </p>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 space-y-2">
                  {clients.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400">No clients available</div>
                  ) : (
                    clients.map((client) => {
                      const isSelected = batchSelections.some((b) => b.clientId === client._id);
                      const currentSelection = batchSelections.find((b) => b.clientId === client._id);
                      const clientProjects = projects.filter(
                        (p) =>
                          (typeof p.client === 'object' ? p.client?._id : p.client)?.toString() ===
                          client._id.toString()
                      );

                      return (
                        <div
                          key={client._id}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-2 transition-colors ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50/40 dark:border-indigo-500/60 dark:bg-indigo-950/20'
                              : 'border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBatchClient(client)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                {client.name}
                              </span>
                              {client.companyName && (
                                <span className="ml-1.5 text-[10px] text-slate-400">
                                  ({client.companyName})
                                </span>
                              )}
                            </div>
                          </label>

                          {isSelected && (
                            <div className="w-48">
                              <select
                                value={currentSelection?.projectId || ''}
                                onChange={(e) => updateBatchProject(client._id, e.target.value)}
                                className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="">No Project</option>
                                {clientProjects.map((cp) => (
                                  <option key={cp._id} value={cp._id}>
                                    {cp.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {batchSelections.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {batchSelections.length} client(s) selected: will create {batchSelections.length} tasks in 1 click!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Dynamic Content vs Tech Fields */}
          {taskCategory === 'content' ? (
            /* CONTENT FIELDS ONLY */
            <div className="space-y-4 rounded-xl border border-fuchsia-200/60 bg-fuchsia-50/20 p-4 dark:border-fuchsia-950/60 dark:bg-fuchsia-950/10">
              {/* Target Platforms */}
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
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-fuchsia-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <span>{plat.icon}</span>
                        <span>{plat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hook / Script Concept */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hook / Core Concept / Script Angle
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 3-second hook: 'Stop making this mistake with your agency ads...' followed by product showcase"
                  value={contentHook}
                  onChange={(e) => setContentHook(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Raw Footage / Drive Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Raw Footage / Assets Drive Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          ) : (
            /* NON-CONTENT / TECH FIELDS ONLY */
            <div className="space-y-4 rounded-xl border border-sky-200/60 bg-sky-50/20 p-4 dark:border-sky-950/60 dark:bg-sky-950/10">
              {/* Technical Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Technical Scope & Implementation Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify exact feature behavior, bug reproduction steps, or page requirements..."
                  value={techScope}
                  onChange={(e) => setTechScope(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Repository / Figma / Spec Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Repository / Figma / Spec Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/... or https://figma.com/..."
                    value={repoLink}
                    onChange={(e) => setRepoLink(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Bug Severity (if bug) */}
                {subType === 'bug_fix' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Bug Severity
                    </label>
                    <select
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Severity</option>
                      <option value="critical">Critical Blocker</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. In-Task Checklist Builder */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Deliverable Checklist ({checklist.length} steps)
              </label>
              <span className="text-[11px] text-slate-400">
                Team member will mark ticks [✓] in Kanban drawer
              </span>
            </div>

            <div className="space-y-1.5 mb-3">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span>{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-slate-400 hover:text-rose-500"
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
                placeholder="Add checklist step (e.g. Export 4K, Color Grade)..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
          >
            {createTaskMutation.isPending ? (
              <span>Creating...</span>
            ) : (
              <>
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>
                  {isBatchMode
                    ? `Assign ${batchSelections.length || 1} Batch Tasks to To-Do`
                    : 'Create Task & Add to To-Do'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KanbanCreateTaskModal;
