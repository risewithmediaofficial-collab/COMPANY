import Attendance from '../models/attendance.model.js';
import { createNotification } from '../utils/notification.js';

export const clockIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ user: req.user._id, date: today });
    if (existing?.clockIn) return res.status(400).json({ success: false, message: 'Already clocked in today' });

    const attendance = existing
      ? Object.assign(existing, { clockIn: new Date(), status: 'present' })
      : new Attendance({ user: req.user._id, date: today, clockIn: new Date(), status: 'present' });

    await attendance.save();
    res.json({ success: true, message: 'Clocked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    if (!attendance?.clockIn) return res.status(400).json({ success: false, message: 'No clock-in found for today' });
    if (attendance.clockOut) return res.status(400).json({ success: false, message: 'Already clocked out today' });

    attendance.clockOut = new Date();
    attendance.totalHours = parseFloat(((attendance.clockOut - attendance.clockIn) / 3600000).toFixed(2));
    await attendance.save();

    res.json({ success: true, message: 'Clocked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitEOD = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { user: req.user._id, date: today },
      { eodReport: { ...req.body, submittedAt: new Date() } },
      { new: true, upsert: true }
    )
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role');

    // Realtime notification broadcast over WebSockets
    const io = req.app.get('io');
    if (io) {
      io.emit('eodSubmitted', {
        attendance,
        user: {
          _id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
          role: req.user.role,
        },
      });
    }

    // In-app notifications for managers & admins
    try {
      const User = (await import('../models/user.model.js')).default;
      const managers = await User.find({
        role: { $in: ['superAdmin', 'manager', 'organizationOwner', 'accountManager'] },
        isActive: true,
      }).select('_id');

      for (const mgr of managers) {
        if (mgr._id.toString() !== req.user._id.toString()) {
          await createNotification({
            recipient: mgr._id,
            type: 'eod_submitted',
            title: 'New EOD Report Submitted',
            message: `${req.user.name} submitted an EOD report for today.`,
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

export const getAttendance = async (req, res) => {
  try {
    const { userId, status, month, year, page = 1, limit = 1000 } = req.query;
    const filter = {};

    const isPrivileged = ['superAdmin', 'organizationOwner', 'manager', 'accountManager'].includes(req.user.role);

    if (!isPrivileged || req.user.role === 'employee') {
      filter.user = req.user._id;
    } else {
      if (userId && userId !== 'all') {
        filter.user = userId;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name avatar department position role email')
      .populate('approvedBy', 'name role')
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

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
          title: 'Official Holiday Assigned 📅',
          message: `${req.user.name} (${assignerRole}) assigned an official holiday on ${date}: "${reasonText}"`,
          link: '/attendance',
        },
        req.app.get('io')
      );

      return att;
    });

    await Promise.all(promises);

    res.json({ success: true, message: `Holiday successfully assigned for ${users.length} team members.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitLeave = async (req, res) => {
  try {
    const { userId, date, notes } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Employee userId is required' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const leaveDate = new Date(date);
    leaveDate.setHours(0, 0, 0, 0);

    const assignerRole = req.user.role === 'superAdmin' ? 'Super Admin' : 'Manager';
    const reasonText = notes || 'Assigned Leave';

    const attendance = await Attendance.findOneAndUpdate(
      { user: userId, date: leaveDate },
      {
        status: 'leave',
        notes: reasonText,
        isApproved: true,
        approvedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    // Send notification to employee
    await createNotification(
      {
        recipient: userId,
        sender: req.user._id,
        type: 'attendance',
        title: 'Leave Assigned 🏖️',
        message: `${req.user.name} (${assignerRole}) assigned you leave on ${date}: "${reasonText}"`,
        link: '/attendance',
      },
      req.app.get('io')
    );

    res.json({ success: true, message: 'Leave assigned successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitWFH = async (req, res) => {
  try {
    const { date, notes } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const wfhDate = new Date(date);
    wfhDate.setHours(0, 0, 0, 0);

    // Validation: WFH must be informed before the day itself (i.e. tomorrow or later)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (wfhDate < tomorrow) {
      return res.status(400).json({
        success: false,
        message: 'Work From Home must be informed at least one day in advance (for tomorrow or later)'
      });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { user: req.user._id, date: wfhDate },
      {
        status: 'work_from_home',
        notes: notes || 'Work From Home Informed',
        isApproved: true,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Work From Home informed successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
