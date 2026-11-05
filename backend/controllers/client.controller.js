// =============================================
// CLIENT CONTROLLER
// =============================================

import mongoose from 'mongoose';
import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import ActivityLog from '../models/activityLog.model.js';
import SmmClient from '../models/smm/smmClient.model.js';
import { sendEmail } from '../utils/email.js';
import { createActivityLog } from '../utils/activity.js';
import { moveToRecycleBin } from '../utils/recycleBin.js';
import { emitLiveEvent } from '../utils/socketEmitter.js';
import { parsePagination } from '../utils/pagination.js';

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
  if (['superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager', 'editor', 'designer', 'adsManager', 'financeManager', 'employee', 'intern'].includes(req.user.role)) return { allowed: true };
  if (['client', 'clientAdmin', 'clientMember'].includes(req.user.role)) {
    const userClientId = req.user.clientId?._id || req.user.clientId;
    const isOwner =
      (client.userId && client.userId.toString() === req.user._id.toString()) ||
      (userClientId && client._id.toString() === userClientId.toString()) ||
      (client.email && req.user.email && client.email.toLowerCase() === req.user.email.toLowerCase());
    if (isOwner) return { allowed: true };
    return { allowed: false, status: 403, message: 'Access denied. You can only view your own details.' };
  }
  return { allowed: false, status: 403, message: 'Access denied.' };
};

