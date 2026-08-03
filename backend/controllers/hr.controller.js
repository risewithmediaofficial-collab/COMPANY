// =============================================
// HR CONTROLLER - Team & Hiring
// =============================================

import Job from '../models/job.model.js';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import { createActivityLog } from '../utils/activity.js';

const employmentStatusMap = {
  Active: 'active',
  Inactive: 'inactive',
  'On Leave': 'on_leave',
  Terminated: 'terminated',
};

const employmentStatusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
  terminated: 'Terminated',
};

const safeUserProjection = '-password -refreshToken -resetPasswordToken -resetPasswordExpire';

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : value.toString().split('\n').map((item) => item.trim()).filter(Boolean);
};

const serializeEmployee = (employee, viewerRole = 'superAdmin', viewerId = null) => {
  const item = employee?.toObject ? employee.toObject() : employee;
  if (!item) return null;

  const canViewCompensation = viewerRole === 'superAdmin'
    || viewerRole === 'manager'
    || (viewerId && item._id?.toString() === viewerId.toString());

  return {
    ...item,
    status: employmentStatusLabels[item.employmentStatus] || (item.isActive ? 'Active' : 'Inactive'),
    joinDate: item.joinDate || item.createdAt,
    salary: canViewCompensation ? Number(item.salary || 0) : undefined,
  };
};

const normalizeEmployeePayload = (body = {}, { isCreate = false, currentUser } = {}) => {
  const payload = {};
  const fields = ['name', 'email', 'phone', 'department', 'position', 'role', 'notes', 'avatar', 'organizationId', 'departmentId', 'assignedBrands'];

  fields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });

  if (body.permissions !== undefined) payload.permissions = body.permissions || {};
  if (body.assignedBrands !== undefined) payload.assignedBrands = Array.isArray(body.assignedBrands) ? body.assignedBrands : [];
  if (body.salary !== undefined) payload.salary = Number(body.salary) || 0;
  if (body.joinDate) payload.joinDate = body.joinDate;
  if (body.manager !== undefined) payload.manager = body.manager || null;
  if (body.status) payload.employmentStatus = employmentStatusMap[body.status] || body.status;
  if (body.employmentStatus) payload.employmentStatus = body.employmentStatus;
  if (payload.employmentStatus) payload.isActive = !['inactive', 'terminated'].includes(payload.employmentStatus);

  if (isCreate) {
    payload.password = body.password || 'password123';
    if (!payload.role) payload.role = 'employee';
    if (!payload.manager && currentUser?.role === 'manager') payload.manager = currentUser._id;
  }

  return payload;
};

const normalizeJobPayload = (body = {}) => ({
  ...body,
  requirements: body.requirements !== undefined ? toArray(body.requirements) : undefined,
  responsibilities: body.responsibilities !== undefined ? toArray(body.responsibilities) : undefined,
  salaryMin: body.salaryMin !== undefined ? Number(body.salaryMin) || 0 : undefined,
  salaryMax: body.salaryMax !== undefined ? Number(body.salaryMax) || 0 : undefined,
});

const buildTeamFilter = (req, extra = {}) => {
  const filter = {
    role: { $in: ['manager', 'employee'] },
    ...extra,
  };

  if (req.user.role === 'manager') {
    filter.$or = [
      { manager: req.user._id },
      { _id: req.user._id },
      { role: 'manager' },
    ];
  }

  if (req.user.role === 'employee') {
    filter.isActive = true;
    filter.role = { $in: ['manager', 'employee'] };
  }

  return filter;
};

