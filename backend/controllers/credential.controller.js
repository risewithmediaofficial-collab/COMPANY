// =============================================
// CLIENT CREDENTIAL CONTROLLER
// =============================================

import ClientCredential from '../models/clientCredential.model.js';
import Client from '../models/client.model.js';
import { encryptData, decryptData } from '../utils/encryption.js';
import { createActivityLog } from '../utils/activity.js';

const sanitizeCredential = (credential) => {
  const item = credential.toObject ? credential.toObject() : credential;

  return {
    ...item,
    encryptedPassword: undefined,
    encryptedData: undefined,
    passwordMask: item.encryptedPassword ? '********' : '',
  };
};

/**
 * Assert access control for credentials
 */
const assertCredentialAccess = (req, credential) => {
  if (!credential) {
    return { allowed: false, status: 404, message: 'Credential not found' };
  }

  if (req.user.role === 'superAdmin' || req.user.role === 'admin') return { allowed: true };

  if (req.user.role === 'manager') {
    // Managers can only access credentials for clients they manage
    return { allowed: true }; // TODO: Add manager-client validation
  }

  if (req.user.role === 'employee') {
    // Employees can access credentials for clients in their team
    return { allowed: true }; // TODO: Add team validation
  }

  return { allowed: false, status: 403, message: 'Access denied' };
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

    // Check if client belongs to user's organization
    if (client.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filter = { clientId, organizationId: req.user.organizationId, isActive: true };

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
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all credentials for the current organization
 */
export const getCredentialsVault = async (req, res) => {
  try {
    const { search, credentialType, clientId, page = 1, limit = 100 } = req.query;

    const filter = { organizationId: req.user.organizationId, isActive: true };

    if (credentialType && credentialType !== 'all') {
      filter.credentialType = credentialType;
    }

    if (clientId && clientId !== 'all') {
      filter.clientId = clientId;
    }

    if (search) {
      const matchingClients = await Client.find({
        organizationId: req.user.organizationId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [
        { credentialName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { clientId: { $in: matchingClients.map((client) => client._id) } },
      ];
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
    res.status(500).json({ success: false, message: error.message });
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

    const accessCheck = assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (credential.organizationId.toString() !== req.user.organizationId.toString()) {
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

    // Update last accessed info
    await ClientCredential.findByIdAndUpdate(credentialId, {
      lastAccessedBy: req.user._id,
      lastAccessedAt: new Date(),
    });

    // Log activity
    await createActivityLog({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: 'VIEW_CREDENTIAL',
      resourceType: 'ClientCredential',
      resourceId: credentialId,
      details: `Viewed credential: ${credential.credentialName}`,
    });

    res.json({ success: true, credential: credentialObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create new credential
 */
export const createCredential = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { credentialName, credentialType, username, password, data, url, notes, expiryDate, tags } =
      req.body;

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Check organization access
    if (client.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prepare credential object
    const credentialData = {
      clientId,
      organizationId: req.user.organizationId,
      credentialName,
      credentialType: credentialType || 'password',
      username: username || '',
      url: url || '',
      notes: notes || '',
      tags: tags || [],
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

    if (expiryDate) {
      credentialData.expiryDate = new Date(expiryDate);
    }

    const credential = new ClientCredential(credentialData);
    await credential.save();

    // Log activity
    await createActivityLog({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: 'CREATE_CREDENTIAL',
      resourceType: 'ClientCredential',
      resourceId: credential._id,
      details: `Created credential: ${credentialName} for client: ${client.name}`,
    });

    res.status(201).json({
      success: true,
      message: 'Credential created successfully',
      credential: credential.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update credential
 */
export const updateCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { credentialName, credentialType, username, password, data, url, notes, expiryDate, tags, isActive } =
      req.body;

    const credential = await ClientCredential.findById(credentialId);

    const accessCheck = assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update fields
    if (credentialName !== undefined) credential.credentialName = credentialName;
    if (credentialType !== undefined) credential.credentialType = credentialType;
    if (username !== undefined) credential.username = username;
    if (url !== undefined) credential.url = url;
    if (notes !== undefined) credential.notes = notes;
    if (tags !== undefined) credential.tags = tags;
    if (isActive !== undefined) credential.isActive = isActive;

    // Handle password update
    if (password) {
      credential.encryptedPassword = encryptData(password);
    }

    // Handle data update
    if (data && typeof data === 'object') {
      credential.encryptedData = encryptData(JSON.stringify(data));
    }

    if (expiryDate !== undefined) {
      credential.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    await credential.save();

    // Log activity
    await createActivityLog({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: 'UPDATE_CREDENTIAL',
      resourceType: 'ClientCredential',
      resourceId: credentialId,
      details: `Updated credential: ${credential.credentialName}`,
    });

    res.json({
      success: true,
      message: 'Credential updated successfully',
      credential: credential.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete credential (soft delete)
 */
export const deleteCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const credential = await ClientCredential.findById(credentialId);

    const accessCheck = assertCredentialAccess(req, credential);
    if (!accessCheck.allowed) {
      return res.status(accessCheck.status).json({ success: false, message: accessCheck.message });
    }

    // Check organization access
    if (credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    credential.isActive = false;
    await credential.save();

    // Log activity
    await createActivityLog({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: 'DELETE_CREDENTIAL',
      resourceType: 'ClientCredential',
      resourceId: credentialId,
      details: `Deleted credential: ${credential.credentialName}`,
    });

    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get logs for this credential
    // This would require implementing activity logs query
    res.json({
      success: true,
      message: 'Logs retrieved successfully',
      logs: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