export const getClients = async (req, res) => {
  try {
    const { status, search, service, createdFrom, createdTo } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 500, maxLimit: 1000 });
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

    if (['client', 'clientAdmin', 'clientMember'].includes(req.user.role)) {
      const userClientId = req.user.clientId?._id || req.user.clientId;
      const clientConditions = [{ userId: req.user._id }];
      if (userClientId) clientConditions.push({ _id: userClientId });
      if (req.user.email) clientConditions.push({ email: req.user.email.toLowerCase().trim() });
      filter.$and = [{ $or: clientConditions }];
    } else if (['employee', 'intern'].includes(req.user.role)) {
      // Employees/interns see assigned clients or unassigned organization clients
      filter.$or = [
        ...(filter.$or || []),
        { assignedTeam: req.user._id },
        { assignedManager: req.user._id },
        { assignedTeam: { $size: 0 } },
        { assignedTeam: { $exists: false } },
      ];
    }

    const [total, clients] = await Promise.all([
      Client.countDocuments(filter),
      Client.find(filter)
        .populate(clientPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      clients: clients.map(serializeClient),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getClient = async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    let client = null;
    const isValidId = mongoose.Types.ObjectId.isValid(rawId);

    if (isValidId) {
      client = await Client.findById(rawId)
        .populate(clientPopulate)
        .populate('convertedFromLead', 'name source value');
    }

    // Fallback 1: Check SmmClient if not found in Client collection
    if (!client && isValidId) {
      const smmClient = await SmmClient.findById(rawId).lean();
      if (smmClient) {
        const matchingClient = smmClient.email
          ? await Client.findOne({ email: smmClient.email.toLowerCase().trim() }).populate(clientPopulate)
          : (smmClient.companyName ? await Client.findOne({ company: { $regex: new RegExp(`^${smmClient.companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).populate(clientPopulate) : null);

        if (matchingClient) {
          client = matchingClient;
        } else {
          try {
            client = await Client.create({
              _id: smmClient._id,
              name: smmClient.primaryContact || smmClient.companyName,
              company: smmClient.companyName,
              email: smmClient.email || `${smmClient._id}@client.internal`,
              phone: smmClient.phone || '',
              status: smmClient.status === 'active' ? 'Active' : 'Inactive',
              services: ['Social Media Marketing'],
              website: smmClient.website || '',
            });
            client = await Client.findById(client._id).populate(clientPopulate);
          } catch (_) {
            client = await Client.findById(smmClient._id).populate(clientPopulate);
          }
        }
      }
    }

    // Fallback 2: Check by exact company name, email, or contact name if identifier is not an ObjectId (or wasn't found by ID)
    if (!client) {
      const decodedId = decodeURIComponent(rawId).trim();
      const escaped = decodedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      client = await Client.findOne({
        $or: [
          { company: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { email: decodedId.toLowerCase() },
          { name: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        ],
      }).populate(clientPopulate);

      // Fallback 2b: Also check SmmClient by name
      if (!client) {
        const smmClient = await SmmClient.findOne({
          $or: [
            { companyName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
            { email: decodedId.toLowerCase() },
            { primaryContact: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          ],
        }).lean();
        if (smmClient) {
          try {
            client = await Client.create({
              _id: smmClient._id,
              name: smmClient.primaryContact || smmClient.companyName,
              company: smmClient.companyName,
              email: smmClient.email || `${smmClient._id}@client.internal`,
              phone: smmClient.phone || '',
              status: smmClient.status === 'active' ? 'Active' : 'Inactive',
              services: ['Social Media Marketing'],
              website: smmClient.website || '',
            });
            client = await Client.findById(client._id).populate(clientPopulate);
          } catch (_) {
            client = await Client.findById(smmClient._id).populate(clientPopulate);
          }
        }
      }
    }

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

// Ensure or synchronize user credentials for client portal
export const ensureClientUserAccount = async (client, reqUserOrOrg) => {
  if (!client || !client.email) return null;
  const cleanEmail = client.email.toLowerCase().trim();
  const rawPhone = (client.phone || '').toString().trim();
  const rawPassword = rawPhone.length >= 6 ? rawPhone : (rawPhone ? rawPhone.padEnd(6, '0') : 'Client@123');
  const orgId = client.organizationId || reqUserOrOrg?.organizationId || (typeof reqUserOrOrg === 'string' ? reqUserOrOrg : undefined);

  let user = await User.findOne({ email: cleanEmail }).select('+password');
  if (!user) {
    user = await User.create({
      name: client.name || client.company || 'Client',
      email: cleanEmail,
      password: rawPassword,
      role: 'client',
      phone: rawPhone,
      clientId: client._id,
      organizationId: orgId,
      isActive: true,
      approvalStatus: 'approved',
    });
  } else {
    let shouldSave = false;
    if (user.role !== 'client') {
      user.role = 'client';
      shouldSave = true;
    }
    if (String(user.clientId || '') !== String(client._id)) {
      user.clientId = client._id;
      shouldSave = true;
    }
    if (rawPhone && user.phone !== rawPhone) {
      user.phone = rawPhone;
      shouldSave = true;
    }
    if (!user.isActive) {
      user.isActive = true;
      shouldSave = true;
    }
    if (user.approvalStatus !== 'approved') {
      user.approvalStatus = 'approved';
      shouldSave = true;
    }
    if (rawPassword) {
      user.password = rawPassword;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
  }

  // Ensure client links back to user and portal is enabled
  if (String(client.userId || '') !== String(user._id) || !client.portalEnabled) {
    client.userId = user._id;
    client.portalEnabled = true;
    await Client.findByIdAndUpdate(client._id, { userId: user._id, portalEnabled: true });
  }

  return user;
};

// Global synchronization for all existing clients to have valid user portal accounts
export const syncAllClientUsers = async () => {
  try {
    const clients = await Client.find({});
    let count = 0;
    for (const client of clients) {
      if (client.email) {
        await ensureClientUserAccount(client);
        count++;
      }
    }
    console.log(`[Sync] Successfully synchronized ${count} client portal user accounts.`);
    return count;
  } catch (err) {
    console.error('[Sync] Error synchronizing client portal accounts:', err.message);
    return 0;
  }
};

export const createClient = async (req, res) => {
  try {
    const payload = normalizeClientPayload(req.body);
    if (req.user?.organizationId) {
      payload.organizationId = req.user.organizationId;
    }

    const client = await Client.create(payload);

    // Auto-create & link client portal user account with email as username and phone as password
    let portalUser = null;
    if (client.email) {
      try {
        portalUser = await ensureClientUserAccount(client, req.user);
      } catch (userErr) {
        console.error('⚠️ Portal user auto-creation error:', userErr.message);
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

    emitLiveEvent('clientCreated', client);

    const populatedClient = await Client.findById(client._id).populate(clientPopulate);
    const rawPhone = (client.phone || '').toString().trim();
    const portalPassword = rawPhone.length >= 6 ? rawPhone : (rawPhone ? rawPhone.padEnd(6, '0') : 'Client@123');

    res.status(201).json({
      success: true,
      client: serializeClient(populatedClient),
      portalCredentials: portalUser
        ? { email: portalUser.email, password: portalPassword }
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

    // Sync portal user account if email or phone exists
    if (client.email) {
      try {
        await ensureClientUserAccount(client, req.user);
      } catch (err) {
        console.error('⚠️ Portal user sync during update skipped:', err.message);
      }
    }

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

    const serialized = serializeClient(client);
    emitLiveEvent('clientUpdated', serialized);

    res.json({ success: true, client: serialized });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    await moveToRecycleBin({
      entityType: 'client',
      originalId: client._id,
      title: client.company || client.name,
      subtitle: client.email || client.phone || '',
      originalLocation: 'Clients 360',
      modelName: 'Client',
      documentData: client,
      user: req.user,
    });

    await Client.findByIdAndDelete(req.params.id);

    // Also remove client portal user if linked
    if (client.userId) {
      await User.findByIdAndDelete(client.userId).catch(() => {});
    }

    await createActivityLog({
      actor: req.user,
      action: 'client.deleted',
      entityType: 'client',
      entityId: client._id,
      title: 'Client deleted',
      description: `${client.company || client.name} was deleted.`,
      relatedClient: client._id,
    });

    emitLiveEvent('clientDeleted', req.params.id);

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

    const portalUser = await ensureClientUserAccount(client, req.user);
    if (!portalUser) {
      return res.status(400).json({ success: false, message: 'Client must have a valid email to activate portal' });
    }

    client.onboardingSteps.portalActivated = true;
    client.onboardingCompleted = Object.values(client.onboardingSteps.toObject ? client.onboardingSteps.toObject() : client.onboardingSteps).every(Boolean);
    await client.save();

    const rawPhone = (client.phone || '').toString().trim();
    const portalPassword = rawPhone.length >= 6 ? rawPhone : (rawPhone ? rawPhone.padEnd(6, '0') : 'Client@123');

    try {
      await sendEmail({
        to: client.email,
        subject: 'Your Client Portal is Ready - RISE WITH MEDIA',
        html: `<h2>Welcome ${client.name}!</h2><p>Your portal is now active.</p><p>Username / Email: <strong>${client.email}</strong></p><p>Password (Phone number): <strong>${portalPassword}</strong></p><p>Login at: ${process.env.CLIENT_URL || 'http://localhost:5173'}/login</p>`,
      });
    } catch (emailErr) {
      console.warn('⚠️ Could not send portal activation email:', emailErr.message);
    }

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

    res.json({
      success: true,
      message: 'Client portal activated and credentials configured',
      client: serializeClient(client),
      credentials: { email: portalUser.email, password: portalPassword },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncPortalUsersHandler = async (req, res) => {
  try {
    const count = await syncAllClientUsers();
    res.json({ success: true, message: `Successfully synchronized ${count} client portal accounts.`, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

