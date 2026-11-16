import React, { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Settings,
  Share2,
  Plus,
  MessageSquare,
  Paperclip,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  Calendar,
  Briefcase,
  List,
  Activity,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  Lock,
  IndianRupee,
  FileText,
  Edit3,
  Trash2,
  X,
  SlidersHorizontal,
  LayoutList,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Palette,
  Target,
  Code2,
  Receipt,
  Save,
  Wallet,
  TrendingUp,
  Layers,
} from '@/components/ui/muiIcons';
import { formatINR } from '../../utils/currency';
import { useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { useProjectMonthlyDeliverables } from '../../hooks/useMonthlyDeliverables';
import { useSocket } from '../../context/SocketContext';
import api from '../../api';
import { toast } from 'sonner';
import { KanbanCreateTaskModal } from '../../components/tasks/KanbanCreateTaskModal';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { Button } from '../../components/ui/button';
import ProjectMonthlyDeliverablesCard from '../../components/projects/ProjectMonthlyDeliverablesCard';
import ProjectTodoDeliverablesCard from '../../components/projects/ProjectTodoDeliverablesCard';
import ProjectNotionPropertiesView from '../../components/projects/ProjectNotionPropertiesView';
import {
  NotionDetailPage,
  NotionTabs,
} from '../../components/ui/NotionDetailTemplate';
import { getAssetUrl } from '../../utils/assetUrl';
import { getPersonColor, extractTaskAssignees, PersonAssigneeBadge } from '../../utils/personColors';
import { getProjectCategoryMeta } from '../../utils/projectCategories';
import { getCategoryTheme } from '../../utils/categoryColors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const statuses = ['todo', 'in_progress', 'review', 'approved', 'rejected', 'done'];

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  approved: 'Approved',
  rejected: 'Changes Needed',
  done: 'Completed',
};

