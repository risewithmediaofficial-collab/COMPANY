import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Timer,
  AlertCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  useClockIn,
  useClockOut,
  useSubmitAbsent,
  useSubmitLeave,
} from '../../hooks/useAttendance';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const AttendanceWidget = ({ todayRecord, user }) => {
  const [time, setTime] = useState(new Date());
  const [presentSelected, setPresentSelected] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [absentReason, setAbsentReason] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const submitAbsent = useSubmitAbsent();
  const submitLeave = useSubmitLeave();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isClockedIn = Boolean(
    todayRecord && (
      (todayRecord.sessions && todayRecord.sessions.length > 0 && todayRecord.sessions.some((s) => !s.clockOut)) ||
      (todayRecord.clockIn && !todayRecord.clockOut)
    )
  );

  const status = todayRecord?.status;
  const isPresent = status === 'present' || Boolean(todayRecord?.clockIn) || presentSelected;
  const isAbsent = status === 'absent';
  const isLeave = status === 'leave';
  const isWFH = status === 'work_from_home';
  const isHoliday = status === 'holiday';

  const handleSelectPresent = () => {
    setPresentSelected(true);
    toast.info('Present selected! Click "Clock In" to start your session.');
  };

  const handleClockInClick = () => {
    clockIn.mutate();
  };

  const handleClockOutClick = () => {
    clockOut.mutate();
  };

  const handleMarkAbsentSubmit = (e) => {
    e.preventDefault();
    if (!absentReason.trim()) {
      toast.error('Please enter a reason for absence');
      return;
    }
    submitAbsent.mutate(
      { date: new Date().toISOString(), notes: absentReason.trim() },
      {
        onSuccess: () => {
          setAbsentReason('');
          setShowAbsentModal(false);
          setPresentSelected(false);
        },
      }
    );
  };

  const handleMarkLeaveSubmit = (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error('Please enter a reason for leave');
      return;
    }
    submitLeave.mutate(
      { date: new Date().toISOString(), notes: leaveReason.trim() },
      {
        onSuccess: () => {
          setLeaveReason('');
          setShowLeaveModal(false);
          setPresentSelected(false);
        },
      }
    );
  };

  return (
    <div className="bg-card p-6 rounded-3xl border border-border shadow-md relative overflow-hidden space-y-6">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-extrabold text-lg tracking-tight flex items-center text-foreground">
            <Clock className="mr-2 h-5 w-5 text-primary animate-pulse" />
            Attendance & Shift Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Today: {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-foreground tracking-tight block">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Current Status Pill */}
      {status && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                status === 'present'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : status === 'absent'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : status === 'leave'
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  : status === 'work_from_home'
                  ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </span>
          </div>
          {todayRecord?.notes && (
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px]" title={todayRecord.notes}>
              Reason: &quot;{todayRecord.notes}&quot;
            </span>
          )}
        </div>
      )}

      {/* Primary Attendance Flow Actions */}
      <div className="space-y-4">
        {/* Step 1: Selection Buttons if not present/clocked-in yet */}
        {!isPresent && !isClockedIn && !isAbsent && !isLeave && !isHoliday && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Step 1: Select Attendance Status for Today
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleSelectPresent}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-extrabold text-sm hover:bg-emerald-500/20 transition-all shadow-sm active:scale-95"
              >
                <CheckCircle2 size={18} />
                Present
              </button>
              <button
                type="button"
                onClick={() => setShowAbsentModal(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-extrabold text-sm hover:bg-destructive/20 transition-all shadow-sm active:scale-95"
              >
                <XCircle size={18} />
                Mark Absent
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 font-extrabold text-sm hover:bg-rose-500/20 transition-all shadow-sm active:scale-95"
              >
                <Calendar size={18} />
                Mark Leave
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Show Clock In when Present is selected or user is active */}
        {(isPresent || isClockedIn || todayRecord?.clockIn) && (
          <div className="space-y-3">
            {isClockedIn ? (
              <button
                type="button"
                onClick={handleClockOutClick}
                disabled={clockOut.isPending}
                className="w-full py-4 rounded-2xl bg-destructive text-white font-black text-base shadow-lg shadow-destructive/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Timer size={20} className="animate-spin" />
                {clockOut.isPending ? 'Clocking Out...' : 'Clock Out (End Shift / Take Break)'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockInClick}
                disabled={clockIn.isPending}
                className="w-full py-4 rounded-2xl bg-primary text-white font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Timer size={20} />
                {clockIn.isPending ? 'Clocking In...' : todayRecord?.clockIn ? 'Clock In / Resume Shift' : 'Clock In Now'}
              </button>
            )}

            {/* Quick Status Switching Options */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground font-semibold">Or change today&apos;s status:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAbsentModal(true)}
                  className="text-destructive font-bold hover:underline"
                >
                  Mark Absent
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="text-rose-600 font-bold hover:underline"
                >
                  Mark Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If Absent or Leave already set */}
        {(isAbsent || isLeave) && (
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recorded as {isAbsent ? 'Absent' : 'Leave'}
              </span>
              <button
                type="button"
                onClick={handleSelectPresent}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Change to Present <ChevronRight size={14} />
              </button>
            </div>
            <p className="text-xs text-foreground font-medium italic">
              Reason: &quot;{todayRecord?.notes || 'No reason specified'}&quot;
            </p>
          </div>
        )}

        {/* Timings Summary Row */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-center border-t border-border">
          <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">First Clock In</span>
            <span className="text-xs font-extrabold text-emerald-600 mt-0.5 block">
              {formatTime(todayRecord?.clockIn)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Last Clock Out</span>
            <span className="text-xs font-extrabold text-amber-600 mt-0.5 block">
              {formatTime(todayRecord?.clockOut)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Logged</span>
            <span className="text-xs font-extrabold text-primary mt-0.5 block">
              {Number(todayRecord?.totalHours || 0).toFixed(2)} hrs
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Mark Absent */}
      <Dialog open={showAbsentModal} onOpenChange={setShowAbsentModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Mark Absent for Today</DialogTitle>
            <DialogDescription>
              Record your absence in the system with a reason for HR/Management.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkAbsentSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason for Absence *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter detailed reason for absence (e.g. Unwell, Emergency)..."
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAbsentModal(false)}
                className="px-4 py-2 rounded-xl border border-border font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitAbsent.isPending}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs shadow-sm hover:bg-destructive/90 disabled:opacity-50"
              >
                {submitAbsent.isPending ? 'Marking...' : 'Confirm Mark Absent'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Mark Leave */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Mark Leave for Today</DialogTitle>
            <DialogDescription>
              Submit a leave request for today's working schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkLeaveSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason for Leave *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter detailed reason for leave (e.g. Casual leave, Appointment)..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 rounded-xl border border-border font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLeave.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {submitLeave.isPending ? 'Submitting...' : 'Confirm Mark Leave'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
