import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Info,
  MapPin,
  Timer,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { EODReportModal } from '../../components/modals/EODReportModal';
import { useAttendance, useClockIn, useClockOut, useAssignHoliday, useSubmitLeave, useSubmitWFH } from '../../hooks/useAttendance';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';

// ── Office Location Config ────────────────────────────────────────────────────
const OFFICE_LOCATION = {
  lat: 12.55157,   // 320/1 Thiruvannamalai Rd, Giddampatti, Tamil Nadu 635001
  lng: 78.19759,
};
const ALLOWED_RADIUS_METERS = 300; // 300-metre radius

/** Haversine formula – returns distance in metres between two lat/lng pairs */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Attendance = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = ['superAdmin', 'manager'].includes(user?.role);
  const isSuperAdmin = user?.role === 'superAdmin';
  const [time, setTime] = useState(new Date());
  const [showEOD, setShowEOD] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', notes: '' });
  const [leaveForm, setLeaveForm] = useState({ userId: '', date: '', notes: '' });
  const [wfhForm, setWfhForm] = useState({ date: '', notes: '' });
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data, isLoading } = useAttendance();
  const { data: users = [] } = useUsers({ enabled: isAdmin });
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const assignHolidayMutation = useAssignHoliday();
  const submitLeaveMutation = useSubmitLeave();
  const submitWFHMutation = useSubmitWFH();
  // 'idle' | 'checking' | 'allowed' | 'denied' | 'out_of_range'
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationDistance, setLocationDistance] = useState(null);

  /** Verify location then run a callback if within radius */
  const verifyLocationThen = useCallback((onAllowed) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceMeters(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
        setLocationDistance(Math.round(dist));
        if (dist <= ALLOWED_RADIUS_METERS) {
          setLocationStatus('allowed');
          onAllowed();
        } else {
          setLocationStatus('out_of_range');
          toast.error(
            `You must be at the office to clock in/out. You are ${Math.round(dist)}m away (max ${ALLOWED_RADIUS_METERS}m allowed).`
          );
        }
      },
      (err) => {
        setLocationStatus('denied');
        const msgs = {
          1: 'Location access denied. Please enable location permission and try again.',
          2: 'Location unavailable. Check your GPS/network.',
          3: 'Location request timed out. Try again.',
        };
        toast.error(msgs[err.code] || 'Failed to get your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleClockIn = useCallback(() => {
    verifyLocationThen(() => clockIn.mutate());
  }, [verifyLocationThen, clockIn]);

  const handleClockOut = useCallback(() => {
    verifyLocationThen(() => clockOut.mutate());
  }, [verifyLocationThen, clockOut]);

  const handleAssignHoliday = async (e) => {
    e.preventDefault();
    try {
      await assignHolidayMutation.mutateAsync(holidayForm);
      setHolidayForm({ date: '', notes: '' });
      setShowHolidayModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignLeave = async (e) => {
    e.preventDefault();
    try {
      await submitLeaveMutation.mutateAsync(leaveForm);
      setLeaveForm({ userId: '', date: '', notes: '' });
      setShowLeaveModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInformWFH = async (e) => {
    e.preventDefault();
    try {
      await submitWFHMutation.mutateAsync(wfhForm);
      setWfhForm({ date: '', notes: '' });
      setShowWFHModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    present: 'bg-emerald-500/10 text-emerald-600',
    absent: 'bg-destructive/10 text-destructive',
    half_day: 'bg-amber-500/10 text-amber-600',
    leave: 'bg-indigo-500/10 text-indigo-600',
    holiday: 'bg-blue-500/10 text-blue-600',
    work_from_home: 'bg-purple-500/10 text-purple-600',
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const records = data?.records || [];
  const summary = data?.summary || { present: 0, totalHours: '0.00', leave: 0, absent: 0 };
  const todayRecord = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return records.find((record) => record.date?.split('T')[0] === today);
  }, [records]);
  const isClockedIn = Boolean(todayRecord?.clockIn && !todayRecord?.clockOut);
  const eodSubmitted = Boolean(todayRecord?.eodReport?.submittedAt);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-64 bg-card rounded-3xl" />
        <div className="h-96 bg-card rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Workspace</h1>
          <p className="text-muted-foreground text-sm">Track attendance, hours, and daily reports</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowHolidayModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors"
            >
              <Calendar size={18} className="mr-2 text-primary" />
              Assign Holiday
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors"
            >
              <Calendar size={18} className="mr-2 text-rose-500" />
              Assign Leave
            </button>
          )}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowWFHModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors"
            >
              <Calendar size={18} className="mr-2 text-indigo-500" />
              Inform WFH
            </button>
          )}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowEOD(true)}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
              disabled={!todayRecord?.clockIn}
            >
              <FileText size={18} className="mr-2" />
              {eodSubmitted ? 'Update EOD Report' : 'Submit EOD Report'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isSuperAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-8 rounded-3xl border border-border shadow-xl relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Timer size={32} className={isClockedIn ? 'animate-pulse' : ''} />
                </div>
                <h2 className="text-4xl font-black tracking-tighter mb-1">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </h2>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">
                  {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>

                {isClockedIn ? (
                  <button
                    onClick={handleClockOut}
                    disabled={clockOut.isPending || locationStatus === 'checking'}
                    className="w-full py-4 rounded-3xl bg-destructive text-white font-black text-lg shadow-xl shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {locationStatus === 'checking' ? '📍 Checking Location...' : clockOut.isPending ? 'Clocking Out...' : 'Clock Out'}
                  </button>
                ) : (
                  <button
                    onClick={handleClockIn}
                    disabled={clockIn.isPending || Boolean(todayRecord?.clockOut) || locationStatus === 'checking'}
                    className="w-full py-4 rounded-3xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    {todayRecord?.clockOut ? 'Shift Completed' : locationStatus === 'checking' ? '📍 Checking Location...' : clockIn.isPending ? 'Clocking In...' : 'Clock In'}
                  </button>
                )}

                {/* Location Status Badge */}
                {locationStatus !== 'idle' && (
                  <div className={`mt-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 ${
                    locationStatus === 'checking' ? 'bg-amber-500/10 text-amber-600' :
                    locationStatus === 'allowed' ? 'bg-emerald-500/10 text-emerald-600' :
                    locationStatus === 'denied' ? 'bg-destructive/10 text-destructive' :
                    'bg-rose-500/10 text-rose-600'
                  }`}>
                    <MapPin size={13} />
                    {locationStatus === 'checking' && 'Detecting your location...'}
                    {locationStatus === 'allowed' && `✓ Office location verified (${locationDistance}m away)`}
                    {locationStatus === 'denied' && 'Location access denied — enable GPS'}
                    {locationStatus === 'out_of_range' && `Outside office range (${locationDistance}m away, max ${ALLOWED_RADIUS_METERS}m)`}
                  </div>
                )}

                <div className="flex items-center justify-center space-x-6 pt-6 text-sm font-bold text-muted-foreground">
                  <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-tighter opacity-60">In</span>
                    <span className="text-foreground">{todayRecord?.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-tighter opacity-60">Out</span>
                    <span className="text-foreground">{todayRecord?.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="font-bold flex items-center mb-6">
                <TrendingUp size={18} className="mr-2 text-emerald-500" />
                This Month Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Days Present</span>
                  <span className="font-bold text-emerald-600">{summary.present} Days</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Hours</span>
                  <span className="font-bold">{summary.totalHours} hrs</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">EOD Submitted</span>
                  <span className={`font-bold ${eodSubmitted ? 'text-emerald-600' : 'text-amber-600'}`}>{eodSubmitted ? 'Yes' : 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`${isSuperAdmin ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
              <h3 className="font-bold flex items-center">
                <History size={18} className="mr-2 text-primary" />
                Shift History
              </h3>
              <div className="flex items-center space-x-2">
                <button className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold uppercase tracking-widest">{new Date().toLocaleString('default', { month: 'long' })}</span>
                <button className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="w-full overflow-x-auto overflow-y-auto max-h-[400px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground font-medium">
                  <tr>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Date</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">In / Out</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Total Time</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">EOD</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((record) => (
                    <tr
                      key={record._id}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold">{new Date(record.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{new Date(record.date).toLocaleDateString([], { month: 'long' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-emerald-600 font-bold">{record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                          <span className="text-muted-foreground opacity-40">to</span>
                          <span className="text-amber-600 font-bold">{record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold">{record.totalHours?.toFixed(1) || '0.0'} hrs</td>
                      <td className="px-6 py-4">
                        {record.status === 'holiday' ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${record.eodReport?.submittedAt ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {record.eodReport?.submittedAt ? 'Submitted' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${statusColors[record.status] || 'bg-secondary/40 text-muted-foreground'}`}>
                            {record.status?.replace(/_/g, ' ')}
                            {(record.notes || record.approvedBy) && <Info size={11} className="ml-0.5 opacity-80" />}
                          </span>
                          {record.notes && (
                            <span className="text-xs font-medium text-foreground/90 truncate max-w-[200px]" title={record.notes}>
                              {record.notes}
                            </span>
                          )}
                          {record.approvedBy && (
                            <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                              <UserCheck size={10} />
                              By: {record.approvedBy.name} ({record.approvedBy.role === 'superAdmin' ? 'Super Admin' : 'Manager'})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground italic">No attendance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl flex items-center justify-between mt-6">
              <div>
                <h3 className="text-xl font-bold">Daily Closeout</h3>
                <p className="text-white/75 text-sm mt-1 max-w-[420px]">Submit your EOD report after logging work so managers can review progress and blockers.</p>
                <button onClick={() => setShowEOD(true)} className="mt-4 px-6 py-2.5 bg-white text-primary font-bold rounded-xl text-sm shadow-lg hover:bg-white/90 transition-all">
                  {eodSubmitted ? 'Review Report' : 'Submit Report'}
                </button>
              </div>
              <Calendar size={80} className="opacity-20 hidden md:block" />
            </div>
          )}
        </div>
      </div>

      <EODReportModal open={showEOD} onOpenChange={setShowEOD} report={todayRecord?.eodReport} />

      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-primary h-5 w-5" />
                Assign Company Holiday
              </h3>
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignHoliday} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                  className="app-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Reason / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christmas, Independence Day"
                  value={holidayForm.notes}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="app-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={assignHolidayMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {assignHolidayMutation.isPending ? 'Assigning...' : 'Assign Holiday'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-5 py-3 rounded-2xl border border-border bg-secondary/30 text-foreground font-semibold text-sm hover:bg-secondary/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-rose-500 h-5 w-5" />
                Assign Leave
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignLeave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Employee *</label>
                <select
                  required
                  value={leaveForm.userId}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="app-select"
                >
                  <option value="">Choose an employee...</option>
                  {users.filter(u => ['employee', 'manager'].includes(u.role)).map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Leave Date *</label>
                <input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, date: e.target.value }))}
                  className="app-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Reason / Details *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor appointment, personal work"
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="app-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {submitLeaveMutation.isPending ? 'Assigning...' : 'Assign Leave'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-5 py-3 rounded-2xl border border-border bg-secondary/30 text-foreground font-semibold text-sm hover:bg-secondary/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWFHModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-indigo-500 h-5 w-5" />
                Inform Work From Home
              </h3>
              <button
                type="button"
                onClick={() => setShowWFHModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInformWFH} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select WFH Date *</label>
                <input
                  type="date"
                  required
                  value={wfhForm.date}
                  onChange={(e) => setWfhForm(prev => ({ ...prev, date: e.target.value }))}
                  className="app-input"
                />
                <span className="text-[10px] text-muted-foreground">Must be submitted at least one day in advance.</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Reason / Details *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internet issue, personal commitment"
                  value={wfhForm.notes}
                  onChange={(e) => setWfhForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="app-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitWFHMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {submitWFHMutation.isPending ? 'Submitting...' : 'Submit WFH Notice'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWFHModal(false)}
                  className="px-5 py-3 rounded-2xl border border-border bg-secondary/30 text-foreground font-semibold text-sm hover:bg-secondary/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="text-primary h-5 w-5" />
                  Attendance Details
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selectedRecord.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 border border-border">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[selectedRecord.status] || 'bg-secondary text-muted-foreground'}`}>
                  {selectedRecord.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Reason / Notes */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason / Description</div>
                <div className="text-sm font-semibold text-foreground">
                  {selectedRecord.notes || 'No notes or reason provided.'}
                </div>
              </div>

              {/* Assigned / Approved By */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-1.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned / Approved By</div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  {selectedRecord.approvedBy ? (
                    <span>
                      {selectedRecord.approvedBy.name} ({selectedRecord.approvedBy.role === 'superAdmin' ? 'Super Admin' : 'Manager'})
                    </span>
                  ) : selectedRecord.isApproved ? (
                    <span>Manager / Admin</span>
                  ) : (
                    <span>Self Clock-in / System Recorded</span>
                  )}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock In</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1">
                    {selectedRecord.clockIn ? new Date(selectedRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>
                <div className="p-3 rounded-2xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock Out</div>
                  <div className="text-sm font-bold text-amber-600 mt-1">
                    {selectedRecord.clockOut ? new Date(selectedRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>
                <div className="p-3 rounded-2xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Time</div>
                  <div className="text-sm font-bold text-foreground mt-1">
                    {selectedRecord.totalHours?.toFixed(1) || '0.0'} hrs
                  </div>
                </div>
              </div>

              {/* EOD Report if exists */}
              {selectedRecord.eodReport?.submittedAt && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={13} /> EOD Report Submitted
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-3">
                    {selectedRecord.eodReport.summary || 'Summary submitted.'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-3 rounded-2xl border border-border bg-secondary/50 text-foreground font-bold text-sm hover:bg-secondary transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
