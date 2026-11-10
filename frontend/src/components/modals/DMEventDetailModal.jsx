import { useState, useEffect } from 'react';
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
  Camera,
  Radio,
  Tv,
  Calendar,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Play,
  Square,
  Pencil,
  Trash2,
  Printer,
  X,
  ListTodo,
  CheckCircle2,
  Check,
  Sparkles,
  Clapperboard,
  LayoutGrid,
} from 'lucide-react';
import { useTrackVideoShootTime, useUpdateVideoShoot } from '../../hooks/useDMCalendar';
import { normalizeShootChecklist, stripChecklistMeta } from '../../utils/dmChecklist';
import { DMInvoiceModal } from './DMInvoiceModal';

export const DMEventDetailModal = ({
  open,
  onOpenChange,
  eventItem = null,
  onEdit = () => {},
  onDelete = () => {},
}) => {
  const [showInvoiceCustomizer, setShowInvoiceCustomizer] = useState(false);
  const trackTime = useTrackVideoShootTime();
  const updateShoot = useUpdateVideoShoot();

  const item = eventItem?.item || eventItem;
  const activityType = eventItem?.activityType || (item?.plannedContents !== undefined ? 'video_shoot' : item?.platform ? 'vj_promotion' : 'rj_promotion');

  const isVideoShoot = activityType === 'video_shoot';
  const isRj = activityType === 'rj_promotion';
  const isVj = activityType === 'vj_promotion';

  // Local checklist state for immediate interactive feedback
  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    if (!item || !isVideoShoot) {
      setChecklist([]);
      return;
    }
    const normalized = normalizeShootChecklist(item, { synthesizeDefaults: true });
    setChecklist(stripChecklistMeta(normalized.items));
  }, [item, isVideoShoot]);

  if (!eventItem || !item) return null;

  const clientName = item.client?.company || item.client?.name || 'Linked Client';

  const statusTone = {
    Scheduled: 'info',
    'In Progress': 'warning',
    Completed: 'success',
    Cancelled: 'danger',
    Postponed: 'neutral',
  };

  const normalizedSummary = normalizeShootChecklist(
    { ...item, checklist },
    { synthesizeDefaults: false }
  );
  const {
    reelItems,
    postItems,
    completedReels: completedReelsCount,
    completedPosts: completedPostsCount,
    targetReels,
    targetPosts,
    reelsPct,
    postsPct,
    isReelsMet,
    isPostsMet,
    showReels: showReelsSection,
    showPosts: showPostsSection,
  } = normalizedSummary;

  const handleToggleChecklistItem = async (origIndex) => {
    if (!isVideoShoot || !item._id) return;
    const updated = checklist.map((c, i) => (i === origIndex ? { ...c, completed: !c.completed } : c));
    setChecklist(updated);

    const newCompletedCount = updated.filter((c) => c.completed).length;
    const newCompletedReels = updated.filter((c) => c.type !== 'post' && c.completed).length;
    const newCompletedPosts = updated.filter((c) => c.type === 'post' && c.completed).length;

    await updateShoot.mutateAsync({
      id: item._id,
      data: {
        checklist: stripChecklistMeta(updated),
        completedContents: newCompletedCount,
        completedReels: newCompletedReels,
        completedPosts: newCompletedPosts,
        ...(item.plannedPosts === 0 && targetPosts > 0 ? { plannedPosts: targetPosts } : {}),
      },
    });
  };

  const handleTimeTrack = async (action) => {
    if (isVideoShoot) {
      await trackTime.mutateAsync({ id: item._id, action });
    }
  };

  return (
    <>
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
                {isVideoShoot ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0">
                    <Camera className="h-5 w-5" />
                  </div>
                ) : isRj ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                    <Radio className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 shrink-0">
                    <Tv className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                    {item.shootTitle || item.promotionTitle}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {clientName} • {isVideoShoot ? 'Video Shoot' : isRj ? 'RJ Promotion' : `VJ Promotion (${item.platform || 'TV'})`}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={statusTone[item.status] || 'neutral'}>{item.status}</StatusBadge>
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
            {/* Timing & Location */}
            <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-2xl bg-muted/40 border border-border/40 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Date</span>
                  <span className="font-semibold text-foreground">
                    {new Date(item.shootDate || item.promotionDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Timing & Duration</span>
                  <span className="font-semibold text-foreground">
                    {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} -{' '}
                    {item.endTime ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}{' '}
                    ({item.minutesSpoken ? `${item.minutesSpoken} mins` : `${item.duration || item.durationSpoken || 0} hrs`})
                  </span>
                </div>
              </div>

              {item.shootLocation ? (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Shoot Location</span>
                    <span className="font-semibold text-foreground">{item.shootLocation}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Separate Reels & Posts Production Checklists (For Video Shoots) */}
            {isVideoShoot ? (
              <div className="space-y-4">
                {showReelsSection && (
                  <div className="rounded-2xl border border-purple-500/20 bg-card p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Clapperboard className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Reels Content Checklist
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click any reel item to mark it finished or pending
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border self-start sm:self-auto ${
                          isReelsMet
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : completedReelsCount > 0
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isReelsMet ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Sparkles size={13} />}
                        {completedReelsCount} / {targetReels} Reels ({reelsPct}%)
                      </span>
                    </div>

                    {/* Reels Progress Bar */}
                    <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${isReelsMet ? 'bg-emerald-500' : 'bg-purple-600'}`}
                        style={{ width: `${Math.min(reelsPct, 100)}%` }}
                      />
                    </div>

                    {/* Reels Items */}
                    <div className="space-y-2 pt-1 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                      {reelItems.map((cItem, idx) => (
                        <div
                          key={cItem._origIndex}
                          onClick={() => handleToggleChecklistItem(cItem._origIndex)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            cItem.completed
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-background border-border hover:border-purple-500/40'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                              cItem.completed
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'border-muted-foreground/40 bg-background'
                            }`}
                          >
                            {cItem.completed ? <Check size={13} className="stroke-[3]" /> : null}
                          </div>

                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 min-w-[28px]">
                            R#{idx + 1}
                          </span>

                          <span
                            className={`text-xs font-semibold flex-1 ${
                              cItem.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {cItem.title || `Reel Content #${idx + 1}`}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              cItem.completed
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            {cItem.completed ? 'Finished' : 'Pending'}
                          </span>
                        </div>
                      ))}

                      {reelItems.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">
                          No reel items recorded yet. Click Edit to add reels.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {showPostsSection && (
                  <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4 text-primary" /> Posts Checklist
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click any post item to mark it finished or pending
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border self-start sm:self-auto ${
                          isPostsMet
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : completedPostsCount > 0
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isPostsMet ? <CheckCircle2 size={13} className="text-emerald-500" /> : <ListTodo size={13} />}
                        {completedPostsCount} / {targetPosts} Posts ({postsPct}%)
                      </span>
                    </div>

                    {/* Posts Progress Bar */}
                    <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${isPostsMet ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(postsPct, 100)}%` }}
                      />
                    </div>

                    {/* Posts Items */}
                    <div className="space-y-2 pt-1 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                      {postItems.map((cItem, idx) => (
                        <div
                          key={cItem._origIndex}
                          onClick={() => handleToggleChecklistItem(cItem._origIndex)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            cItem.completed
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-background border-border hover:border-primary/40'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                              cItem.completed
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'border-muted-foreground/40 bg-background'
                            }`}
                          >
                            {cItem.completed ? <Check size={13} className="stroke-[3]" /> : null}
                          </div>

                          <span className="text-[11px] font-bold text-primary min-w-[28px]">
                            P#{idx + 1}
                          </span>

                          <span
                            className={`text-xs font-semibold flex-1 ${
                              cItem.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {cItem.title || `Post #${idx + 1}`}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              cItem.completed
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {cItem.completed ? 'Finished' : 'Pending'}
                          </span>
                        </div>
                      ))}

                      {postItems.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">
                          No post items recorded yet. Click Edit to add posts.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!showReelsSection && !showPostsSection && (
                  <div className="rounded-2xl border border-border/80 bg-card p-5 text-center text-xs text-muted-foreground italic">
                    No Reels or Posts checklist items recorded yet. Click Edit to add deliverables.
                  </div>
                )}
              </div>
            ) : (
              /* For RJ & VJ Promotions: keep their member assignment and financial summary */
              <>
                {(item.rjMembers || item.vjMembers || []).length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" /> Assigned Broadcasters / Team
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(item.rjMembers || item.vjMembers).map((m, i) => (
                        <div key={i} className="px-3 py-1.5 rounded-xl border border-border/40 bg-background text-xs flex items-center gap-2">
                          <span className="font-semibold text-foreground">{m.name || m.user?.name || 'Member'}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-500" /> Financial Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-background border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Total Amount</span>
                      <span className="font-bold text-foreground text-sm">₹{(item.totalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Amount Paid</span>
                      <span className="font-bold text-emerald-500 text-sm">₹{(item.amountPaid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Balance</span>
                      <span className="font-bold text-rose-500 text-sm">₹{(item.balanceAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Details & Script Points */}
            {item.promotionDetails && item.promotionDetails !== 'null' ? (
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
                <h4 className="text-xs font-bold text-foreground">Promotion Details & Script Points</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.promotionDetails}
                </p>
              </div>
            ) : null}

            {/* Notes */}
            {item.notes && item.notes !== 'null' ? (
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
                <h4 className="text-xs font-bold text-foreground">Internal Notes & Remarks</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.notes}
                </p>
              </div>
            ) : null}

            {/* Time Tracking Control (For Video Shoots) */}
            {isVideoShoot ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border/40">
                <div className="text-xs">
                  <span className="font-semibold block text-foreground">Time Tracking</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.shootStartedAt
                      ? `Started: ${new Date(item.shootStartedAt).toLocaleTimeString()} ${item.shootEndedAt ? '• Ended: ' + new Date(item.shootEndedAt).toLocaleTimeString() : ''}`
                      : 'Shoot clock not started'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status !== 'Completed' && !item.shootStartedAt ? (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleTimeTrack('start')} disabled={trackTime.isPending}>
                      <Play className="h-3.5 w-3.5 mr-1 fill-white" /> Start Clock
                    </Button>
                  ) : null}
                  {item.status === 'In Progress' || (item.shootStartedAt && !item.shootEndedAt) ? (
                    <Button size="sm" variant="destructive" onClick={() => handleTimeTrack('stop')} disabled={trackTime.isPending}>
                      <Square className="h-3.5 w-3.5 mr-1 fill-white" /> End Clock
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Pinned Sticky Footer */}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-3 z-10 shadow-xs select-none">
            <div className="flex items-center gap-2.5">
              <Button
                size="sm"
                variant="outline"
                className="h-11 px-4 rounded-xl font-semibold text-sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(
                    isVideoShoot
                      ? {
                          ...item,
                          checklist: stripChecklistMeta(checklist),
                          completedReels: completedReelsCount,
                          completedPosts: completedPostsCount,
                          completedContents: completedReelsCount + completedPostsCount,
                        }
                      : item
                  );
                }}
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-11 px-4 rounded-xl font-semibold text-sm text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { onOpenChange(false); onDelete(item); }}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
            
            <div className="flex items-center gap-2.5 ml-auto">
              <Button size="sm" className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm" onClick={() => setShowInvoiceCustomizer(true)}>
                <Printer className="h-4 w-4 mr-1.5" /> Invoice PDF
              </Button>
              <Button variant="outline" className="h-11 px-5 rounded-xl font-semibold text-sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Customization & Generation Modal */}
      <DMInvoiceModal
        open={showInvoiceCustomizer}
        onOpenChange={setShowInvoiceCustomizer}
        eventItem={eventItem}
      />
    </>
  );
};
