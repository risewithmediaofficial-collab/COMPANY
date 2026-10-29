import Attendance from '../models/attendance.model.js';
import { emitLiveEvent } from '../utils/socketEmitter.js';
import { createNotification } from '../utils/notification.js';

export const clockIn = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const now = new Date();

    if (!attendance) {
      attendance = new Attendance({
        user: req.user._id,
        date: startOfToday,
        clockIn: now,
        clockOut: null,
        sessions: [{ clockIn: now, clockOut: null, durationHours: 0 }],
        status: 'present',
      });
    } else {
      if (!attendance.sessions) {
        attendance.sessions = [];
      }

      // If sessions array is empty but legacy clockIn exists
      if (attendance.sessions.length === 0 && attendance.clockIn) {
        attendance.sessions.push({
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut || null,
          durationHours: attendance.totalHours || 0,
        });
      }

      // Check if user is currently clocked in (open session exists)
      const hasOpenSession = attendance.sessions.some((s) => !s.clockOut);
      if (hasOpenSession) {
        return res.status(400).json({ success: false, message: 'Already clocked in' });
      }

      // Start new session (resuming shift after break)
      if (!attendance.clockIn) {
        attendance.clockIn = now;
      }
      attendance.clockOut = null; // Currently active in a session
      attendance.sessions.push({ clockIn: now, clockOut: null, durationHours: 0 });
      if (['absent', 'half_day'].includes(attendance.status) || !attendance.status) {
        attendance.status = 'present';
      }
    }

    await attendance.save();
    emitLiveEvent('attendanceUpdated', { attendance: attendance.toObject(), userId: req.user._id });
    res.json({ success: true, message: 'Clocked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No clock-in found for today' });
    }

    if (!attendance.sessions || attendance.sessions.length === 0) {
      if (!attendance.clockIn) {
        return res.status(400).json({ success: false, message: 'No clock-in found for today' });
      }
      attendance.sessions = [{
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut || null,
        durationHours: attendance.totalHours || 0,
      }];
    }

    const openSession = attendance.sessions.find((s) => !s.clockOut);
    if (!openSession) {
      return res.status(400).json({ success: false, message: 'Already clocked out' });
    }

    const now = new Date();
    openSession.clockOut = now;
    openSession.durationHours = parseFloat(((now - new Date(openSession.clockIn)) / 3600000).toFixed(2));

    // Calculate total cumulative working hours for today across all sessions
    const totalMs = attendance.sessions.reduce((sum, s) => {
      if (s.clockIn && s.clockOut) {
        return sum + (new Date(s.clockOut) - new Date(s.clockIn));
      }
      return sum;
    }, 0);

    attendance.clockOut = now;
    attendance.totalHours = parseFloat((totalMs / 3600000).toFixed(2));
    await attendance.save();
    emitLiveEvent('attendanceUpdated', { attendance: attendance.toObject(), userId: req.user._id });

    res.json({ success: true, message: 'Clocked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitEOD = async (req, res) => {
  try {
    const { date, summary, tasksCompleted, blockers } = req.body;

    let targetDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        targetDate = parsedDate;
      }
    }
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { user: req.user._id, date: targetDate },
      {
        $set: {
          eodReport: {
            summary: summary || '',
            tasksCompleted: Array.isArray(tasksCompleted) ? tasksCompleted : (tasksCompleted ? [tasksCompleted] : []),
            blockers: blockers || '',
            submittedAt: new Date(),
          },
        },
        $setOnInsert: {
          user: req.user._id,
          date: targetDate,
          status: 'present',
        },
      },
      { new: true, upsert: true }
    )
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role');

    // Realtime notification broadcast over WebSockets
    emitLiveEvent('eodSubmitted', {
      attendance,
      user: {
        _id: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar,
        role: req.user.role,
      },
    });
    emitLiveEvent('attendanceUpdated', { attendance: attendance.toObject(), userId: req.user._id });

    // In-app notifications for managers & admins
    try {
      const User = (await import('../models/user.model.js')).default;
      const managers = await User.find({
        role: { $in: ['superAdmin', 'admin', 'manager', 'organizationOwner', 'accountManager'] },
        isActive: true,
      }).select('_id');

      const dateStr = targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      for (const mgr of managers) {
        if (mgr._id.toString() !== req.user._id.toString()) {
          await createNotification({
            recipient: mgr._id,
            type: 'eod_submitted',
            title: 'New EOD Report Submitted',
            message: `${req.user.name} submitted an EOD report for ${dateStr}.`,
            link: '/dashboard',
          });
        }
      }
    } catch (notifErr) {
      console.error('EOD Notification error:', notifErr);
    }

    res.json({ success: true, message: 'EOD report submitted successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ensures all Sundays in a given date range exist as default holiday records
 * for eligible active staff members who have not clocked in.
 */
export const ensureSundayHolidaysForPeriod = async (startDate, endDate, specificUserId = null) => {
  try {
    const User = (await import('../models/user.model.js')).default;
    const userQuery = {
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    };
    if (specificUserId && specificUserId !== 'all') {
      userQuery._id = specificUserId;
    }
    const eligibleUsers = await User.find(userQuery).select('_id').lean();
    if (!eligibleUsers.length) return;

    // Collect all Sundays between startDate and endDate
    const sundays = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (cur <= end) {
      if (cur.getDay() === 0) {
        sundays.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (!sundays.length) return;

    const sStartOverall = new Date(sundays[0]);
    sStartOverall.setHours(0, 0, 0, 0);
    const sEndOverall = new Date(sundays[sundays.length - 1]);
    sEndOverall.setHours(23, 59, 59, 999);

    const userIds = eligibleUsers.map((u) => u._id);
    const existingRecords = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: sStartOverall, $lte: sEndOverall },
    }).select('user date status').lean();

    const existingKeySet = new Set(
      existingRecords.map((r) => {
        const d = new Date(r.date);
        return `${r.user.toString()}_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      })
    );

    const newHolidaysToInsert = [];
    for (const sundayDate of sundays) {
      const sStart = new Date(sundayDate);
      sStart.setHours(0, 0, 0, 0);
      const sKey = `${sStart.getFullYear()}-${sStart.getMonth() + 1}-${sStart.getDate()}`;

      for (const u of eligibleUsers) {
        const key = `${u._id.toString()}_${sKey}`;
        if (!existingKeySet.has(key)) {
          newHolidaysToInsert.push({
            user: u._id,
            date: sStart,
            status: 'holiday',
            requestedStatus: 'none',
            approvalStatus: 'approved',
            isApproved: true,
            notes: 'Sunday Weekly Holiday',
            totalHours: 0,
            sessions: [],
          });
          existingKeySet.add(key);
        }
      }
    }

    if (newHolidaysToInsert.length > 0) {
      await Attendance.insertMany(newHolidaysToInsert, { ordered: false }).catch(() => {});
    }
  } catch (err) {
    console.error('Error ensuring Sunday holidays for period:', err);
  }
};

let lastAutoAbsentCheck = 0;
/**
 * Automatically ensures employees who failed to clock in by 10:30 AM on Monday-Saturday
 * are marked as absent for today. Throttled to run at most once per 10 minutes.
 */
export const ensureAutoAbsentForToday = async (startOfToday, endOfToday) => {
  try {
    const now = new Date();
    if (Date.now() - lastAutoAbsentCheck < 10 * 60 * 1000) {
      return;
    }

    // Calculate IST time (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
    const istDay = istNow.getDay(); // 0 is Sunday
    const istHours = istNow.getHours();
    const istMinutes = istNow.getMinutes();

    // Skip Sunday (default weekly holiday)
    if (istDay === 0) return;

    // Cutoff is 10:30 AM IST
    const isPast1030 = istHours > 10 || (istHours === 10 && istMinutes >= 30);
    if (!isPast1030) return;

    lastAutoAbsentCheck = Date.now();

    const User = (await import('../models/user.model.js')).default;
    const eligibleUsers = await User.find({
      isActive: true,
      role: { $nin: ['client', 'clientAdmin', 'clientMember', 'referral'] },
    }).select('_id name').lean();

    if (!eligibleUsers.length) return;

    const start = startOfToday || new Date(new Date().setHours(0, 0, 0, 0));
    const end = endOfToday || new Date(new Date().setHours(23, 59, 59, 999));

    const todayAttendances = await Attendance.find({
      date: { $gte: start, $lte: end },
    }).lean();

    const attByUser = new Map();
    todayAttendances.forEach((a) => {
      attByUser.set(a.user.toString(), a);
    });

    const bulkOps = [];
    for (const u of eligibleUsers) {
      const att = attByUser.get(u._id.toString());
      const hasClockIn = Boolean(att && (att.clockIn || (att.sessions && att.sessions.some((s) => s.clockIn))));
      const isApprovedExcusal = Boolean(att && att.approvalStatus === 'approved' && ['leave', 'holiday', 'work_from_home'].includes(att.status));
      const isPendingRequest = Boolean(att && att.approvalStatus === 'pending');

      if (hasClockIn || isApprovedExcusal || isPendingRequest) {
        continue;
      }

      if (att && att.status === 'absent') {
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { user: u._id, date: start },
          update: {
            $set: {
              status: 'absent',
              requestedStatus: 'absent',
              approvalStatus: 'approved',
              isApproved: true,
              notes: 'Automatically marked absent: Failed to clock in by 10:30 AM cutoff',
              clockIn: null,
              clockOut: null,
              totalHours: 0,
              sessions: [],
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }
  } catch (err) {
    console.error('Error ensuring auto absent for today:', err);
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { userId, status, month, year, page = 1, limit = 1000 } = req.query;
    await ensureAutoAbsentForToday();
    const filter = {};

    const isPrivileged = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);

    if (!isPrivileged || req.user.role === 'employee') {
      filter.user = req.user._id;
    } else {
      if (userId && userId !== 'all') {
        filter.user = userId;
      }
    }

    if (status && status !== 'all') {
      if (status === 'shifts') {
        filter.status = { $ne: 'holiday' };
      } else {
        filter.status = status;
      }
    }

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };

      // Make all Sundays holiday by default
      await ensureSundayHolidaysForPeriod(start, end, filter.user);
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role')
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Compute summary
    const summary = {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      leave: records.filter(r => r.status === 'leave').length,
      wfh: records.filter(r => r.status === 'work_from_home').length,
      holiday: records.filter(r => r.status === 'holiday').length,
      totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(2),
    };

    res.json({ success: true, records, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeamAttendance = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // If today is Sunday, ensure Sunday holiday exists for all team members
    if (startOfToday.getDay() === 0) {
      await ensureSundayHolidaysForPeriod(startOfToday, endOfToday);
    } else {
      // If Monday - Saturday and past 10:30 AM cutoff, ensure unclocked staff are marked absent
      await ensureAutoAbsentForToday(startOfToday, endOfToday);
    }

    const records = await Attendance.find({
      date: { $gte: startOfToday, $lte: endOfToday },
    })
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role');

    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEodReports = async (req, res) => {
  try {
    const { days = 7, userId, mine } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    since.setHours(0, 0, 0, 0);

    const query = {
      date: { $gte: since },
      'eodReport.submittedAt': { $exists: true },
    };

    if (req.user.role === 'employee' || mine === 'true') {
      query.user = userId || req.user._id;
    } else if (req.user.role === 'client') {
      const Client = (await import('../models/client.model.js')).default;
      const Project = (await import('../models/project.model.js')).default;
      const User = (await import('../models/user.model.js')).default;

      const client = await Client.findOne({ userId: req.user._id });
      let teamUserIds = [];

      if (client) {
        if (client.assignedManager) teamUserIds.push(client.assignedManager);
        if (client.assignedTeam && client.assignedTeam.length > 0) {
          teamUserIds.push(...client.assignedTeam);
        }
        const clientProjects = await Project.find({ client: client._id }).select('manager team');
        clientProjects.forEach((p) => {
          if (p.manager) teamUserIds.push(p.manager);
          if (p.team && p.team.length > 0) teamUserIds.push(...p.team);
        });
      }

      const uniqueTeamIds = [...new Set(teamUserIds.map((id) => id.toString()))];

      if (uniqueTeamIds.length > 0) {
        query.user = { $in: uniqueTeamIds };
      } else if (req.user.organizationId) {
        const orgUsers = await User.find({
          organizationId: req.user.organizationId,
          role: { $nin: ['client', 'referral'] },
        }).select('_id');
        query.user = { $in: orgUsers.map((u) => u._id) };
      }
    } else if (userId) {
      query.user = userId;
    }

    const records = await Attendance.find(query)
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role')
      .sort({ date: -1 })
      .limit(100);

    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignHoliday = async (req, res) => {
  try {
    const { date, notes } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);

    const User = (await import('../models/user.model.js')).default;
    const users = await User.find({
      organizationId: req.user.organizationId,
      role: { $nin: ['client', 'referral'] },
      isActive: true,
    });

    const assignerRole = req.user.role === 'superAdmin' ? 'Super Admin' : 'Manager';
    const reasonText = notes || 'Company Official Holiday';

    const promises = users.map(async (userObj) => {
      const att = await Attendance.findOneAndUpdate(
        { user: userObj._id, date: holidayDate },
        {
          status: 'holiday',
          notes: reasonText,
          isApproved: true,
          approvedBy: req.user._id,
        },
        { upsert: true, new: true }
      );

      // Send notification to employee
      await createNotification(
        {
          recipient: userObj._id,
          sender: req.user._id,
          type: 'attendance',
          title: 'Official Holiday Assigned ðŸ“…',
          message: `${req.user.name} (${assignerRole}) assigned an official holiday on ${date}: "${reasonText}"`,
          link: '/attendance',
        },
        req.app.get('io')
      );

      return att;
    });

    await Promise.all(promises);
    emitLiveEvent('attendanceUpdated', { holidayDate });

    res.json({ success: true, message: `Holiday successfully assigned for ${users.length} team members.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitAbsent = async (req, res) => {
  try {
    const { userId, date, notes, reason } = req.body;
    const targetUserId = userId || req.user._id;
    const reasonText = notes || reason;

    if (!reasonText || !reasonText.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for marking absent is required' });
    }

    const absentDate = date ? new Date(date) : new Date();
    absentDate.setHours(0, 0, 0, 0);

    const isAdminOrManager = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);

    const updateObj = {
      notes: reasonText.trim(),
      requestedStatus: 'absent',
      approvalStatus: isAdminOrManager ? 'approved' : 'pending',
      isApproved: isAdminOrManager,
      approvedBy: isAdminOrManager ? req.user._id : undefined,
      appliedAt: new Date(),
    };

    if (isAdminOrManager) {
      updateObj.status = 'absent';
      updateObj.clockIn = null;
      updateObj.clockOut = null;
      updateObj.totalHours = 0;
      updateObj.sessions = [];
    }

    const attendance = await Attendance.findOneAndUpdate(
      { user: targetUserId, date: absentDate },
      { $set: updateObj },
      { upsert: true, new: true }
    ).populate('user', 'name avatar department position role email');

    // Notify managers & admins if requested by an employee
    if (!isAdminOrManager) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const managers = await User.find({ role: { $in: ['superAdmin', 'admin', 'manager', 'organizationOwner', 'accountManager'] }, isActive: true }).select('_id');
        const formattedDate = absentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        for (const mgr of managers) {
          await createNotification({
            recipient: mgr._id,
            sender: req.user._id,
            type: 'attendance',
            title: 'Absence Request Pending Approval âš ï¸',
            message: `${req.user.name} requested Absent for ${formattedDate}: "${reasonText.trim()}"`,
            link: '/attendance',
          });
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }

    emitLiveEvent('attendanceUpdated', { attendance, userId: targetUserId });

    res.json({
      success: true,
      message: isAdminOrManager ? 'Marked absent successfully' : 'Absence request submitted for Admin/Manager approval',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitLeave = async (req, res) => {
  try {
    const { userId, date, startDate, endDate, notes, reason } = req.body;
    const targetUserId = userId || req.user._id;
    const reasonText = notes || reason;

    if (!reasonText || !reasonText.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for leave is required' });
    }

    const isAdminOrManager = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);

    // Compute dates list (single date or date range)
    const datesToApply = [];
    if (startDate && endDate) {
      const cur = new Date(startDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        datesToApply.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const singleDate = date ? new Date(date) : new Date();
      singleDate.setHours(0, 0, 0, 0);
      datesToApply.push(singleDate);
    }

    const updateObj = {
      notes: reasonText.trim(),
      requestedStatus: 'leave',
      status: 'leave',
      approvalStatus: isAdminOrManager ? 'approved' : 'pending',
      isApproved: isAdminOrManager,
      approvedBy: isAdminOrManager ? req.user._id : undefined,
      appliedAt: new Date(),
    };

    if (isAdminOrManager) {
      updateObj.status = 'leave';
      updateObj.clockIn = null;
      updateObj.clockOut = null;
      updateObj.totalHours = 0;
      updateObj.sessions = [];
    }

    const results = await Promise.all(
      datesToApply.map((d) =>
        Attendance.findOneAndUpdate(
          { user: targetUserId, date: d },
          { $set: updateObj },
          { upsert: true, new: true }
        ).populate('user', 'name avatar department position role email').populate('approvedBy', 'name role')
      )
    );

    const attendance = results[0];

    // Notify managers & admins if requested by an employee
    if (!isAdminOrManager) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const managers = await User.find({
          role: { $in: ['superAdmin', 'admin', 'manager', 'organizationOwner', 'accountManager'] },
          isActive: true,
        }).select('_id');

        let dateStr = datesToApply[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (datesToApply.length > 1) {
          const lastDateStr = datesToApply[datesToApply.length - 1].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          dateStr = `${dateStr} to ${lastDateStr} (${datesToApply.length} days)`;
        }

        for (const mgr of managers) {
          await createNotification({
            recipient: mgr._id,
            sender: req.user._id,
            type: 'attendance',
            title: 'Leave Request Pending Approval ðŸ–ï¸',
            message: `${req.user.name} applied for leave for ${dateStr}: "${reasonText.trim()}"`,
            link: '/attendance',
          });
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }

    emitLiveEvent('attendanceUpdated', { attendance, userId: targetUserId });

    res.json({
      success: true,
      message: isAdminOrManager
        ? `Leave marked successfully for ${datesToApply.length} day(s)`
        : `Leave application submitted for Admin/Manager approval (${datesToApply.length} day(s))`,
      attendance,
      count: datesToApply.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitWFH = async (req, res) => {
  try {
    const { date, notes, reason } = req.body;
    const reasonText = notes || reason || 'Work From Home Requested';

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const wfhDate = new Date(date);
    wfhDate.setHours(0, 0, 0, 0);

    const isAdminOrManager = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);

    const updateObj = {
      notes: reasonText.trim(),
      requestedStatus: 'work_from_home',
      status: 'work_from_home',
      approvalStatus: isAdminOrManager ? 'approved' : 'pending',
      isApproved: isAdminOrManager,
      approvedBy: isAdminOrManager ? req.user._id : undefined,
      appliedAt: new Date(),
    };

    if (isAdminOrManager) {
      updateObj.status = 'work_from_home';
    }

    const attendance = await Attendance.findOneAndUpdate(
      { user: req.user._id, date: wfhDate },
      { $set: updateObj },
      { upsert: true, new: true }
    ).populate('user', 'name avatar department position role email');

    // Notify managers & admins if requested by an employee
    if (!isAdminOrManager) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const managers = await User.find({ role: { $in: ['superAdmin', 'admin', 'manager', 'organizationOwner', 'accountManager'] }, isActive: true }).select('_id');
        const formattedDate = wfhDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        for (const mgr of managers) {
          await createNotification({
            recipient: mgr._id,
            sender: req.user._id,
            type: 'attendance',
            title: 'Work From Home Request Pending ðŸ ',
            message: `${req.user.name} requested WFH for ${formattedDate}: "${reasonText.trim()}"`,
            link: '/attendance',
          });
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }

    emitLiveEvent('attendanceUpdated', { attendance, userId: req.user._id });

    res.json({
      success: true,
      message: isAdminOrManager ? 'Work From Home marked successfully' : 'Work From Home request submitted for Admin/Manager approval',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveOrRejectAttendanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    const isAdminOrManager = ['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);
    if (!isAdminOrManager) {
      return res.status(403).json({ success: false, message: 'Only Admins and Managers can approve/reject attendance requests.' });
    }

    const attendance = await Attendance.findById(id).populate('user', 'name avatar email');
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance request record not found.' });
    }

    if (action === 'approve') {
      attendance.approvalStatus = 'approved';
      attendance.isApproved = true;
      attendance.approvedBy = req.user._id;
      if (attendance.requestedStatus && attendance.requestedStatus !== 'none') {
        attendance.status = attendance.requestedStatus;
      }
      if (attendance.status === 'absent') {
        attendance.clockIn = null;
        attendance.clockOut = null;
        attendance.totalHours = 0;
        attendance.sessions = [];
      }
    } else if (action === 'reject') {
      attendance.approvalStatus = 'rejected';
      attendance.isApproved = false;
      attendance.approvedBy = req.user._id;
      attendance.rejectionReason = rejectionReason || 'Request rejected by manager.';
    }

    await attendance.save();
    await attendance.populate('user', 'name avatar email department position role');
    await attendance.populate('approvedBy', 'name role');

    // Send notification to employee
    const statusLabel = (attendance.requestedStatus || attendance.status).replace(/_/g, ' ');
    const formattedDate = new Date(attendance.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    try {
      await createNotification(
        {
          recipient: attendance.user._id,
          sender: req.user._id,
          type: 'attendance',
          title: action === 'approve' ? `Attendance Request Approved âœ…` : `Attendance Request Rejected âŒ`,
          message: action === 'approve'
            ? `Your request for ${statusLabel} on ${formattedDate} was approved by ${req.user.name}.`
            : `Your request for ${statusLabel} on ${formattedDate} was rejected: "${rejectionReason || 'No reason provided'}"`,
          link: '/attendance',
        },
        req.app.get('io')
      );
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    emitLiveEvent('attendanceUpdated', { attendance, userId: attendance.user?._id || attendance.user });

    res.json({
      success: true,
      message: `Attendance request ${action}d successfully.`,
      attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
