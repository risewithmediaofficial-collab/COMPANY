import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Timer,
  AlertCircle,
  Info,
  ChevronRight,
  UserCheck,
  Send,
} from 'lucide-react';
import {
  useClockIn,
  useClockOut,
  useSubmitAbsent,
  useSubmitLeave,
  useAttendance,
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

export const AttendanceWidget = ({ todayRecord: propTodayRecord, user: propUser }) => {
  const { user: authUser } = useSelector((state) => state.auth || {});
  const user = propUser || authUser;

  const [time, setTime] = useState(new Date());
  const [presentSelected, setPresentSelected] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Fetch monthly records for current user so widget always has reactive live data
  const { data: attendanceData } = useAttendance({
    userId: user?._id,
    month: currentMonth,
    year: currentYear,
    limit: 31,
  });

  const [absentReason, setAbsentReason] = useState('');
  const [absentDate, setAbsentDate] = useState(todayStr);

  const [leaveStartDate, setLeaveStartDate] = useState(todayStr);
  const [leaveEndDate, setLeaveEndDate] = useState(todayStr);
  const [leaveReason, setLeaveReason] = useState('');

  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const submitAbsent = useSubmitAbsent();
  const submitLeave = useSubmitLeave();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine active today record from props or fetched query
  const todayRecord = useMemo(() => {
    if (propTodayRecord) return propTodayRecord;
    const records = attendanceData?.records || [];
    return records.find((r) => {
      const rDate = r.date ? r.date.split('T')[0] : '';
      return rDate === todayStr && ((r.user?._id || r.user) === user?._id);
    });
  }, [propTodayRecord, attendanceData?.records, todayStr, user?._id]);

  const isClockedIn = Boolean(
    todayRecord && (
      (todayRecord.sessions && todayRecord.sessions.length > 0 && todayRecord.sessions.some((s) => !s.clockOut)) ||
      (todayRecord.clockIn && !todayRecord.clockOut)
    )
  );

  // Calculate live duration for active session
  const activeSessionStartTime = useMemo(() => {
    if (!todayRecord) return null;
    if (todayRecord.sessions && todayRecord.sessions.length > 0) {
      const activeSession = todayRecord.sessions.find((s) => !s.clockOut);
      if (activeSession?.clockIn) return new Date(activeSession.clockIn);
    }
    if (todayRecord.clockIn && !todayRecord.clockOut) {
      return new Date(todayRecord.clockIn);
    }
    return null;
  }, [todayRecord]);

  const [liveElapsedStr, setLiveElapsedStr] = useState('00:00:00');

  useEffect(() => {
    if (!activeSessionStartTime) {
      setLiveElapsedStr('00:00:00');
      return;
    }
    const updateElapsed = () => {
      const diffMs = Math.max(0, Date.now() - activeSessionStartTime.getTime());
      const totalSec = Math.floor(diffMs / 1000);
      const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      setLiveElapsedStr(`${hrs}:${mins}:${secs}`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSessionStartTime]);

  const status = todayRecord?.status;
  const approvalStatus = todayRecord?.approvalStatus;
  const isPresent = status === 'present' || Boolean(todayRecord?.clockIn) || presentSelected;
  const isAbsent = status === 'absent' || todayRecord?.requestedStatus === 'absent';
  const isLeave = status === 'leave' || todayRecord?.requestedStatus === 'leave';
  const isWFH = status === 'work_from_home';
  const isHoliday = status === 'holiday';

  const handleSelectPresent = () => {
    setPresentSelected(true);
    toast.info('Present selected! Click "Clock In" to start your shift.');
  };

  const handleClockInClick = () => {
    if (!navigator.geolocation) {
      toast.error('Location access is not available in this browser. Please use a GPS-enabled browser/device.');
      return;
    }

    setIsGettingLocation(true);
    toast.info('Checking your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        clockIn.mutate(
          { latitude, longitude, accuracy, locationName: 'GPS Location' },
          {
            onSettled: () => setIsGettingLocation(false),
          }
        );
      },
      (error) => {
        setIsGettingLocation(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission is required to clock in. Please allow location access and try again.'
            : error.code === error.POSITION_UNAVAILABLE
            ? 'Unable to detect your location. Please turn on GPS/location services and try again.'
            : 'Location check timed out. Please try again.';
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
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
      { date: absentDate || todayStr, notes: absentReason.trim() },
      {
        onSuccess: () => {
          setAbsentReason('');
          setShowAbsentModal(false);
          setPresentSelected(false);
        },
      }
    );
  };

  const handleApplyLeaveSubmit = (e) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error('Please enter a reason for leave');
      return;
    }
    submitLeave.mutate(
      {
        startDate: leaveStartDate || todayStr,
        endDate: leaveEndDate || leaveStartDate || todayStr,
        notes: leaveReason.trim(),
      },
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
            Daily Shift & Attendance
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

      {/* Leave Approval Banner / Current Status Pill */}
      {isLeave ? (
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
          approvalStatus === 'approved'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : approvalStatus === 'rejected'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-2">
            {approvalStatus === 'approved' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : approvalStatus === 'rejected' ? (
              <XCircle size={18} className="text-rose-600" />
            ) : (
              <AlertCircle size={18} className="text-amber-600 animate-pulse" />
            )}
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                {approvalStatus === 'approved'
                  ? 'Leave Approved ✅'
                  : approvalStatus === 'rejected'
                  ? 'Leave Rejected ❌'
                  : 'Leave Pending Approval ⏳'}
              </span>
              <p className="text-[11px] opacity-90 font-medium">
                {approvalStatus === 'approved'
                  ? todayRecord?.approvedBy?.name ? `Approved by ${todayRecord.approvedBy.name}` : 'Approved by Management'
                  : approvalStatus === 'rejected'
                  ? `Reason: "${todayRecord?.rejectionReason || 'No reason provided'}"`
                  : 'Sent to Super Admin & Admin for review.'}
              </p>
            </div>
          </div>
          {todayRecord?.notes && (
            <span className="text-[11px] font-semibold max-w-[160px] truncate text-right opacity-80" title={todayRecord.notes}>
              &quot;{todayRecord.notes}&quot;
            </span>
          )}
        </div>
      ) : status && status !== 'present' ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                status === 'absent'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
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
      ) : null}

      {/* Primary Attendance Flow Actions */}
      <div className="space-y-4">
        {/* Active Session Timer Indicator if Clocked In */}
        {isClockedIn && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Active Shift in Progress
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Clocked In at {formatTime(todayRecord?.clockIn)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-600 font-mono">
                {liveElapsedStr}
              </span>
            </div>
          </div>
        )}

        {/* Step 1: Selection Buttons if not present/clocked-in yet */}
        {!isPresent && !isClockedIn && !isAbsent && !isLeave && !isHoliday && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Select Attendance Status for Today
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
                Apply for Leave
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
                className="w-full py-4 rounded-2xl bg-destructive text-white font-black text-base shadow-lg shadow-destructive/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Timer size={20} className={clockOut.isPending ? 'animate-spin' : ''} />
                {clockOut.isPending ? 'Clocking Out...' : 'Clock Out (End Shift / Take Break)'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockInClick}
                disabled={clockIn.isPending || isGettingLocation}
                className="w-full py-4 rounded-2xl bg-primary text-white font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Timer size={20} className={clockIn.isPending || isGettingLocation ? 'animate-spin' : ''} />
                {isGettingLocation
                  ? 'Checking Location...'
                  : clockIn.isPending
                  ? 'Clocking In...'
                  : todayRecord?.clockIn
                  ? 'Clock In / Resume Shift'
                  : 'Clock In Now'}
              </button>
            )}

            {/* Quick Status Switching Options */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground font-semibold">Need to submit a request?</span>
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
                  Apply for Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If Absent or Leave already set */}
        {(isAbsent || isLeave) && !isClockedIn && (
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
                Switch to Present & Clock In <ChevronRight size={14} />
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
            <DialogTitle>Mark Absent</DialogTitle>
            <DialogDescription>
              Record your absence in the system with a date and reason for HR/Management.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkAbsentSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Absent Date *</label>
              <input
                type="date"
                required
                value={absentDate}
                onChange={(e) => setAbsentDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
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
                {submitAbsent.isPending ? 'Submitting...' : 'Confirm Mark Absent'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Apply for Leave */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Submit a formal leave application to Super Admin & Admin for review and approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Leave Start Date *</label>
                <input
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => {
                    setLeaveStartDate(e.target.value);
                    if (e.target.value > leaveEndDate) {
                      setLeaveEndDate(e.target.value);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Leave End Date *</label>
                <input
                  type="date"
                  required
                  min={leaveStartDate}
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason for Leave *</label>
              <textarea
                required
                rows={3}
                placeholder="Explain reason for leave (e.g. Medical appointment, Family event, Vacation, Casual leave)..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-secondary/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Info size={14} className="text-primary shrink-0" />
              <span>This request will be sent to Super Admin and Admin. Once approved, your attendance status will update to <strong>Leave Approved</strong>.</span>
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
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={13} />
                {submitLeave.isPending ? 'Submitting Application...' : 'Submit Leave Application'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
