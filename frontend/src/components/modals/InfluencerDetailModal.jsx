import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  X,
} from '@/components/ui/muiIcons';

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
      <DialogContent
        size="lg"
        noPadding
        hideCloseButton
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]"
      >
        {/* Pinned Sticky Header */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-card shrink-0 select-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-foreground shrink-0">
                <Sparkles size={20} className="shrink-0" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  {influencer.name}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                  {influencer.handle} • <span className="text-muted-foreground font-normal">{influencer.platform}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="neutral">
                {influencer.influencerType}
              </StatusBadge>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded-md">
                ESC
              </span>
              <DialogClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Category</span>
              <span className="font-bold text-foreground text-sm mt-0.5 block">{influencer.category || 'Niche'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Followers</span>
              <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">
                {(influencer.followersCount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Engagement</span>
              <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">
                {influencer.engagementRate || 0}%
              </span>
            </div>
          </div>

          {/* Location & Rating */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/60 text-xs">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Location City</span>
                <span className="font-bold text-foreground text-sm">{influencer.cityLocation || 'Regional / Pan-India'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-secondary px-3.5 py-1.5 rounded-xl border border-border">
              <Star className="h-4 w-4 fill-foreground text-foreground shrink-0" />
              <span className="font-bold text-foreground text-sm tabular-nums">{influencer.rating || 5}.0 Stars</span>
            </div>
          </div>

          {/* Commercial Rate Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-foreground shrink-0" /> Commercial Rate Card
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Reel Cost</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">₹{(influencer.pricing?.reelCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Story Cost</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">₹{(influencer.pricing?.storyCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Post Cost</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">₹{(influencer.pricing?.postCost || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Event Appearance</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block tabular-nums">₹{(influencer.pricing?.eventCost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Contact Details & Links */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3.5 text-xs">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-foreground shrink-0" /> Contact &amp; Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-muted-foreground block text-[10px]">Contact Person</span>
                <span className="font-semibold text-foreground text-sm">{influencer.contactName || 'Direct Creator'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Phone / WhatsApp</span>
                <span className="font-semibold text-foreground text-sm tabular-nums">{influencer.phone || influencer.whatsapp || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Email</span>
                <span className="font-semibold text-foreground text-sm">{influencer.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-border/40">
              {influencer.profileUrl ? (
                <a
                  href={influencer.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Social Profile Link
                </a>
              ) : null}

              {influencer.mediaKitUrl ? (
                <a
                  href={influencer.mediaKitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" /> Media Kit Drive Link
                </a>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          {influencer.notes ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-1.5 text-xs">
              <h4 className="text-xs font-bold text-foreground">Internal Notes &amp; History</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{influencer.notes}</p>
            </div>
          ) : null}
        </div>

        {/* Pinned Sticky Footer */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
          <div className="flex items-center gap-2.5">
            <Button size="sm" variant="outline" className="h-11 px-4 rounded-xl font-semibold text-sm" onClick={() => { onOpenChange(false); onEdit(influencer); }}>
              <Pencil className="h-4 w-4 mr-1.5 shrink-0" /> Edit Profile
            </Button>
            <Button size="sm" variant="outline" className="h-11 px-4 rounded-xl font-semibold text-sm text-foreground border-border hover:bg-secondary" onClick={() => { onOpenChange(false); onDelete(influencer); }}>
              <Trash2 className="h-4 w-4 mr-1.5 shrink-0" /> Delete
            </Button>
          </div>

          <Button variant="outline" className="h-11 px-5 rounded-xl font-semibold text-sm ml-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

