import { useState } from 'react';
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
  Camera,
  Radio,
  Tv,
  Calendar,
  Clock,
  MapPin,
  Users,
  Wrench,
  IndianRupee,
  Play,
  Square,
  Pencil,
  Trash2,
  Printer,
  Receipt,
  FileText,
} from 'lucide-react';
import { useTrackVideoShootTime } from '../../hooks/useDMCalendar';
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

  if (!eventItem) return null;

  const item = eventItem.item || eventItem;
  const activityType = eventItem.activityType || (item.plannedContents !== undefined ? 'video_shoot' : item.platform ? 'vj_promotion' : 'rj_promotion');

  const isVideoShoot = activityType === 'video_shoot';
  const isRj = activityType === 'rj_promotion';
  const isVj = activityType === 'vj_promotion';

  const clientName = item.client?.company || item.client?.name || 'Linked Client';

  const statusTone = {
    Scheduled: 'info',
    'In Progress': 'warning',
    Completed: 'success',
    Cancelled: 'danger',
    Postponed: 'neutral',
  };

  const isContentBelowScheduled = item.completedContents < item.plannedContents;
  const isReelsBelowScheduled = item.completedReels < item.plannedReels;

  const handleTimeTrack = async (action) => {
    if (isVideoShoot) {
      await trackTime.mutateAsync({ id: item._id, action });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2">
                {isVideoShoot ? (
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Camera className="h-5 w-5" />
                  </div>
                ) : isRj ? (
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Radio className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <Tv className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {item.shootTitle || item.promotionTitle}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {clientName} • {isVideoShoot ? 'Video Shoot' : isRj ? 'RJ Promotion' : `VJ Promotion (${item.platform || 'TV'})`}
                  </DialogDescription>
                </div>
              </div>
              <StatusBadge tone={statusTone[item.status] || 'neutral'}>{item.status}</StatusBadge>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
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
                  <span className="text-muted-foreground block text-[10px]">Timing & Spoken Duration</span>
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

            {/* Content & Reels Progress (RED if below scheduled) */}
            {isVideoShoot ? (
              <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-2xl border border-border/60 bg-card">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Contents Progress</span>
                    <span className={`font-bold ${isContentBelowScheduled ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {item.completedContents || 0} / {item.plannedContents || 0} ({item.contentsCompletionPct || 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isContentBelowScheduled ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(item.contentsCompletionPct || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Reels Progress</span>
                    <span className={`font-bold ${isReelsBelowScheduled ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {item.completedReels || 0} / {item.plannedReels || 0} ({item.reelsCompletionPct || 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isReelsBelowScheduled ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(item.reelsCompletionPct || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Assigned Team Members */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Assigned Crew / Team
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {(item.assignedTeam || item.rjMembers || item.vjMembers || []).map((m, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-xl border border-border/40 bg-background text-xs flex items-center gap-2">
                    <span className="font-semibold text-foreground">{m.name || m.user?.name || 'Member'}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{m.role}</span>
                  </div>
                ))}
                {(!item.assignedTeam && !item.rjMembers && !item.vjMembers) || (item.assignedTeam?.length === 0 && item.rjMembers?.length === 0 && item.vjMembers?.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic">No team members explicitly listed.</p>
                ) : null}
              </div>
            </div>

            {/* Equipment List */}
            {isVideoShoot && item.equipment && item.equipment.length > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Equipment Assigned
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.equipment.map((eq, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-secondary/60 border border-border/40 text-xs font-medium text-foreground">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Itemized Expenses Breakdown */}
            {item.expensesList && item.expensesList.length > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Shoot Expenses Breakdown List
                </h4>
                <div className="space-y-1.5 pt-1">
                  {item.expensesList.map((exp, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-background border border-border/40">
                      <span className="font-semibold text-foreground">{exp.title}</span>
                      <span className="font-bold text-emerald-600">₹{Number(exp.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Expenses & Financial Balance */}
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

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(item); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { onOpenChange(false); onDelete(item); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowInvoiceCustomizer(true)}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Invoice / Work Order PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
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