const statusTheme = {
  todo: {
    surface: 'bg-sky-500/[0.04] dark:bg-sky-500/[0.08] border border-sky-500/20',
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
  },
  in_progress: {
    surface: 'bg-blue-500/[0.04] dark:bg-blue-500/[0.08] border border-blue-500/20',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  review: {
    surface: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.08] border border-purple-500/20',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
  },
  approved: {
    surface: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/20',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  },
  rejected: {
    surface: 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border border-rose-500/20',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
  },
  done: {
    surface: 'bg-teal-500/[0.04] dark:bg-teal-500/[0.08] border border-teal-500/20',
    dot: 'bg-teal-500',
    badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30',
  },
};

const projectStatusStyles = {
  Planning: 'bg-secondary text-muted-foreground ',
  'In Progress': 'bg-primary text-primary-foreground ',
  'On Hold': 'bg-muted text-foreground ',
  Completed: 'bg-foreground text-background ',
  Cancelled: 'bg-secondary text-muted-foreground line-through',
};

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const socket = useSocket();
  const [project, setProject] = useState(null);
  const [kanban, setKanban] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [taskDefaults, setTaskDefaults] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({});
  const [projectInvoices, setProjectInvoices] = useState([]);
  const [showHeaderProperties, setShowHeaderProperties] = useState(false);

  // Deliverables query for metadata overview
  const { data: deliverablesData } = useProjectMonthlyDeliverables(project?._id);
  const deliverablesList = useMemo(() => {
    return deliverablesData?.deliverables || (Array.isArray(deliverablesData) ? deliverablesData : []);
  }, [deliverablesData]);

  // Drag & drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
  const projectDetailsBoardRef = useRef(null);

  // Smooth side auto-scroll while dragging tasks in project board
  useAutoScrollOnDrag(projectDetailsBoardRef, Boolean(draggingTaskId));

  const updateProject = useUpdateProject();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteProjectMutation = useDeleteProject();
  const deleteTaskMutation = useDeleteTask();
  const navigate = useNavigate();

  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const handleDeleteProject = async () => {
    if (!project?._id) return;
    try {
      await deleteProjectMutation.mutateAsync(project._id);
      setShowDeleteProjectDialog(false);
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTaskMutation.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
      fetchProjectData(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchProjectData = async (showLoading = true) => {
    try {
      if (showLoading && !project) setLoading(true);
      const [projectSettled, kanbanSettled, invoicesSettled] = await Promise.allSettled([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/kanban`),
        api.get(`/finance/invoices?project=${id}`),
      ]);

      if (projectSettled.status === 'fulfilled' && projectSettled.value.data?.project) {
        setProject(projectSettled.value.data.project);
        setRecentActivity(projectSettled.value.data.recentActivity || []);
        setRecentTasks(projectSettled.value.data.recentTasks || []);
      } else if (projectSettled.status === 'rejected' && showLoading && !project) {
        toast.error(projectSettled.reason?.response?.data?.message || 'Failed to load project');
      }

      if (kanbanSettled.status === 'fulfilled' && kanbanSettled.value.data?.kanban) {
        setKanban(kanbanSettled.value.data.kanban);
      }

      if (invoicesSettled.status === 'fulfilled' && invoicesSettled.value.data?.invoices) {
        setProjectInvoices(invoicesSettled.value.data.invoices);
      }

      if (user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager') {
        try {
          const requestsRes = await api.get(`/access-requests/project/${id}`);
          setAccessRequests(requestsRes.data.requests || []);
        } catch (_) {
          // non-blocking
        }
      }
    } catch (error) {
      if (showLoading && !project) {
        toast.error(error.response?.data?.message || 'Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };

  // Live polling fallback for continuous live updates without manual refresh
  useEffect(() => {
    fetchProjectData(true);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchProjectData(false);
      }
    }, 90000);

    return () => clearInterval(interval);
  }, [id, user?.role]);

  // Real-time WebSocket room listener for immediate sync
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('joinProject', id);

    const handleRealtimeUpdate = () => {
      fetchProjectData(false);
    };

    socket.on('projectUpdated', handleRealtimeUpdate);
    socket.on('taskCreated', handleRealtimeUpdate);
    socket.on('taskUpdated', handleRealtimeUpdate);
    socket.on('taskDeleted', handleRealtimeUpdate);
    socket.on('taskMoved', handleRealtimeUpdate);
    socket.on('accessRequestCreated', handleRealtimeUpdate);

    return () => {
      socket.emit('leaveProject', id);
      socket.off('projectUpdated', handleRealtimeUpdate);
      socket.off('taskCreated', handleRealtimeUpdate);
      socket.off('taskUpdated', handleRealtimeUpdate);
      socket.off('taskDeleted', handleRealtimeUpdate);
      socket.off('taskMoved', handleRealtimeUpdate);
      socket.off('accessRequestCreated', handleRealtimeUpdate);
    };
  }, [socket, id]);

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
    setDragOverTaskIndex(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDrop = (e, targetStatus, dropIdx = null) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('taskId');
    const targetIdx = dropIdx !== null ? dropIdx : dragOverTaskIndex;
    setDraggingTaskId(null);
    setDragOverStatus(null);
    setDragOverTaskIndex(null);

    const currentStatus = Object.keys(kanban).find((s) =>
      (kanban[s] || []).some((t) => t._id === taskId)
    );

    if (!taskId || !targetStatus) return;

    const confirmStatuses = ['approved', 'done'];
    const confirmMessages = {
      approved: 'Are you sure you want to mark this task as Approved?',
      done: 'Are you sure you want to mark this task as Done / Completed?',
    };

    if (confirmStatuses.includes(targetStatus) && currentStatus !== targetStatus) {
      setPendingDrop({ taskId, targetStatus, dropIdx: targetIdx, message: confirmMessages[targetStatus] });
    } else {
      executeDrop(taskId, targetStatus, targetIdx);
    }
  };

  const executeDrop = async (taskId, targetStatus, dropIdx = null) => {
    try {
      // Optimistic UI update
      setKanban((prev) => {
        const next = { ...prev };
        let movedTask = null;
        for (const s of Object.keys(next)) {
          const idx = (next[s] || []).findIndex((t) => t._id === taskId);
          if (idx !== -1) {
            movedTask = next[s][idx];
            next[s] = next[s].filter((_, i) => i !== idx);
            break;
          }
        }
        if (movedTask) {
          const targetList = [...(next[targetStatus] || [])];
          const updated = { ...movedTask, status: targetStatus };
          if (dropIdx !== null && dropIdx !== undefined && dropIdx <= targetList.length) {
            targetList.splice(dropIdx, 0, updated);
          } else {
            targetList.push(updated);
          }
          next[targetStatus] = targetList;
        }
        return next;
      });

      await updateTaskStatus.mutateAsync({ id: taskId, status: statusLabels[targetStatus] || targetStatus });
      toast.success(`Task moved to ${statusLabels[targetStatus]}`);
      fetchProjectData();
    } catch {
      fetchProjectData(); // rollback
    }
  };

  const confirmPendingDrop = () => {
    if (pendingDrop) {
      executeDrop(pendingDrop.taskId, pendingDrop.targetStatus);
      setPendingDrop(null);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleRequestAccess = async () => {
    try {
      setIsRequesting(true);
      await api.post('/access-requests', { projectId: id, reason: 'Requesting access to project assets.' });
      toast.success('Access request sent successfully');
      setHasRequested(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleProcessRequest = async (requestId, status) => {
    try {
      await api.put(`/access-requests/${requestId}`, { status });
      toast.success(`Request ${status}`);
      fetchProjectData();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/projects/${id}`);
      toast.success('Project link copied to clipboard');
    } catch (_) {
      toast.error('Unable to copy project link');
    }
  };

  const openTaskModal = (defaults = {}) => {
    if (user?.role === 'client') return;
    setTaskDefaults({
      project: id,
      taskType: 'task',
      status: 'To Do',
      ...defaults,
    });
    setShowTaskModal(true);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────────
  const allTasks = useMemo(
    () => statuses.flatMap((status) => kanban[status] || []),
    [kanban],
  );

  const files = useMemo(() => {
    const projectFiles = (project?.files || []).map((file) => ({
      ...file,
      source: 'Project file',
      createdAt: file.uploadedAt,
    }));
    const taskFiles = allTasks.flatMap((task) =>
      (task.attachments || []).map((file) => ({
        ...file,
        source: task.title,
        createdAt: file.uploadedAt,
      }))
    );
    return [...projectFiles, ...taskFiles];
  }, [allTasks, project]);

  const isTeamMember = useMemo(() => {
    if (!user) return false;
    if (user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager') return true;
    return (project?.team || []).some((member) => member._id === user._id) || project?.manager?._id === user._id;
  }, [project?.manager?._id, project?.team, user]);

  // ─── Budget helpers ───────────────────────────────────────────────────────────
  const syncBudgetForm = () => {
    const b = project?.budgetDetails || {};
    const toEmptyOrVal = (val) => (val === 0 || val === '0' || val === null || val === undefined ? '' : String(val));
    setBudgetForm({
      marketingAmount: toEmptyOrVal(b.marketingAmount),
      adsAmount: toEmptyOrVal(b.adsAmount),
      contentAmount: toEmptyOrVal(b.contentAmount),
      designAmount: toEmptyOrVal(b.designAmount),
      developmentAmount: toEmptyOrVal(b.developmentAmount),
      printingAmount: toEmptyOrVal(b.printingAmount),
      otherExpenses: toEmptyOrVal(b.otherExpenses),
      totalBudget: toEmptyOrVal(b.totalBudget ?? project?.budget),
      amountReceived: toEmptyOrVal(b.amountReceived),
      paymentStatus: b.paymentStatus || 'pending',
      budgetNotes: b.budgetNotes || '',
    });
  };

  const handleSaveBudget = async () => {
    try {
      const subtotal = [
        budgetForm.marketingAmount, budgetForm.adsAmount, budgetForm.contentAmount,
        budgetForm.designAmount, budgetForm.developmentAmount, budgetForm.printingAmount,
        budgetForm.otherExpenses,
      ].reduce((sum, val) => sum + (Number(val) || 0), 0);
      const totalBudget = Number(budgetForm.totalBudget) || subtotal;
      const amountReceived = Number(budgetForm.amountReceived) || 0;

      await updateProject.mutateAsync({
        id: project._id,
        data: {
          budget: totalBudget,
          budgetDetails: {
            ...budgetForm,
            marketingAmount: Number(budgetForm.marketingAmount) || 0,
            adsAmount: Number(budgetForm.adsAmount) || 0,
            contentAmount: Number(budgetForm.contentAmount) || 0,
            designAmount: Number(budgetForm.designAmount) || 0,
            developmentAmount: Number(budgetForm.developmentAmount) || 0,
            printingAmount: Number(budgetForm.printingAmount) || 0,
            otherExpenses: Number(budgetForm.otherExpenses) || 0,
            totalBudget,
            amountReceived,
          },
        },
      });
      setEditingBudget(false);
      fetchProjectData(false);
    } catch (err) {
      console.error('Failed to save budget:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update budget');
    }
  };

  // ─── Early returns ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!project) {
    return <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground">Project not found.</div>;
  }

  if (!isTeamMember && user.role !== 'client') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center text-foreground">
          <Lock size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            You don't have permission to view this project's assets. Please request access from the project manager.
          </p>
        </div>
        <button
          onClick={handleRequestAccess}
          disabled={isRequesting || hasRequested}
          className={`px-8 py-3 rounded-2xl font-bold transition-all ${
            hasRequested
              ? 'bg-secondary text-muted-foreground cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isRequesting ? 'Sending...' : hasRequested ? 'Request Sent' : 'Request Access'}
        </button>
      </div>
    );
  }

  // ─── Tab Renderers ────────────────────────────────────────────────────────────

  const renderBoard = () => (
    <>
      {/* Confirmation Dialog */}
      <Dialog open={Boolean(pendingDrop)} onOpenChange={(open) => { if (!open) setPendingDrop(null); }}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-md max-h-[90vh]">
          <div className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    Confirm Status Change
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Verify deliverable transition
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div className="rounded-xl bg-secondary/30 p-4 text-sm text-foreground">
                <p className="leading-relaxed">{pendingDrop?.message || 'Are you sure you want to update the status of this task?'}</p>
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingDrop(null)}
                  className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmPendingDrop}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all w-full sm:w-auto"
                >
                  Yes, Confirm
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div ref={projectDetailsBoardRef} className="flex min-h-[500px] h-[calc(100vh-270px)] gap-4 sm:gap-6 overflow-x-auto pb-6 custom-scrollbar responsive-table-container">
        {statuses.map((status) => {
          const isDragOver = dragOverStatus === status;
          const theme = statusTheme[status] || statusTheme.todo;

          return (
            <div key={status} className="flex w-[280px] sm:w-80 flex-shrink-0 flex-col">
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center space-x-2">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${theme.dot}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {statusLabels[status]}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${theme.badge}`}>
                    {kanban[status]?.length || 0}
                  </span>
                </div>
                {user?.role !== 'client' && (
                  <button
                    onClick={() => openTaskModal({ status: statusLabels[status] })}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    if (dragOverStatus === status) setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar rounded-2xl p-3 transition-all duration-150 shadow-sm ${theme.surface} ${
                  isDragOver
                    ? ' !bg-primary/10 ring-2 ring-primary/40 shadow-inner'
                    : ''
                }`}
              >
                {/* Deliverable Targets Queue in TO DO column (Closed way: shows 1 item + click to view and assign more) */}
                {status === 'todo' && deliverablesList && deliverablesList.length > 0 && (
                  <ProjectTodoDeliverablesCard
                    deliverables={deliverablesList}
                    project={project}
                    canManage={user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager'}
                    onAssignTask={(info) => {
                      const norm = (info?.contentType || info?.deliverable?.contentType || '').toLowerCase();
                      let subType = 'reel';
                      if (norm.includes('video') || norm.includes('youtube')) subType = 'video_content';
                      else if (norm.includes('story')) subType = 'content';
                      else if (norm.includes('carousel')) subType = 'carousel';
                      else if (norm.includes('poster') || norm.includes('post') || norm.includes('graphic')) subType = 'poster';

                      openTaskModal({
                        title: info?.title || `${info?.contentType || 'Deliverable'} - ${project?.name || ''}`,
                        taskCategory: 'content',
                        subType,
                        project: project?._id,
                        client: project?.client?._id || project?.client,
                      });
                    }}
                    onSelectTask={(taskId) => {
                      if (taskId) setSelectedTaskId(taskId);
                    }}
                  />
                )}

                {(kanban[status] || []).map((task, idx) => {
                  const isBeingDragged = draggingTaskId === task._id;
                  const showDropIndicatorBefore = isDragOver && dragOverTaskIndex === idx && !isBeingDragged;
                  const assignees = extractTaskAssignees(task);
                  const primaryColor = assignees.length > 0 ? getPersonColor(assignees[0].name) : null;

                  return (
                    <React.Fragment key={task._id}>
                      {showDropIndicatorBefore && (
                        <div className="h-1.5 rounded-full bg-primary/70 my-1 " />
                      )}
                      <div
                        draggable={user?.role !== 'client'}
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverStatus(status);
                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          setDragOverTaskIndex(e.clientY < midY ? idx : idx + 1);
                        }}
                        onDrop={(e) => handleDrop(e, status, idx)}
                        onClick={() => setSelectedTaskId(task._id)}
                        className={`group cursor-pointer rounded-2xl bg-card border border-border/75 p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40 active:cursor-grabbing border-l-4 ${
                          getCategoryTheme(task.taskType || task.taskCategory).accentBorder
                        } ${
                          isBeingDragged
                            ? 'opacity-30 scale-95 ring-1 ring-primary/40'
                            : ' hover:-translate-y-0.5 '
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.isOverTarget && (
                              <span className="rounded bg-foreground text-background px-1.5 py-0.5 text-[8px] font-extrabold uppercase">
                                Over Task
                              </span>
                            )}
                            {(() => {
                              const catTheme = getCategoryTheme(task.taskType || task.taskCategory);
                              const Icon = catTheme.icon;
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold ${catTheme.badgeClass}`}>
                                  <Icon size={10} className="shrink-0" />
                                  <span>{catTheme.shortLabel || task.taskType || 'Task'}</span>
                                </span>
                              );
                            })()}
                            {(task.tags || []).length > 0 && task.tags.map((tag) => (
                              <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[8px] font-bold uppercase text-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              task.priority === 'Urgent' || task.priority === 'High'
                                ? 'bg-foreground text-background '
                                : 'bg-secondary text-muted-foreground'
                            }`}>
                              {task.priority || 'Med'}
                            </span>
                            {user?.role !== 'client' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTaskId(task._id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="line-clamp-2 text-sm font-bold leading-tight">{task.title}</h4>

                        {/* Color-coded Assignee(s) with Name */}
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {assignees.length > 0 ? (
                            assignees.map((person, pIdx) => (
                              <PersonAssigneeBadge key={pIdx} person={person} size="sm" />
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium bg-secondary text-muted-foreground ">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 text-[10px] text-muted-foreground tabular-nums">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center">
                              <MessageSquare size={12} className="mr-1 shrink-0" /> {task.comments?.length || 0}
                            </span>
                            <span className="flex items-center">
                              <Paperclip size={12} className="mr-1 shrink-0" /> {task.attachments?.length || 0}
                            </span>
                          </div>

                          {task.dueDate && (
                            <div className={`flex items-center font-bold ${
                              new Date(task.dueDate) < new Date() && status !== 'done' ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              <Clock size={10} className="mr-1 shrink-0" />
                              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Drop indicator at the bottom of the column */}
                {isDragOver && dragOverTaskIndex >= (kanban[status] || []).length && (
                  <div className="h-1.5 rounded-full bg-primary/70 my-1 " />
                )}

                {(kanban[status] || []).length === 0 && (status !== 'todo' || !deliverablesList || deliverablesList.length === 0) && (
                  <div className={`flex h-20 items-center justify-center text-xs rounded-xl transition-all ${
                    isDragOver ? ' bg-primary/10 text-primary font-semibold' : 'text-muted-foreground italic '
                  }`}>
                    {isDragOver ? `Drop here to move to ${statusLabels[status]}` : 'No tasks here.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderList = () => {
    const rows = recentTasks.length ? recentTasks : allTasks;

    return (
      <div className="overflow-hidden rounded-3xl bg-card ">
        <div className="flex items-center justify-between bg-secondary/10 p-5">
          <h2 className="font-bold">Recent Tasks</h2>
          {user?.role !== 'client' && (
            <button
              onClick={() => openTaskModal()}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} className="mr-2" />
              Add Task
            </button>
          )}
        </div>
        <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar responsive-table-container">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-muted-foreground bg-card">
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Assignees</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05]">
              {rows.length ? rows.map((task) => (
                <tr
                  key={task._id}
                  onClick={() => setSelectedTaskId(task._id)}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-foreground group-hover:text-primary">{task.title}</div>
                      {task.isOverTarget && (
                        <span className="rounded bg-foreground text-background px-1.5 py-0.5 text-[9px] font-extrabold uppercase shrink-0">
                          Over Task
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{task.taskType || 'task'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold">
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{task.priority || 'Medium'}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap tabular-nums">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </td>
                  <td className="px-6 py-4">
                    {(task.assignedTo || []).length
                      ? task.assignedTo.map((member) => member.name).join(', ')
                      : 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {user?.role !== 'client' && (
                      <button
                        type="button"
                        onClick={() => setDeleteTaskId(task._id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
                    No tasks have been created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFiles = () => (
    <div className="rounded-3xl bg-card p-6 ">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-bold">Files &amp; Attachments</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {files.length} item{files.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {files.length ? files.map((file, index) => {
          const fileUrl = getAssetUrl(file.url);
          const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.url || file.name || '');

          return (
            <a
              key={`${file.url}-${index}`}
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/20 p-4 transition-colors hover:bg-secondary/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={file.name || 'File preview'}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Paperclip size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{file.name || 'Untitled file'}</p>
                  <p className="text-xs text-muted-foreground">{file.source}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Recently added'}
              </span>
            </a>
          );
        }) : (
          <div className="rounded-2xl bg-secondary/10 p-12 text-center text-sm text-muted-foreground">
            No project files or task attachments have been uploaded yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderAccessManagement = () => (
    <div className="space-y-6">
      <div className="rounded-3xl bg-card p-6 ">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Team Access</h2>
          </div>
          <button className="rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors flex items-center gap-2">
            <UserPlus size={14} /> Add Member
          </button>
        </div>

        <div className="space-y-3">
          {(project.team || []).map((member) => (
            <div key={member._id} className="flex items-center justify-between rounded-2xl p-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                  {member.avatar ? <img src={getAssetUrl(member.avatar)} alt="" className="rounded-full" /> : member.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const updatedTeam = (project.team || []).filter((m) => m._id !== member._id).map((m) => m._id);
                    await updateProject.mutateAsync({ id: project._id, data: { team: updatedTeam } });
                    toast.success(`${member.name} removed from project team`);
                    fetchProjectData(false);
                  } catch (err) {
                    toast.error('Failed to remove team member');
                  }
                }}
                className="text-xs font-bold text-destructive hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {(user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager') && accessRequests.length > 0 && (
        <div className="rounded-3xl bg-card p-6 ">
          <h2 className="mb-4 text-lg font-bold">Pending Requests</h2>
          <div className="space-y-3">
            {accessRequests.filter(r => r.status === 'pending').map((request) => (
              <div key={request._id} className="flex items-center justify-between rounded-2xl bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                    {request.requester.avatar ? <img src={getAssetUrl(request.requester.avatar)} alt="" className="rounded-full" /> : request.requester.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{request.requester.name}</p>
                    <p className="text-xs text-muted-foreground">{request.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProcessRequest(request._id, 'rejected')}
                    className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleProcessRequest(request._id, 'approved')}
                    className="rounded-lg p-2 text-foreground hover:bg-secondary transition-colors"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProposalPanel = () => {
    const proposal = project.acceptedProposalId;
    if (!proposal || typeof proposal === 'string') {
      return (
        <div className="rounded-3xl bg-card p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold">No accepted proposal linked</p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{proposal.title}</h2>
            <p className="text-sm text-muted-foreground">{proposal.proposalNumber}</p>
          </div>
          <Link to={`/proposals/${proposal._id}`} className="text-sm font-semibold text-primary hover:underline">
            View full proposal →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Proposal Amount</p>
            <p className="mt-1 text-lg font-bold">{formatINR(proposal.amount)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-lg font-bold capitalize">{proposal.status}</p>
          </div>
          <div className="rounded-2xl bg-secondary/20 p-4 md:col-span-2">
            <p className="text-xs text-muted-foreground">Accepted Date &amp; Time</p>
            <p className="mt-1 text-lg font-bold">
              {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderBudgetPanel = () => {
    const b = project.budgetDetails || {};
    const isManager = user?.role === 'manager';
    const total = b.totalBudget ?? project.budget ?? 0;
    const received = b.amountReceived ?? 0;
    const pending = Math.max(0, total - received);

    const budgetFields = [
      { key: 'marketingAmount', label: 'Marketing', icon: Megaphone, color: 'text-amber-500 bg-amber-500/10' },
      { key: 'adsAmount', label: 'Ads Budget', icon: Target, color: 'text-rose-500 bg-rose-500/10' },
      { key: 'contentAmount', label: 'Content', icon: FileText, color: 'text-cyan-500 bg-cyan-500/10' },
      { key: 'designAmount', label: 'Design', icon: Palette, color: 'text-violet-500 bg-violet-500/10' },
      { key: 'developmentAmount', label: 'Development', icon: Code2, color: 'text-indigo-500 bg-indigo-500/10' },
      { key: 'printingAmount', label: 'Printing', icon: Layers, color: 'text-teal-500 bg-teal-500/10' },
      { key: 'otherExpenses', label: 'Other Expenses', icon: Receipt, color: 'text-slate-500 bg-slate-500/10' },
    ];

    if (isManager) {
      return (
        <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><IndianRupee size={18} className="shrink-0" /> Ads Budget</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">Manager View</span>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground">Project Ads Budget</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{formatINR(b.adsAmount || 0)}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Full finance totals, received payments, and pending balances are hidden for the manager role.
          </p>
        </div>
      );
    }

    if (editingBudget) {
      const liveDirectCosts = [
        Number(budgetForm.marketingAmount) || 0,
        Number(budgetForm.adsAmount) || 0,
        Number(budgetForm.contentAmount) || 0,
        Number(budgetForm.designAmount) || 0,
        Number(budgetForm.developmentAmount) || 0,
        Number(budgetForm.printingAmount) || 0,
        Number(budgetForm.otherExpenses) || 0,
      ].reduce((acc, curr) => acc + curr, 0);

      const liveTotalBudget = Number(budgetForm.totalBudget) || 0;
      const liveReceived = Number(budgetForm.amountReceived) || 0;
      const liveGrossProfit = liveTotalBudget - liveDirectCosts;
      const liveProfitMargin = liveTotalBudget > 0 ? Math.round((liveGrossProfit / liveTotalBudget) * 100) : null;
      const livePending = Math.max(0, liveTotalBudget - liveReceived);

      return (
        <div className="rounded-3xl bg-card border border-border/80 p-6 sm:p-7 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IndianRupee size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Edit Project Budget</h2>
                <p className="text-xs text-muted-foreground">
                  Track client quote value, allocate deliverable costs, and manage collections.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setEditingBudget(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={updateProject.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{updateProject.isPending ? 'Saving...' : 'Save Budget'}</span>
              </button>
            </div>
          </div>

          {/* Live Financial Calculation Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-sky-500/[0.04] dark:bg-sky-500/[0.08] border border-sky-500/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                Total Budget
              </span>
              <p className="text-xl font-extrabold text-foreground tabular-nums">
                {liveTotalBudget > 0 ? formatINR(liveTotalBudget) : '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                Direct Costs
              </span>
              <p className="text-xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                {liveDirectCosts > 0 ? formatINR(liveDirectCosts) : '₹0'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Gross Profit
                </span>
                {liveProfitMargin !== null && liveTotalBudget > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${liveProfitMargin >= 40 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : liveProfitMargin >= 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>
                    {liveProfitMargin}%
                  </span>
                )}
              </div>
              <p className={`text-xl font-extrabold tabular-nums ${liveGrossProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {liveTotalBudget > 0 ? formatINR(liveGrossProfit) : '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-500/[0.04] dark:bg-teal-500/[0.08] border border-teal-500/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                Pending Amount
              </span>
              <p className="text-xl font-extrabold text-teal-700 dark:text-teal-300 tabular-nums">
                {livePending > 0 ? formatINR(livePending) : '₹0'}
              </p>
            </div>
          </div>

          {/* Section 1: Direct Costs & Deliverables Allocation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet size={12} />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Deliverable & Direct Cost Allocations
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {budgetFields.map((field) => {
                const FieldIcon = field.icon;
                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <span className={`flex h-4 w-4 items-center justify-center rounded ${field.color}`}>
                        <FieldIcon size={10} />
                      </span>
                      <span>{field.label}</span>
                    </label>
                    <div className="relative rounded-xl border border-border/80 bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70 text-xs font-bold">
                        ₹
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/35 tabular-nums focus:outline-none"
                        value={budgetForm[field.key] ?? ''}
                        onChange={(e) => setBudgetForm((c) => ({ ...c, [field.key]: e.target.value }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Contract Value & Collection */}
          <div className="p-4 sm:p-5 rounded-2xl bg-secondary/20 border border-border/60 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Receipt size={12} />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Contract Value & Client Collection
              </h3>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Total Project Budget
                </label>
                <div className="relative rounded-xl border border-border/80 bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70 text-xs font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-transparent text-sm font-bold text-foreground placeholder:text-muted-foreground/35 tabular-nums focus:outline-none"
                    value={budgetForm.totalBudget ?? ''}
                    onChange={(e) => setBudgetForm((c) => ({ ...c, totalBudget: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Amount Received
                </label>
                <div className="relative rounded-xl border border-border/80 bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70 text-xs font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-transparent text-sm font-bold text-foreground placeholder:text-muted-foreground/35 tabular-nums focus:outline-none"
                    value={budgetForm.amountReceived ?? ''}
                    onChange={(e) => setBudgetForm((c) => ({ ...c, amountReceived: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Payment Status
                </label>
                <SelectDropdown
                  value={budgetForm.paymentStatus || 'pending'}
                  onChange={(val) => setBudgetForm((c) => ({ ...c, paymentStatus: val || 'pending' }))}
                  options={[
                    { value: 'pending', label: 'Pending Payment' },
                    { value: 'partial', label: 'Partially Paid' },
                    { value: 'paid', label: 'Fully Paid' },
                  ]}
                  placeholder="Payment Status"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-[38px] bg-background text-xs font-semibold rounded-xl border border-border/80"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Milestone Terms */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Budget Notes & Payment Terms
            </label>
            <textarea
              className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-20"
              placeholder="Record payment milestones, influencer costs, direct shoot expenses, or quotation references..."
              value={budgetForm.budgetNotes || ''}
              onChange={(e) => setBudgetForm((c) => ({ ...c, budgetNotes: e.target.value }))}
            />
          </div>
        </div>
      );
    }

    const directCostsTotal = budgetFields.reduce((sum, f) => sum + (Number(b[f.key]) || 0), 0);
    const grossProfit = total - directCostsTotal;
    const profitMargin = total > 0 ? Math.round((grossProfit / total) * 100) : null;
    const collectionPct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

    return (
      <div className="rounded-3xl bg-card border border-border/80 p-6 sm:p-7 space-y-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IndianRupee size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Project Budget & Finances</h2>
              <p className="text-xs text-muted-foreground">Contract profitability, received client payments, and cost allocation.</p>
            </div>
          </div>

          {user?.role !== 'client' && (
            <button
              type="button"
              onClick={() => { syncBudgetForm(); setEditingBudget(true); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-xs"
            >
              <Edit3 size={13} />
              <span>Edit Budget</span>
            </button>
          )}
        </div>

        {/* Financial KPI Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 tabular-nums">
          <div className="p-4 rounded-2xl bg-sky-500/[0.04] dark:bg-sky-500/[0.08] border border-sky-500/20 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">Total Contract Budget</span>
            <p className="text-2xl font-extrabold text-foreground">{formatINR(total)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border border-amber-500/20 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Direct Expenses</span>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{formatINR(directCostsTotal)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Gross Profit</span>
              {profitMargin !== null && total > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${profitMargin >= 40 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : profitMargin >= 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>
                  {profitMargin}%
                </span>
              )}
            </div>
            <p className={`text-2xl font-extrabold ${grossProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
              {formatINR(grossProfit)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-500/[0.04] dark:bg-teal-500/[0.08] border border-teal-500/20 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">Pending Amount</span>
            <p className="text-2xl font-extrabold text-teal-700 dark:text-teal-300">{formatINR(pending)}</p>
          </div>
        </div>

        {/* Collection Status Progress Bar */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-foreground">Collection Progress ({collectionPct}%)</span>
            <span className="text-muted-foreground tabular-nums">
              Received {formatINR(received)} of {formatINR(total)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${collectionPct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${collectionPct}%` }}
            />
          </div>
        </div>

        {/* Deliverable Costs Breakdown Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Cost Allocation Breakdown
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 tabular-nums">
            {budgetFields.map((field) => {
              const FieldIcon = field.icon;
              return (
                <div key={field.key} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 hover:border-border transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${field.color} shrink-0`}>
                      <FieldIcon size={12} />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground truncate">{field.label}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">{formatINR(b[field.key] || 0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Status & Notes */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Payment Status:</span>
            <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold capitalize border ${
              b.paymentStatus === 'paid'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : b.paymentStatus === 'partial'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
            }`}>
              {b.paymentStatus || 'pending'}
            </span>
          </div>
        </div>

        {b.budgetNotes ? (
          <div className="rounded-2xl bg-secondary/20 border border-border/40 p-4 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Notes & Terms</p>
            {b.budgetNotes}
          </div>
        ) : null}
      </div>
    );
  };

  const renderActivity = () => (
    <div className="rounded-3xl bg-card p-6 ">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-bold">Recent Activity</h2>
        <span className="text-xs font-semibold text-muted-foreground">{recentActivity.length} updates</span>
      </div>

      <div className="space-y-4">
        {recentActivity.length ? recentActivity.map((item) => (
          <div key={item._id} className="flex gap-4 rounded-2xl bg-secondary/15 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity size={18} />
            </div>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.actor?.name || 'System'} • {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl bg-secondary/10 p-12 text-center text-sm text-muted-foreground">
            No recent activity has been recorded for this project yet.
          </div>
        )}
      </div>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <NotionDetailPage
        backTo="/projects"
        backLabel="Projects"
        title={project.name}
        subtitle={[
          project.client?.name || 'Internal Project',
          project.createdAt ? `Created ${new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
          `Due ${project.dueDate || project.endDate ? new Date(project.dueDate || project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}`,
        ].filter(Boolean).join(' | ')}
        icon={Briefcase}
        status={
          <div className="flex items-center gap-2 flex-wrap">
            {project.category && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getProjectCategoryMeta(project.category).badgeClass}`}>
                {React.createElement(getProjectCategoryMeta(project.category).icon, { size: 13, className: 'shrink-0' })}
                <span>{getProjectCategoryMeta(project.category).label}</span>
              </span>
            )}
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                projectStatusStyles[project.status] || projectStatusStyles.Planning
              }`}
            >
              {project.status}
            </span>
          </div>
        }
        actions={(
          <>
            <div className="mr-2 flex -space-x-2">
              {(project.team || []).map((member) => (
                <div
                  key={member._id}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-card bg-secondary text-xs font-bold text-foreground "
                  title={member.name}
                >
                  {member.avatar ? <img src={getAssetUrl(member.avatar)} alt="" /> : member.name.charAt(0)}
                </div>
              ))}
              {user?.role !== 'client' && (
                <button
                  onClick={() => openTaskModal()}
                  className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-card bg-primary text-xs font-bold text-primary-foreground transition-transform hover:scale-110"
                  title="Add task"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowHeaderProperties((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                showHeaderProperties
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={showHeaderProperties ? 'Hide properties panel' : 'Show properties panel'}
            >
              <SlidersHorizontal size={14} />
              <span>Properties</span>
              {showHeaderProperties ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={handleShare}
              className="rounded-xl bg-background p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Share project"
            >
              <Share2 size={18} />
            </button>
            {(user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all cursor-pointer"
                  title="Edit Project Details"
                >
                  <Edit3 size={14} />
                  <span>Edit Project</span>
                </button>
                <button
                  onClick={() => setShowDeleteProjectDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive font-bold text-xs hover:bg-destructive/20 transition-all cursor-pointer"
                  title="Delete Project"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </>
            )}
            {user?.role !== 'client' && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="rounded-xl bg-background p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
                title="Project settings"
              >
                <Settings size={18} />
              </button>
            )}
          </>
        )}
      >
        <NotionTabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: LayoutList },
            { id: 'board', label: 'Task Board', icon: LayoutGrid },
            { id: 'list', label: 'List View', icon: List },
            { id: 'files', label: 'Files', icon: Paperclip },
            { id: 'activity', label: 'Activity', icon: Clock },
            { id: 'proposal', label: 'Proposal', icon: FileText },
            { id: 'budget', label: 'Budget', icon: IndianRupee },
            (user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager') && { id: 'access', label: 'Access', icon: ShieldCheck },
          ].filter(Boolean)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="border-0 bg-transparent p-0"
        />
      </NotionDetailPage>

      {/* Collapsible Notion Properties Sheet (when toggled from header while viewing another tab) */}
      {showHeaderProperties && activeTab !== 'overview' && (
        <div className="rounded-3xl bg-card p-4 sm:p-6 shadow-sm border border-border/40 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <LayoutList size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Properties</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Open in Overview tab
              </button>
              <button
                onClick={() => setShowHeaderProperties(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                title="Close properties panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <ProjectNotionPropertiesView
            project={project}
            kanban={kanban}
            deliverables={deliverablesList}
            invoices={projectInvoices}
            onEdit={() => setShowProjectModal(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            canEdit={user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager'}
          />
        </div>
      )}

      {/* Monthly Deliverables & Targets Overview (Shown on task views) */}
      {(activeTab === 'board' || activeTab === 'list') && (
        <ProjectMonthlyDeliverablesCard
          project={project}
          canManage={user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager'}
          onAssignTask={(info) => {
            const norm = (info?.contentType || info?.deliverable?.contentType || '').toLowerCase();
            let subType = 'reel';
            if (norm.includes('video') || norm.includes('youtube')) subType = 'video_content';
            else if (norm.includes('story')) subType = 'content';
            else if (norm.includes('carousel')) subType = 'carousel';
            else if (norm.includes('poster') || norm.includes('post') || norm.includes('graphic')) subType = 'poster';

            openTaskModal({
              title: info?.title || `${info?.contentType || 'Deliverable'} - ${project?.name || ''}`,
              taskCategory: 'content',
              subType,
              project: project?._id,
              client: project?.client?._id || project?.client,
            });
          }}
          onSelectTask={(taskId) => {
            if (taskId) setSelectedTaskId(taskId);
          }}
        />
      )}

      {/* Tab Content */}
      <div key={activeTab} className="animate-in fade-in duration-150">
        {activeTab === 'overview' && (
          <div className="rounded-3xl bg-card p-4 sm:p-6 shadow-sm border border-border/40">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <LayoutList size={18} className="text-primary" />
                  Project Overview & Properties
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notion-style property list displaying all project metadata, status, deliverables, budget & timeline
                </p>
              </div>
              {(user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager') && (
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Properties</span>
                </button>
              )}
            </div>
            <ProjectNotionPropertiesView
              project={project}
              kanban={kanban}
              deliverables={deliverablesList}
              invoices={projectInvoices}
              onEdit={() => setShowProjectModal(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              canEdit={user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager'}
            />
          </div>
        )}
        {activeTab === 'board' && renderBoard()}
        {activeTab === 'list' && renderList()}
        {activeTab === 'files' && renderFiles()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'proposal' && renderProposalPanel()}
        {activeTab === 'budget' && renderBudgetPanel()}
        {activeTab === 'access' && renderAccessManagement()}
      </div>

      {user?.role !== 'client' && (
        <>
          <KanbanCreateTaskModal
            isOpen={showTaskModal}
            onClose={() => {
              setShowTaskModal(false);
              setTaskDefaults({});
              fetchProjectData();
            }}
            initialValues={taskDefaults}
            onTaskCreated={() => {
              fetchProjectData();
            }}
          />

          <AddProjectModal
            open={showProjectModal}
            onOpenChange={(open) => {
              setShowProjectModal(open);
              if (!open) fetchProjectData(false);
            }}
            project={project}
          />
        </>
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
            fetchProjectData();
          }
        }}
      />

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{project?.name}</strong>? All associated tasks, milestones, and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold"
            >
              Delete Project
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTaskId)} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold"
            >
              Delete Task
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;
