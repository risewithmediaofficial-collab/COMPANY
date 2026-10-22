import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Code2,
  Bug,
  Zap,
  Sparkles,
  GitBranch,
  Calendar,
  Briefcase,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Rocket,
  ShieldAlert,
} from 'lucide-react';
import { devApi } from '../../api/development';
import api from '../../api';
import { toast } from 'react-hot-toast';

const TECH_TYPES = [
  { id: 'website_development', label: '💻 Web Feature / App Dev', defaultChecklist: ['Review Specs & Wireframes', 'Component / API Implementation', 'Responsive Mobile Verification', 'Deploy to Staging'] },
  { id: 'website_update', label: '⚡ Website Update / Maintenance', defaultChecklist: ['Asset Gathering', 'Apply Updates', 'Cross-browser Verification'] },
  { id: 'bug_fix', label: '🐞 Bug Fix / Hotpatch', defaultChecklist: ['Reproduce Error', 'Isolate Root Cause', 'Write Code Fix', 'Unit / Integration Test'] },
  { id: 'seo_work', label: '🔍 SEO & Performance', defaultChecklist: ['Audit & Keyword Plan', 'Meta Tags & Schema', 'Core Web Vitals Test'] },
  { id: 'custom_task', label: '⚙️ Tech Infrastructure / API', defaultChecklist: ['Scope Definition', 'Implementation', 'Documentation'] },
];

export const CreateDevTaskModal = ({
  isOpen,
  onClose,
  onTaskCreated,
  defaultProject = '',
  defaultSprint = '',
}) => {
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('website_development');
  const [priority, setPriority] = useState('medium');
  const [stage, setStage] = useState('backlog');
  const [dueDate, setDueDate] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 3);
    return next.toISOString().split('T')[0];
  });

  // Entities
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [releases, setReleases] = useState([]);

  // Selection
  const [selectedProject, setSelectedProject] = useState(defaultProject);
  const [selectedClient, setSelectedClient] = useState('');
  const [developerId, setDeveloperId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [testerId, setTesterId] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprint);
  const [releaseId, setReleaseId] = useState('');

  // Tech / Git metadata
  const [techScope, setTechScope] = useState('');
  const [branch, setBranch] = useState('');
  const [pullRequestUrl, setPullRequestUrl] = useState('');

  // Bug details
  const [bugSeverity, setBugSeverity] = useState('medium');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load supporting entities
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [projRes, cliRes, usersRes, sprintsRes, relRes] = await Promise.all([
          api.get('/projects').catch(() => ({ data: { projects: [] } })),
          api.get('/clients').catch(() => ({ data: { clients: [] } })),
          api.get('/users').catch(() => ({ data: { users: [] } })),
          devApi.getSprints().catch(() => ({ data: { data: [] } })),
          devApi.getReleases().catch(() => ({ data: { data: [] } })),
        ]);

        setProjects(projRes.data?.projects || []);
        setClients(cliRes.data?.clients || []);
        setUsers((usersRes.data?.users || []).filter((u) => u.role !== 'client'));
        setSprints(sprintsRes.data?.data || []);
        setReleases(relRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load dev modal data:', err);
      }
    };

    loadData();
  }, [isOpen]);

  // Set default checklist when taskType changes
  useEffect(() => {
    const found = TECH_TYPES.find((t) => t.id === taskType);
    if (found && found.defaultChecklist) {
      setChecklist(found.defaultChecklist.map((item) => ({ title: item, isCompleted: false })));
    }
  }, [taskType]);

  // If project changes, match client
  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const p = projects.find((item) => item._id === selectedProject);
      if (p?.client) {
        setSelectedClient(typeof p.client === 'object' ? p.client._id : p.client);
      }
    }
  }, [selectedProject, projects]);

  if (!isOpen) return null;

  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([...checklist, { title: newChecklistText.trim(), isCompleted: false }]);
    setNewChecklistText('');
  };

  const handleRemoveChecklist = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        taskTitle: title.trim(),
        taskType,
        priority,
        stage,
        dueDate: dueDate || undefined,
        project: selectedProject || undefined,
        client: selectedClient || undefined,
        developer: developerId || undefined,
        reviewer: reviewerId || undefined,
        tester: testerId || undefined,
        sprint: sprintId || undefined,
        release: releaseId || undefined,
        techScope: techScope.trim(),
        requirementDetails: techScope.trim(),
        branch: branch.trim(),
        pullRequestUrl: pullRequestUrl.trim(),
        isBug: taskType === 'bug_fix',
        bugSeverity: taskType === 'bug_fix' ? bugSeverity : undefined,
        stepsToReproduce: taskType === 'bug_fix' ? stepsToReproduce.trim() : undefined,
        expectedResult: taskType === 'bug_fix' ? expectedResult.trim() : undefined,
        actualResult: taskType === 'bug_fix' ? actualResult.trim() : undefined,
        checklist,
      };

      await devApi.createTask(payload);
      toast.success('Development task created successfully!');

      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create dev task:', err);
      toast.error(err.response?.data?.message || 'Failed to create development task');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <Code2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Create Development Task
              </h2>
              <p className="text-xs text-muted-foreground">
                Creates a tech task directly in the Development module (isolated from general tasks database)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Build client portal authentication & OAuth2 integration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Type & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Development Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {TECH_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Initial Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="backlog">Backlog</option>
                <option value="analysis">Analysis</option>
                <option value="ready_for_dev">Ready for Dev</option>
                <option value="in_development">In Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">🔥 Urgent / Blocker</option>
              </select>
            </div>
          </div>

          {/* Project & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Associated Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">No Project (Internal / Tech)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Internal / Agency Task</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roles: Developer, Reviewer, Tester */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Lead Developer
              </label>
              <select
                value={developerId}
                onChange={(e) => setDeveloperId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select Developer</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Code Reviewer
              </label>
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select Reviewer (Optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                QA Tester
              </label>
              <select
                value={testerId}
                onChange={(e) => setTesterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select QA Tester (Optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sprint & Release */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Sprint
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">No Sprint Assigned</option>
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Release / Deployment
              </label>
              <select
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">No Release Assigned</option>
                {releases.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.version} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Git Branch & PR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Git Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. feat/client-vault"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Pull Request URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={pullRequestUrl}
                onChange={(e) => setPullRequestUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Scope / Requirements */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Technical Scope / Requirements
            </label>
            <textarea
              rows={3}
              placeholder="Describe technical implementation details, architecture, API payload structures, or UI components needed..."
              value={techScope}
              onChange={(e) => setTechScope(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Bug Details Section (if bug_fix selected) */}
          {taskType === 'bug_fix' && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                <Bug size={15} />
                <span>Bug Details</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Severity
                </label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high', 'critical'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setBugSeverity(sev)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        bugSeverity === sev
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Steps to Reproduce
                  </label>
                  <textarea
                    rows={2}
                    placeholder="1. Go to page... 2. Click button..."
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Expected vs Actual
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Expected 200 OK, but received 500 internal server error..."
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Implementation Checklist
            </label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/60 text-xs">
                  <span className="text-foreground">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(idx)}
                    className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add checklist step..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklist();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-3 py-1.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={14} className="inline mr-1" /> Add
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5 bg-secondary/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            <span>{submitting ? 'Creating...' : 'Create Dev Task'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateDevTaskModal;
