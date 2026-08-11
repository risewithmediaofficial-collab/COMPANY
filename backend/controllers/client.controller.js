// =============================================
// CLIENT CONTROLLER
// =============================================

import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import ActivityLog from '../models/activityLog.model.js';
import { sendEmail } from '../utils/email.js';
import { createActivityLog } from '../utils/activity.js';

const statusMap = {
  Active: 'active',
  Inactive: 'inactive',
  Prospect: 'onboarding',
  Churned: 'churned',
  Renew: 'renew',
};

const serializeClient = (client) => {
  const item = client.toObject ? client.toObject() : client;
  const label = {
    active: 'Active',
    inactive: 'Inactive',
    onboarding: 'Prospect',
    churned: 'Churned',
    renew: 'Renew',
  }[item.status] || item.status;

  return { ...item, status: label };
};

const normalizeClientPayload = (body) => {
  const payload = {
    ...body,
    status: body.status ? (statusMap[body.status] || body.status) : body.status,
  };

  if (Object.prototype.hasOwnProperty.call(body, 'referredBy')) {
    payload.referredBy = body.referredBy || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'referredByManual')) {
    payload.referredByManual = body.referredByManual?.toString?.().trim?.() || '';
  }

  if (payload.referredBy) {
    payload.referredByManual = '';
  }

  if (payload.contractEndDate === '' || payload.contractEndDate === undefined) {
    payload.contractEndDate = null;
  }
  if (payload.contractStartDate === '' || payload.contractStartDate === undefined) {
    payload.contractStartDate = null;
  }

  return payload;
};

const clientPopulate = [
  { path: 'assignedManager', select: 'name avatar email' },
  { path: 'assignedTeam', select: 'name avatar email' },
  { path: 'userId', select: 'email lastLogin isActive' },
  { path: 'referredBy', select: 'name email role referralCode' },
];

const assertClientAccess = (req, client) => {
  if (!client) return { allowed: false, status: 404, message: 'Client not found' };
  if (['superAdmin', 'organizationOwner', 'manager', 'accountManager', 'editor', 'designer', 'adsManager', 'financeManager', 'employee'].includes(req.user.role)) return { allowed: true };
  if (req.user.role === 'client' && client.userId?.toString() === req.user._id.toString()) return { allowed: true };
  return { allowed: true }; // Fallback allow for company staff
};

