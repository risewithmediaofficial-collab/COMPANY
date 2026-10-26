import React, { useState } from 'react';
import {
  FileText,
  User,
  Calendar,
  ExternalLink,
  Sparkles,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

const VIDEO_TYPES = [
  'Montage',
  'Voice-over',
  'CTA',
  'Services',
  'Customer Review',
  'Promotional',
  'Educational',
  'Interview',
];

const LANGUAGES = ['English', 'Tamil', 'Kannada', 'Telugu', 'Hindi', 'Other'];

const CTA_OPTIONS = [
  'Call Now',
  'WhatsApp',
  'Visit Website',
  'Send DM',
  'Book Now',
  'Learn More',
  'None',
];

const STATUS_OPTIONS = [
  'Draft',
  'Internal Review',
  'Client Approval',
  'Approved',
  'Revision Required',
];

export const ScriptwriterStageForm = ({
  content,
  users = [],
  onSaveStage,
  onRequestRevision,
  disabled = false,
}) => {
  const currentData = content?.scriptwriter || {};

  const [formData, setFormData] = useState({
    assignedMember: currentData.assignedMember?._id || currentData.assignedMember || '',
    assignedMemberName: currentData.assignedMemberName || '',
    videoType: currentData.videoType || 'Promotional',
    language: currentData.language || 'English',
    hook: currentData.hook || '',
    fullScript: currentData.fullScript || '',
    sceneBySceneInstructions: currentData.sceneBySceneInstructions || '',
    onScreenText: currentData.onScreenText || '',
    cta: currentData.cta || 'None',
    referenceVideoLink: currentData.referenceVideoLink || '',
    deadline: currentData.deadline ? currentData.deadline.split('T')[0] : '',
    status: currentData.status || 'Draft',
    notes: currentData.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyScript = () => {
    if (!formData.fullScript) return;
    navigator.clipboard.writeText(formData.fullScript);
    setCopied(true);
    toast.success('Script copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveStage('scriptwriter', formData);
      toast.success('Scriptwriter stage updated successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update script');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Scriptwriter Studio</h3>
            <p className="text-xs text-muted-foreground">
              Define the hook, full script narrative, instructions, and reference links
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {formData.fullScript && (
            <button
              type="button"
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Script'}
            </button>
          )}

          {onRequestRevision && (
            <button
              type="button"
              onClick={() => onRequestRevision('Scriptwriting')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
            >
              Request Revision
            </button>
          )}

          <button
            type="submit"
            disabled={saving || disabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Script'}
          </button>
        </div>
      </div>

      {/* Main Grid: Settings & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assigned Scriptwriter */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Assigned Scriptwriter
          </label>
          <div className="relative">
            <select
              name="assignedMember"
              value={formData.assignedMember}
              onChange={handleChange}
              disabled={disabled}
              className="w-full h-10 px-3 pr-8 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role || 'Member'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Video Type */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Video Type</label>
          <select
            name="videoType"
            value={formData.videoType}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {VIDEO_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Language</label>
          <select
            name="language"
            value={formData.language}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Call To Action */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Call To Action (CTA)
          </label>
          <select
            name="cta"
            value={formData.cta}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {CTA_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Status */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Script Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Script Deadline
          </label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* Hook / Opening Line */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Hook / Opening Line (First 3-5 Seconds)
          </label>
          <span className="text-[11px] text-muted-foreground">Catch audience attention</span>
        </div>
        <input
          type="text"
          name="hook"
          value={formData.hook}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g. Stop scrolling if you're struggling to get real qualified leads in 2026..."
          className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Full Script */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-foreground">
            Full Script Narrative
          </label>
          <span className="text-[11px] text-muted-foreground">Complete spoken script / voice-over text</span>
        </div>
        <textarea
          name="fullScript"
          rows={7}
          value={formData.fullScript}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Write the full script text here with clear paragraphs..."
          className="w-full p-4 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono transition-all placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Two Columns: Scene-by-scene & On-screen text */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Scene-by-Scene Visual Instructions
          </label>
          <textarea
            name="sceneBySceneInstructions"
            rows={5}
            value={formData.sceneBySceneInstructions}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Scene 1: Close-up face speaking&#10;Scene 2: Screen recording showing CRM dashboard&#10;Scene 3: B-roll walking in office"
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted-foreground/60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Caption / On-screen Text Overlay
          </label>
          <textarea
            name="onScreenText"
            rows={5}
            value={formData.onScreenText}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Text overlays to render on video:&#10;'300% ROI in 30 Days'&#10;'Direct WhatsApp booking'"
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Reference Video Link */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1.5">
          Editing / Concept Reference Video Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="referenceVideoLink"
            value={formData.referenceVideoLink}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://instagram.com/reel/... or https://youtube.com/watch?v=..."
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.referenceVideoLink && (
            <a
              href={formData.referenceVideoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all shrink-0"
            >
              <ExternalLink size={13} />
              Open Reference
            </a>
          )}
        </div>
      </div>
    </form>
  );
};

export default ScriptwriterStageForm;
