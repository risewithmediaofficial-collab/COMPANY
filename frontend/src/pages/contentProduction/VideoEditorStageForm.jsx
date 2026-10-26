import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  FileText,
  Video,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Music,
  Mic,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { contentProductionApi } from '../../api/contentProduction';

const VIDEO_TYPES = [
  'Montage',
  'Voice-over',
  'CTA',
  'Services',
  'Customer Review',
  'Promotional',
  'Educational',
  'Talking Head',
  'Before & After',
];

const VIDEO_FORMATS = ['9:16', '16:9', '1:1'];

const VIDEO_DURATIONS = ['15 sec', '30 sec', '60 sec', '90 sec', 'Custom'];

const STATUS_OPTIONS = ['Pending', 'Editing', 'Review', 'Revision Required', 'Completed'];

export const VideoEditorStageForm = ({
  content,
  clients = [],
  allContents = [],
  users = [],
  onSaveStage,
  onRequestRevision,
  onSwitchContent,
  disabled = false,
}) => {
  const currentData = content?.videoEditor || {};
  const currentClientId = content?.client?._id || content?.client || '';
  const currentRawFootage = currentData.rawFootageDriveLink || content?.videographer?.rawFootageDriveLink || '';

  const [formData, setFormData] = useState({
    assignedMember: currentData.assignedMember?._id || currentData.assignedMember || '',
    assignedMemberName: currentData.assignedMemberName || '',
    videoType: currentData.videoType || 'Promotional',
    videoFormat: currentData.videoFormat || '9:16',
    videoDuration: currentData.videoDuration || '30 sec',
    editingReferenceVideo: currentData.editingReferenceVideo || '',
    selectedReferenceVideoId: currentData.selectedReferenceVideoId || '',
    selectedReferenceVideoTitle: currentData.selectedReferenceVideoTitle || '',
    rawFootageDriveLink: currentRawFootage,
    script: currentData.script || content?.scriptwriter?.fullScript || '',
    selectedScriptId: currentData.selectedScriptId || '',
    selectedScriptTitle: currentData.selectedScriptTitle || '',
    voiceOverAudioLink: currentData.voiceOverAudioLink || '',
    musicReferenceLink: currentData.musicReferenceLink || '',
    captionOnScreenText: currentData.captionOnScreenText || content?.scriptwriter?.onScreenText || '',
    brandAssetsDriveLink: currentData.brandAssetsDriveLink || '',
    editingInstructions: currentData.editingInstructions || '',
    deadline: currentData.deadline ? currentData.deadline.split('T')[0] : '',
    status: currentData.status || 'Pending',
    finalVideoDriveLink: currentData.finalVideoDriveLink || '',
    notes: currentData.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Saved scripts & reference videos loaded from CRM records
  const [savedScripts, setSavedScripts] = useState([]);
  const [savedReferenceVideos, setSavedReferenceVideos] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Fetch saved scripts and reference videos for this client
  const fetchClientSavedAssets = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoadingAssets(true);
    try {
      const res = await contentProductionApi.getScriptsAndReferences({ clientId });
      if (res.data?.success) {
        setSavedScripts(res.data.scripts || []);
        setSavedReferenceVideos(res.data.referenceVideos || []);
      }
    } catch (err) {
      console.warn('Failed to load saved scripts and references:', err);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (currentClientId) {
      fetchClientSavedAssets(currentClientId);
    }
  }, [currentClientId, fetchClientSavedAssets]);

  // Pre-select saved script and reference if available
  useEffect(() => {
    if (savedScripts.length > 0 && !formData.selectedScriptId) {
      // Look for a script associated with this current content
      const matchingScript = savedScripts.find(
        (s) => s.contentId === content?.contentId || s.recordId === content?._id
      );
      if (matchingScript) {
        setFormData((prev) => ({
          ...prev,
          selectedScriptId: matchingScript.id,
          selectedScriptTitle: matchingScript.title,
          script: prev.script || matchingScript.fullScript,
        }));
      }
    }
  }, [savedScripts, content, formData.selectedScriptId]);

  useEffect(() => {
    if (savedReferenceVideos.length > 0 && !formData.selectedReferenceVideoId) {
      const matchingRef = savedReferenceVideos.find(
        (r) => r.contentId === content?.contentId || r.recordId === content?._id
      );
      if (matchingRef) {
        setFormData((prev) => ({
          ...prev,
          selectedReferenceVideoId: matchingRef.id,
          selectedReferenceVideoTitle: matchingRef.title,
          editingReferenceVideo: prev.editingReferenceVideo || matchingRef.url,
        }));
      }
    }
  }, [savedReferenceVideos, content, formData.selectedReferenceVideoId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // When editor chooses a saved script from dropdown
  const handleScriptSelect = (scriptId) => {
    if (!scriptId) {
      setFormData((prev) => ({
        ...prev,
        selectedScriptId: '',
        selectedScriptTitle: '',
      }));
      return;
    }

    const selected = savedScripts.find((s) => s.id === scriptId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        selectedScriptId: selected.id,
        selectedScriptTitle: selected.title,
        script: selected.fullScript || prev.script,
      }));
      toast.success(`Loaded saved script: "${selected.title}"`);
    }
  };

  // When editor chooses a saved reference video from dropdown
  const handleReferenceVideoSelect = (refId) => {
    if (!refId) {
      setFormData((prev) => ({
        ...prev,
        selectedReferenceVideoId: '',
        selectedReferenceVideoTitle: '',
      }));
      return;
    }

    const selected = savedReferenceVideos.find((r) => r.id === refId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        selectedReferenceVideoId: selected.id,
        selectedReferenceVideoTitle: selected.title,
        editingReferenceVideo: selected.url,
      }));
      toast.success(`Loaded reference video: "${selected.title}"`);
    }
  };

  const handleCopyScript = () => {
    if (!formData.script) return;
    navigator.clipboard.writeText(formData.script);
    setCopiedScript(true);
    toast.success('Script text copied to clipboard');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveStage('videoEditor', formData);
      toast.success('Video editor stage saved successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update editor details');
    } finally {
      setSaving(false);
    }
  };

  // Find currently selected script details for preview
  const activeScript = savedScripts.find((s) => s.id === formData.selectedScriptId);
  const activeRef = savedReferenceVideos.find((r) => r.id === formData.selectedReferenceVideoId);

  // Client contents for Content Title dropdown
  const clientContents = allContents.filter(
    (c) => (c.client?._id || c.client) === currentClientId
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Film size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Video Editing Suite</h3>
            <p className="text-xs text-muted-foreground">
              Link approved scripts, reference clips, raw footage, and upload the final produced video
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRequestRevision && (
            <button
              type="button"
              onClick={() => onRequestRevision('Video Editing')}
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
            {saving ? 'Saving…' : 'Save Editing Details'}
          </button>
        </div>
      </div>

      {/* 1. Client & Content Selector Bar */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            Client
          </label>
          <div className="text-xs font-medium text-foreground bg-background px-3 py-2 rounded-xl border border-border/80 truncate">
            {content?.client?.name || content?.client?.company || content?.clientName || 'No Client Selected'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            Current Content
          </label>
          <div className="flex items-center gap-2">
            <select
              value={content?._id || ''}
              onChange={(e) => onSwitchContent && onSwitchContent(e.target.value)}
              disabled={disabled || clientContents.length <= 1}
              className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {clientContents.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.contentId} — {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SCRIPT SELECTION (Saved Scripts from CRM) */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Saved Script Selection
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {savedScripts.length} saved script(s) found in CRM
          </span>
        </div>

        {savedScripts.length > 0 ? (
          <div>
            <select
              value={formData.selectedScriptId}
              onChange={(e) => handleScriptSelect(e.target.value)}
              disabled={disabled}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
              <option value="">-- Choose a Saved Script from CRM --</option>
              {savedScripts.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.source}] {s.contentId} — {s.title} ({s.status})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-background/50 border border-dashed border-border text-center text-xs text-muted-foreground">
            No previously saved scripts found for this client. You can enter the script below.
          </div>
        )}

        {/* Script Preview Card */}
        {formData.script && (
          <div className="p-3 rounded-xl bg-background border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Active Script Preview {formData.selectedScriptTitle && `(${formData.selectedScriptTitle})`}
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                {copiedScript ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedScript ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto text-xs text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed p-2 rounded-lg bg-muted/30 border border-border/50">
              {formData.script}
            </div>
          </div>
        )}
      </div>

      {/* 3. REFERENCE VIDEO SELECTION (Saved References from CRM) */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-blue-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Saved Reference Video Selection
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {savedReferenceVideos.length} saved reference clip(s) found in CRM
          </span>
        </div>

        {savedReferenceVideos.length > 0 ? (
          <div>
            <select
              value={formData.selectedReferenceVideoId}
              onChange={(e) => handleReferenceVideoSelect(e.target.value)}
              disabled={disabled}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">-- Choose a Saved Reference Video --</option>
              {savedReferenceVideos.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.source}] {r.contentId} — {r.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-background/50 border border-dashed border-border text-center text-xs text-muted-foreground">
            No saved reference videos found for this client. You can provide a custom link below.
          </div>
        )}

        {/* Reference Video Link Input & Clickable Preview */}
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="editingReferenceVideo"
            value={formData.editingReferenceVideo}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Reference Video URL (https://instagram.com/reel/...)"
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.editingReferenceVideo && (
            <a
              href={formData.editingReferenceVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shrink-0 shadow-xs"
            >
              <ExternalLink size={13} />
              Preview Video
            </a>
          )}
        </div>
      </div>

      {/* 4. OTHER EDITING METADATA: Type, Format, Duration, Assigned, Status, Deadline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assigned Editor */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Assigned Editor
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

        {/* Video Format */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Video Format</label>
          <select
            name="videoFormat"
            value={formData.videoFormat}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {VIDEO_FORMATS.map((vf) => (
              <option key={vf} value={vf}>
                {vf}
              </option>
            ))}
          </select>
        </div>

        {/* Video Duration */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Video Duration</label>
          <select
            name="videoDuration"
            value={formData.videoDuration}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {VIDEO_DURATIONS.map((vd) => (
              <option key={vd} value={vd}>
                {vd}
              </option>
            ))}
          </select>
        </div>

        {/* Editing Status */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Editing Status</label>
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
            Editing Deadline
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

      {/* Raw Footage Link (from videographer or editable) */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/80">
        <label className="block text-xs font-bold text-foreground mb-1.5">
          Raw Footage Drive Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="rawFootageDriveLink"
            value={formData.rawFootageDriveLink}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://drive.google.com/..."
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.rawFootageDriveLink && (
            <a
              href={formData.rawFootageDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all shrink-0"
            >
              <ExternalLink size={13} />
              Open Footage
            </a>
          )}
        </div>
      </div>

      {/* Voice-over Audio & Music Reference Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Mic size={14} className="text-amber-500" />
            Voice-over Audio Link (Drive / Dropbox)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="voiceOverAudioLink"
              value={formData.voiceOverAudioLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://drive.google.com/... (voiceover.mp3)"
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.voiceOverAudioLink && (
              <a
                href={formData.voiceOverAudioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Music size={14} className="text-pink-500" />
            Music / Audio Reference Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="musicReferenceLink"
              value={formData.musicReferenceLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://open.spotify.com/... or YouTube/Drive link"
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.musicReferenceLink && (
              <a
                href={formData.musicReferenceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Brand Assets Drive Link & Caption/On-screen Text */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Logo / Brand Assets Drive Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="brandAssetsDriveLink"
              value={formData.brandAssetsDriveLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://drive.google.com/drive/folders/... (Logos, Fonts)"
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.brandAssetsDriveLink && (
              <a
                href={formData.brandAssetsDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Editing Instructions / Cuts & Timing
          </label>
          <textarea
            name="editingInstructions"
            rows={3}
            value={formData.editingInstructions}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Cut at 0:15 on bass drop; add brand color glow on transitions..."
            className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* FINAL VIDEO DRIVE LINK (CRITICAL - Passed to SMM) */}
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Film size={16} className="text-purple-500" />
            Final Video Google Drive Link
          </label>
          <span className="text-[11px] text-muted-foreground">
            Accessible directly to the SMM Team once completed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="finalVideoDriveLink"
            value={formData.finalVideoDriveLink}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://drive.google.com/file/d/.../view"
            className="flex-1 h-11 px-4 rounded-xl bg-background border border-border text-foreground text-xs font-mono font-medium focus:ring-2 focus:ring-purple-500/30 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.finalVideoDriveLink && (
            <a
              href={formData.finalVideoDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shrink-0 shadow-sm"
            >
              <ExternalLink size={14} />
              Open Final Video
            </a>
          )}
        </div>
      </div>
    </form>
  );
};

export default VideoEditorStageForm;
