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
  FileText,
  Printer,
  Receipt,
} from 'lucide-react';
import { useTrackVideoShootTime } from '../../hooks/useDMCalendar';

export const printDMInvoice = (item, activityType) => {
  const isVideoShoot = activityType === 'video_shoot' || item.plannedContents !== undefined;
  const clientName = item.client?.company || item.client?.name || 'Client';
  const clientEmail = item.client?.email || 'N/A';
  const clientPhone = item.client?.phone || 'N/A';

  const dateStr = new Date(item.shootDate || item.promotionDate || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const invNumber = `RWM-INV-${Date.now().toString().slice(-6)}`;
  const title = item.shootTitle || item.promotionTitle || 'Digital Marketing Production';

  const expensesList = item.expensesList && item.expensesList.length > 0
    ? item.expensesList
    : [{ title, amount: item.totalAmount || 0 }];

  const totalAmount = item.totalAmount || expensesList.reduce((a, c) => a + Number(c.amount || 0), 0);
  const amountPaid = item.amountPaid || 0;
  const balanceDue = Math.max(totalAmount - amountPaid, 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${invNumber} - Rise With Media</title>
        <style>
          * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; }
          body { margin: 0; padding: 40px; color: #1e293b; background: #ffffff; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand img { height: 52px; object-fit: contain; }
          .brand-text h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .brand-text p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .inv-title { text-align: right; }
          .inv-title h2 { margin: 0; font-size: 26px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; }
          .inv-title p { margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #64748b; }

          .meta-grid { display: flex; justify-content: space-between; margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
          .meta-box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .meta-box p { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }

          .details-section { margin-top: 24px; }
          .section-title { font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; }

          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
          .amount-col { text-align: right; font-weight: 700; }

          .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
          .totals-table { width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 13px; }
          .totals-row.grand { background: #0f172a; color: #ffffff; font-weight: 800; font-size: 15px; border-radius: 8px; margin-top: 6px; }
          .totals-row.balance { color: #dc2626; font-weight: 800; font-size: 14px; }

          .crew-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .crew-tag { background: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155; }

          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-top: 1.5px dashed #94a3b8; margin-top: 40px; padding-top: 6px; font-size: 11px; font-weight: 700; color: #475569; }

          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Download PDF Invoice
          </button>
        </div>

        <div class="header">
          <div class="brand">
            <img src="/branding/rise-with-media-logo.png" alt="Rise With Media Logo" onerror="this.style.display='none'" />
            <div class="brand-text">
              <h1>RISE WITH MEDIA</h1>
              <p>Digital Marketing & Content Production</p>
            </div>
          </div>
          <div class="inv-title">
            <h2>INVOICE</h2>
            <p># ${invNumber}</p>
            <p>Date: ${dateStr}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <h4>Billed To (Client)</h4>
            <p>${clientName}</p>
            <span style="font-size: 11px; color: #64748b;">${clientEmail} • ${clientPhone}</span>
          </div>
          <div class="meta-box">
            <h4>Service Activity</h4>
            <p>${title}</p>
            <span style="font-size: 11px; color: #64748b;">Type: ${isVideoShoot ? 'Video Shoot' : item.platform ? 'VJ Promotion' : 'RJ Promotion'}</span>
          </div>
          <div class="meta-box">
            <h4>Payment Status</h4>
            <p style="color: ${balanceDue === 0 ? '#16a34a' : '#dc2626'}">${balanceDue === 0 ? 'PAID IN FULL' : 'BALANCE DUE'}</p>
          </div>
        </div>

        <div class="details-section">
          <div class="section-title">Itemized Expenses & Service Charges</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Item Description / Expense Title</th>
                <th class="amount-col">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${expensesList.map((exp, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-weight: 600;">${exp.title || 'Production Expense'}</td>
                  <td class="amount-col">₹${Number(exp.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${(item.assignedTeam || item.rjMembers || item.vjMembers || []).length > 0 ? `
          <div class="details-section" style="margin-top: 18px;">
            <div class="section-title">Assigned Crew / Team Members</div>
            <div class="crew-tags">
              ${(item.assignedTeam || item.rjMembers || item.vjMembers).map((t) => `<span class="crew-tag">${t.name || t.user?.name || 'Member'} (${t.role})</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="totals-container">
          <div class="totals-table">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>Amount Paid:</span>
              <span style="color: #16a34a; font-weight: bold;">₹${amountPaid.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row balance">
              <span>Balance Due:</span>
              <span>₹${balanceDue.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row grand">
              <span>Grand Total:</span>
              <span>₹${totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div style="font-size: 11px; color: #64748b; max-width: 340px;">
            <p style="margin: 0; font-weight: 700; color: #334155;">Terms & Instructions:</p>
            <p style="margin: 4px 0 0 0;">Thank you for working with Rise With Media. Please clear pending dues as per payment terms.</p>
          </div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory</div>
            <span style="font-size: 10px; color: #64748b;">Rise With Media Team</span>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const DMEventDetailModal = ({
  open,
  onOpenChange,
  eventItem = null,
  onEdit = () => {},
  onDelete = () => {},
}) => {
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
                <span className="text-muted-foreground block text-[10px]">Timing & Duration</span>
                <span className="font-semibold text-foreground">
                  {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} -{' '}
                  {item.endTime ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ({item.duration || item.durationSpoken || 0} hrs)
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

          {/* Notes */}
          {item.notes && item.notes !== 'null' ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
              <h4 className="text-xs font-bold text-foreground">Notes / Instructions</h4>
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
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => printDMInvoice(item, activityType)}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Professional Invoice PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
