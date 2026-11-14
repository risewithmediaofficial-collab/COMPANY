import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Info,
  MapPin,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  User,
  Clock,
  Briefcase,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  BellRing,
  MoreVertical,
  Plus,
  X,
} from '@/components/ui/muiIcons';
import api from '../../api';
import { getAssetUrl } from '../../utils/assetUrl';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { EODReportModal } from '../../components/modals/EODReportModal';
import { EODDetailModal } from '../../components/modals/EODDetailModal';
import { AttendanceWidget } from '../../components/attendance/AttendanceWidget';
import {
  useAttendance,
  useTeamTodayAttendance,
  useAssignHoliday,
  useSubmitLeave,
  useSubmitWFH,
  useApproveAttendanceRequest,
} from '../../hooks/useAttendance';
import { useEodReports } from '../../hooks/useEodReports';
import { useUsers } from '../../hooks/useUsers';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../../components/ui/dialog';

const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getInitials = (name, email) => {
  const source = (name || email || 'E').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const Attendance = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin =
    ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(user?.role) ||
    Boolean(user?.permissions?.canManageHR || user?.permissions?.canManageEmployees);
  const isSuperAdmin = user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'organizationOwner';

  const currentDate = new Date();
  const approveAttendanceMutation = useApproveAttendanceRequest();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // View state
  const [viewTab, setViewTab] = useState(isAdmin ? 'team' : 'personal');
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
  const [showLiveRoster, setShowLiveRoster] = useState(true);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef(null);

  const [selectedEodDetail, setSelectedEodDetail] = useState(null);
  const [showEOD, setShowEOD] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [rejectModalState, setRejectModalState] = useState({ open: false, id: null, reason: '' });

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

  // Close actions menu on click outside or Escape
  useEffect(() => {
    if (!actionsMenuOpen) return undefined;
    const handleOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [actionsMenuOpen]);

  const handleTriggerAttendanceReminder = async () => {
    setActionsMenuOpen(false);
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
    setActionsMenuOpen(false);
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
    setActionsMenuOpen(false);
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

  const attendanceMonthRange = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return {
      startDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
      endDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }, [selectedYear, selectedMonth]);

  const { data: eodData, isLoading: isEodLoading } = useEodReports(
    'all',
    { startDate: attendanceMonthRange.startDate, endDate: attendanceMonthRange.endDate },
    { enabled: isAdmin }
  );

  const assignHolidayMutation = useAssignHoliday();
  const submitLeaveMutation = useSubmitLeave();
  const submitWFHMutation = useSubmitWFH();

  const assignableUsers = useMemo(
    () =>
      users.filter((u) =>
        ['employee', 'manager', 'accountManager'].includes(u.role)
      ),
    [users]
  );

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

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectModalState.id) return;
    approveAttendanceMutation.mutate(
      {
        id: rejectModalState.id,
        action: 'reject',
        rejectionReason: rejectModalState.reason.trim(),
      },
      {
        onSettled: () => setRejectModalState({ open: false, id: null, reason: '' }),
      }
    );
  };

  const statusStyles = {
    present: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    absent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    half_day: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    leave: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    holiday: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    work_from_home: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
  };

  const rawRecords = useMemo(() => {
    return (data?.records || []).filter(
      (r) => !['superAdmin', 'organizationOwner', 'admin'].includes(r.user?.role)
    );
  }, [data?.records]);

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

  const summary = data?.summary || {
    present: 0,
    totalHours: '0.00',
    leave: 0,
    absent: 0,
    wfh: 0,
    holiday: 0,
  };

  const todayRecord = useMemo(() => {
    const isSameCalendarDay = (d1, d2) => {
      if (!d1 || !d2) return false;
      const a = new Date(d1);
      const b = new Date(d2);
      if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
      return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      );
    };

    const currentUserId = user?._id?.toString();
    const now = new Date();

    return rawRecords.find((record) => {
      const recordUserId = (record.user?._id || record.user)?.toString();
      const matchesUser = !currentUserId || !recordUserId || recordUserId === currentUserId;
      const isToday =
        (record.date && isSameCalendarDay(record.date, now)) ||
        (record.clockIn && isSameCalendarDay(record.clockIn, now)) ||
        (record.sessions && record.sessions.some((s) => s.clockIn && isSameCalendarDay(s.clockIn, now)));
      return matchesUser && isToday;
    });
  }, [rawRecords, user?._id]);

  const eodSubmitted = Boolean(todayRecord?.eodReport?.submittedAt);

  const todayTeamActivity = useMemo(() => {
    const employeeUsers = users.filter((u) => u.role !== 'client' && u.role !== 'referral');

    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 330 * 60000);
    const istDay = istTime.getDay();
    const isPast1030 =
      istDay !== 0 && (istTime.getHours() > 10 || (istTime.getHours() === 10 && istTime.getMinutes() >= 30));

    return employeeUsers.map((emp) => {
      const att = teamTodayRecords.find((r) => (r.user?._id || r.user) === emp._id);

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
        hasClockIn,
        clockIn: att?.clockIn ? formatTime(att.clockIn) : null,
        clockOut: att?.clockOut ? formatTime(att.clockOut) : null,
        totalHours: att?.totalHours || 0,
        eodSubmitted: Boolean(att?.eodReport?.submittedAt),
        isPending,
        appliedAt: att?.appliedAt,
      };
    });
  }, [users, teamTodayRecords]);

  const teamMetrics = useMemo(() => {
    const employeeUsers = users.filter((u) => u.role !== 'client' && u.role !== 'referral');
    const totalEmployees = employeeUsers.length;
    const clockedIn = todayTeamActivity.filter((item) => item.status === 'present').length;
    const completed = todayTeamActivity.filter((item) => item.status === 'completed').length;
    const onLeave = todayTeamActivity.filter(
      (item) => item.status === 'leave' || item.status === 'pending_leave'
    ).length;
    const wfh = todayTeamActivity.filter(
      (item) => item.status === 'work_from_home' || item.status === 'pending_wfh'
    ).length;
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
    const avgDailyHours = present + wfh > 0 ? (totalHours / (present + wfh)).toFixed(1) : '0.0';
    const eodSubmittedCount = empRecords.filter((r) => r.eodReport?.submittedAt).length;

    const workedTasks = [];
    empRecords.forEach((r) => {
      if (r.eodReport) {
        if (Array.isArray(r.eodReport.tasksCompleted) && r.eodReport.tasksCompleted.length > 0) {
          r.eodReport.tasksCompleted.forEach((taskItem) => {
            workedTasks.push({
              date: r.date,
              workTitle:
                typeof taskItem === 'string' ? taskItem : taskItem.title || taskItem.taskTitle || 'Completed task',
              hours: taskItem.hours || r.totalHours || 0,
              notes: r.notes || r.eodReport.summary || '',
            });
          });
        } else if (r.eodReport.summary) {
          workedTasks.push({
            date: r.date,
            workTitle: r.eodReport.summary,
            hours: r.totalHours || 0,
            notes: r.notes || '',
          });
        }
      }
    });

    const totalLoggedDays = present + wfh + leave + absent;
    const attendanceRate =
      totalLoggedDays > 0 ? (((present + wfh) / totalLoggedDays) * 100).toFixed(0) : '100';

    return {
      present,
      leave,
      absent,
      wfh,
      totalHours: totalHours.toFixed(1),
      avgDailyHours,
      eodSubmittedCount,
      attendanceRate,
      workedTasks,
    };
  }, [selectedEmployeeInfo, rawRecords]);

  const filteredEodReports = useMemo(() => {
    return (eodData?.records || []).filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (d.getFullYear() !== selectedYear || d.getMonth() + 1 !== selectedMonth) return false;
      if (selectedUser !== 'all' && (r.user?._id || r.user) !== selectedUser) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = r.user?.name?.toLowerCase() || '';
      const email = r.user?.email?.toLowerCase() || '';
      const dept = r.user?.department?.toLowerCase() || '';
      const summaryText = r.eodReport?.summary?.toLowerCase() || '';
      const blockers = r.eodReport?.blockers?.toLowerCase() || '';
      const tasksMatch = r.eodReport?.tasksCompleted?.some((t) =>
        (typeof t === 'string' ? t : t.title || t.taskTitle || '').toLowerCase().includes(q)
      );
      return (
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        summaryText.includes(q) ||
        blockers.includes(q) ||
        tasksMatch
      );
    });
  }, [eodData?.records, selectedYear, selectedMonth, selectedUser, searchQuery]);

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
  const showEmployeeColumn = selectedUser === 'all';

  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      toast.error('No attendance records available for export in the selected filters');
      return;
    }

    const csvRows = [];
    csvRows.push(`"EMPLOYEE ATTENDANCE & PERFORMANCE SUMMARY REPORT"`);
    csvRows.push(`"Report Month: ${monthName} ${selectedYear}"`);
    csvRows.push(`"Generated On: ${new Date().toLocaleString()}"`);
    csvRows.push(`""`);
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
      const avgHours = emp.present + emp.wfh > 0 ? (emp.totalHours / (emp.present + emp.wfh)).toFixed(2) : '0.00';
      const attRate = workingDaysLogged > 0 ? (((emp.present + emp.wfh) / workingDaysLogged) * 100).toFixed(1) : '0.0';
      csvRows.push(
        [
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
        ].join(',')
      );
    });

    csvRows.push(`""`);
    csvRows.push(`""`);
    csvRows.push(`"SECTION 2: DETAILED DAILY ATTENDANCE LOGS"`);
    csvRows.push(
      [
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
      ].join(',')
    );

    records.forEach((record) => {
      const dateObj = new Date(record.date);
      let sessionsDetail = '"--"';
      if (record.sessions && record.sessions.length > 0) {
        sessionsDetail = `"${record.sessions
          .map(
            (s, idx) =>
              `#${idx + 1}: In ${formatTime(s.clockIn)} - Out ${s.clockOut ? formatTime(s.clockOut) : 'Active'} (${
                s.durationHours ? s.durationHours.toFixed(2) : 0
              }h)`
          )
          .join('; ')}"`;
      } else if (record.clockIn) {
        sessionsDetail = `"In ${formatTime(record.clockIn)} - Out ${formatTime(record.clockOut)}"`;
      }

      csvRows.push(
        [
          `"${(record.user?.name || record.user?.email || 'Unknown Employee').replace(/"/g, '""')}"`,
          `"${(record.user?.email || '').replace(/"/g, '""')}"`,
          `"${(record.user?.department || '').replace(/"/g, '""')}"`,
          `"${(record.user?.position || '').replace(/"/g, '""')}"`,
          `"${(record.user?.role || '').replace(/"/g, '""')}"`,
          record.date ? dateObj.toISOString().split('T')[0] : '',
          dateObj.toLocaleDateString([], { weekday: 'short' }),
          record.clockIn ? `"${formatTime(record.clockIn)}"` : '"--:--"',
          record.clockOut ? `"${formatTime(record.clockOut)}"` : '"--:--"',
          sessionsDetail,
          record.totalHours ? record.totalHours.toFixed(2) : '0.00',
          `"${(record.status || '').replace(/_/g, ' ').toUpperCase()}"`,
          record.eodReport?.submittedAt ? '"Submitted"' : '"Pending"',
          `"${(record.notes || '').replace(/"/g, '""')}"`,
          `"${(record.approvedBy?.name || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_Summary_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported Monthly Summary & Logs for ${monthName} ${selectedYear}`);
  };

  const statusCounts = useMemo(() => {
    const counts = {
      all: rawRecords.length,
      pending: pendingApprovals.length,
      present: 0,
      holiday: 0,
      leave: 0,
      work_from_home: 0,
      absent: 0,
    };
    rawRecords.forEach((r) => {
      if (r.status === 'present') counts.present += 1;
      else if (r.status === 'holiday') counts.holiday += 1;
      else if (r.status === 'leave') counts.leave += 1;
      else if (r.status === 'work_from_home') counts.work_from_home += 1;
      else if (r.status === 'absent') counts.absent += 1;
    });
    return counts;
  }, [rawRecords, pendingApprovals.length]);

  const statusFilters = useMemo(
    () => [
      { value: 'all', label: 'All', count: statusCounts.all },
      { value: 'pending', label: 'Pending', count: statusCounts.pending },
      { value: 'present', label: 'Present', count: statusCounts.present },
      { value: 'holiday', label: 'Holidays', count: statusCounts.holiday },
      { value: 'leave', label: 'Leave', count: statusCounts.leave },
      { value: 'work_from_home', label: 'WFH', count: statusCounts.work_from_home },
      { value: 'absent', label: 'Absent', count: statusCounts.absent },
    ],
    [statusCounts]
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-14 w-64 bg-card rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-card rounded-3xl" />
      </div>
    );
  }

  const getRosterStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return { label: 'Active Now', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' };
      case 'completed':
        return { label: 'Completed', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30' };
      case 'pending_leave':
        return { label: 'Leave Pending', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' };
      case 'pending_wfh':
        return { label: 'WFH Pending', cls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' };
      case 'work_from_home':
        return { label: 'WFH', cls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' };
      case 'leave':
        return { label: 'On Leave', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' };
      case 'holiday':
        return { label: 'Holiday', cls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' };
      case 'absent':
        return { label: 'Absent', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' };
      default:
        return { label: 'Not Clocked In', cls: 'bg-secondary text-muted-foreground border border-border' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">Attendance &amp; EOD</h1>
          {isAdmin && pendingApprovals.length > 0 && (
            <button
              type="button"
              onClick={() => {
                hasUserChangedTab.current = true;
                setViewTab('team');
                setSelectedStatus('pending');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold hover:bg-muted transition-colors shrink-0 cursor-pointer tabular-nums"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              {pendingApprovals.length} pending
            </button>
          )}
        </div>

        {/* Clean Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowWFHModal(true)}
              className="h-10 px-4 rounded-xl bg-card hover:bg-secondary/60 text-foreground text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <MapPin size={16} className="text-muted-foreground shrink-0" />
              Inform WFH
            </button>
          )}

          {!isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowEOD(true)}
              disabled={!todayRecord?.clockIn}
              className="h-10 px-4 rounded-xl bg-card hover:bg-secondary/60 text-foreground text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-45 cursor-pointer"
            >
              <FileText size={16} className="text-muted-foreground shrink-0" />
              {eodSubmitted ? 'Update EOD' : 'Submit EOD'}
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-10 px-4 rounded-xl bg-card hover:bg-secondary/60 text-foreground text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              title="Download monthly attendance CSV report"
            >
              <FileSpreadsheet size={16} className="text-muted-foreground shrink-0" />
              Export CSV
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={16} className="shrink-0" />
            {isAdmin ? 'Assign Leave' : 'Apply Leave'}
          </button>

          {/* Consolidated Admin Operations Menu */}
          {isAdmin && (
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                disabled={reminding}
                aria-expanded={actionsMenuOpen}
                className="h-10 px-3.5 rounded-xl bg-card hover:bg-secondary/60 text-foreground text-sm font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <MoreVertical size={16} className="text-muted-foreground shrink-0" />
                <span className="hidden sm:inline">More</span>
                <ChevronDown
                  size={15}
                  className={`text-muted-foreground transition-transform ${actionsMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {actionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card p-1.5 shadow-xl z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setShowHolidayModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <Calendar size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Assign Holiday</div>
                      <div className="text-xs text-muted-foreground">Mark company-wide day off</div>
                    </div>
                  </button>

                  <div className="my-1 px-3 pt-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Reminders &amp; Cutoffs</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerAttendanceReminder}
                    disabled={reminding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Clock size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Morning Reminder</div>
                      <div className="text-xs text-muted-foreground">Ping unclocked staff (10:30 AM)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerAutoAbsent}
                    disabled={reminding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <AlertCircle size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Run Auto-Absent</div>
                      <div className="text-xs text-muted-foreground">Process 10:30 AM cutoff check</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerEveningReminder}
                    disabled={reminding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <BellRing size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Evening EOD Reminder</div>
                      <div className="text-xs text-muted-foreground">Prompt clock-out &amp; EOD closeout</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin View Switcher */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1.5 bg-secondary/40 p-1.5 rounded-2xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => {
                hasUserChangedTab.current = true;
                setViewTab('team');
                setSelectedUser('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                viewTab === 'team' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={16} className="shrink-0" />
              Team Attendance
            </button>

            <button
              type="button"
              onClick={() => {
                hasUserChangedTab.current = true;
                setViewTab('eod');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                viewTab === 'eod' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText size={16} className="shrink-0" />
              EOD Reports
              {eodData?.records?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-foreground tabular-nums">
                  {eodData.records.length}
                </span>
              )}
            </button>

            {!isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  hasUserChangedTab.current = true;
                  setViewTab('personal');
                  setSelectedUser(user?._id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  viewTab === 'personal' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User size={16} className="shrink-0" />
                My Attendance
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 1: TEAM ATTENDANCE (ADMIN / MANAGER) ================= */}
      {isAdmin && viewTab === 'team' && (
        <div className="space-y-6">
          {/* Today's Clean KPI Snapshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Active Now</div>
                <div className="text-3xl font-bold text-foreground mt-1 tracking-tight">{teamMetrics.clockedIn}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Completed Shift</div>
                <div className="text-3xl font-bold text-foreground mt-1 tracking-tight">{teamMetrics.completed}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Leave &amp; WFH</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-foreground tracking-tight">
                    {teamMetrics.onLeave + teamMetrics.wfh}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {teamMetrics.onLeave} Leave · {teamMetrics.wfh} WFH
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                <Briefcase size={18} />
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Absent Today</div>
                <div className="text-3xl font-bold text-foreground mt-1 tracking-tight">{teamMetrics.absent}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                <XCircle size={18} />
              </div>
            </div>
          </div>

          {/* Pending Approvals Action Queue (Only shown when items exist) */}
          {pendingApprovals.length > 0 && (
            <div className="bg-secondary/40 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-foreground font-bold text-base tabular-nums">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>Pending Approvals ({pendingApprovals.length})</span>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card text-muted-foreground">
                  Needs Review
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {pendingApprovals.map((req) => {
                  const reqDateStr = new Date(req.date).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const isWFH = req.requestedStatus === 'work_from_home' || req.status === 'work_from_home';
                  return (
                    <div key={req._id} className="bg-card p-4 rounded-2xl flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs overflow-hidden">
                            {req.user?.avatar ? (
                              <img src={getAssetUrl(req.user.avatar)} alt={req.user.name} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(req.user?.name, req.user?.email)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate">
                              {req.user?.name || req.user?.email || 'Employee'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {req.user?.department || req.user?.position || req.user?.role || ''}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 bg-secondary text-foreground">
                          {isWFH ? 'WFH' : 'Leave'}
                        </span>
                      </div>

                      <div className="text-xs bg-secondary/35 p-3 rounded-xl text-foreground/90 space-y-1 tabular-nums">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground shrink-0" />
                          {reqDateStr}
                        </div>
                        {req.notes && (
                          <div className="text-muted-foreground line-clamp-2">&ldquo;{req.notes}&rdquo;</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => approveAttendanceMutation.mutate({ id: req._id, action: 'approve' })}
                          disabled={approveAttendanceMutation.isPending}
                          className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectModalState({ open: true, id: req._id, reason: '' })}
                          disabled={approveAttendanceMutation.isPending}
                          className="flex-1 h-9 rounded-xl bg-secondary hover:bg-muted text-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

          {/* Today's Live Team Activity (Clean & Collapsible) */}
          <div className="bg-card rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Users size={18} className="text-muted-foreground shrink-0" />
                <h2 className="font-bold text-base text-foreground truncate">Today&apos;s Team Status</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold tabular-nums shrink-0">
                  {todayTeamActivity.length}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline text-xs font-medium text-muted-foreground tabular-nums">
                  {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLiveRoster((prev) => !prev)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  {showLiveRoster ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {showLiveRoster && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayTeamActivity.map((item) => {
                  const badge = getRosterStatusBadge(item.status);
                  const isSelected = selectedUser === item.user._id;
                  return (
                    <div
                      key={item.user._id}
                      onClick={() => setSelectedUser(isSelected ? 'all' : item.user._id)}
                      className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-secondary/75 ring-2 ring-primary/20'
                          : item.status === 'present'
                          ? 'bg-secondary/45 hover:bg-secondary/65'
                          : 'bg-secondary/20 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs overflow-hidden">
                          {item.user.avatar ? (
                            <img src={getAssetUrl(item.user.avatar)} alt={item.user.name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(item.user.name, item.user.email)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">
                            {item.user.name || item.user.email || 'Employee'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.hasClockIn ? (
                              <span className="tabular-nums text-foreground/80 font-medium">
                                {item.clockIn} – {item.clockOut || 'Active'}
                              </span>
                            ) : (
                              item.user.department || item.user.position || item.user.role
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>

                        {item.totalHours > 0 && (
                          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {item.totalHours.toFixed(1)} hrs
                          </span>
                        )}

                        {isAdmin && item.isPending && item.attendance?._id && (
                          <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => approveAttendanceMutation.mutate({ id: item.attendance._id, action: 'approve' })}
                              className="px-2 py-0.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectModalState({ open: true, id: item.attendance._id, reason: '' })}
                              className="px-2 py-0.5 rounded-md bg-secondary hover:bg-muted text-foreground text-[11px] font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Employee Drill-Down Overview */}
          {selectedEmployeeInfo && selectedUserStats && (
            <div className="bg-card p-6 rounded-3xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-foreground text-sm overflow-hidden">
                    {selectedEmployeeInfo.avatar ? (
                      <img
                        src={getAssetUrl(selectedEmployeeInfo.avatar)}
                        alt={selectedEmployeeInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedEmployeeInfo.name, selectedEmployeeInfo.email)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground truncate">
                        {selectedEmployeeInfo.name || selectedEmployeeInfo.email}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                        {selectedEmployeeInfo.department || selectedEmployeeInfo.position || selectedEmployeeInfo.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {selectedEmployeeInfo.email} · {monthName} {selectedYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="px-3.5 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-bold tabular-nums">
                    {selectedUserStats.attendanceRate}% Attendance
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser('all')}
                    className="text-xs font-semibold text-foreground bg-secondary/60 hover:bg-secondary px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 tabular-nums">
                <div className="p-4 rounded-2xl bg-background">
                  <span className="text-xs font-medium text-muted-foreground block">Present Days</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {selectedUserStats.present + selectedUserStats.wfh}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedUserStats.present} office · {selectedUserStats.wfh} WFH
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background">
                  <span className="text-xs font-medium text-muted-foreground block">Hours Worked</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">{selectedUserStats.totalHours}h</span>
                    <span className="text-xs text-muted-foreground">avg {selectedUserStats.avgDailyHours}h/day</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background">
                  <span className="text-xs font-medium text-muted-foreground block">Leaves &amp; Absences</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {selectedUserStats.leave + selectedUserStats.absent}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedUserStats.leave} leave · {selectedUserStats.absent} absent
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background">
                  <span className="text-xs font-medium text-muted-foreground block">EOD Submissions</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">{selectedUserStats.eodSubmittedCount}</span>
                    <span className="text-xs text-muted-foreground">reports</span>
                  </div>
                </div>
              </div>

              {selectedUserStats.workedTasks.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 tabular-nums">
                    <Briefcase size={14} className="shrink-0" />
                    Logged Work &amp; EOD Tasks ({selectedUserStats.workedTasks.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {selectedUserStats.workedTasks.map((work, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-semibold text-foreground truncate">{work.workTitle}</div>
                          {work.notes && <div className="text-muted-foreground truncate">{work.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className="px-2 py-0.5 rounded-lg bg-secondary text-foreground font-semibold">
                            {new Date(work.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground font-semibold">
                            {work.hours}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unified Filter Toolbar + Full-Width Team Records Table */}
          <div className="bg-card rounded-3xl overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Header: Title and Month Stepper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex items-center gap-2.5">
                  <History size={18} className="text-muted-foreground shrink-0" />
                  <h2 className="font-bold text-base text-foreground">Attendance Logs</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-xs font-semibold tabular-nums">
                    {records.length}
                  </span>
                </div>

                {/* Month Navigation Stepper */}
                <div className="flex items-center gap-1 bg-background px-2 h-10 rounded-xl border border-border/50 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-foreground cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold min-w-[125px] text-center tabular-nums uppercase tracking-wide">
                    {monthName} {selectedYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-foreground cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Controls Row: Status Filter Pills on left, Search & Employee Select on right */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Single Status Filter Pills Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                {statusFilters.map(({ value, label, count }) => {
                  const active = selectedStatus === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedStatus(value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer tabular-nums inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      <span>{label}</span>
                      {typeof count === 'number' && count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            active ? 'bg-primary-foreground/20 text-inherit' : 'bg-card text-foreground'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search & Employee Select */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <SelectDropdown
                  value={selectedUser}
                  onChange={(val) => setSelectedUser(val || 'all')}
                  options={[
                    { value: 'all', label: `All Employees (${assignableUsers.length})` },
                    ...assignableUsers.map((u) => ({
                      value: u._id,
                      label: u.name || u.email,
                      subLabel: u.department ? `${u.department} · ${u.role}` : u.role,
                    })),
                  ]}
                  allowCustom={false}
                  allowDeselect={false}
                  placeholder="All Employees"
                  className="w-full sm:w-56"
                  buttonClassName="h-10 bg-background border border-border/50 text-xs sm:text-sm font-medium rounded-xl hover:bg-secondary/40"
                />

                <div className="relative w-full sm:w-56">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name, email, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full pl-9 pr-3.5 rounded-xl bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>

            {/* Table */}
            <div className="responsive-table-container overflow-y-auto max-h-[calc(100vh-300px)]">
              <table className="w-full min-w-[740px] text-left text-sm">
                <thead className="bg-secondary/20 text-muted-foreground text-xs font-semibold">
                  <tr>
                    {showEmployeeColumn && <th className="sticky top-0 z-10 bg-card px-6 py-3.5">Employee</th>}
                    <th className="sticky top-0 z-10 bg-card px-6 py-3.5">Date</th>
                    <th className="sticky top-0 z-10 bg-card px-6 py-3.5">Clock In / Out</th>
                    <th className="sticky top-0 z-10 bg-card px-6 py-3.5 text-right">Duration</th>
                    <th className="sticky top-0 z-10 bg-card px-6 py-3.5">EOD</th>
                    <th className="sticky top-0 z-10 bg-card px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.04]">
                  {records.map((record) => {
                    const isLeaveRecord = record.status === 'leave' || record.requestedStatus === 'leave';
                    const isApprovedLeave =
                      isLeaveRecord &&
                      (record.approvalStatus === 'approved' || (record.status === 'leave' && !record.approvalStatus));
                    const isWFHRecord =
                      record.status === 'work_from_home' || record.requestedStatus === 'work_from_home';
                    const isApprovedWFH =
                      isWFHRecord &&
                      (record.approvalStatus === 'approved' ||
                        (record.status === 'work_from_home' && !record.approvalStatus));

                    return (
                      <tr
                        key={record._id}
                        onClick={() => setSelectedRecord(record)}
                        className="hover:bg-secondary/25 transition-colors cursor-pointer"
                      >
                        {showEmployeeColumn && (
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs overflow-hidden">
                                {record.user?.avatar ? (
                                  <img
                                    src={getAssetUrl(record.user.avatar)}
                                    alt={record.user.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(record.user?.name, record.user?.email)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate max-w-[180px]">
                                  {record.user?.name || record.user?.email || 'Unknown Employee'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {record.user?.department || record.user?.position || record.user?.email || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        <td className="px-6 py-3.5 tabular-nums whitespace-nowrap">
                          <div className="font-semibold text-foreground">
                            {new Date(record.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(record.date).getFullYear()}
                          </div>
                        </td>

                        <td className="px-6 py-3.5 tabular-nums">
                          {record.clockIn || (record.sessions && record.sessions.length > 0) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-foreground">{formatTime(record.clockIn)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold text-muted-foreground">
                                  {record.clockOut ? formatTime(record.clockOut) : 'Active'}
                                </span>
                                {record.sessions && record.sessions.length > 1 && (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-foreground">
                                    {record.sessions.length} sessions
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-6 py-3.5 font-semibold text-right tabular-nums whitespace-nowrap">
                          {record.totalHours > 0 ? `${record.totalHours.toFixed(1)} hrs` : '—'}
                        </td>

                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {record.status === 'holiday' || record.status === 'leave' || record.status === 'absent' ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                record.eodReport?.submittedAt
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {record.eodReport?.submittedAt ? 'Submitted' : 'Pending'}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            {record.approvalStatus === 'pending' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                <AlertCircle size={12} className="shrink-0" />
                                Pending {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                              </span>
                            ) : isApprovedLeave ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 size={12} className="shrink-0" />
                                Leave Approved
                              </span>
                            ) : isApprovedWFH ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 size={12} className="shrink-0" />
                                WFH Approved
                              </span>
                            ) : record.approvalStatus === 'rejected' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                <XCircle size={12} className="shrink-0" />
                                Rejected
                              </span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize inline-flex items-center gap-1 ${
                                  statusStyles[record.status] || 'bg-secondary text-muted-foreground'
                                }`}
                              >
                                {record.status?.replace(/_/g, ' ')}
                                {(record.notes || record.approvedBy) && <Info size={12} className="opacity-75 shrink-0" />}
                              </span>
                            )}

                            {record.notes && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={record.notes}>
                                {record.notes}
                              </span>
                            )}

                            {isAdmin && record.approvalStatus === 'pending' && (
                              <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => approveAttendanceMutation.mutate({ id: record._id, action: 'approve' })}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectModalState({ open: true, id: record._id, reason: '' })}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {record.approvedBy && (record.approvalStatus === 'approved' || isApprovedLeave) && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <UserCheck size={11} className="shrink-0" />
                                {record.approvedBy.name || 'Admin'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {records.length === 0 && (
                    <tr>
                      <td colSpan={showEmployeeColumn ? 6 : 5} className="px-6 py-14 text-center text-muted-foreground">
                        No attendance records match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: EOD REPORTS (ADMIN / MANAGER) ================= */}
      {isAdmin && viewTab === 'eod' && (
        <div className="space-y-6">
          <div className="bg-card p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <SelectDropdown
                value={selectedUser}
                onChange={(val) => setSelectedUser(val || 'all')}
                options={[
                  { value: 'all', label: `All Team Members (${assignableUsers.length})` },
                  ...assignableUsers.map((u) => ({
                    value: u._id,
                    label: u.name || u.email,
                    subLabel: u.department ? `${u.department} · ${u.role}` : u.role,
                  })),
                ]}
                allowCustom={false}
                allowDeselect={false}
                placeholder="All Team Members"
                className="w-full sm:w-60"
                buttonClassName="h-10 bg-background border border-border/50 text-xs sm:text-sm font-medium rounded-xl hover:bg-secondary/40"
              />

              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search summary, tasks, blockers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full pl-9 pr-3.5 text-sm rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-3.5 py-2 rounded-xl tabular-nums">
              {filteredEodReports.length} EOD {filteredEodReports.length === 1 ? 'report' : 'reports'}
            </div>
          </div>

          {isEodLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-52 bg-card rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredEodReports.length === 0 ? (
            <div className="p-14 text-center bg-card rounded-3xl text-muted-foreground space-y-2">
              <FileText size={32} className="mx-auto opacity-40" />
              <h3 className="font-semibold text-foreground text-sm">No EOD Reports Found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEodReports.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedEodDetail(item)}
                  className="bg-card hover:bg-secondary/20 rounded-3xl transition-colors p-5 space-y-4 cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-foreground text-xs overflow-hidden">
                        {item.user?.avatar ? (
                          <img src={getAssetUrl(item.user.avatar)} alt={item.user.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(item.user?.name, item.user?.email)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">
                          {item.user?.name || item.user?.email || 'Employee'}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.user?.department || item.user?.position || item.user?.role || 'Team Member'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <span className="text-xs font-semibold text-foreground block">
                        {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.eodReport?.submittedAt ? formatTime(item.eodReport.submittedAt) : ''}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">
                    {item.eodReport?.summary || 'No summary provided.'}
                  </p>

                  {item.eodReport?.tasksCompleted?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.eodReport.tasksCompleted.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs bg-secondary/70 text-foreground px-2.5 py-1 rounded-lg max-w-[200px] truncate font-medium"
                        >
                          <CheckCircle2 size={11} className="shrink-0" />
                          <span className="truncate">{typeof t === 'string' ? t : t.title || t.taskTitle || 'Task'}</span>
                        </span>
                      ))}
                      {item.eodReport.tasksCompleted.length > 3 && (
                        <span className="text-xs font-semibold text-muted-foreground px-1.5 py-1 tabular-nums">
                          +{item.eodReport.tasksCompleted.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {item.eodReport?.blockers && (
                    <div className="p-3 rounded-xl bg-secondary/50 text-foreground text-xs space-y-0.5">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" /> Blocker
                      </div>
                      <p className="line-clamp-2 text-muted-foreground">{item.eodReport.blockers}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs tabular-nums">
                    <span className="text-muted-foreground font-medium">
                      Logged: <strong className="text-foreground">{item.totalHours?.toFixed(1) || '0.0'} hrs</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEodDetail(item);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline cursor-pointer"
                    >
                      <Eye size={13} /> View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 3: MY ATTENDANCE (PERSONAL / EMPLOYEE) ================= */}
      {(!isAdmin || viewTab === 'personal') && !isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Clock Widget + Monthly Summary */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <AttendanceWidget todayRecord={todayRecord} user={user} />

            <div className="bg-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-muted-foreground shrink-0" />
                  Month Summary
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">
                  {monthName} {selectedYear}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="p-3.5 rounded-2xl bg-background">
                  <span className="text-xs text-muted-foreground block">Present</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">{summary.present} days</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-background">
                  <span className="text-xs text-muted-foreground block">Total Hours</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">{summary.totalHours}h</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-background">
                  <span className="text-xs text-muted-foreground block">Leaves / WFH</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {summary.leave + summary.wfh} days
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-background">
                  <span className="text-xs text-muted-foreground block">Today EOD</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {eodSubmitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="bg-primary text-primary-foreground p-6 rounded-3xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold">End of Day Report</h3>
                  <button
                    type="button"
                    onClick={() => setShowEOD(true)}
                    disabled={!todayRecord?.clockIn}
                    className="mt-3 h-10 px-5 bg-background text-foreground font-semibold rounded-xl text-sm hover:bg-secondary disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {eodSubmitted ? 'Update EOD' : 'Submit EOD'}
                  </button>
                </div>
                <FileText size={40} className="opacity-25 shrink-0" />
              </div>
            )}
          </div>

          {/* Right Column: Personal Shift History */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-card rounded-3xl overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <History size={18} className="text-muted-foreground shrink-0" />
                    <h3 className="font-bold text-base text-foreground">Shift History</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold tabular-nums">
                      {records.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-background px-2 h-9 rounded-xl">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold min-w-[110px] text-center tabular-nums">
                      {monthName} {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {statusFilters.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedStatus(value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedStatus === value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="responsive-table-container overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="bg-secondary/20 text-muted-foreground text-xs font-semibold">
                    <tr>
                      <th className="sticky top-0 z-10 bg-card px-5 py-3.5">Date</th>
                      <th className="sticky top-0 z-10 bg-card px-5 py-3.5">Clock In / Out</th>
                      <th className="sticky top-0 z-10 bg-card px-5 py-3.5 text-right">Duration</th>
                      <th className="sticky top-0 z-10 bg-card px-5 py-3.5">EOD</th>
                      <th className="sticky top-0 z-10 bg-card px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.04]">
                    {records.map((record) => {
                      const isLeaveRecord = record.status === 'leave' || record.requestedStatus === 'leave';
                      const isApprovedLeave =
                        isLeaveRecord &&
                        (record.approvalStatus === 'approved' || (record.status === 'leave' && !record.approvalStatus));
                      const isWFHRecord =
                        record.status === 'work_from_home' || record.requestedStatus === 'work_from_home';
                      const isApprovedWFH =
                        isWFHRecord &&
                        (record.approvalStatus === 'approved' ||
                          (record.status === 'work_from_home' && !record.approvalStatus));

                      return (
                        <tr
                          key={record._id}
                          onClick={() => setSelectedRecord(record)}
                          className="hover:bg-secondary/25 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3.5 tabular-nums whitespace-nowrap">
                            <div className="font-semibold text-foreground">
                              {new Date(record.date).toLocaleDateString([], {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 tabular-nums text-xs">
                            {record.clockIn ? (
                              <span className="font-semibold text-foreground">
                                {formatTime(record.clockIn)} →{' '}
                                <span className="text-muted-foreground">
                                  {record.clockOut ? formatTime(record.clockOut) : 'Active'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-semibold text-right tabular-nums whitespace-nowrap">
                            {record.totalHours > 0 ? `${record.totalHours.toFixed(1)} hrs` : '—'}
                          </td>

                          <td className="px-5 py-3.5">
                            {record.status === 'holiday' || record.status === 'leave' || record.status === 'absent' ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  record.eodReport?.submittedAt
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {record.eodReport?.submittedAt ? 'Submitted' : 'Pending'}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            {record.approvalStatus === 'pending' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Pending {(record.requestedStatus || record.status).replace(/_/g, ' ')}
                              </span>
                            ) : isApprovedLeave ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Leave Approved
                              </span>
                            ) : isApprovedWFH ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                WFH Approved
                              </span>
                            ) : record.approvalStatus === 'rejected' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Rejected
                              </span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                  statusStyles[record.status] || 'bg-secondary text-muted-foreground'
                                }`}
                              >
                                {record.status?.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-14 text-center text-muted-foreground">
                          No attendance logs found for {monthName} {selectedYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EOD Report Modal */}
      <EODReportModal open={showEOD} onOpenChange={setShowEOD} report={todayRecord?.eodReport} />

      {/* EOD Detail Modal */}
      <EODDetailModal
        open={Boolean(selectedEodDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedEodDetail(null);
        }}
        record={selectedEodDetail}
      />

      {/* Rejection Reason Modal */}
      <Dialog
        open={rejectModalState.open}
        onOpenChange={(open) => {
          if (!open) setRejectModalState({ open: false, id: null, reason: '' });
        }}
      >
        <DialogContent
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-md max-h-[90vh]"
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Reject Request
              </DialogTitle>
            </div>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
              <X size={16} />
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleConfirmReject} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  value={rejectModalState.reason}
                  onChange={(e) => setRejectModalState((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full rounded-xl bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                />
              </div>
            </div>

            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setRejectModalState({ open: false, id: null, reason: '' })}
                className="h-11 px-5 rounded-xl bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={approveAttendanceMutation.isPending}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50 transition-colors cursor-pointer"
              >
                {approveAttendanceMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Holiday Modal */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]"
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Assign Holiday
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                <X size={16} />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleAssignHoliday} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Holiday Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (_) {}
                  }}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Holiday Name / Reason <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Independence Day"
                  value={holidayForm.notes}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="h-11 px-5 rounded-xl bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignHolidayMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50 transition-colors cursor-pointer"
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
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]"
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {isAdmin ? 'Assign / Apply Leave' : 'Apply for Leave'}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                <X size={16} />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleAssignLeave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              {isAdmin && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Employee
                  </label>
                  <SelectDropdown
                    value={leaveForm.userId}
                    onChange={(val) => setLeaveForm((prev) => ({ ...prev, userId: val }))}
                    options={[
                      { value: '', label: `Myself (${user?.name || user?.email})` },
                      ...assignableUsers.map((u) => ({
                        value: u._id,
                        label: u.name || u.email,
                        subLabel: u.department ? `${u.department} · ${u.role}` : u.role,
                      })),
                    ]}
                    allowCustom={false}
                    allowDeselect={false}
                    placeholder="Select Employee"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Start Date <span className="text-foreground">*</span>
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
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (_) {}
                    }}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    End Date <span className="text-foreground">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={leaveForm.startDate}
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (_) {}
                    }}
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Reason <span className="text-foreground">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter leave reason..."
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                />
              </div>
            </div>

            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="h-11 px-5 rounded-xl bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Send size={15} />
                  {submitLeaveMutation.isPending
                    ? 'Submitting...'
                    : isAdmin && leaveForm.userId && leaveForm.userId !== user?._id
                    ? 'Assign Leave'
                    : 'Submit Leave'}
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
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]"
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Work From Home Request
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                <X size={16} />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleInformWFH} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  WFH Date <span className="text-foreground">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={wfhForm.date || todayStr}
                  onChange={(e) => setWfhForm((prev) => ({ ...prev, date: e.target.value }))}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (_) {}
                  }}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Reason <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote work, travel"
                  value={wfhForm.notes}
                  onChange={(e) => setWfhForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="h-11 w-full rounded-xl bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Press <kbd className="font-mono text-foreground font-bold">ESC</kbd> to exit
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowWFHModal(false)}
                  className="h-11 px-5 rounded-xl bg-background hover:bg-muted font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitWFHMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitWFHMutation.isPending ? 'Submitting...' : 'Submit WFH'}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Detail Modal */}
      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null);
        }}
      >
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]"
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between bg-card px-6 py-5 select-none">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Attendance Details
              </DialogTitle>
              <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {selectedRecord?.date &&
                  new Date(selectedRecord.date).toLocaleDateString([], {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
              </div>
            </div>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0">
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {selectedRecord && (
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar text-sm">
              {selectedRecord.user && typeof selectedRecord.user === 'object' && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground text-xs overflow-hidden">
                    {selectedRecord.user.avatar ? (
                      <img
                        src={getAssetUrl(selectedRecord.user.avatar)}
                        alt={selectedRecord.user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedRecord.user.name, selectedRecord.user.email)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {selectedRecord.user.name || selectedRecord.user.email || 'Employee'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedRecord.user.email} · {selectedRecord.user.role}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    statusStyles[selectedRecord.status] || 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {selectedRecord.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {selectedRecord.appliedAt && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background tabular-nums text-xs">
                  <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock size={14} className="shrink-0" /> Applied At
                  </span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedRecord.appliedAt).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at {formatTime(selectedRecord.appliedAt)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
                <div className="p-3 rounded-2xl bg-background">
                  <div className="text-xs font-medium text-muted-foreground">Clock In</div>
                  <div className="text-sm font-bold text-foreground mt-1">{formatTime(selectedRecord.clockIn)}</div>
                </div>
                <div className="p-3 rounded-2xl bg-background">
                  <div className="text-xs font-medium text-muted-foreground">Clock Out</div>
                  <div className="text-sm font-bold text-muted-foreground mt-1">
                    {formatTime(selectedRecord.clockOut)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-background">
                  <div className="text-xs font-medium text-muted-foreground">Total Time</div>
                  <div className="text-sm font-bold text-foreground mt-1">
                    {selectedRecord.totalHours?.toFixed(1) || '0.0'} hrs
                  </div>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="p-3.5 rounded-2xl bg-background space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Reason / Notes</div>
                  <div className="text-sm text-foreground">{selectedRecord.notes}</div>
                </div>
              )}

              {selectedRecord.sessions && selectedRecord.sessions.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-secondary/20 tabular-nums">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Sessions ({selectedRecord.sessions.length})
                    </span>
                    <span className="font-bold text-foreground">
                      {Number(selectedRecord.totalHours || 0).toFixed(2)} hrs total
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                    {selectedRecord.sessions.map((session, sIdx) => (
                      <div key={sIdx} className="p-2.5 rounded-xl bg-card flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-secondary text-foreground font-semibold text-[11px] flex items-center justify-center">
                            {sIdx + 1}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatTime(session.clockIn)} →{' '}
                            <span className="text-muted-foreground">
                              {session.clockOut ? formatTime(session.clockOut) : 'Active'}
                            </span>
                          </span>
                        </div>
                        <span className="font-semibold text-foreground bg-secondary/60 px-2 py-0.5 rounded-md">
                          {session.durationHours
                            ? `${session.durationHours.toFixed(2)}h`
                            : session.clockOut
                            ? '0.00h'
                            : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecord.eodReport?.submittedAt && (
                <div className="p-3.5 rounded-2xl bg-secondary/35 space-y-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText size={13} /> EOD Summary
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-3">
                    {selectedRecord.eodReport.summary || 'Summary submitted.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="shrink-0 bg-card px-6 py-4 flex justify-end select-none">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="h-11 px-6 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground font-semibold text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
