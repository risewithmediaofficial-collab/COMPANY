import React, { Fragment, useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  Send,
  Eye,
  BellRing,
  X,
} from '@/components/ui/muiIcons';
import api from '../../api';
import { getAssetUrl } from '../../utils/assetUrl';
import { EODReportModal } from '../../components/modals/EODReportModal';
import { EODDetailModal } from '../../components/modals/EODDetailModal';
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
import { useEodReports } from '../../hooks/useEodReports';
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
  DialogClose,
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
  const isAdmin = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(user?.role) || Boolean(user?.permissions?.canManageHR || user?.permissions?.canManageEmployees);
  const isSuperAdmin = user?.role === 'superAdmin' || user?.role === 'admin';

  const currentDate = new Date();
  const [time, setTime] = useState(new Date());
  const approveAttendanceMutation = useApproveAttendanceRequest();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Manager View Controls vs Personal View vs EOD Reports
  const [viewTab, setViewTab] = useState(isAdmin ? 'team' : 'personal'); // 'team' | 'eod' | 'personal'
  const hasUserChangedTab = useRef(false);

  useEffect(() => {
    if (isAdmin && !hasUserChangedTab.current && viewTab === 'personal') {
      setViewTab('team');
    }
  }, [isAdmin, viewTab]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const [eodDays, setEodDays] = useState(30);
  const [selectedEodDetail, setSelectedEodDetail] = useState(null);
  const [showEOD, setShowEOD] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', notes: '' });
  const [leaveForm, setLeaveForm] = useState({
    userId: '',
    startDate: todayStr,
    endDate: todayStr,
    notes: '',
  });
  const [wfhForm, setWfhForm] = useState({ date: todayStr, notes: '' });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reminding, setReminding] = useState(false);

  const handleTriggerAttendanceReminder = async () => {
    setReminding(true);
    try {
      const res = await api.post('/notifications/trigger-attendance-reminders');
      toast.success(res.data?.message || 'Attendance reminders sent to staff!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger attendance reminder');
    } finally {
      setReminding(false);
    }
  };

  const handleTriggerEveningReminder = async () => {
    setReminding(true);
    try {
      const res = await api.post('/notifications/trigger-evening-reminders');
      toast.success(res.data?.message || 'Evening EOD reminders sent to staff!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger evening reminder');
    } finally {
      setReminding(false);
    }
  };

  const handleTriggerAutoAbsent = async () => {
    setReminding(true);
    try {
      const res = await api.post('/notifications/trigger-auto-absent');
      toast.success(res.data?.message || '10:30 AM Auto-absent cutoff processed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger auto-absent cutoff');
    } finally {
      setReminding(false);
    }
  };

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
  const { data: eodData, isLoading: isEodLoading } = useEodReports(eodDays, {}, { enabled: isAdmin });

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
      await submitLeaveMutation.mutateAsync({
        userId: leaveForm.userId || (isAdmin ? undefined : user?._id),
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate || leaveForm.startDate,
        notes: leaveForm.notes,
      });
      setLeaveForm({ userId: '', startDate: todayStr, endDate: todayStr, notes: '' });
      setShowLeaveModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInformWFH = async (e) => {
    e.preventDefault();
    try {
      await submitWFHMutation.mutateAsync(wfhForm);
      setWfhForm({ date: todayStr, notes: '' });
      setShowWFHModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    present: 'bg-primary text-primary-foreground border border-primary',
    absent: 'bg-background text-muted-foreground border border-border',
    half_day: 'bg-secondary text-foreground border border-border',
    leave: 'bg-muted text-foreground border border-border',
    holiday: 'bg-secondary text-foreground border border-border',
    work_from_home: 'bg-secondary text-foreground border border-border',
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
    const isSameCalendarDay = (d1, d2) => {
      if (!d1 || !d2) return false;
      const a = new Date(d1);
      const b = new Date(d2);
      if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth() === b.getMonth() &&
             a.getDate() === b.getDate();
    };

    const currentUserId = user?._id?.toString();
    const now = new Date();

    return rawRecords.find((record) => {
      const recordUserId = (record.user?._id || record.user)?.toString();
      const matchesUser = !currentUserId || !recordUserId || recordUserId === currentUserId;
      const isToday = (record.date && isSameCalendarDay(record.date, now)) ||
                      (record.clockIn && isSameCalendarDay(record.clockIn, now)) ||
                      (record.sessions && record.sessions.some(s => s.clockIn && isSameCalendarDay(s.clockIn, now)));
      return matchesUser && isToday;
    });
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

    // Calculate IST time (UTC+5:30)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (330 * 60000));
    const istDay = istTime.getDay(); // 0 is Sunday
    const isPast1030 = istDay !== 0 && (istTime.getHours() > 10 || (istTime.getHours() === 10 && istTime.getMinutes() >= 30));
    
    return employeeUsers.map((emp) => {
      const att = teamTodayRecords.find(
        (r) => (r.user?._id || r.user) === emp._id
      );

      const hasClockIn = Boolean(att?.clockIn || (att?.sessions && att.sessions.some((s) => s.clockIn)));
      const isPending = att?.approvalStatus === 'pending';

      let resolvedStatus = 'not_clocked_in';
      if (hasClockIn) {
        resolvedStatus = att.clockOut ? 'completed' : 'present';
      } else if (isPending) {
        resolvedStatus = att.requestedStatus === 'work_from_home' ? 'pending_wfh' : 'pending_leave';
      } else if (att?.status === 'leave') {
        resolvedStatus = 'leave';
      } else if (att?.status === 'work_from_home') {
        resolvedStatus = 'work_from_home';
      } else if (att?.status === 'holiday') {
        resolvedStatus = 'holiday';
      } else if (att?.status === 'absent' || isPast1030) {
        resolvedStatus = 'absent';
      }

      return {
        user: emp,
        attendance: att || null,
        status: resolvedStatus,
        clockIn: att?.clockIn ? formatTime(att.clockIn) : '--:--',
        clockOut: att?.clockOut ? formatTime(att.clockOut) : '--:--',
        totalHours: att?.totalHours || 0,
        eodSubmitted: Boolean(att?.eodReport?.submittedAt),
        isPending,
        appliedAt: att?.appliedAt,
      };
    });
  }, [users, teamTodayRecords]);

  // Team live metrics for today
  const teamMetrics = useMemo(() => {
    const employeeUsers = users.filter((u) => u.role !== 'client' && u.role !== 'referral');
    const totalEmployees = employeeUsers.length;
    const clockedIn = todayTeamActivity.filter((item) => item.status === 'present').length;
    const completed = todayTeamActivity.filter((item) => item.status === 'completed').length;
    const onLeave = todayTeamActivity.filter((item) => item.status === 'leave' || item.status === 'pending_leave').length;
    const wfh = todayTeamActivity.filter((item) => item.status === 'work_from_home' || item.status === 'pending_wfh').length;
    const holiday = todayTeamActivity.filter((item) => item.status === 'holiday').length;
    const absent = todayTeamActivity.filter((item) => item.status === 'absent').length;

    return {
      totalEmployees,
      clockedIn,
      completed,
      onLeave,
      wfh,
      holiday,
      absent,
    };
  }, [users, todayTeamActivity]);

  const pendingApprovals = useMemo(() => {
    const serverPending = data?.pendingRequests || [];
    const localPending = rawRecords.filter((r) => r.approvalStatus === 'pending');
    const map = new Map();
    serverPending.forEach((r) => map.set(r._id?.toString(), r));
    localPending.forEach((r) => map.set(r._id?.toString(), r));
    if (Array.isArray(todayTeamActivity)) {
      todayTeamActivity.forEach((item) => {
        if (item.isPending && item.attendance?._id) {
          map.set(item.attendance._id.toString(), item.attendance);
        }
      });
    }
    return Array.from(map.values());
  }, [data?.pendingRequests, rawRecords, todayTeamActivity]);

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
      'First Clock In (12-Hr)',
      'Last Clock Out (12-Hr)',
      'All Login & Logout Sessions (Complete Timings)',
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

      let sessionsDetail = '"--"';
      if (record.sessions && record.sessions.length > 0) {
        sessionsDetail = `"${record.sessions.map((s, idx) => `#${idx + 1}: In ${formatTime(s.clockIn)} - Out ${s.clockOut ? formatTime(s.clockOut) : 'Active'} (${s.durationHours ? s.durationHours.toFixed(2) : 0}h)`).join('; ')}"`;
      } else if (record.clockIn) {
        sessionsDetail = `"In ${formatTime(record.clockIn)} - Out ${formatTime(record.clockOut)}"`;
      }

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
        sessionsDetail,
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-48 bg-card rounded-3xl border border-border" />
        <div className="h-96 bg-card rounded-3xl border border-border" />
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
            {isAdmin ? "Manage team attendance, review employee EOD reports, and approve leaves" : "Track attendance, apply for leave, hours, and daily reports"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
              title="Download overall monthly summary & detailed logs as CSV spreadsheet"
            >
              <FileSpreadsheet size={18} className="mr-2 shrink-0" />
              Download Report (CSV)
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowHolidayModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors cursor-pointer"
            >
              <Calendar size={18} className="mr-2 text-muted-foreground shrink-0" />
              Assign Holiday
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleTriggerAttendanceReminder}
              disabled={reminding}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground shadow-xs hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              title="Send morning attendance reminders (up to 10:30 AM cutoff) to unclocked staff"
            >
              <Clock size={16} className="mr-1.5 text-muted-foreground shrink-0" />
              Remind Attendance (10:30 AM Cutoff)
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleTriggerAutoAbsent}
              disabled={reminding}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground shadow-xs hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              title="Run 10:30 AM cutoff check to automatically mark unclocked employees absent"
            >
              <AlertCircle size={16} className="mr-1.5 text-muted-foreground shrink-0" />
              Auto-Absent (10:30 AM)
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleTriggerEveningReminder}
              disabled={reminding}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground shadow-xs hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              title="Send 6:00 - 6:30 PM evening clock-out & EOD reminder to staff"
            >
              <BellRing size={16} className="mr-1.5 text-muted-foreground shrink-0" />
              Remind EOD
            </button>
          )}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <Calendar size={18} className="mr-2 text-muted-foreground shrink-0" />
            {isAdmin ? 'Assign / Apply Leave' : 'Apply for Leave'}
          </button>
          {!isSuperAdmin && (
            <button
              onClick={() => setShowWFHModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary/40 transition-colors cursor-pointer"
            >
              <Calendar size={18} className="mr-2 text-muted-foreground shrink-0" />
              Inform WFH
            </button>
          )}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowEOD(true)}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              disabled={!todayRecord?.clockIn}
            >
              <FileText size={18} className="mr-2 shrink-0" />
              {eodSubmitted ? 'Update EOD Report' : 'Submit EOD Report'}
            </button>
          )}
        </div>
      </div>

      {/* Admin / Manager Navigation Tabs & Overview Cards */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-2xl border border-border overflow-x-auto custom-scrollbar max-w-full">
              <button
                onClick={() => { hasUserChangedTab.current = true; setViewTab('team'); setSelectedUser('all'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 min-h-[38px] cursor-pointer ${
                  viewTab === 'team'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={16} className="shrink-0" />
                Team Attendance Records
              </button>

              <button
                onClick={() => { hasUserChangedTab.current = true; setViewTab('eod'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 min-h-[38px] cursor-pointer ${
                  viewTab === 'eod'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText size={16} className="shrink-0" />
                Team EOD Reports
                {eodData?.records?.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary border border-border text-foreground tabular-nums">
                    {eodData.records.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { hasUserChangedTab.current = true; setViewTab('personal'); setSelectedUser(user?._id); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 min-h-[38px] cursor-pointer ${
                  viewTab === 'personal'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User size={16} className="shrink-0" />
                My Attendance
              </button>
            </div>

            {/* Quick Status Pill Counters for Today */}
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-foreground border border-border text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
                Clocked In Today: {teamMetrics.clockedIn}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card text-foreground border border-border text-xs font-bold">
                Completed Shift: {teamMetrics.completed}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card text-muted-foreground border border-border text-xs font-bold">
                On Leave: {teamMetrics.onLeave}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card text-muted-foreground border border-border text-xs font-bold">
                WFH: {teamMetrics.wfh}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card text-muted-foreground border border-border text-xs font-bold">
                Absent: {teamMetrics.absent}
              </div>
            </div>
          </div>

          {/* Dedicated Pending Approvals Action Banner for Admin & Super Admin */}
          {isAdmin && pendingApprovals.length > 0 && (
            <div className="bg-secondary/40 border border-border rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-foreground font-extrabold text-sm sm:text-base tabular-nums">
                  <AlertCircle size={20} className="text-foreground shrink-0" />
                  <span>Action Required: {pendingApprovals.length} Pending WFH / Leave Request{pendingApprovals.length > 1 ? 's' : ''}</span>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-foreground border border-border">
                  Awaiting Review
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {pendingApprovals.map((req) => {
                  const reqDateStr = new Date(req.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  const isWFH = req.requestedStatus === 'work_from_home' || req.status === 'work_from_home';
                  return (
                    <div key={req._id} className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs uppercase overflow-hidden border border-border">
                            {req.user?.avatar ? (
                              <img src={getAssetUrl(req.user.avatar)} alt={req.user.name} className="h-full w-full object-cover" />
                            ) : (
                              (req.user?.name || req.user?.email || 'E').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground text-xs truncate">
                              {req.user?.name || req.user?.email || 'Employee'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {req.user?.department || req.user?.position || req.user?.role || ''}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 border bg-secondary text-foreground border-border">
                          {isWFH ? 'WFH Request' : 'Leave Request'}
                        </span>
                      </div>

                      <div className="text-xs bg-secondary/30 p-2.5 rounded-xl text-foreground/90 space-y-1 border border-border/50 tabular-nums">
                        <div className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                          <Calendar size={13} className="shrink-0" /> Requested Date: {reqDateStr}
                        </div>
                        {req.notes && (
                          <div className="text-[11px] text-muted-foreground italic line-clamp-2">
                            "{req.notes}"
                          </div>
                        )}
                        {req.appliedAt && (
                          <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
                            <Clock size={10} className="shrink-0" /> Applied: {new Date(req.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {formatTime(req.appliedAt)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => approveAttendanceMutation.mutate({ id: req._id, action: 'approve' })}
                          disabled={approveAttendanceMutation.isPending}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('Rejection reason (optional):');
                            approveAttendanceMutation.mutate({ id: req._id, action: 'reject', rejectionReason: reason || '' });
                          }}
                          disabled={approveAttendanceMutation.isPending}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-secondary hover:bg-muted text-foreground border border-border font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Live Clock-In List Panel for Manager/Admin */}
          {viewTab === 'team' && (
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center text-foreground">
                  <Clock size={18} className="mr-2 text-foreground shrink-0" />
                  Today's Live Employee Clock-In Activity ({todayTeamActivity.length} Team Members)
                </h3>
                <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                  {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayTeamActivity.map((item) => (
                  <div
                    key={item.user._id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      item.status === 'present'
                        ? 'bg-secondary/40 border-border'
                        : 'bg-secondary/15 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs uppercase overflow-hidden border border-border">
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
                        <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 flex items-center gap-1 tabular-nums">
                          <span className="text-foreground">In: {item.clockIn}</span>
                          <span>•</span>
                          <span>Out: {item.clockOut}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          item.status === 'present'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-foreground border-border'
                        }`}
                      >
                        {item.status === 'present'
                          ? 'Active Now'
                          : item.status === 'completed'
                          ? 'Completed'
                          : item.status === 'pending_leave'
                          ? 'Leave Pending'
                          : item.status === 'pending_wfh'
                          ? 'WFH Pending'
                          : item.status === 'absent'
                          ? 'Absent'
                          : item.status === 'not_clocked_in'
                          ? 'Not Clocked In'
                          : item.status?.replace(/_/g, ' ')}
                      </span>
                      {item.totalHours > 0 ? (
                        <span className="text-[10px] font-bold text-foreground mt-1 tabular-nums">
                          {item.totalHours.toFixed(1)} hrs
                        </span>
                      ) : item.status === 'absent' ? (
                        <span className="text-[9px] font-semibold text-muted-foreground mt-0.5 tabular-nums">
                          Cutoff 10:30 AM
                        </span>
                      ) : null}

                      {isAdmin && item.isPending && item.attendance?._id && (
                        <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => approveAttendanceMutation.mutate({ id: item.attendance._id, action: 'approve' })}
                            className="px-2 py-0.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold shadow-2xs cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt('Rejection reason (optional):');
                              approveAttendanceMutation.mutate({ id: item.attendance._id, action: 'reject', rejectionReason: reason || '' });
                            }}
                            className="px-2 py-0.5 rounded-md bg-secondary hover:bg-muted text-foreground border border-border text-[10px] font-bold shadow-2xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar for Manager/Admin */}
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-4">
            {/* Quick Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-1"><Filter size={12} /> Quick Filter:</span>
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: `Pending Approvals (${pendingApprovals.length})` },
                { value: 'present', label: 'Present' },
                { value: 'holiday', label: 'Holidays' },
                { value: 'leave', label: 'Leaves' },
                { value: 'work_from_home', label: 'WFH' },
                { value: 'absent', label: 'Absent' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedStatus(value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer tabular-nums ${
                    selectedStatus === value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/30 border-border text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {label}
                  {selectedStatus === value && records.length > 0 && (
                    <span className="ml-1.5 bg-primary-foreground/20 text-inherit rounded-full px-1.5 py-0.5 text-[10px] font-extrabold">{records.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
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
                        .filter((u) => ['employee', 'manager', 'admin', 'superAdmin', 'organizationOwner', 'accountManager'].includes(u.role))
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email} {u.department ? `(${u.department})` : `(${u.role})`}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

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

              {/* Month & Year Navigation */}
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
          </div>

          {/* Detailed Employee Stats & Worked Works Dashboard for Selected Employee */}
          {selectedEmployeeInfo && selectedUserStats && (
            <div className="bg-card p-6 rounded-3xl border border-border shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary font-black text-foreground text-lg uppercase overflow-hidden border border-border shadow-sm">
                    {selectedEmployeeInfo.avatar ? (
                      <img src={getAssetUrl(selectedEmployeeInfo.avatar)} alt={selectedEmployeeInfo.name} className="h-full w-full object-cover" />
                    ) : (
                      (selectedEmployeeInfo.name || selectedEmployeeInfo.email || 'E').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-foreground">
                        {selectedEmployeeInfo.name || selectedEmployeeInfo.email}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-xs font-extrabold uppercase border border-border">
                        {selectedEmployeeInfo.department || selectedEmployeeInfo.position || selectedEmployeeInfo.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedEmployeeInfo.email} • Filtered Month: {monthName} {selectedYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-secondary text-foreground border border-border text-xs font-black tabular-nums">
                    {selectedUserStats.attendanceRate}% Attendance Rate
                  </div>
                  <button
                    onClick={() => setSelectedUser('all')}
                    className="text-xs font-bold text-foreground bg-secondary hover:bg-muted border border-border px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>

              {/* 4 Core Stat Cards for Employee */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Present Days</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-foreground">{selectedUserStats.present + selectedUserStats.wfh}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Days ({selectedUserStats.present} P, {selectedUserStats.wfh} WFH)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Worked Hours</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-foreground">{selectedUserStats.totalHours}</span>
                    <span className="text-xs text-muted-foreground font-semibold">hrs (Avg {selectedUserStats.avgDailyHours}h/day)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Leaves & Absences</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-foreground">{selectedUserStats.leave + selectedUserStats.absent}</span>
                    <span className="text-xs text-muted-foreground font-semibold">({selectedUserStats.leave} Leave, {selectedUserStats.absent} Absent)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">EOD Reports Submitted</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-foreground">{selectedUserStats.eodSubmittedCount}</span>
                    <span className="text-xs text-muted-foreground font-semibold">Reports</span>
                  </div>
                </div>
              </div>

              {/* Worked Works & Daily Tasks Logged List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 tabular-nums">
                    <Briefcase size={14} className="text-muted-foreground shrink-0" />
                    Worked Works & Daily Task Updates ({selectedUserStats.workedTasks.length} Logged Entries)
                  </h4>
                </div>

                {selectedUserStats.workedTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-secondary/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                    No EOD work tasks or progress updates logged for this employee in {monthName} {selectedYear}.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {selectedUserStats.workedTasks.map((work, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-foreground truncate">{work.workTitle}</div>
                          {work.notes && <div className="text-[11px] text-muted-foreground truncate">{work.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 tabular-nums">
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold">
                            {new Date(work.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary border border-border text-foreground font-bold">
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

      {/* Team EOD Reports View for Super Admin / Admin / Manager */}
      {viewTab === 'eod' ? (
        <div className="space-y-6">
          {/* EOD Controls Header */}
          <div className="bg-card p-5 rounded-3xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Employee selector */}
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="app-select text-xs font-semibold py-2 px-3 rounded-xl border border-border bg-secondary/20 min-w-[180px]"
                >
                  <option value="all">All Team Members ({users.length})</option>
                  {users
                    .filter((u) => ['employee', 'manager', 'admin', 'superAdmin', 'organizationOwner', 'accountManager'].includes(u.role))
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name || u.email} {u.department ? `(${u.department})` : `(${u.role})`}
                      </option>
                    ))}
                </select>
              </div>

              {/* Days range selector */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <select
                  value={eodDays}
                  onChange={(e) => setEodDays(Number(e.target.value))}
                  className="app-select text-xs font-semibold py-2 px-3 rounded-xl border border-border bg-secondary/20"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks, blockers, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-border bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="text-xs font-bold text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-xl border border-border">
              Showing {eodData?.records?.filter((r) => {
                if (selectedUser !== 'all' && (r.user?._id || r.user) !== selectedUser) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const name = r.user?.name?.toLowerCase() || '';
                const email = r.user?.email?.toLowerCase() || '';
                const dept = r.user?.department?.toLowerCase() || '';
                const summary = r.eodReport?.summary?.toLowerCase() || '';
                const blockers = r.eodReport?.blockers?.toLowerCase() || '';
                const tasksMatch = r.eodReport?.tasksCompleted?.some((t) =>
                  (typeof t === 'string' ? t : t.title || t.taskTitle || '').toLowerCase().includes(q)
                );
                return name.includes(q) || email.includes(q) || dept.includes(q) || summary.includes(q) || blockers.includes(q) || tasksMatch;
              }).length || 0} EOD submissions
            </div>
          </div>

          {/* EOD Cards Grid */}
          {isEodLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-56 bg-card rounded-3xl border border-border" />
              ))}
            </div>
          ) : (
            (() => {
              const filteredReports = (eodData?.records || []).filter((r) => {
                if (selectedUser !== 'all' && (r.user?._id || r.user) !== selectedUser) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const name = r.user?.name?.toLowerCase() || '';
                const email = r.user?.email?.toLowerCase() || '';
                const dept = r.user?.department?.toLowerCase() || '';
                const summary = r.eodReport?.summary?.toLowerCase() || '';
                const blockers = r.eodReport?.blockers?.toLowerCase() || '';
                const tasksMatch = r.eodReport?.tasksCompleted?.some((t) =>
                  (typeof t === 'string' ? t : t.title || t.taskTitle || '').toLowerCase().includes(q)
                );
                return name.includes(q) || email.includes(q) || dept.includes(q) || summary.includes(q) || blockers.includes(q) || tasksMatch;
              });

              if (filteredReports.length === 0) {
                return (
                  <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground space-y-2">
                    <FileText size={36} className="mx-auto opacity-40 text-muted-foreground" />
                    <h3 className="font-bold text-foreground text-sm">No EOD Reports Found</h3>
                    <p className="text-xs">No team members have submitted EOD reports matching the selected filters.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredReports.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedEodDetail(item)}
                      className="bg-card hover:bg-secondary/15 rounded-3xl border border-border transition-all p-5 space-y-4 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group"
                    >
                      {/* Header: User avatar + info + date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-foreground text-xs uppercase overflow-hidden border border-border">
                            {item.user?.avatar ? (
                              <img src={getAssetUrl(item.user.avatar)} alt={item.user.name} className="h-full w-full object-cover" />
                            ) : (
                              (item.user?.name || item.user?.email || 'E').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-sm truncate transition-colors">
                              {item.user?.name || item.user?.email || 'Employee'}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.user?.department || item.user?.position || item.user?.role || 'Team Member'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums">
                          <span className="text-xs font-bold text-foreground block">
                            {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.eodReport?.submittedAt ? formatTime(item.eodReport.submittedAt) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Daily Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Summary</span>
                        <p className="text-xs text-foreground/90 line-clamp-3 leading-relaxed">
                          {item.eodReport?.summary || 'No summary text provided.'}
                        </p>
                      </div>

                      {/* Completed Tasks Pills */}
                      {item.eodReport?.tasksCompleted?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
                            Completed Tasks ({item.eodReport.tasksCompleted.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.eodReport.tasksCompleted.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-secondary/70 border border-border text-foreground px-2 py-0.5 rounded-lg max-w-[200px] truncate font-medium">
                                <CheckCircle2 size={10} className="shrink-0" />
                                <span className="truncate">{typeof t === 'string' ? t : t.title || t.taskTitle || 'Task'}</span>
                              </span>
                            ))}
                            {item.eodReport.tasksCompleted.length > 3 && (
                              <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 tabular-nums">
                                +{item.eodReport.tasksCompleted.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Blockers */}
                      {item.eodReport?.blockers && (
                        <div className="p-2.5 rounded-xl bg-muted border border-border text-foreground text-xs">
                          <span className="font-bold flex items-center gap-1 text-[10px] uppercase">
                            <AlertCircle size={12} className="shrink-0" /> Blocker:
                          </span>
                          <p className="line-clamp-2 mt-0.5 text-muted-foreground">{item.eodReport.blockers}</p>
                        </div>
                      )}

                      {/* Card Footer: Hours & View action */}
                      <div className="pt-3 border-t border-border flex items-center justify-between text-xs tabular-nums">
                        <span className="font-semibold text-muted-foreground">
                          Total Time: <strong className="text-foreground">{item.totalHours?.toFixed(1) || '0.0'} hrs</strong>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedEodDetail(item); }}
                          className="inline-flex items-center gap-1 font-bold text-foreground hover:underline cursor-pointer"
                        >
                          <Eye size={13} /> View Full Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      ) : (
        /* Main Layout Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Clock In/Out & Monthly Summary */}
          <div className="lg:col-span-1 space-y-6">
            <AttendanceWidget todayRecord={todayRecord} user={user} />

            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="font-bold flex items-center mb-6">
                <TrendingUp size={18} className="mr-2 text-foreground shrink-0" />
                {viewTab === 'team' ? 'Filtered Summary' : 'This Month Summary'}
              </h3>
              <div className="space-y-4 tabular-nums">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Present Days / Logs</span>
                  <span className="font-bold text-foreground">{summary.present} Records</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Hours</span>
                  <span className="font-bold text-foreground">{summary.totalHours} hrs</span>
                </div>
                {summary.leave > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Leaves</span>
                    <span className="font-bold text-foreground">{summary.leave} Days</span>
                  </div>
                )}
                {summary.wfh > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Work From Home</span>
                    <span className="font-bold text-foreground">{summary.wfh} Days</span>
                  </div>
                )}
                {viewTab === 'personal' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">EOD Submitted</span>
                    <span className={`font-bold ${eodSubmitted ? 'text-foreground' : 'text-muted-foreground'}`}>
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
              <div className="p-6 border-b border-border bg-secondary/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-bold flex items-center">
                    <History size={18} className="mr-2 text-foreground shrink-0" />
                    {viewTab === 'team' ? 'Employee Shift & Attendance Records' : 'Shift History'}
                    <span className="ml-2 text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full tabular-nums">
                      {records.length} records
                    </span>
                  </h3>

                  {isAdmin && (
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary hover:bg-muted border border-border px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      Export CSV Report
                    </button>
                  )}

                  {!isAdmin && (
                    <div className="flex items-center space-x-2">
                      <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold uppercase tracking-widest tabular-nums">
                        {monthName} {selectedYear}
                      </span>
                      <button onClick={handleNextMonth} className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Status Filter Pills - also for personal view */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: `Pending (${pendingApprovals.length})` },
                    { value: 'present', label: 'Present' },
                    { value: 'holiday', label: 'Holidays' },
                    { value: 'leave', label: 'Leaves' },
                    { value: 'work_from_home', label: 'WFH' },
                    { value: 'absent', label: 'Absent' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedStatus(value)}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer tabular-nums ${
                        selectedStatus === value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-secondary/30 border-border text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="responsive-table-container overflow-y-auto max-h-[calc(100vh-350px)]">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-muted-foreground font-medium">
                    <tr>
                      {showEmployeeColumn && (
                        <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Employee</th>
                      )}
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">In / Out Timings</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 text-right">Total Time</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">EOD Report</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((record) => {
                      const isLeaveRecord = record.status === 'leave' || record.requestedStatus === 'leave';
                      const isApprovedLeave = isLeaveRecord && (record.approvalStatus === 'approved' || (record.status === 'leave' && !record.approvalStatus));
                      const isWFHRecord = record.status === 'work_from_home' || record.requestedStatus === 'work_from_home';
                      const isApprovedWFH = isWFHRecord && (record.approvalStatus === 'approved' || (record.status === 'work_from_home' && !record.approvalStatus));

                      return (
                        <tr
                          key={record._id}
                          onClick={() => setSelectedRecord(record)}
                          className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          {/* Employee Details Column for Managers / Admins */}
                          {showEmployeeColumn && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs uppercase overflow-hidden border border-border">
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
                                  <div className="text-[10px] text-muted-foreground font-semibold truncate max-w-[150px]">
                                    {record.user?.department || record.user?.position || record.user?.role || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}

                          <td className="px-6 py-4 tabular-nums">
                            <div className="font-bold">
                              {new Date(record.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase">
                              {new Date(record.date).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Explicit 12-Hour AM/PM Format for Clock In and Out + All Sessions Logs */}
                          <td className="px-6 py-4 tabular-nums">
                            {record.sessions && record.sessions.length > 1 ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-2 text-xs">
                                  <span className="text-foreground font-bold">
                                    {formatTime(record.clockIn)}
                                  </span>
                                  <span className="text-muted-foreground">to</span>
                                  <span className="text-muted-foreground font-bold">
                                    {formatTime(record.clockOut)}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border">
                                    {record.sessions.length} sessions
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground bg-secondary/30 p-2 rounded-xl border border-border/60 max-w-[260px]">
                                  {record.sessions.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-foreground/80">#{idx + 1}: {formatTime(s.clockIn)}</span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="font-semibold text-foreground/80">{s.clockOut ? formatTime(s.clockOut) : 'Active'}</span>
                                      <span className="text-foreground font-bold">({s.durationHours ? s.durationHours.toFixed(1) : 0}h)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-foreground font-bold">
                                  {formatTime(record.clockIn)}
                                </span>
                                <span className="text-muted-foreground">to</span>
                                <span className="text-muted-foreground font-bold">
                                  {formatTime(record.clockOut)}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold text-right tabular-nums">{record.totalHours?.toFixed(1) || '0.0'} hrs</td>

                          <td className="px-6 py-4">
                            {record.status === 'holiday' ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  record.eodReport?.submittedAt
                                    ? 'bg-primary text-primary-foreground border border-primary'
                                    : 'bg-secondary text-muted-foreground border border-border'
                                }`}
                              >
                                {record.eodReport?.submittedAt ? 'Submitted' : 'Pending'}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {record.approvalStatus === 'pending' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground border border-border flex items-center gap-1">
                                  <AlertCircle size={11} className="shrink-0" />
                                  Pending Approval: {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                                </span>
                              ) : isApprovedLeave ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground border border-primary flex items-center gap-1">
                                  <CheckCircle2 size={11} className="shrink-0" />
                                  Leave Approved
                                </span>
                              ) : isApprovedWFH ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground border border-primary flex items-center gap-1">
                                  <CheckCircle2 size={11} className="shrink-0" />
                                  WFH Approved
                                </span>
                              ) : record.approvalStatus === 'rejected' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-muted text-muted-foreground border border-border flex items-center gap-1">
                                  <XCircle size={11} className="shrink-0" />
                                  Rejected: {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                                </span>
                              ) : (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                                    statusColors[record.status] || 'bg-secondary text-muted-foreground border border-border'
                                  }`}
                                >
                                  {record.status?.replace(/_/g, ' ')}
                                  {(record.notes || record.approvedBy) && <Info size={11} className="ml-0.5 opacity-80 shrink-0" />}
                                </span>
                              )}

                              {record.appliedAt && (
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 tabular-nums">
                                  <Clock size={10} className="shrink-0" />
                                  Applied: {new Date(record.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {formatTime(record.appliedAt)}
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
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                                  >
                                    <CheckCircle2 size={12} /> Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt('Rejection reason (optional):');
                                      approveAttendanceMutation.mutate({ id: record._id, action: 'reject', rejectionReason: reason || '' });
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-foreground border border-border font-bold text-[10px] hover:bg-muted transition-all shadow-xs cursor-pointer"
                                  >
                                    <XCircle size={12} /> Reject
                                  </button>
                                </div>
                              )}

                              {record.approvedBy && (record.approvalStatus === 'approved' || isApprovedLeave) && (
                                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <UserCheck size={10} className="shrink-0" />
                                  Approved by: {record.approvedBy.name || 'Admin'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

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
              <div className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-sm flex items-center justify-between mt-6 border border-border">
                <div>
                  <h3 className="text-xl font-bold">Daily Closeout</h3>
                  <p className="text-primary-foreground/80 text-sm mt-1 max-w-[420px]">
                    Submit your EOD report after logging work so managers can review progress and blockers.
                  </p>
                  <button
                    onClick={() => setShowEOD(true)}
                    className="mt-4 px-6 py-2.5 bg-background text-foreground border border-border font-bold rounded-xl text-sm shadow-sm hover:bg-secondary transition-all cursor-pointer"
                  >
                    {eodSubmitted ? 'Review Report' : 'Submit Report'}
                  </button>
                </div>
                <Calendar size={80} className="opacity-20 hidden md:block shrink-0" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* EOD Report Modal */}
      <EODReportModal open={showEOD} onOpenChange={setShowEOD} report={todayRecord?.eodReport} />

      {/* EOD Detail Modal for viewing full team EOD submission */}
      <EODDetailModal
        open={Boolean(selectedEodDetail)}
        onOpenChange={(open) => { if (!open) setSelectedEodDetail(null); }}
        record={selectedEodDetail}
      />

      {/* Assign Holiday Modal */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]"
        >
          {/* Pinned Header */}
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b border-border bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground border border-border shadow-xs shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  Assign Company Holiday
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Record an official agency holiday across all employee attendance calendars.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleAssignHoliday} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Select Holiday Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Reason / Description <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christmas, Independence Day, Diwali"
                  value={holidayForm.notes}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignHolidayMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {assignHolidayMutation.isPending ? 'Assigning...' : 'Assign Holiday'}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign / Apply Leave Modal */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]"
        >
          {/* Pinned Header */}
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b border-border bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground border border-border shadow-xs shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  {isAdmin ? 'Assign Employee Leave / Apply Leave' : 'Apply for Leave'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  {isAdmin
                    ? 'Record an approved leave on behalf of a team member, or submit your own leave request.'
                    : 'Submit a formal leave application to Super Admin & Admin for review and approval.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleAssignLeave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              {isAdmin && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Select Employee (Optional / Self)
                  </label>
                  <select
                    value={leaveForm.userId}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, userId: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
                  >
                    <option value="">Myself ({user?.name || user?.email})</option>
                    {users
                      .filter((u) => ['employee', 'manager', 'admin', 'superAdmin', 'organizationOwner', 'accountManager'].includes(u.role))
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.email} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Leave Start Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={leaveForm.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setLeaveForm((prev) => ({
                      ...prev,
                      startDate: newStart,
                      endDate: prev.endDate < newStart ? newStart : prev.endDate,
                    }));
                  }}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Leave End Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={leaveForm.startDate}
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Reason / Description <span className="text-foreground">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the reason for leave (e.g. Medical emergency, Family function, Casual leave)..."
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none shadow-2xs"
                />
              </div>

              {!isAdmin && (
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border text-xs text-muted-foreground flex items-center gap-2.5">
                  <Info size={16} className="text-foreground shrink-0" />
                  <span>Your application will be sent to Super Admin and Admin. Once approved, the status will show <strong>Leave Approved</strong>.</span>
                </div>
              )}
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Send size={15} />
                  {submitLeaveMutation.isPending
                    ? 'Submitting...'
                    : isAdmin && leaveForm.userId && leaveForm.userId !== user?._id
                    ? 'Assign Leave'
                    : 'Submit Leave Application'}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inform WFH Modal */}
      <Dialog open={showWFHModal} onOpenChange={setShowWFHModal}>
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]"
        >
          {/* Pinned Header */}
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b border-border bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground border border-border shadow-xs shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  Inform Work From Home (WFH)
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Submit in advance when working remotely.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleInformWFH} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Select WFH Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={wfhForm.date || todayStr}
                  onChange={(e) => setWfhForm((prev) => ({ ...prev, date: e.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                />
                <span className="text-xs text-muted-foreground mt-1.5 block">Defaults to today. You may change the date to submit a future WFH request.</span>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Reason / Details <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote work, commute issue"
                  value={wfhForm.notes}
                  onChange={(e) => setWfhForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowWFHModal(false)}
                  className="h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitWFHMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitWFHMutation.isPending ? 'Submitting...' : 'Submit WFH Notice'}
                </button>
              </div>
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold text-foreground text-xs uppercase overflow-hidden border border-border">
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

              {selectedRecord.appliedAt && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/25 border border-border tabular-nums">
                  <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock size={13} className="text-foreground shrink-0" /> Applied Date &amp; Time
                  </span>
                  <span className="font-bold text-foreground">
                    {new Date(selectedRecord.appliedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime(selectedRecord.appliedAt)}
                  </span>
                </div>
              )}

              {/* Reason / Notes */}
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Reason / Description</div>
                <div className="font-medium text-foreground">
                  {selectedRecord.notes || 'No notes or reason provided.'}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock In</div>
                  <div className="text-xs font-bold text-foreground mt-1">
                    {formatTime(selectedRecord.clockIn)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Clock Out</div>
                  <div className="text-xs font-bold text-muted-foreground mt-1">
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

              {/* All Login & Logout Timings Breakdown */}
              {selectedRecord.sessions && selectedRecord.sessions.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-secondary/20 border border-border tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock size={13} className="text-foreground shrink-0" />
                      All Login &amp; Logout Timings ({selectedRecord.sessions.length} Sessions)
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      Total: {Number(selectedRecord.totalHours || 0).toFixed(2)} hrs
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedRecord.sessions.map((session, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2.5 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-secondary border border-border text-foreground font-bold text-[10px] flex items-center justify-center">
                            #{sIdx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-foreground">
                              In: {formatTime(session.clockIn)}
                            </span>
                            <span className="mx-1.5 text-muted-foreground">•</span>
                            <span className="font-bold text-muted-foreground">
                              Out: {session.clockOut ? formatTime(session.clockOut) : 'Currently Active'}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-foreground bg-secondary/60 px-2 py-0.5 rounded-md text-[11px]">
                          {session.durationHours ? `${session.durationHours.toFixed(2)} hrs` : session.clockOut ? '0.00 hrs' : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EOD Report if exists */}
              {selectedRecord.eodReport?.submittedAt && (
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border space-y-1">
                  <div className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
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
                  className="w-full py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground font-semibold text-xs hover:bg-secondary transition-all cursor-pointer"
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
