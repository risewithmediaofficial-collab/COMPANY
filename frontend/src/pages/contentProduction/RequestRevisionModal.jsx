import React, { useState } from 'react';
import { X, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { contentProductionApi } from '../../api/contentProduction';

const STAGE_OPTIONS = ['Scriptwriting', 'Videography', 'Video Editing', 'SMM'];

export const RequestRevisionModal = ({
  isOpen,
  onClose,
  contentId,
  initialStage = 'Video Editing',
  onRevisionSubmitted,
}) => {
  const [stage, setStage] = useState(initialStage);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please provide specific revision feedback');
      return;
    }

    setLoading(true);
    try {
      const res = await contentProductionApi.addRevision(contentId, {
        stage,
        feedback: feedback.trim(),
      });
      if (res.data?.success) {
        toast.success(`Revision requested for ${stage}`);
        onRevisionSubmitted && onRevisionSubmitted(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit revision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Request Content Revision</h3>
              <p className="text-xs text-muted-foreground">
                Flags stage for rework and notifies the assigned team member
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Target Stage for Revision
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 outline-none"
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Specific Changes / Feedback Required <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              placeholder="e.g. Please trim the intro by 2 seconds, remove background hiss at 0:22, and make subtitles bold yellow font matching brand colors..."
              className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs focus:ring-2 focus:ring-rose-500/20 outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? 'Submitting…' : 'Submit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestRevisionModal;