export const getJobs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name')
      .populate('applicants.reviewedBy', 'name');

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJob = async (req, res) => {
  try {
    const payload = normalizeJobPayload(req.body);
    const job = await Job.create({ ...payload, postedBy: req.user._id });

    await createActivityLog({
      actor: req.user,
      action: 'job.created',
      entityType: 'job',
      entityId: job._id,
      title: 'Job created',
      description: `${job.title} was created.`,
      metadata: { department: job.department, status: job.status },
    });

    res.status(201).json({ success: true, job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      normalizeJobPayload(req.body),
      { new: true, runValidators: true },
    );

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    await createActivityLog({
      actor: req.user,
      action: 'job.updated',
      entityType: 'job',
      entityId: job._id,
      title: 'Job updated',
      description: `${job.title} was updated.`,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    await createActivityLog({
      actor: req.user,
      action: 'job.deleted',
      entityType: 'job',
      entityId: job._id,
      title: 'Job deleted',
      description: `${job.title} was deleted.`,
    });

    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addApplicant = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!req.body.name?.trim() || !req.body.email?.trim()) {
      return res.status(400).json({ success: false, message: 'Applicant name and email are required' });
    }

    job.applicants.push({
      ...req.body,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    });
    await job.save();

    await createActivityLog({
      actor: req.user,
      action: 'job.applicant.added',
      entityType: 'job',
      entityId: job._id,
      title: 'Applicant added',
      description: `${req.body.name} applied to ${job.title}.`,
    });

    res.status(201).json({ success: true, job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateApplicantStage = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const applicant = job.applicants.id(req.params.applicantId);
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });

    Object.assign(applicant, {
      ...req.body,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    });
    await job.save();

    await createActivityLog({
      actor: req.user,
      action: 'job.applicant.updated',
      entityType: 'job',
      entityId: job._id,
      title: 'Applicant stage updated',
      description: `${applicant.name} moved to ${applicant.stage}.`,
      metadata: { applicantId: applicant._id, stage: applicant.stage },
    });

    res.json({ success: true, applicant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTeamMembers = async (req, res) => {
  try {
    const { role, search, status, department, page = 1, limit = 20 } = req.query;
    const filter = buildTeamFilter(req);

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (status) {
      filter.employmentStatus = employmentStatusMap[status] || status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const members = await User.find(filter)
      .select(safeUserProjection)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Fetch today's attendance for each employee
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const memberIds = members.map((m) => m._id);
    const attendanceRecords = await Attendance.find({
      user: { $in: memberIds },
      date: { $gte: today, $lt: tomorrow },
    });

    const attendanceMap = {};
    attendanceRecords.forEach((record) => {
      const isClockedIn = record.sessions && record.sessions.length > 0
        ? record.sessions.some((s) => !s.clockOut)
        : Boolean(record.clockIn && !record.clockOut);

      attendanceMap[record.user.toString()] = {
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        totalHours: record.totalHours,
        status: record.status,
        sessions: record.sessions || [],
        isClockedIn,
      };
    });

    const employees = members.map((member) => {
      const serialized = serializeEmployee(member, req.user.role, req.user._id);
      serialized.todayAttendance = attendanceMap[member._id.toString()] || null;
      return serialized;
    });

    res.json({
      success: true,
      total,
      members: employees,
      employees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    if (req.user.role === 'employee' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const employee = await User.findById(req.params.id)
      .select(safeUserProjection)
      .populate('manager', 'name email');

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    res.json({
      success: true,
      employee: serializeEmployee(employee, req.user.role, req.user._id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const payload = normalizeEmployeePayload(req.body, { isCreate: true, currentUser: req.user });
    const employee = await User.create(payload);
    const savedEmployee = await User.findById(employee._id).select(safeUserProjection).populate('manager', 'name email');

    await createActivityLog({
      actor: req.user,
      action: 'employee.created',
      entityType: 'user',
      entityId: employee._id,
      title: 'Employee created',
      description: `${employee.name} was added to the team.`,
      relatedUser: employee._id,
      metadata: { role: employee.role, department: employee.department },
    });

    res.status(201).json({
      success: true,
      employee: serializeEmployee(savedEmployee, req.user.role, req.user._id),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const payload = normalizeEmployeePayload(req.body);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true },
    )
      .select(safeUserProjection)
      .populate('manager', 'name email');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await createActivityLog({
      actor: req.user,
      action: 'employee.updated',
      entityType: 'user',
      entityId: user._id,
      title: 'Employee updated',
      description: `${user.name}'s profile was updated.`,
      relatedUser: user._id,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    const employee = serializeEmployee(user, req.user.role, req.user._id);
    res.json({ success: true, user: employee, employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    await createActivityLog({
      actor: req.user,
      action: 'employee.deleted',
      entityType: 'user',
      entityId: user._id,
      title: 'Employee deleted',
      description: `${user.name} was removed from the team.`,
      relatedUser: user._id,
    });

    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