export const getClients = async (req, res) => {
  try {
    const { status, search, service, createdFrom, createdTo, page = 1, limit = 500 } = req.query;
    const filter = {};

    if (status) {
      const mapped = statusMap[status] || status;
      filter.status = { $in: [status, mapped, status.toLowerCase()] };
    }
    if (service) {
      filter.services = { $elemMatch: { $regex: service, $options: 'i' } };
    }
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(`${createdTo}T23:59:59.999Z`);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.user.role === 'client') {
      filter.userId = req.user._id;
    } else if (req.user.role === 'employee') {
      // Employees see assigned clients or unassigned organization clients
      filter.$or = [
        ...(filter.$or || []),
        { assignedTeam: req.user._id },
        { assignedManager: req.user._id },
        { assignedTeam: { $size: 0 } },
        { assignedTeam: { $exists: false } },
      ];
    }

    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .populate(clientPopulate)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, clients: clients.map(serializeClient) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate(clientPopulate)
      .populate('convertedFromLead', 'name source value');

    const access = assertClientAccess(req, client);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const [projects, recentActivity] = await Promise.all([
      Project.find({ client: client._id }).select('name status progress dueDate budget').sort({ createdAt: -1 }),
      ActivityLog.find({ relatedClient: client._id })
        .populate('actor', 'name avatar role')
        .sort({ createdAt: -1 })
        .limit(15),
    ]);

    res.json({
      success: true,
      client: serializeClient(client),
      projects,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createClient = async (req, res) => {
  try {
    const payload = normalizeClientPayload(req.body);
    if (req.user?.organizationId) {
      payload.organizationId = req.user.organizationId;
    }

    const client = await Client.create(payload);

    // Safe auto-create of client portal user account
    let portalUser = null;
    if (client.email) {
      try {
        const cleanEmail = client.email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: cleanEmail });
        if (!existingUser) {
          const rawPhone = (client.phone || '').toString().trim();
          const rawPassword = rawPhone.length >= 6 ? rawPhone : 'Client@123';
          portalUser = await User.create({
            name: client.name,
            email: cleanEmail,
            password: rawPassword,
            role: 'client',
            clientId: client._id,
            organizationId: req.user?.organizationId,
            isActive: true,
            approvalStatus: 'approved',
          });

          client.userId = portalUser._id;
          client.portalEnabled = true;
          await client.save();
        } else if (existingUser.role === 'client') {
          client.userId = existingUser._id;
          client.portalEnabled = true;
          await client.save();
        }
      } catch (userErr) {
        console.error('⚠️ Portal user auto-creation skipped:', userErr.message);
      }
    }

    await createActivityLog({
      actor: req.user,
      action: 'client.created',
      entityType: 'client',
      entityId: client._id,
      title: 'Client created',
      description: `${client.company || client.name} was added.`,
      relatedClient: client._id,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('clientCreated', client);
    }

    const populatedClient = await Client.findById(client._id).populate(clientPopulate);

    res.status(201).json({
      success: true,
      client: serializeClient(populatedClient),
      portalCredentials: portalUser
        ? { email: portalUser.email, password: (client.phone || '').trim().length >= 6 ? client.phone.trim() : 'Client@123' }
        : null,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, normalizeClientPayload(req.body), { new: true, runValidators: true })
      .populate(clientPopulate);

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    await createActivityLog({
      actor: req.user,
      action: 'client.updated',
      entityType: 'client',
      entityId: client._id,
      title: 'Client updated',
      description: `${client.company || client.name} was updated.`,
      relatedClient: client._id,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, client: serializeClient(client) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    await createActivityLog({
      actor: req.user,
      action: 'client.deleted',
      entityType: 'client',
      entityId: client._id,
      title: 'Client deleted',
      description: `${client.company || client.name} was deleted.`,
      relatedClient: client._id,
    });

    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOnboardingStep = async (req, res) => {
  try {
    const { step, value } = req.body;
    const allowed = ['welcomeEmailSent', 'projectCreated', 'teamAssigned', 'kickoffCallScheduled', 'portalActivated'];
    if (!allowed.includes(step)) return res.status(400).json({ success: false, message: 'Invalid onboarding step' });

    const update = { [`onboardingSteps.${step}`]: Boolean(value) };
    const client = await Client.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const steps = client.onboardingSteps;
    const allDone = Object.values(steps.toObject ? steps.toObject() : steps).every(Boolean);
    client.onboardingCompleted = allDone;
    await client.save();

    await createActivityLog({
      actor: req.user,
      action: 'client.onboarding.updated',
      entityType: 'client',
      entityId: client._id,
      title: 'Client onboarding updated',
      description: `${step} was marked ${value ? 'complete' : 'incomplete'}.`,
      relatedClient: client._id,
      metadata: { step, value: Boolean(value) },
    });

    res.json({ success: true, client: serializeClient(client) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const activatePortal = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    let portalUser = await User.findOne({ email: client.email, role: 'client' });
    const tempPassword = Math.random().toString(36).slice(-10);

    if (!portalUser) {
      portalUser = await User.create({
        name: client.name,
        email: client.email,
        password: tempPassword,
        role: 'client',
        clientId: client._id,
        isActive: true,
        approvalStatus: 'approved',
      });
    } else {
      portalUser.clientId = client._id;
      portalUser.isActive = true;
      portalUser.approvalStatus = 'approved';
      await portalUser.save();
    }

    client.userId = portalUser._id;
    client.portalEnabled = true;
    client.onboardingSteps.portalActivated = true;
    client.onboardingCompleted = Object.values(client.onboardingSteps.toObject()).every(Boolean);
    await client.save();

    await sendEmail({
      to: client.email,
      subject: 'Your Client Portal is Ready - RISE WITH MEDIA',
      html: `<h2>Welcome ${client.name}!</h2><p>Your portal is now active.</p><p>Email: ${client.email}</p><p>${portalUser.createdAt?.getTime() === portalUser.updatedAt?.getTime() ? `Temporary password: ${tempPassword}` : 'Use your existing password or the password reset flow if needed.'}</p><p>Login at: ${process.env.CLIENT_URL}/login</p>`,
    });

    await createActivityLog({
      actor: req.user,
      action: 'client.portal.activated',
      entityType: 'client',
      entityId: client._id,
      title: 'Client portal activated',
      description: `${client.company || client.name} portal was activated.`,
      relatedClient: client._id,
      relatedUser: portalUser._id,
    });

    res.json({ success: true, message: 'Client portal activated and credentials sent', client: serializeClient(client) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
