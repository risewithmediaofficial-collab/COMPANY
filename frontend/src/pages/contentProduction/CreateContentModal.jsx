import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  User,
  Film,
  Building,
  Flag,
  Save,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { contentProductionApi } from '../../api/contentProduction';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STAGES = ['Scriptwriting', 'Videography', 'Video Editing', 'SMM'];

export const CreateContentModal = ({ isOpen, onClose, onCreated, clients = [], users = [] }) => {
  const [formData, setFormData] = useState({
    client: '',
    title: '',
    priority: 'Medium',
    currentStage: 'Scriptwriting',
    assignedTo: '',
    deadline: '',
    additionalNotes: '',
    driveLink: '',
    videoType: 'Promotional',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Content Title is required');
      return;
    }
    if (!formData.client) {
      toast.error('Please select an existing client');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client: formData.client,
        title: formData.title.trim(),
        priority: formData.priority,
        currentStage: formData.currentStage,
        assignedTo: formData.assignedTo || null,
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        additionalNotes: formData.additionalNotes.trim(),
        driveLinks: formData.driveLink
          ? [{ label: 'Primary Drive Folder', url: formData.driveLink.trim() }]
          : [],
        scriptwriter: {
          videoType: formData.videoType,
          status: 'Draft',
        },
        videoEditor: {
          videoType: formData.videoType,
        },
      };

      const res = await contentProductionApi.create(payload);
      if (res.data?.success) {
        toast.success(`Content ${res.data.data.contentId} created successfully`);
        onCreated && onCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Film size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Create Production Content</h3>
              <p className="text-xs text-muted-foreground">
                Initialize a unified content record across Script, Shoot, Edit, and SMM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Client Selection */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Building size={14} className="text-primary" />
              Client Name <span className="text-rose-500">*</span>
            </label>
            <select
              name="client"
              value={formData.client}
              onChange={handleChange}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">-- Select Client from Existing Database --</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Content Title */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Content Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. 5 Signs You Need a Marketing Agency in 2026"
              className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Priority & Starting Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Flag size={14} className="text-amber-500" />
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Starting Pipeline Stage
              </label>
              <select
                name="currentStage"
                value={formData.currentStage}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Person & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                Assigned Team Member
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Target Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {/* Initial Google Drive Link */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <LinkIcon size={14} className="text-muted-foreground" />
              Shared Google Drive Folder Link (Optional)
            </label>
            <input
              type="url"
              name="driveLink"
              value={formData.driveLink}
              onChange={handleChange}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Additional Production Notes
            </label>
            <textarea
              name="additionalNotes"
              rows={3}
              value={formData.additionalNotes}
              onChange={handleChange}
              placeholder="Any specific client requirements, guidelines, or brand tone..."
              className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'Creating Record…' : 'Create Content Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContentModal;
