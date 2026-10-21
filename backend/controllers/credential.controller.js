// =============================================
// CLIENT CREDENTIAL CONTROLLER
// =============================================

import ClientCredential from '../models/clientCredential.model.js';
import Client from '../models/client.model.js';
import { encryptData, decryptData } from '../utils/encryption.js';
import { createActivityLog } from '../utils/activity.js';

const sanitizeCredential = (credential) => {
  const item = credential.toObject ? credential.toObject() : credential;

  // Strip per-account encrypted passwords, add a mask flag
  const socialAccounts = (item.socialAccounts || []).map((acc) => ({
    ...acc,
    encryptedPassword: undefined,
    hasPassword: Boolean(acc.encryptedPassword),
  }));

  return {
    ...item,
    encryptedPassword: undefined,
    encryptedData: undefined,
    passwordMask: item.encryptedPassword ? '********' : '',
    socialAccounts,
  };
};

/**
 * Safely verify organization access without throwing if organizationId is undefined
 */
const hasOrgAccess = (user, entityOrgId) => {
  if (!user) return false;
  // SuperAdmin and Admin have universal access across the platform
  if (user.role === 'superAdmin' || user.role === 'admin') return true;
  // If either user or entity has no organizationId assigned, permit access
  if (!user.organizationId || !entityOrgId) return true;
  return user.organizationId.toString() === entityOrgId.toString();
};

/**
 * Helper: Find client record associated with a user
 */
const getClientForUser = async (user) => {
  if (!user) return null;
  if (user.clientId) {
    const client = await Client.findById(user.clientId);
    if (client) return client;
  }
  let client = await Client.findOne({ userId: user._id });
  if (!client && user.email) {
    client = await Client.findOne({ email: user.email.toLowerCase().trim() });
  }
  return client;
};

/**
 * Assert access control for credentials
 */
const assertCredentialAccess = async (req, credential) => {
  if (!credential) {
    return { allowed: false, status: 404, message: 'Credential not found' };
  }

  if (req.user.role === 'superAdmin' || req.user.role === 'admin') return { allowed: true };

  if (req.user.role === 'manager' || req.user.role === 'accountManager') {
    return { allowed: true };
  }

  if (req.user.role === 'employee' || req.user.role === 'intern') {
    return { allowed: true };
  }

  if (req.user.role === 'client') {
    const credClientId = credential.clientId?._id || credential.clientId;
    if (req.user.clientId && String(req.user.clientId) === String(credClientId)) {
      return { allowed: true };
    }
    const userClient = await getClientForUser(req.user);
    if (userClient && String(userClient._id) === String(credClientId)) {
      return { allowed: true };
    }
    return { allowed: false, status: 403, message: 'Access denied: You can only view your own credentials' };
  }

  return { allowed: false, status: 403, message: 'Access denied to this credential' };
};

/**
 * Get all credentials for a client
 */
export const getClientCredentials = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { search, credentialType, page = 1, limit = 20 } = req.query;

    // Verify client exists and user has access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (req.user.role === 'client') {
      const userClient = await getClientForUser(req.user);
      if (!userClient || String(userClient._id) !== String(clientId)) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view your own credentials' });
      }
    } else {
      // Check if client belongs to user's organization
      if (!hasOrgAccess(req.user, client.organizationId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this client' });
      }
    }

    const filter = { clientId, isActive: true };

    if (credentialType) {
      filter.credentialType = credentialType;
    }

    if (search) {
      filter.$or = [
        { credentialName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ClientCredential.countDocuments(filter);
    const credentials = await ClientCredential.find(filter)
      .populate('createdBy', 'name email')
      .populate('lastAccessedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const sanitizedCredentials = credentials.map(sanitizeCredential);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      credentials: sanitizedCredentials,
    });
  } catch (error) {
    console.error('Error fetching client credentials:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch credentials' });
  }
};

/**
 * Get all credentials for the current organization
 */
