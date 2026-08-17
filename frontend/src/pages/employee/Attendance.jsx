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
  Search,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  User,
  Clock,
  Briefcase,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { getAssetUrl } from '../../utils/assetUrl';
import { EODReportModal } from '../../components/modals/EODReportModal';
import { AttendanceWidget } from '../../components/attendance/AttendanceWidget';
import {
  useAttendance,
  useTeamTodayAttendance,
  useClockIn,
  useClockOut,
  useAssignHoliday,
  useSubmitLeave,
  useSubmitWFH,
  useApproveAttendanceRequest,
} from '../../hooks/useAttendance';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

// Helper function to format 12-Hour AM/PM Time
const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const Attendance = () => {
  const { user } = useSelector((state) => state.auth);
  const { isDateInRange } = useDateFilter();
  const isAdmin = ['superAdmin', 'organizationOwner', 'manager', 'accountManager'].includes(user?.role);
  const isSuperAdmin = user?.role === 'superAdmin';

  const currentDate = new Date();
  const [time, setTime] = useState(new Date());
  const approveAttendanceMutation = useApproveAttendanceRequest();

  // Manager View Controls vs Personal View
  const [viewTab, setViewTab] = useState(isAdmin ? 'team' : 'personal'); // 'team' | 'personal'
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const [showEOD, setShowEOD] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', notes: '' });
  const [leaveForm, setLeaveForm] = useState({ userId: '', date: '', notes: '' });
  const [wfhForm, setWfhForm] = useState({ date: '', notes: '' });
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Build query filters for useAttendance
  const attendanceFilters = useMemo(() => {
    const filters = {
      month: selectedMonth,
      year: selectedYear,
      limit: 1000,
    };
    if (selectedStatus !== 'all') {
      filters.status = selectedStatus;
    }
    if (viewTab === 'personal') {
      filters.userId = user?._id;
    } else if (selectedUser !== 'all') {
      filters.userId = selectedUser;
    } else {
      filters.userId = 'all';
    }
    return filters;
  }, [viewTab, selectedUser, selectedStatus, selectedMonth, selectedYear, user?._id]);

  const { data, isLoading } = useAttendance(attendanceFilters);
  const { data: teamTodayRecords = [] } = useTeamTodayAttendance({ enabled: isAdmin });
  const { data: users = [] } = useUsers({ enabled: isAdmin });

  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const assignHolidayMutation = useAssignHoliday();
  const submitLeaveMutation = useSubmitLeave();
  const submitWFHMutation = useSubmitWFH();

  const handleClockIn = useCallback(() => {
    clockIn.mutate();
  }, [clockIn]);

  const handleClockOut = useCallback(() => {
    clockOut.mutate();
  }, [clockOut]);

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
    present: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
    absent: 'bg-destructive/10 text-destructive border border-destructive/20',
    half_day: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    leave: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    holiday: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
    work_from_home: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rawRecords = data?.records || [];
  const records = useMemo(() => {
    if (!searchQuery.trim()) return rawRecords;
    const query = searchQuery.toLowerCase();
    return rawRecords.filter((r) => {
      const nameMatch = r.user?.name?.toLowerCase().includes(query);
      const emailMatch = r.user?.email?.toLowerCase().includes(query);
      const deptMatch = r.user?.department?.toLowerCase().includes(query);
      const notesMatch = r.notes?.toLowerCase().includes(query);
      return nameMatch || emailMatch || deptMatch || notesMatch;
    });
  }, [rawRecords, searchQuery]);

  const summary = data?.summary || { present: 0, totalHours: '0.00', leave: 0, absent: 0, wfh: 0, holiday: 0 };

  const todayRecord = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return rawRecords.find(
      (record) =>
        record.date?.split('T')[0] === todayStr &&
        (record.user?._id === user?._id || record.user === user?._id)
    );
  }, [rawRecords, user?._id]);

  const isClockedIn = Boolean(
    todayRecord && (
      (todayRecord.sessions && todayRecord.sessions.length > 0 && todayRecord.sessions.some((s) => !s.clockOut)) ||
      (todayRecord.clockIn && !todayRecord.clockOut)
    )
  );
  const eodSubmitted = Boolean(todayRecord?.eodReport?.submittedAt);

  // Live today activity list for managers
  const todayTeamActivity = useMemo(() => {
    const employeeUsers = users.filter((u) => u.role !== 'client' && u.role !== 'referral');
    
    return employeeUsers.map((emp) => {
      const att = teamTodayRecords.find(
        (r) => (r.user?._id || r.user) === emp._id
      );

      return {
        user: emp,
        attendance: att || null,
        status: att ? att.status : 'not_clocked_in',
        clockIn: att?.clockIn ? formatTime(att.clockIn) : '--:--',
        clockOut: att?.clockOut ? formatTime(att.clockOut) : '--:--',
        totalHours: att?.totalHours || 0,
        eodSubmitted: Boolean(att?.eodReport?.submittedAt),
      };
    });
  }, [users, teamTodayRecords]);

  // Team live metrics for today
  const teamMetrics = useMemo(() => {
    const employeeUsers = users.filter((u) => u.role !== 'client' && u.role !== 'referral');
    const totalEmployees = employeeUsers.length;
    const clockedIn = teamTodayRecords.filter((r) =>
      r.sessions && r.sessions.length > 0 ? r.sessions.some((s) => !s.clockOut) : Boolean(r.clockIn && !r.clockOut)
    ).length;
    const completed = teamTodayRecords.filter((r) => r.clockOut).length;
    const onLeave = teamTodayRecords.filter((r) => r.status === 'leave').length;
    const wfh = teamTodayRecords.filter((r) => r.status === 'work_from_home').length;
    const holiday = teamTodayRecords.filter((r) => r.status === 'holiday').length;

    return {
      totalEmployees,
      clockedIn,
      completed,
      onLeave,
      wfh,
      holiday,
    };
  }, [users, teamTodayRecords]);

  // Filtered employee profile info & detailed performance metrics
  const selectedEmployeeInfo = useMemo(() => {
    if (selectedUser === 'all') return null;
    return users.find((u) => u._id === selectedUser) || null;
  }, [users, selectedUser]);

  const selectedUserStats = useMemo(() => {
    if (!selectedEmployeeInfo) return null;
    const empRecords = rawRecords.filter((r) => (r.user?._id || r.user) === selectedEmployeeInfo._id);
    const present = empRecords.filter((r) => r.status === 'present').length;
    const leave = empRecords.filter((r) => r.status === 'leave').length;
    const absent = empRecords.filter((r) => r.status === 'absent').length;
    const wfh = empRecords.filter((r) => r.status === 'work_from_home').length;
    const totalHours = empRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgDailyHours = (present + wfh) > 0 ? (totalHours / (present + wfh)).toFixed(1) : '0.0';
    const eodSubmittedCount = empRecords.filter((r) => r.eodReport?.submittedAt).length;

    // Collect all worked work logs / EOD task entries from these records
    const workedTasks = [];
    empRecords.forEach((r) => {
      if (r.eodReport) {
        if (Array.isArray(r.eodReport.tasksCompleted) && r.eodReport.tasksCompleted.length > 0) {
          r.eodReport.tasksCompleted.forEach((taskItem) => {
            workedTasks.push({
              date: r.date,
              workTitle: typeof taskItem === 'string' ? taskItem : taskItem.title || taskItem.taskTitle || 'Completed task',
              hours: taskItem.hours || r.totalHours || 0,
              type: 'EOD Completed Task',
              notes: r.notes || r.eodReport.summary || '',
            });
          });
        } else if (r.eodReport.summary) {
          workedTasks.push({
            date: r.date,
            workTitle: r.eodReport.summary,
            hours: r.totalHours || 0,
            type: 'Daily EOD Summary',
            notes: r.notes || '',
          });
        }
      }
    });

    const totalLoggedDays = present + wfh + leave + absent;
    const attendanceRate = totalLoggedDays > 0 ? (((present + wfh) / totalLoggedDays) * 100).toFixed(0) : '100';

    return {
      present,
      leave,
      absent,
      wfh,
      totalHours: totalHours.toFixed(1),
      avgDailyHours,
      eodSubmittedCount,
      totalLoggedDays,
      attendanceRate,
      workedTasks,
    };
  }, [selectedEmployeeInfo, rawRecords]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
  const showEmployeeColumn = viewTab === 'team' || (isAdmin && selectedUser === 'all');

  // Enhanced CSV Export: Section 1 (Overall Employee Summary Matrix) + Section 2 (Daily Detailed Logs)
  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      toast.error('No attendance records available for export in the selected filters');
      return;
    }

    const csvRows = [];

    // --- TITLE & METADATA ---
    csvRows.push(`"EMPLOYEE ATTENDANCE & PERFORMANCE SUMMARY REPORT"`);
    csvRows.push(`"Report Month: ${monthName} ${selectedYear}"`);
    csvRows.push(`"Generated On: ${new Date().toLocaleString()}"`);
    csvRows.push(`""`);

    // --- SECTION 1: OVERALL EMPLOYEE SUMMARY MATRIX ---
    csvRows.push(`"SECTION 1: OVERALL EMPLOYEE SUMMARY MATRIX"`);
    const summaryHeaders = [
      'Employee Name',
      'Email',
      'Department',
      'Role',
      'Days Present',
      'Days Absent',
      'Days On Leave',
      'Days WFH',
      'Holidays',
      'Total Hours Worked',
      'Avg Hours / Day Worked',
      'EOD Reports Submitted',
      'Attendance Rate (%)',
    ];
    csvRows.push(summaryHeaders.join(','));

    // Compute summary statistics per employee
    const employeeSummaryMap = {};

    users
      .filter((u) => u.role !== 'client' && u.role !== 'referral')
      .forEach((u) => {
        employeeSummaryMap[u._id] = {
          name: u.name || u.email || 'Unknown Employee',
          email: u.email || '',
          department: u.department || 'General',
          role: u.role || 'employee',
          present: 0,
          absent: 0,
          leave: 0,
          wfh: 0,
          holiday: 0,
          totalHours: 0,
          eodCount: 0,
        };
      });

    records.forEach((record) => {
      const uId = record.user?._id || record.user;
      if (uId) {
        if (!employeeSummaryMap[uId]) {
          employeeSummaryMap[uId] = {
            name: record.user?.name || record.user?.email || 'Unknown Employee',
            email: record.user?.email || '',
            department: record.user?.department || 'General',
            role: record.user?.role || 'employee',
            present: 0,
            absent: 0,
            leave: 0,
            wfh: 0,
            holiday: 0,
            totalHours: 0,
            eodCount: 0,
          };
        }
        const emp = employeeSummaryMap[uId];
        if (record.status === 'present') emp.present += 1;
        else if (record.status === 'absent') emp.absent += 1;
        else if (record.status === 'leave') emp.leave += 1;
        else if (record.status === 'work_from_home') emp.wfh += 1;
        else if (record.status === 'holiday') emp.holiday += 1;

        emp.totalHours += record.totalHours || 0;
        if (record.eodReport?.submittedAt) emp.eodCount += 1;
      }
    });

    Object.values(employeeSummaryMap).forEach((emp) => {
      const workingDaysLogged = emp.present + emp.wfh + emp.leave + emp.absent;
      const avgHours = (emp.present + emp.wfh) > 0 ? (emp.totalHours / (emp.present + emp.wfh)).toFixed(2) : '0.00';
      const attRate = workingDaysLogged > 0 ? (((emp.present + emp.wfh) / workingDaysLogged) * 100).toFixed(1) : '0.0';

      const row = [
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${emp.email.replace(/"/g, '""')}"`,
        `"${emp.department.replace(/"/g, '""')}"`,
        `"${emp.role.replace(/"/g, '""')}"`,
        emp.present,
        emp.absent,
        emp.leave,
        emp.wfh,
        emp.holiday,
        emp.totalHours.toFixed(2),
        avgHours,
        emp.eodCount,
        `"${attRate}%"`,
      ];
      csvRows.push(row.join(','));
    });

    csvRows.push(`""`);
    csvRows.push(`""`);

    // --- SECTION 2: DETAILED DAILY ATTENDANCE LOGS ---
    csvRows.push(`"SECTION 2: DETAILED DAILY ATTENDANCE LOGS"`);
    const detailHeaders = [
      'Employee Name',
      'Email',
      'Department',
      'Position',
      'Role',
      'Date',
      'Day of Week',
      'Clock In Time (12-Hr)',
      'Clock Out Time (12-Hr)',
      'Total Hours Logged',
      'Status',
      'EOD Report Status',
      'Notes / Reason',
      'Approved / Assigned By',
    ];
    csvRows.push(detailHeaders.join(','));

    records.forEach((record) => {
      const empName = `"${(record.user?.name || record.user?.email || 'Unknown Employee').replace(/"/g, '""')}"`;
      const empEmail = `"${(record.user?.email || '').replace(/"/g, '""')}"`;
      const empDept = `"${(record.user?.department || '').replace(/"/g, '""')}"`;
      const empPos = `"${(record.user?.position || '').replace(/"/g, '""')}"`;
      const empRole = `"${(record.user?.role || '').replace(/"/g, '""')}"`;

      const dateObj = new Date(record.date);
      const dateStr = record.date ? dateObj.toISOString().split('T')[0] : '';
      const dayStr = dateObj.toLocaleDateString([], { weekday: 'short' });

      const clockInStr = record.clockIn ? `"${formatTime(record.clockIn)}"` : '"--:--"';
      const clockOutStr = record.clockOut ? `"${formatTime(record.clockOut)}"` : '"--:--"';
      const hoursStr = record.totalHours ? record.totalHours.toFixed(2) : '0.00';
      const statusStr = `"${(record.status || '').replace(/_/g, ' ').toUpperCase()}"`;
      const eodStr = record.eodReport?.submittedAt ? '"Submitted"' : '"Pending"';
      const notesStr = `"${(record.notes || '').replace(/"/g, '""')}"`;
      const approverStr = `"${(record.approvedBy?.name || '').replace(/"/g, '""')}"`;

      const row = [
        empName,
        empEmail,
        empDept,
        empPos,
        empRole,
        dateStr,
        dayStr,
        clockInStr,
        clockOutStr,
        hoursStr,
        statusStr,
        eodStr,
        notesStr,
        approverStr,
      ];

      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_Summary_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported Monthly Overall Summary & Detailed Logs for ${monthName} ${selectedYear}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse space-y-6">
        <div className="h-48 bg-card rounded-3xl" />
        <div className="h-96 bg-card rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Workspace & Attendance</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Manage team attendance, monitor live clock-ins, and download monthly summary reports" : "Track attendance, hours, and daily reports"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
              title="Download overall monthly summary & detailed logs as CSV spreadsheet"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Download Report (CSV)
            </button>
          )}
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

      <DateRangePicker title="Attendance Date Filter (From Date to To Date)" />

      {/* Admin / Manager Navigation Tabs & Overview Cards */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center space-x-2 bg-secondary/30 p-1.5 rounded-2xl border border-border">
              <button
                onClick={() => { setViewTab('team'); setSelectedUser('all'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewTab === 'team'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={16} className={viewTab === 'team' ? 'text-primary' : ''} />
                Team Attendance Records
              </button>
              <button
                onClick={() => { setViewTab('personal'); setSelectedUser(user?._id); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewTab === 'personal'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User size={16} className={viewTab === 'personal' ? 'text-primary' : ''} />
                My Attendance
              </button>
            </div>

            {/* Quick Status Pill Counters for Today */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Clocked In Today: {teamMetrics.clockedIn}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold">
                Completed Shift: {teamMetrics.completed}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold">
                On Leave: {teamMetrics.onLeave}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-bold">
                WFH: {teamMetrics.wfh}
              </div>
            </div>
          </div>

          {/* Today's Live Clock-In List Panel for Manager/Admin */}
          {viewTab === 'team' && (
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center text-foreground">
                  <Clock size={18} className="mr-2 text-emerald-500 animate-pulse" />
                  Today's Live Employee Clock-In Activity ({todayTeamActivity.length} Team Members)
                </h3>
                <span className="text-xs text-muted-foreground font-semibold">
                  {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayTeamActivity.map((item) => (
                  <div
                    key={item.user._id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      item.attendance?.clockIn && !item.attendance?.clockOut
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : item.attendance?.clockOut
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : item.status === 'leave'
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : item.status === 'work_from_home'
                        ? 'bg-purple-500/5 border-purple-500/30'
                        : 'bg-secondary/20 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs uppercase overflow-hidden border border-primary/20">
                        {item.user.avatar ? (
                          <img src={getAssetUrl(item.user.avatar)} alt={item.user.name} className="h-full w-full object-cover" />
                        ) : (
                          (item.user.name || item.user.email || 'E').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground text-xs truncate">
                          {item.user.name || item.user.email || 'Employee'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {item.user.department || item.user.position || item.user.role}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                          <span>In: {item.clockIn}</span>
                          <span>•</span>
                          <span className="text-amber-600">Out: {item.clockOut}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          item.attendance?.clockIn && !item.attendance?.clockOut
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : item.attendance?.clockOut
                            ? 'bg-amber-500/20 text-amber-600'
                            : item.status === 'leave'
                            ? 'bg-rose-500/20 text-rose-600'
                            : item.status === 'work_from_home'
                            ? 'bg-purple-500/20 text-purple-600'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {item.attendance?.clockIn && !item.attendance?.clockOut
                          ? 'Active Now'
                          : item.attendance?.clockOut
                          ? 'Completed'
                          : item.status?.replace(/_/g, ' ')}
                      </span>
                      {item.totalHours > 0 && (
                        <span className="text-[10px] font-bold text-foreground mt-1">
                          {item.totalHours.toFixed(1)} hrs
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar for Manager/Admin */}
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Employee Selector */}
              {viewTab === 'team' && (
                <div className="flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" />
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="app-select text-xs font-semibold py-2 px-3 rounded-xl border border-border bg-secondary/20 min-w-[180px]"
                  >
                    <option value="all">All Employees ({users.length})</option>
                    {users
                      .filter((u) => ['employee', 'manager', 'superAdmin', 'organizationOwner', 'accountManager'].includes(u.role))
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.email} {u.department ? `(${u.department})` : `(${u.role})`}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="app-select text-xs font-semibold py-2 px-3 rounded-xl border border-border bg-secondary/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="leave">On Leave</option>
                  <option value="work_from_home">Work From Home</option>
                  <option value="holiday">Holiday</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search employee name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-border bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Month & Year Navigation + CSV Download */}
            <div className="flex items-center space-x-3 bg-secondary/20 px-3 py-1.5 rounded-2xl border border-border">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-card transition-colors text-foreground"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-extrabold uppercase tracking-wider min-w-[110px] text-center">
                {monthName} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-card transition-colors text-foreground"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Detailed Employee Stats & Worked Works Dashboard for Selected Employee */}
          {selectedEmployeeInfo && selectedUserStats && (
            <div className="bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 dark:from-card dark:to-secondary/40 p-6 rounded-3xl border border-indigo-200/80 dark:border-border shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-black text-primary text-lg uppercase overflow-hidden border border-primary/20 shadow-sm">
                    {selectedEmployeeInfo.avatar ? (
                      <img src={getAssetUrl(selectedEmployeeInfo.avatar)} alt={selectedEmployeeInfo.name} className="h-full w-full object-cover" />
                    ) : (
                      (selectedEmployeeInfo.name || selectedEmployeeInfo.email || 'E').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-foreground">
                        {selectedEmployeeInfo.name || selectedEmployeeInfo.email}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-extrabold uppercase border border-indigo-500/20">
                        {selectedEmployeeInfo.department || selectedEmployeeInfo.position || selectedEmployeeInfo.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                      {selectedEmployeeInfo.email} • Filtered Month: {monthName} {selectedYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black">
                    🎯 {selectedUserStats.attendanceRate}% Attendance Rate
                  </div>
                  <button
                    onClick={() => setSelectedUser('all')}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground bg-slate-200/60 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>

              {/* 4 Core Stat Cards for Employee */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Present Days</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-600">{selectedUserStats.present + selectedUserStats.wfh}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Days ({selectedUserStats.present} P, {selectedUserStats.wfh} WFH)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Worked Hours</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-primary">{selectedUserStats.totalHours}</span>
                    <span className="text-xs text-muted-foreground font-semibold">hrs (Avg {selectedUserStats.avgDailyHours}h/day)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Leaves & Absences</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-rose-600">{selectedUserStats.leave + selectedUserStats.absent}</span>
                    <span className="text-xs text-muted-foreground font-semibold">({selectedUserStats.leave} Leave, {selectedUserStats.absent} Absent)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">EOD Reports Submitted</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-indigo-600">{selectedUserStats.eodSubmittedCount}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Reports</span>
                  </div>
                </div>
              </div>

              {/* Worked Works & Daily Tasks Logged List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-foreground flex items-center gap-1.5">
                    <Briefcase size={14} className="text-primary" />
                    Worked Works & Daily Task Updates ({selectedUserStats.workedTasks.length} Logged Entries)
                  </h4>
                </div>

                {selectedUserStats.workedTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-card/60 border border-dashed border-slate-200 dark:border-border text-center text-xs text-muted-foreground">
                    No EOD work tasks or progress updates logged for this employee in {monthName} {selectedYear}.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {selectedUserStats.workedTasks.map((work, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-foreground truncate">{work.workTitle}</div>
                          {work.notes && <div className="text-[11px] text-muted-foreground truncate">{work.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-secondary text-slate-700 dark:text-foreground font-bold">
                            {new Date(work.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {work.hours} hrs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Clock In/Out & Monthly Summary */}
        <div className="lg:col-span-1 space-y-6">
          <AttendanceWidget todayRecord={todayRecord} user={user} />

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h3 className="font-bold flex items-center mb-6">
              <TrendingUp size={18} className="mr-2 text-emerald-500" />
              {viewTab === 'team' ? 'Filtered Summary' : 'This Month Summary'}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Present Days / Logs</span>
                <span className="font-bold text-emerald-600">{summary.present} Records</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-bold">{summary.totalHours} hrs</span>
              </div>
              {summary.leave > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Leaves</span>
                  <span className="font-bold text-rose-600">{summary.leave} Days</span>
                </div>
              )}
              {summary.wfh > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Work From Home</span>
                  <span className="font-bold text-purple-600">{summary.wfh} Days</span>
                </div>
              )}
              {viewTab === 'personal' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">EOD Submitted</span>
                  <span className={`font-bold ${eodSubmitted ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {eodSubmitted ? 'Yes' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Records Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-secondary/10">
              <h3 className="font-bold flex items-center">
                <History size={18} className="mr-2 text-primary" />
                {viewTab === 'team' ? 'Employee Shift & Attendance Records' : 'Shift History'}
                <span className="ml-2 text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                  {records.length} records
                </span>
              </h3>

              {isAdmin && (
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Download size={14} />
                  Export CSV Report
                </button>
              )}

              {!isAdmin && (
                <div className="flex items-center space-x-2">
                  <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {monthName} {selectedYear}
                  </span>
                  <button onClick={handleNextMonth} className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground font-medium">
                  <tr>
                    {showEmployeeColumn && (
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Employee</th>
                    )}
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Date</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">In / Out Timings</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Total Time</th>
                    <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">EOD Report</th>
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
                      {/* Employee Details Column for Managers / Admins */}
                      {showEmployeeColumn && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs uppercase overflow-hidden border border-primary/20">
                              {record.user?.avatar ? (
                                <img src={getAssetUrl(record.user.avatar)} alt={record.user.name} className="h-full w-full object-cover" />
                              ) : (
                                (record.user?.name || record.user?.email || 'E').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground truncate max-w-[150px]">
                                {record.user?.name || record.user?.email || 'Unknown Employee'}
                              </div>
                              {record.user?.email && (
                                <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                                  {record.user.email}
                                </div>
                              )}
                              <div className="text-[10px] text-primary/80 font-semibold truncate max-w-[150px]">
                                {record.user?.department || record.user?.position || record.user?.role || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-4">
                        <div className="font-bold">
                          {new Date(record.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {new Date(record.date).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Explicit 12-Hour AM/PM Format for Clock In and Out */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-emerald-600 font-bold">
                            {formatTime(record.clockIn)}
                          </span>
                          <span className="text-muted-foreground opacity-40">to</span>
                          <span className="text-amber-600 font-bold">
                            {formatTime(record.clockOut)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold">{record.totalHours?.toFixed(1) || '0.0'} hrs</td>

                      <td className="px-6 py-4">
                        {record.status === 'holiday' ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              record.eodReport?.submittedAt
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}
                          >
                            {record.eodReport?.submittedAt ? 'Submitted' : 'Pending'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {record.approvalStatus === 'pending' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                              <AlertCircle size={11} />
                              Pending Approval: {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                            </span>
                          ) : record.approvalStatus === 'rejected' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                              <XCircle size={11} />
                              Rejected: {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                                statusColors[record.status] || 'bg-secondary/40 text-muted-foreground'
                              }`}
                            >
                              {record.status?.replace(/_/g, ' ')}
                              {(record.notes || record.approvedBy) && <Info size={11} className="ml-0.5 opacity-80" />}
                            </span>
                          )}

                          {record.notes && (
                            <span className="text-xs font-medium text-foreground/90 truncate max-w-[180px]" title={record.notes}>
                              Reason: {record.notes}
                            </span>
                          )}

                          {isAdmin && record.approvalStatus === 'pending' && (
                            <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => approveAttendanceMutation.mutate({ id: record._id, action: 'approve' })}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-all shadow-xs"
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt('Rejection reason (optional):');
                                  approveAttendanceMutation.mutate({ id: record._id, action: 'reject', rejectionReason: reason || '' });
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition-all shadow-xs"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          )}

                          {record.approvedBy && record.approvalStatus === 'approved' && (
                            <span className="text-[10px] font-semibold text-primary flex items-center gap-1 mt-0.5">
                              <UserCheck size={10} />
                              Approved by: {record.approvedBy.name}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {records.length === 0 && (
                    <tr>
                      <td colSpan={showEmployeeColumn ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground italic">
                        No attendance records found matching the current filters.
                      </td>
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
                <p className="text-white/75 text-sm mt-1 max-w-[420px]">
                  Submit your EOD report after logging work so managers can review progress and blockers.
                </p>
                <button
                  onClick={() => setShowEOD(true)}
                  className="mt-4 px-6 py-2.5 bg-white text-primary font-bold rounded-xl text-sm shadow-lg hover:bg-white/90 transition-all"
                >
                  {eodSubmitted ? 'Review Report' : 'Submit Report'}
                </button>
              </div>
              <Calendar size={80} className="opacity-20 hidden md:block" />
            </div>
          )}
        </div>
      </div>

      {/* EOD Report Modal */}
      <EODReportModal open={showEOD} onOpenChange={setShowEOD} report={todayRecord?.eodReport} />

      {/* Assign Holiday Modal */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Assign Company Holiday</DialogTitle>
            <DialogDescription>
              Record an official agency holiday across all employee attendance calendars.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignHoliday} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Holiday Date *</label>
              <input
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason / Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. Christmas, Independence Day, Diwali"
                value={holidayForm.notes}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-2 rounded-xl border border-border font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignHolidayMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {assignHolidayMutation.isPending ? 'Assigning...' : 'Assign Holiday'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Leave Modal */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Assign Employee Leave</DialogTitle>
            <DialogDescription>
              Record an approved leave of absence on behalf of a team member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignLeave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Employee *</label>
              <select
                required
                value={leaveForm.userId}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, userId: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose an employee...</option>
                {users
                  .filter((u) => ['employee', 'manager', 'superAdmin', 'organizationOwner', 'accountManager'].includes(u.role))
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name || u.email} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Leave Date *</label>
              <input
                type="date"
                required
                value={leaveForm.date}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason / Details *</label>
              <input
                type="text"
                required
                placeholder="e.g. Medical appointment, emergency"
                value={leaveForm.notes}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
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
                disabled={submitLeaveMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {submitLeaveMutation.isPending ? 'Assigning...' : 'Assign Leave'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inform WFH Modal */}
      <Dialog open={showWFHModal} onOpenChange={setShowWFHModal}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Inform Work From Home (WFH)</DialogTitle>
            <DialogDescription>
              Submit in advance when working remotely.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInformWFH} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select WFH Date *</label>
              <input
                type="date"
                required
                value={wfhForm.date}
                onChange={(e) => setWfhForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[11px] text-muted-foreground">Must be submitted at least one day in advance.</span>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason / Details *</label>
              <input
                type="text"
                required
                placeholder="e.g. Remote work, commute issue"
                value={wfhForm.notes}
                onChange={(e) => setWfhForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowWFHModal(false)}
                className="px-4 py-2 rounded-xl border border-border font-semibold text-xs hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitWFHMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {submitWFHMutation.isPending ? 'Submitting...' : 'Submit WFH Notice'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Detail Modal */}
      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>Attendance Record Details</DialogTitle>
            <DialogDescription>
              {selectedRecord?.date && new Date(selectedRecord.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 text-xs">
              {/* Employee Info */}
              {selectedRecord.user && typeof selectedRecord.user === 'object' && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/80">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-xs uppercase overflow-hidden border border-primary/20">
                    {selectedRecord.user.avatar ? (
                      <img src={getAssetUrl(selectedRecord.user.avatar)} alt={selectedRecord.user.name} className="h-full w-full object-cover" />
                    ) : (
                      (selectedRecord.user.name || selectedRecord.user.email || 'E').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-xs">
                      {selectedRecord.user.name || selectedRecord.user.email || 'Employee'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {selectedRecord.user.email} • {selectedRecord.user.role}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/25 border border-border">
                <span className="font-medium text-muted-foreground">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusColors[selectedRecord.status] || 'bg-secondary text-muted-foreground'}`}>
                  {selectedRecord.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Reason / Notes */}
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Reason / Description</div>
                <div className="font-medium text-foreground">
                  {selectedRecord.notes || 'No notes or reason provided.'}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock In</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatTime(selectedRecord.clockIn)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock Out</div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {formatTime(selectedRecord.clockOut)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Time</div>
                  <div className="text-xs font-bold text-foreground mt-1">
                    {selectedRecord.totalHours?.toFixed(1) || '0.0'} hrs
                  </div>
                </div>
              </div>

              {/* EOD Report if exists */}
              {selectedRecord.eodReport?.submittedAt && (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} /> EOD Report Submitted
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-3">
                    {selectedRecord.eodReport.summary || 'Summary submitted.'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="w-full py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground font-semibold text-xs hover:bg-secondary transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
