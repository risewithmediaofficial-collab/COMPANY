import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../ui/page';
import {
  Sparkles,
  MapPin,
  Users,
  TrendingUp,
  IndianRupee,
  Phone,
  Mail,
  ExternalLink,
  Pencil,
  Trash2,
  Star,
  FileText,
} from 'lucide-react';

export const InfluencerDetailModal = ({
  open,
  onOpenChange,
  influencer = null,
  onEdit = () => {},
  onDelete = () => {},
}) => {
  if (!influencer) return null;

  const isLocal = influencer.influencerType === 'Local Influencer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isLocal ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {influencer.name}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-primary">
                  {influencer.handle} • <span className="text-muted-foreground">{influencer.platform}</span>
                </DialogDescription>
              </div>
            </div>
            <StatusBadge tone={isLocal ? 'success' : 'primary'}>
              {influencer.influencerType}
            </StatusBadge>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Category</span>
              <span className="font-bold text-foreground text-sm">{influencer.category || 'Niche'}</span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Followers</span>
              <span className="font-bold text-emerald-500 text-sm">
                {(influencer.followersCount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Engagement</span>
              <span className="font-bold text-blue-500 text-sm">
                {influencer.engagementRate || 0}%
              </span>
            </div>
          </div>

          {/* Location & Rating */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Location City</span>
                <span className="font-bold text-foreground">{influencer.cityLocation || 'Regional / Pan-India'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="font-bold text-amber-600 text-sm">{influencer.rating || 5}.0 Stars</span>
            </div>
          </div>

          {/* Commercial Rate Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-500" /> Commercial Rate Card
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Reel Cost</span>
                <span className="font-bold text-foreground">₹{(influencer.pricing?.reelCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Story Cost</span>
                <span className="font-bold text-foreground">₹{(influencer.pricing?.storyCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Post Cost</span>
                <span className="font-bold text-foreground">₹{(influencer.pricing?.postCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Event Appearance</span>
                <span className="font-bold text-emerald-600">₹{(influencer.pricing?.eventCost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Contact Details & Links */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 text-xs">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-primary" /> Contact & Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">Contact Person</span>
                <span className="font-semibold text-foreground">{influencer.contactName || 'Direct Creator'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Phone / WhatsApp</span>
                <span className="font-semibold text-foreground">{influencer.phone || influencer.whatsapp || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Email</span>
                <span className="font-semibold text-foreground">{influencer.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              {influencer.profileUrl ? (
                <a
                  href={influencer.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Social Profile Link
                </a>
              ) : null}

              {influencer.mediaKitUrl ? (
                <a
                  href={influencer.mediaKitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Media Kit Drive Link
                </a>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          {influencer.notes ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1 text-xs">
              <h4 className="text-xs font-bold text-foreground">Internal Notes & History</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{influencer.notes}</p>
            </div>
          ) : null}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(influencer); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { onOpenChange(false); onDelete(influencer); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