export const getCredentialsVault = async (req, res) => {
  try {
    const { search, credentialType, clientId, page = 1, limit = 100 } = req.query;

    const filter = { isActive: true };

    if (req.user.role === 'client') {
      const userClient = await getClientForUser(req.user);
      if (!userClient) {
        return res.json({
          success: true,
          total: 0,
          page: 1,
          limit: Number(limit),
          credentials: [],
        });
      }
      filter.clientId = userClient._id;
    } else {
      if (req.user?.role !== 'superAdmin' && req.user?.role !== 'admin' && req.user?.organizationId) {
        filter.$or = [
          { organizationId: req.user.organizationId },
          { organizationId: { $exists: false } },
          { organizationId: null },
        ];
      }

      if (clientId && clientId !== 'all') {
        filter.clientId = clientId;
      }
    }

    if (credentialType && credentialType !== 'all') {
      filter.credentialType = credentialType;
    }

    if (search) {
      const searchConditions = [
        { credentialName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];

      if (req.user.role !== 'client') {
        const clientQuery = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        };
        if (req.user?.role !== 'superAdmin' && req.user?.role !== 'admin' && req.user?.organizationId) {
          clientQuery.organizationId = req.user.organizationId;
        }
        const matchingClients = await Client.find(clientQuery).select('_id');
        searchConditions.push({ clientId: { $in: matchingClients.map((c) => c._id) } });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const total = await ClientCredential.countDocuments(filter);
    const credentials = await ClientCredential.find(filter)
      .populate('clientId', 'name company email')
      .populate('createdBy', 'name email')
      .populate('lastAccessedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      credentials: credentials.map(sanitizeCredential),
    });
  } catch (error) {
    console.error('Error fetching credentials vault:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load credentials vault' });
  }
};

/**
 * Get a single credential with decrypted password
 */
export const getCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const credential = await ClientCredential.findById(credentialId)
      .populate('clientId', 'name company email')
      .populate('createdBy', 'name email')
      .populate('lastAccessedBy', 'name email');

    const accessCheck = await assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (!hasOrgAccess(req.user, credential.organizationId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Decrypt password
    const credentialObj = credential.toObject();
    if (credentialObj.encryptedPassword) {
      credentialObj.password = decryptData(credentialObj.encryptedPassword);
      credentialObj.encryptedPassword = undefined;
    }

    if (credentialObj.encryptedData) {
      try {
        const decrypted = decryptData(credentialObj.encryptedData);
        credentialObj.data = JSON.parse(decrypted);
      } catch (e) {
        credentialObj.data = decryptData(credentialObj.encryptedData);
      }
      credentialObj.encryptedData = undefined;
    }

    // Decrypt per-platform social account passwords
    if (credentialObj.socialAccounts && credentialObj.socialAccounts.length > 0) {
      credentialObj.socialAccounts = credentialObj.socialAccounts.map((acc) => {
        const decryptedAcc = { ...acc };
        if (acc.encryptedPassword) {
          decryptedAcc.password = decryptData(acc.encryptedPassword);
          decryptedAcc.encryptedPassword = undefined;
        }
        return decryptedAcc;
      });
    }

    // Update last accessed info
    await ClientCredential.findByIdAndUpdate(credentialId, {
      lastAccessedBy: req.user._id,
      lastAccessedAt: new Date(),
    });

    // Log activity
    await createActivityLog({
      actor: req.user._id,
      action: 'VIEW_CREDENTIAL',
      entityType: 'ClientCredential',
      entityId: credentialId,
      title: `Viewed credential: ${credential.credentialName}`,
      description: `Decrypted credential for ${credential.credentialName}`,
      relatedClient: credential.clientId?._id || credential.clientId,
    });

    res.json({ success: true, credential: credentialObj });
  } catch (error) {
    console.error('Error fetching credential:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve credential' });
  }
};

/**
 * Create new credential
 */
export const createCredential = async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      credentialName,
      credentialType,
      username,
      password,
      data,
      url,
      notes,
      email,
      mobileNumber,
      expiryDate,
      tags,
      socialAccounts,
    } = req.body;

    if (!credentialName) {
      return res.status(400).json({ success: false, message: 'Credential name is required' });
    }

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Check organization access
    if (!hasOrgAccess(req.user, client.organizationId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this client' });
    }

    // Prepare credential object
    const credentialData = {
      clientId,
      organizationId: req.user?.organizationId || client?.organizationId || undefined,
      credentialName,
      credentialType: credentialType || 'social_media',
      username: username || '',
      email: email || '',
      mobileNumber: mobileNumber || '',
      url: url || '',
      notes: notes || '',
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      createdBy: req.user._id,
      isActive: true,
    };

    // Encrypt password if provided
    if (password) {
      credentialData.encryptedPassword = encryptData(password);
    }

    // Encrypt additional data if provided
    if (data && typeof data === 'object') {
      credentialData.encryptedData = encryptData(JSON.stringify(data));
    }

    // Encrypt per-platform social account passwords
    if (socialAccounts && Array.isArray(socialAccounts)) {
      credentialData.socialAccounts = socialAccounts.map((acc) => {
        const entry = { ...acc };
        if (acc.password) {
          entry.encryptedPassword = encryptData(acc.password);
          delete entry.password;
        }
        return entry;
      });
    }

    if (expiryDate) {
      credentialData.expiryDate = new Date(expiryDate);
    }

    const credential = new ClientCredential(credentialData);
    await credential.save();

    // Log activity
    await createActivityLog({
      actor: req.user._id,
      action: 'CREATE_CREDENTIAL',
      entityType: 'ClientCredential',
      entityId: credential._id,
      title: `Created credential: ${credentialName}`,
      description: `Created credential for client: ${client.name}`,
      relatedClient: client._id,
    });

    res.status(201).json({
      success: true,
      message: 'Credential created successfully',
      credential: credential.toObject(),
    });
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create credential' });
  }
};

