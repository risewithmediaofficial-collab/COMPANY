import React, { useState } from 'react';
import {
  Share2,
  Calendar,
  Clock,
  ExternalLink,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Send,
  AlertCircle,
  Hash,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn'];

const CONTENT_TYPES = ['Reel', 'Post', 'Carousel', 'Story', 'YouTube Short'];

const CTA_OPTIONS = [
  'Call Now',
  'WhatsApp',
  'Visit Website',
  'Send DM',
  'Book Now',
  'Learn More',
  'None',
];

const STATUS_OPTIONS = ['Content Pending', 'Approval Pending', 'Scheduled', 'Published'];

export const SmmStageForm = ({
  content,
  users = [],
  onSaveStage,
  onRequestRevision,
  disabled = false,
}) => {
  const currentData = content?.smm || {};
  const editorFinalVideo = content?.videoEditor?.finalVideoDriveLink || '';

  const [formData, setFormData] = useState({
    assignedMember: currentData.assignedMember?._id || currentData.assignedMember || '',
    assignedMemberName: currentData.assignedMemberName || '',
    platforms: currentData.platforms || ['Instagram'],
    contentType: currentData.contentType || 'Reel',
    caption: currentData.caption || '',
    hashtags: currentData.hashtags || '',
    cta: currentData.cta || 'None',
    finalCreativeDriveLink: currentData.finalCreativeDriveLink || editorFinalVideo,
    coverImageDriveLink: currentData.coverImageDriveLink || '',
    scheduledDate: currentData.scheduledDate ? currentData.scheduledDate.split('T')[0] : '',
    scheduledTime: currentData.scheduledTime || '11:00',
    status: currentData.status || 'Content Pending',
    publishedPostUrl: currentData.publishedPostUrl || '',
    deadline: currentData.deadline ? currentData.deadline.split('T')[0] : '',
    notes: currentData.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformToggle = (platform) => {
    if (disabled) return;
    setFormData((prev) => {
      const exists = prev.platforms.includes(platform);
      const updated = exists
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms: updated };
    });
  };

  const handleCopyCaption = () => {
    const fullText = `${formData.caption}\n\n${formData.hashtags}`.trim();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    toast.success('Caption & hashtags copied to clipboard');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handlePullEditorVideo = () => {
    if (!editorFinalVideo) {
      toast.error('No final video link uploaded in Editor stage yet');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      finalCreativeDriveLink: editorFinalVideo,
    }));
    toast.success('Synced final video drive link from Editor stage');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveStage('smm', formData);
      toast.success('SMM stage saved successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update SMM details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Social Media Management (SMM)</h3>
            <p className="text-xs text-muted-foreground">
              Prepare captions, format hashtags, schedule posting date/time, and track published URLs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {formData.caption && (
            <button
              type="button"
              onClick={handleCopyCaption}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              {copiedCaption ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copiedCaption ? 'Copied' : 'Copy Caption & Tags'}
            </button>
          )}

          {onRequestRevision && (
            <button
              type="button"
              onClick={() => onRequestRevision('SMM')}
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
            {saving ? 'Saving…' : 'Save SMM Details'}
          </button>
        </div>
      </div>

      {/* Editor Video Sync Banner if available */}
      {editorFinalVideo && (
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Film size={18} className="text-purple-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>Final Produced Video is ready from Editor stage</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold">
                  Available
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-md">
                {editorFinalVideo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={editorFinalVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-secondary text-foreground border border-border transition-all"
            >
              <ExternalLink size={13} />
              Preview Video
            </a>
            <button
              type="button"
              onClick={handlePullEditorVideo}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs"
            >
              Use Link
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Platforms, Content Type, Assignee, Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Assigned SMM Member */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Assigned SMM Member
          </label>
          <select
            name="assignedMember"
            value={formData.assignedMember}
            onChange={handleChange}
            disabled={disabled}
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

        {/* Content Type */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Content Type</label>
          <select
            name="contentType"
            value={formData.contentType}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {CONTENT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
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

        {/* SMM Stage Status */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">SMM Status</label>
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
      </div>

      {/* Target Platforms (Multi-select) */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-2">
          Target Social Media Platforms (Multi-select)
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const isSelected = formData.platforms.includes(platform);
            return (
              <button
                type="button"
                key={platform}
                onClick={() => handlePlatformToggle(platform)}
                disabled={disabled}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-background hover:bg-secondary text-muted-foreground border-border'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {platform}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduling Row: Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30 border border-border/80">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" />
            Scheduled Publishing Date
          </label>
          <input
            type="date"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Clock size={14} className="text-primary" />
            Scheduled Publishing Time
          </label>
          <input
            type="time"
            name="scheduledTime"
            value={formData.scheduledTime}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Deliverable Deadline
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

      {/* Caption & Hashtags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Post Caption / Copy
          </label>
          <textarea
            name="caption"
            rows={6}
            value={formData.caption}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Write engaging caption for the post... Don't forget the call to action!"
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Hash size={14} className="text-muted-foreground" />
            Hashtags
          </label>
          <textarea
            name="hashtags"
            rows={6}
            value={formData.hashtags}
            onChange={handleChange}
            disabled={disabled}
            placeholder="#RiseWithMedia #DigitalMarketing #BusinessGrowth #CreativeAgency"
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Final Creative Drive Link & Cover Image Drive Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Film size={14} className="text-primary" />
            Final Creative / Video Drive Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="finalCreativeDriveLink"
              value={formData.finalCreativeDriveLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://drive.google.com/..."
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.finalCreativeDriveLink && (
              <a
                href={formData.finalCreativeDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-amber-500" />
            Cover Image / Thumbnail Drive Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="coverImageDriveLink"
              value={formData.coverImageDriveLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://drive.google.com/... (Thumbnail / Cover)"
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.coverImageDriveLink && (
              <a
                href={formData.coverImageDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Published Post URL */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Live Published Post URL
          </label>
          <span className="text-[11px] text-muted-foreground">
            Paste final published link (Instagram, LinkedIn, YouTube)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="publishedPostUrl"
            value={formData.publishedPostUrl}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://www.instagram.com/reel/C7... or https://youtube.com/shorts/..."
            className="flex-1 h-11 px-4 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.publishedPostUrl && (
            <a
              href={formData.publishedPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shrink-0 shadow-sm"
            >
              <ExternalLink size={14} />
              Open Live Post
            </a>
          )}
        </div>
      </div>
    </form>
  );
};

export default SmmStageForm;
