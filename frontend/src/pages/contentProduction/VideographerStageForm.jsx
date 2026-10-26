import React, { useState } from 'react';
import {
  Camera,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Save,
  CheckCircle2,
  FileText,
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
  'Interview',
  'Product Shoot',
];

const VIDEO_FORMATS = ['Vertical', 'Horizontal', 'Square'];

const EQUIPMENT_OPTIONS = ['Camera', 'Mobile', 'Gimbal', 'Tripod', 'Microphone', 'Lighting'];

const STATUS_OPTIONS = ['Scheduled', 'In Progress', 'Completed', 'Retake Required'];

export const VideographerStageForm = ({
  content,
  users = [],
  onSaveStage,
  onRequestRevision,
  disabled = false,
}) => {
  const currentData = content?.videographer || {};
  const scriptwriterScript = content?.scriptwriter?.fullScript || '';
  const scriptwriterRef = content?.scriptwriter?.referenceVideoLink || '';

  const [formData, setFormData] = useState({
    assignedMember: currentData.assignedMember?._id || currentData.assignedMember || '',
    assignedMemberName: currentData.assignedMemberName || '',
    videoType: currentData.videoType || 'Product Shoot',
    shootDate: currentData.shootDate ? currentData.shootDate.split('T')[0] : '',
    shootTime: currentData.shootTime || '',
    shootLocation: currentData.shootLocation || '',
    locationMapLink: currentData.locationMapLink || '',
    script: currentData.script || scriptwriterScript || '',
    referenceVideoLink: currentData.referenceVideoLink || scriptwriterRef || '',
    requiredShots: currentData.requiredShots || '',
    presenter: currentData.presenter || '',
    equipment: currentData.equipment || ['Camera', 'Microphone'],
    videoFormat: currentData.videoFormat || 'Vertical',
    specialInstructions: currentData.specialInstructions || '',
    rawFootageDriveLink: currentData.rawFootageDriveLink || '',
    deadline: currentData.deadline ? currentData.deadline.split('T')[0] : '',
    status: currentData.status || 'Scheduled',
    notes: currentData.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEquipmentToggle = (item) => {
    if (disabled) return;
    setFormData((prev) => {
      const exists = prev.equipment.includes(item);
      const updated = exists
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item];
      return { ...prev, equipment: updated };
    });
  };

  const handleCopyScript = () => {
    const textToCopy = formData.script || scriptwriterScript;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedScript(true);
    toast.success('Script copied to clipboard');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handlePullApprovedScript = () => {
    if (!scriptwriterScript) {
      toast.error('No scriptwriter script found for this content record');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      script: scriptwriterScript,
      referenceVideoLink: prev.referenceVideoLink || scriptwriterRef,
    }));
    toast.success('Loaded script from Scriptwriter stage');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveStage('videographer', formData);
      toast.success('Videographer stage updated successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update shoot details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Videographer & Shoot Hub</h3>
            <p className="text-xs text-muted-foreground">
              Schedule shoot, specify required equipment, locations, and upload raw footage drive links
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRequestRevision && (
            <button
              type="button"
              onClick={() => onRequestRevision('Videography')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
            >
              Request Retake / Revision
            </button>
          )}

          <button
            type="submit"
            disabled={saving || disabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Shoot Details'}
          </button>
        </div>
      </div>

      {/* Script Sync Banner */}
      {scriptwriterScript && (
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>Approved Script available from Stage 1</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
                  Ready for Shoot
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {content?.scriptwriter?.hook || scriptwriterScript.slice(0, 100)}…
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background hover:bg-secondary text-foreground border border-border transition-all"
            >
              {copiedScript ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copiedScript ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handlePullApprovedScript}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
            >
              Sync to Shoot
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Shoot Timing & Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Assigned Videographer */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Assigned Videographer
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

        {/* Shoot Status */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Shoot Status</label>
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

        {/* Shoot Date */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Shoot Date</label>
          <input
            type="date"
            name="shootDate"
            value={formData.shootDate}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Shoot Time */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">Shoot Time</label>
          <input
            type="time"
            name="shootTime"
            value={formData.shootTime}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Presenter / Person Required */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Presenter / Persons Required for Shoot
          </label>
          <input
            type="text"
            name="presenter"
            value={formData.presenter}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g. Dr. Kumar (Founder) + 2 Client Staff members"
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Shoot Location & Maps Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Shoot Location Address
          </label>
          <div className="relative">
            <input
              type="text"
              name="shootLocation"
              value={formData.shootLocation}
              onChange={handleChange}
              disabled={disabled}
              placeholder="e.g. Client Office, 4th Floor, HSR Layout, Bengaluru"
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Google Maps Link (Optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              name="locationMapLink"
              value={formData.locationMapLink}
              onChange={handleChange}
              disabled={disabled}
              placeholder="https://maps.google.com/?q=..."
              className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/60"
            />
            {formData.locationMapLink && (
              <a
                href={formData.locationMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all shrink-0"
              >
                <MapPin size={13} className="text-rose-500" />
                View Map
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Required (Multi-Select Pills) */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-2">
          Equipment Required (Multi-select)
        </label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => {
            const isSelected = formData.equipment.includes(item);
            return (
              <button
                type="button"
                key={item}
                onClick={() => handleEquipmentToggle(item)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background hover:bg-secondary text-muted-foreground border-border'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Raw Footage Google Drive Link (CRITICAL) */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/25">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Camera size={15} className="text-blue-500" />
            Raw Footage Google Drive Link
          </label>
          <span className="text-[11px] text-muted-foreground">Will automatically link to Video Editor stage</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            name="rawFootageDriveLink"
            value={formData.rawFootageDriveLink}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://drive.google.com/drive/folders/..."
            className="flex-1 h-11 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-muted-foreground/60"
          />
          {formData.rawFootageDriveLink && (
            <a
              href={formData.rawFootageDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shrink-0 shadow-sm"
            >
              <ExternalLink size={14} />
              Open Raw Footage
            </a>
          )}
        </div>
      </div>

      {/* Required Shots / Shot List & Special Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Required Shots / Shot List
          </label>
          <textarea
            name="requiredShots"
            rows={5}
            value={formData.requiredShots}
            onChange={handleChange}
            disabled={disabled}
            placeholder="1. Front facing master shot with soft lighting&#10;2. B-roll closeups of product in action&#10;3. Overhead desk setup shots"
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted-foreground/60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Special Instructions & Notes
          </label>
          <textarea
            name="specialInstructions"
            rows={5}
            value={formData.specialInstructions}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Ensure audio check before interview; use external lapel mic; record in 4K 60fps for slow motion b-rolls."
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
    </form>
  );
};

export default VideographerStageForm;