/**
 * Update credential
 */
export const updateCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const {
      credentialName,
      credentialType,
      username,
      password,
      data,
      url,
      notes,
      email,
      mobileNumber,
      expiryDate,
      tags,
      isActive,
      socialAccounts,
    } = req.body;

    const credential = await ClientCredential.findById(credentialId);

    const accessCheck = await assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (!hasOrgAccess(req.user, credential.organizationId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update fields
    if (credentialName !== undefined) credential.credentialName = credentialName;
    if (credentialType !== undefined) credential.credentialType = credentialType;
    if (username !== undefined) credential.username = username;
    if (email !== undefined) credential.email = email;
    if (mobileNumber !== undefined) credential.mobileNumber = mobileNumber;
    if (url !== undefined) credential.url = url;
    if (notes !== undefined) credential.notes = notes;
    if (tags !== undefined) {
      credential.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
    }
    if (isActive !== undefined) credential.isActive = isActive;

    // Handle password update
    if (password) {
      credential.encryptedPassword = encryptData(password);
    }

    // Handle data update
    if (data && typeof data === 'object') {
      credential.encryptedData = encryptData(JSON.stringify(data));
    }

    // Update social accounts (re-encrypt passwords)
    if (socialAccounts !== undefined && Array.isArray(socialAccounts)) {
      credential.socialAccounts = socialAccounts.map((acc) => {
        const entry = { ...acc };
        if (acc.password) {
          // New plain-text password provided — encrypt it
          entry.encryptedPassword = encryptData(acc.password);
          delete entry.password;
        } else if (!acc.encryptedPassword) {
          // No password field at all — try to preserve existing one if _id matches
          const existing = credential.socialAccounts?.find(
            (e) => e._id?.toString() === acc._id?.toString()
          );
          if (existing?.encryptedPassword) {
            entry.encryptedPassword = existing.encryptedPassword;
          }
        }
        return entry;
      });
    }

    if (expiryDate !== undefined) {
      credential.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    await credential.save();

    // Log activity
    await createActivityLog({
      actor: req.user._id,
      action: 'UPDATE_CREDENTIAL',
      entityType: 'ClientCredential',
      entityId: credentialId,
      title: `Updated credential: ${credential.credentialName}`,
      description: `Updated credential details for ${credential.credentialName}`,
      relatedClient: credential.clientId,
    });

    res.json({
      success: true,
      message: 'Credential updated successfully',
      credential: credential.toObject(),
    });
  } catch (error) {
    console.error('Error updating credential:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update credential' });
  }
};

/**
 * Delete credential (soft delete)
 */
export const deleteCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const credential = await ClientCredential.findById(credentialId);

    const accessCheck = await assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (!hasOrgAccess(req.user, credential.organizationId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    credential.isActive = false;
    await credential.save();

    // Log activity
    await createActivityLog({
      actor: req.user._id,
      action: 'DELETE_CREDENTIAL',
      entityType: 'ClientCredential',
      entityId: credentialId,
      title: `Deleted credential: ${credential.credentialName}`,
      description: `Removed credential from vault`,
      relatedClient: credential.clientId,
    });

    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete credential' });
  }
};

/**
 * Get credential access logs
 */
export const getCredentialLogs = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const credential = await ClientCredential.findById(credentialId);
    if (!credential) {
      return res.status(404).json({ success: false, message: 'Credential not found' });
    }

    // Check organization access
    if (!hasOrgAccess(req.user, credential.organizationId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      message: 'Logs retrieved successfully',
      logs: [],
    });
  } catch (error) {
    console.error('Error getting credential logs:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve logs' });
  }
};
