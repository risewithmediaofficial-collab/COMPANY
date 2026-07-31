import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressUpdateForm } from './ProgressUpdateForm';
import { useAddCompletedFiles, useTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { AddTaskModal } from '../modals/AddTaskModal';
import { Edit, Plus } from 'lucide-react';
import {
  formatTaskTypeLabel,
  isWebsiteTaskType,
  normalizeTaskStatusLabel,
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  uploadFiles,
} from '../../utils/taskFields';
import { getAssetUrl } from '../../utils/assetUrl';

const Section = ({ title, children }) => (
  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
    <h3 className="text-base font-bold text-foreground">{title}</h3>
    <div className="mt-4">{children}</div>
  </div>
);

const Field = ({ label, value }) => (
  <div className="rounded-2xl border border-border bg-background px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value || 'Not provided'}</p>
  </div>
);

const StatusPill = ({ status }) => {
  const normalized = normalizeTaskStatusLabel(status);
  const tones = {
    'To Do': 'bg-slate-100 text-slate-700',
    'On Process': 'bg-blue-100 text-blue-700',
    'Waiting for Client': 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rework: 'bg-rose-100 text-rose-700',
    Approved: 'bg-green-100 text-green-700',
    'Rework Completed': 'bg-violet-100 text-violet-700',
    'Review Required': 'bg-indigo-100 text-indigo-700',
  };

  return <Badge className={tones[normalized] || 'bg-slate-100 text-slate-700'}>{normalized}</Badge>;
};

const FileList = ({ files = [], emptyMessage }) => {
  if (!files.length) {
    return <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {files.map((file, index) => {
        const fileUrl = getAssetUrl(file.url);
        const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.url || file.name || '');

        return (
        <a
          key={`${file.url || file.name}-${index}`}
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            {isImage ? (
              <img
                src={fileUrl}
                alt={file.name || 'Attachment preview'}
                className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0">
            <p className="font-semibold text-foreground">{file.name || 'Attachment'}</p>
            <p className="text-xs text-muted-foreground">{file.type || 'File'}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Recently added'}
          </span>
        </a>
      );
      })}
    </div>
  );
};

export const TaskDetailModal = ({ taskId, open, onOpenChange }) => {
  const { data: task, isLoading, refetch } = useTask(taskId);
  const { user } = useSelector((state) => state.auth);
  const updateStatus = useUpdateTaskStatus();
  const addCompletedFiles = useAddCompletedFiles();
  const [completedFiles, setCompletedFiles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAssignAnotherModal, setShowAssignAnotherModal] = useState(false);

  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const allowedStatusOptions = isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS;

  const assignees = useMemo(
    () => (Array.isArray(task?.assignedTo) ? task.assignedTo.map((item) => item.name).filter(Boolean).join(', ') : ''),
    [task?.assignedTo],
  );

  const isAssigned = useMemo(() => {
    if (!task || !user) return false;
    const assigneesList = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    return assigneesList.some((assignee) => {
      const id = typeof assignee === 'object' ? assignee._id : assignee;
      return id?.toString() === user._id?.toString();
    });
  }, [task, user]);

  const canEdit = ['superAdmin', 'manager'].includes(user?.role) || (isEmployee && isAssigned);

  const handleUploadCompletedFiles = async () => {
    const uploaded = await uploadFiles(completedFiles);
    await addCompletedFiles.mutateAsync({ id: taskId, completedFiles: uploaded });
    setCompletedFiles([]);
    refetch();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isLoading ? 'Loading task...' : task?.taskTitle || task?.title || 'Task details'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        ) : task ? (
          <div className="space-y-6">
            <Section title="Overview">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Client" value={task.client?.name || task.client?.company || task.clientName} />
                <Field label="Assigned Person" value={assignees || task.assignedPersonName} />
                <Field label="Task Category" value={task.taskCategory === 'non_content' ? 'Non-Content Task' : 'Content Task'} />
                <Field label="Task Type" value={formatTaskTypeLabel(task.taskType)} />
                <Field label="Priority" value={task.priority} />
                <Field label="Due Date" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'} />
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current Status</p>
                  <div className="mt-2"><StatusPill status={task.status} /></div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Client Approval</p>
                  <p className="mt-1 text-sm text-foreground">{task.approvalStatus || 'pending'}</p>
                </div>
              </div>

              {!isClient && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Update Status</label>
                    <div className="mt-2">
                      <select
                        value={normalizeTaskStatusLabel(task.status)}
                        onChange={(event) => updateStatus.mutate({ id: task._id, status: event.target.value })}
                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      >
                        {allowedStatusOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowAssignAnotherModal(true)}
                        variant="outline"
                        className="flex items-center gap-2 rounded-xl border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
                      >
                        <Plus size={16} />
                        Assign Another Task
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary/95"
                      >
                        <Edit size={16} />
                        Edit Task Details
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section title="Task Details">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Requirements / Description" value={task.description} />
                <Field label="Client Visible Notes" value={task.clientVisibleNotes} />
                {task.taskCategory === 'content' ? (
                  <>
                    <Field label="Script Text" value={task.scriptText} />
                    <Field label="Script Link" value={task.scriptLink} />
                    <Field label="Caption" value={task.caption} />
                    <Field label="Reference Link" value={task.referenceLink} />
                    <Field label="Editor Guide" value={task.editorGuide} />
                    <Field label="Internal Notes" value={task.internalNotes} />
                  </>
                ) : (
                  <>
                    {isWebsiteTaskType(task.taskType) ? (
                      <>
                        <Field label="Website Type" value={task.websiteType} />
                        <Field label="Website Requirements" value={task.websiteRequirements} />
                        <Field label="Pages Needed" value={(task.pagesNeeded || []).join(', ')} />
                        <Field label="Content Availability" value={formatTaskTypeLabel(task.contentAvailability)} />
                        <Field label="Branding Availability" value={formatTaskTypeLabel(task.brandingAvailability)} />
                        <Field label="Domain Details" value={task.domainDetails} />
                        <Field label="Hosting Details" value={task.hostingDetails} />
                        <Field label="Admin Credentials" value={task.adminCredentials} />
                        <Field label="Required Features" value={task.requiredFeatures} />
                      </>
                    ) : (
                      <>
                        <Field label="Reference Link" value={task.referenceLink} />
                        <Field label="Internal Notes" value={task.internalNotes} />
                      </>
                    )}
                  </>
                )}
              </div>
            </Section>

            <Section title="Attachments">
              <FileList files={task.attachments || []} emptyMessage="No attachments uploaded for this task yet." />
            </Section>

            <Section title="Completed Files">
              {!isClient && (
                <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                  <label className="text-sm font-semibold text-foreground">Upload completed files</label>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setCompletedFiles(Array.from(event.target.files || []))}
                    className="mt-3 w-full text-sm"
                  />
                  {completedFiles.length > 0 && (
                    <div className="mt-3">
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {completedFiles.map((file) => (
                          <li key={`${file.name}-${file.size}`}>{file.name}</li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        onClick={handleUploadCompletedFiles}
                        disabled={addCompletedFiles.isPending}
                        className="mt-3"
                      >
                        {addCompletedFiles.isPending ? 'Uploading...' : 'Upload Completed Files'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <FileList files={task.completedFiles || []} emptyMessage="No completed files have been uploaded yet." />
            </Section>

            {!isClient && (
              <Section title="Work Progress">
                <ProgressUpdateForm taskId={taskId} onSuccess={refetch} />
                {(task.progressUpdates || []).length > 0 && (
                  <div className="mt-4 space-y-3">
                    {task.progressUpdates.slice().reverse().map((item, index) => (
                      <div key={`${item.completedAt}-${index}`} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-foreground">{item.description}</p>
                          <span className="text-xs text-muted-foreground">
                            {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        {item.workDate ? (
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Work Date: {new Date(item.workDate).toLocaleDateString()}
                          </p>
                        ) : null}
                        {item.workNotes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.workNotes}</p>}
                        {item.hours ? <p className="mt-2 text-xs text-muted-foreground">{item.hours}h logged</p> : null}
                        {item.attachments?.length ? (
                          <div className="mt-3">
                            <FileList files={item.attachments} emptyMessage="" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section title="Client Response">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Client Response" value={task.clientResponse || 'pending'} />
                <Field label="Approval Status" value={task.approvalStatus || 'pending'} />
                <Field label="Response Date" value={task.clientResponseDate ? new Date(task.clientResponseDate).toLocaleString() : 'Not submitted'} />
                <Field label="Response Submitted By" value={task.clientResponseBy?.name || 'Not submitted'} />
                <Field label="Client Feedback" value={task.clientFeedback} />
                <Field label="Rejection Reason" value={task.rejectionReason} />
              </div>
            </Section>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
            Task not found.
          </div>
        )}
        <AddTaskModal
          open={isEditing}
          onOpenChange={(val) => {
            setIsEditing(val);
            if (!val) refetch();
          }}
          task={task}
        />
        {showAssignAnotherModal && (
          <AddTaskModal
            open={showAssignAnotherModal}
            onOpenChange={(val) => {
              setShowAssignAnotherModal(val);
              if (!val) refetch();
            }}
            initialValues={{
              client: task.client?._id || task.client || '',
              project: task.project?._id || task.project || '',
              assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0]?._id || task.assignedTo[0] || '' : task.assignedTo || '',
              assignedManager: task.assignedManager?._id || task.assignedManager || '',
              priority: task.priority || 'Medium',
              dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
