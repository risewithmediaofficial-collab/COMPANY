import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ChevronLeft,
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
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { useUpdateProject } from '../../hooks/useProjects';
import { useUpdateTaskStatus } from '../../hooks/useTasks';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import { getAssetUrl } from '../../utils/assetUrl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

const statuses = ['todo', 'in_progress', 'review', 'approved', 'rejected', 'done'];

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  approved: 'Approved',
  rejected: 'Blocked',
  done: 'Done',
};

const projectStatusStyles = {
  Planning: 'bg-secondary text-muted-foreground',
  'In Progress': 'bg-emerald-500/10 text-emerald-600',
  'On Hold': 'bg-amber-500/10 text-amber-600',
  Completed: 'bg-blue-500/10 text-blue-600',
  Cancelled: 'bg-red-500/10 text-red-600',
};

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [project, setProject] = useState(null);
  const [kanban, setKanban] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [taskDefaults, setTaskDefaults] = useState({});
  const [accessRequests, setAccessRequests] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({});

  // Drag & drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);

  const updateProject = useUpdateProject();
  const updateTaskStatus = useUpdateTaskStatus();

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, kanbanRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/kanban`),
      ]);

      setProject(projectRes.data.project);
      setRecentActivity(projectRes.data.recentActivity || []);
      setRecentTasks(projectRes.data.recentTasks || []);
      setKanban(kanbanRes.data.kanban || {});

      if (user?.role === 'superAdmin' || user?.role === 'manager') {
        const requestsRes = await api.get(`/access-requests/project/${id}`);
        setAccessRequests(requestsRes.data.requests || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggingTaskId(null);
    setDragOverStatus(null);

    const currentStatus = Object.keys(kanban).find((s) =>
      (kanban[s] || []).some((t) => t._id === taskId)
    );

    if (!taskId || !targetStatus || currentStatus === targetStatus) return;

    const confirmStatuses = ['approved', 'done'];
    const confirmMessages = {
      approved: 'Are you sure you want to mark this task as Approved?',
      done: 'Are you sure you want to mark this task as Done / Completed?',
    };

    if (confirmStatuses.includes(targetStatus)) {
      setPendingDrop({ taskId, targetStatus, message: confirmMessages[targetStatus] });
    } else {
      executeDrop(taskId, targetStatus);
    }
  };

  const executeDrop = async (taskId, targetStatus) => {
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
          next[targetStatus] = [
            ...(next[targetStatus] || []),
            { ...movedTask, status: targetStatus },
          ];
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
    if (user.role === 'superAdmin' || user.role === 'manager') return true;
    return (project?.team || []).some((member) => member._id === user._id) || project?.manager?._id === user._id;
  }, [project?.manager?._id, project?.team, user]);

  // ─── Budget helpers ───────────────────────────────────────────────────────────
  const syncBudgetForm = () => {
    const b = project.budgetDetails || {};
    setBudgetForm({
      marketingAmount: b.marketingAmount ?? 0,
      adsAmount: b.adsAmount ?? 0,
      contentAmount: b.contentAmount ?? 0,
      designAmount: b.designAmount ?? 0,
      developmentAmount: b.developmentAmount ?? 0,
      printingAmount: b.printingAmount ?? 0,
      otherExpenses: b.otherExpenses ?? 0,
      totalBudget: b.totalBudget ?? project.budget ?? 0,
      amountReceived: b.amountReceived ?? 0,
      paymentStatus: b.paymentStatus || 'pending',
      budgetNotes: b.budgetNotes || '',
    });
  };

  const handleSaveBudget = async () => {
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
    fetchProjectData();
  };

  // ─── Early returns ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">
        Loading workspace...
      </div>
    );
  }

  if (!project) {
    return <div className="rounded-3xl border border-border bg-card p-12 text-center text-muted-foreground">Project not found.</div>;
  }

  if (!isTeamMember && user.role !== 'client') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
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
          className={`px-8 py-3 rounded-2xl font-bold transition-all shadow-lg ${
            hasRequested
              ? 'bg-secondary text-muted-foreground cursor-default'
              : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingDrop?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => setPendingDrop(null)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmPendingDrop}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90"
            >
              Yes, Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-320px)] space-x-6 overflow-x-auto pb-6 scrollbar-hide">
        {statuses.map((status) => {
          const isDragOver = dragOverStatus === status;
          const columnDotColor =
            status === 'done' ? 'bg-emerald-500'
              : status === 'approved' ? 'bg-blue-500'
                : status === 'review' ? 'bg-amber-500'
                  : status === 'in_progress' ? 'bg-indigo-500'
                    : status === 'rejected' ? 'bg-rose-500'
                      : 'bg-muted-foreground';

          return (
            <div key={status} className="flex w-80 flex-shrink-0 flex-col">
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${columnDotColor}`} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {statusLabels[status]}
                  </h3>
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold">
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
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex-1 space-y-3 overflow-y-auto rounded-2xl border-2 p-3 transition-all duration-150 ${
                  isDragOver
                    ? 'border-primary bg-primary/5 shadow-inner'
                    : 'border-dashed border-border bg-secondary/20'
                }`}
              >
                {isDragOver && (
                  <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-semibold text-primary">
                    Drop here
                  </div>
                )}

                {(kanban[status] || []).map((task) => (
                  <div
                    key={task._id}
                    draggable={user?.role !== 'client'}
                    onDragStart={(e) => handleDragStart(e, task._id)}
                    onDragEnd={handleDragEnd}
                    className={`group cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-all active:cursor-grabbing ${
                      draggingTaskId === task._id
                        ? 'opacity-40 scale-95 rotate-1'
                        : 'hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(task.tags || []).length ? task.tags.map((tag) => (
                          <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary">
                            {tag}
                          </span>
                        )) : (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">
                            {task.taskType || 'Task'}
                          </span>
                        )}
                      </div>
                      <button className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    <h4 className="line-clamp-2 text-sm font-bold leading-tight">{task.title}</h4>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center">
                          <MessageSquare size={12} className="mr-1" /> {task.comments?.length || 0}
                        </span>
                        <span className="flex items-center">
                          <Paperclip size={12} className="mr-1" /> {task.attachments?.length || 0}
                        </span>
                      </div>
                      <div className="flex -space-x-1.5">
                        {(task.assignedTo || []).map((member) => (
                          <div
                            key={member._id}
                            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-secondary text-[8px] font-bold shadow-sm"
                            title={member.name}
                          >
                            {member.avatar ? <img src={getAssetUrl(member.avatar)} alt="" /> : member.name?.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {task.dueDate && (
                      <div className={`mt-3 flex items-center text-[10px] font-bold ${
                        new Date(task.dueDate) < new Date() && status !== 'done' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        <Clock size={10} className="mr-1" />
                        {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}

                {(kanban[status] || []).length === 0 && !isDragOver && (
                  <div className="flex h-20 items-center justify-center text-xs italic text-muted-foreground">
                    No tasks here.
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
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-secondary/10 p-5">
          <h2 className="font-bold">Recent Tasks</h2>
          {user?.role !== 'client' && (
            <button
              onClick={() => openTaskModal()}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              <Plus size={16} className="mr-2" />
              Add Task
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Assignees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length ? rows.map((task) => (
                <tr key={task._id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{task.title}</div>
                    <div className="text-xs text-muted-foreground">{task.taskType || 'task'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold">
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{task.priority || 'Medium'}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </td>
                  <td className="px-6 py-4">
                    {(task.assignedTo || []).length
                      ? task.assignedTo.map((member) => member.name).join(', ')
                      : 'Unassigned'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
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
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
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
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/20 p-4 transition-colors hover:bg-secondary/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={file.name || 'File preview'}
                    className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
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
          <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-12 text-center text-sm text-muted-foreground">
            No project files or task attachments have been uploaded yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderAccessManagement = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Team Access</h2>
            <p className="text-xs text-muted-foreground">Manage who has access to this project and its assets.</p>
          </div>
          <button className="rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors flex items-center gap-2">
            <UserPlus size={14} /> Add Member
          </button>
        </div>

        <div className="space-y-3">
          {(project.team || []).map((member) => (
            <div key={member._id} className="flex items-center justify-between rounded-2xl border border-border p-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                  {member.avatar ? <img src={getAssetUrl(member.avatar)} alt="" className="rounded-full" /> : member.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <button className="text-xs font-bold text-destructive hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {(user.role === 'superAdmin' || user.role === 'manager') && accessRequests.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Pending Requests</h2>
          <div className="space-y-3">
            {accessRequests.filter(r => r.status === 'pending').map((request) => (
              <div key={request._id} className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
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
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleProcessRequest(request._id, 'approved')}
                    className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
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
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold">No accepted proposal linked</p>
          <p className="mt-2 text-sm text-muted-foreground">Link an accepted proposal when editing the project, or create one from the Proposals Dashboard.</p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
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
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Proposal Amount</p>
            <p className="mt-1 text-lg font-bold">{formatINR(proposal.amount)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-lg font-bold capitalize">{proposal.status}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 md:col-span-2">
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
      ['marketingAmount', 'Marketing'],
      ['adsAmount', 'Ads Budget'],
      ['contentAmount', 'Content'],
      ['designAmount', 'Design'],
      ['developmentAmount', 'Development'],
      ['printingAmount', 'Printing'],
      ['otherExpenses', 'Other Expenses'],
    ];

    if (isManager) {
      return (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><IndianRupee size={18} /> Ads Budget</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">Manager View</span>
          </div>
          <div className="rounded-2xl border border-border bg-emerald-500/5 p-4">
            <p className="text-xs text-muted-foreground">Project Ads Budget</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatINR(b.adsAmount || 0)}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Full finance totals, received payments, and pending balances are hidden for the manager role.
          </p>
        </div>
      );
    }

    if (editingBudget) {
      return (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Edit Budget</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditingBudget(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleSaveBudget} disabled={updateProject.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Save Budget
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {budgetFields.map(([key, label]) => (
              <label key={key} className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <input
                  type="number"
                  className="app-input w-full"
                  value={budgetForm[key] ?? ''}
                  onChange={(e) => setBudgetForm((c) => ({ ...c, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Total Project Budget</span>
              <input type="number" className="app-input w-full" value={budgetForm.totalBudget ?? ''} onChange={(e) => setBudgetForm((c) => ({ ...c, totalBudget: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Amount Received</span>
              <input type="number" className="app-input w-full" value={budgetForm.amountReceived ?? ''} onChange={(e) => setBudgetForm((c) => ({ ...c, amountReceived: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Payment Status</span>
              <select className="app-input w-full" value={budgetForm.paymentStatus} onChange={(e) => setBudgetForm((c) => ({ ...c, paymentStatus: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>
          <textarea
            className="app-input w-full min-h-24"
            placeholder="Budget notes..."
            value={budgetForm.budgetNotes || ''}
            onChange={(e) => setBudgetForm((c) => ({ ...c, budgetNotes: e.target.value }))}
          />
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><IndianRupee size={18} /> Project Budget</h2>
          {user?.role !== 'client' && (
            <button
              onClick={() => { syncBudgetForm(); setEditingBudget(true); }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Edit Budget
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-emerald-500/5 p-4">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatINR(total)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-blue-500/5 p-4">
            <p className="text-xs text-muted-foreground">Amount Received</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatINR(received)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-amber-500/5 p-4">
            <p className="text-xs text-muted-foreground">Pending Amount</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{formatINR(pending)}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {budgetFields.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-border/70 bg-secondary/15 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold">{formatINR(b[key] || 0)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">Payment Status:</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize">{b.paymentStatus || 'pending'}</span>
        </div>
        {b.budgetNotes ? (
          <div className="rounded-xl border border-border bg-secondary/10 p-4 text-sm whitespace-pre-wrap">{b.budgetNotes}</div>
        ) : null}
      </div>
    );
  };

  const renderActivity = () => (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-bold">Recent Activity</h2>
        <span className="text-xs font-semibold text-muted-foreground">{recentActivity.length} updates</span>
      </div>

      <div className="space-y-4">
        {recentActivity.length ? recentActivity.map((item) => (
          <div key={item._id} className="flex gap-4 rounded-2xl border border-border bg-secondary/15 p-4">
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
          <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-12 text-center text-sm text-muted-foreground">
            No recent activity has been recorded for this project yet.
          </div>
        )}
      </div>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="overflow-hidden rounded-[24px] border border-border bg-card p-6 text-foreground shadow-none">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start space-x-4">
            <Link to="/projects" className="mt-1 rounded-xl border border-border bg-background p-2 text-foreground transition-colors hover:bg-secondary">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black tracking-tight text-foreground">{project.name}</h1>
                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${projectStatusStyles[project.status] || projectStatusStyles.Planning}`}>
                  {project.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center font-medium">
                  <Briefcase size={16} className="mr-2" />
                  {project.client?.name}
                </span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  Due {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="mr-4 flex -space-x-2">
              {(project.team || []).map((member) => (
                <div
                  key={member._id}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-white text-xs font-bold text-slate-900 shadow-sm"
                  title={member.name}
                >
                  {member.avatar ? <img src={getAssetUrl(member.avatar)} alt="" /> : member.name.charAt(0)}
                </div>
              ))}
              {user?.role !== 'client' && (
                <button
                  onClick={() => openTaskModal()}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-white text-xs font-bold transition-transform hover:scale-110"
                  title="Add task"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <button
              onClick={handleShare}
              className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-slate-200 transition-colors hover:bg-white/10"
            >
              <Share2 size={18} />
            </button>
            {user?.role !== 'client' && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-slate-200 transition-colors hover:bg-white/10"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 overflow-x-auto border-t border-white/10 pt-4">
          {[
            { id: 'board', label: 'Task Board', icon: LayoutGrid },
            { id: 'list', label: 'List View', icon: List },
            { id: 'files', label: 'Files', icon: Paperclip },
            { id: 'activity', label: 'Activity', icon: Clock },
            { id: 'proposal', label: 'Proposal', icon: FileText },
            { id: 'budget', label: 'Budget', icon: IndianRupee },
            (user.role === 'superAdmin' || user.role === 'manager') && { id: 'access', label: 'Access', icon: ShieldCheck },
          ].filter(Boolean).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'board' && renderBoard()}
          {activeTab === 'list' && renderList()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'proposal' && renderProposalPanel()}
          {activeTab === 'budget' && renderBudgetPanel()}
          {activeTab === 'access' && renderAccessManagement()}
        </motion.div>
      </AnimatePresence>

      {user?.role !== 'client' && (
        <>
          <AddTaskModal
            open={showTaskModal}
            onOpenChange={(open) => {
              setShowTaskModal(open);
              if (!open) {
                setTaskDefaults({});
                fetchProjectData();
              }
            }}
            initialValues={taskDefaults}
          />

          <AddProjectModal
            open={showProjectModal}
            onOpenChange={(open) => {
              setShowProjectModal(open);
              if (!open) fetchProjectData();
            }}
            project={project}
          />
        </>
      )}
    </div>
  );
};

export default ProjectDetails;
