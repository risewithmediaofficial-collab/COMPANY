import Asset from '../models/asset.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';
import { createActivityLog } from '../utils/activity.js';

const normalizeFiles = (files) => {
  if (!Array.isArray(files)) return [];
  return files
    .filter(Boolean)
    .map((file) => ({
      name: file.name || 'Asset file',
      url: file.url || '',
      type: file.type || '',
      size: Number(file.size) || 0,
    }))
    .filter((file) => file.url);
};

const normalizeTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item.toString().trim()).filter(Boolean);
  return value.toString().split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeAssetPayload = (body = {}) => {
  const payload = { ...body };
  if (payload.tags !== undefined) payload.tags = normalizeTags(payload.tags);
  if (payload.files !== undefined) payload.files = normalizeFiles(payload.files);
  if (payload.isClientVisible !== undefined) payload.isClientVisible = Boolean(payload.isClientVisible);
  return payload;
};

const buildAssetFilter = async (req, baseFilter = {}) => {
  const filter = { ...baseFilter };

  if (req.user.role === 'client') {
    const client = await Client.findOne({ userId: req.user._id }).select('_id');
    if (!client) return { ...filter, _id: null };
    filter.client = client._id;
    filter.isClientVisible = true;
    return filter;
  }

  return filter;
};

const hydrateAsset = (assetId) => Asset.findById(assetId)
  .populate('client', 'name company logo')
  .populate('project', 'name')
  .populate('uploadedBy', 'name avatar role');

const assertAssetAccess = async (req, asset) => {
  if (!asset) return { allowed: false, status: 404, message: 'Asset not found' };
  if (req.user.role === 'superAdmin' || req.user.role === 'admin') return { allowed: true };

  if (req.user.role === 'client') {
    const client = await Client.findOne({ userId: req.user._id }).select('_id');
    if (client && asset.client?.toString() === client._id.toString() && asset.isClientVisible) {
      return { allowed: true };
    }
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user.role === 'manager') {
    const client = await Client.findById(asset.client).select('assignedManager');
    const project = asset.project ? await Project.findById(asset.project).select('manager') : null;
    if (client?.assignedManager?.toString() === req.user._id.toString()) return { allowed: true };
    if (project?.manager?.toString() === req.user._id.toString()) return { allowed: true };
  }

  if (req.user.role === 'employee') {
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};

export const getAssets = async (req, res) => {
  try {
    const { search, client, project, category, visible } = req.query;
    const filter = {};

    if (client && client !== 'all') filter.client = client;
    if (project && project !== 'all') filter.project = project;
    if (category && category !== 'all') filter.category = category;
    if (visible === 'true') filter.isClientVisible = true;
    if (visible === 'false') filter.isClientVisible = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const scopedFilter = withWorkspaceScope(req, await buildAssetFilter(req, filter));
    const assets = await Asset.find(scopedFilter)
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('uploadedBy', 'name avatar role')
      .sort({ createdAt: -1 });

    res.json({ success: true, assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAsset = async (req, res) => {
  try {
    const asset = await hydrateAsset(req.params.id);
    const access = await assertAssetAccess(req, asset);
    if (!access.allowed) return res.status(access.status).json({ success: false, message: access.message });
    res.json({ success: true, asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAsset = async (req, res) => {
  try {
    const payload = normalizeAssetPayload(req.body);
    if (!payload.name?.trim()) return res.status(400).json({ success: false, message: 'Asset name is required' });
    if (!payload.client) return res.status(400).json({ success: false, message: 'Client is required' });
    if (!payload.files?.length) return res.status(400).json({ success: false, message: 'At least one file is required' });

    const client = await Client.findById(payload.client).select('_id');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (payload.project) {
      const project = await Project.findById(payload.project).select('client');
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      if (project.client?.toString() !== payload.client.toString()) {
        return res.status(400).json({ success: false, message: 'Selected project does not belong to the selected client' });
      }
    }

    const asset = await Asset.create({
      ...payload,
      uploadedBy: req.user._id,
    });

    await createActivityLog({
      actor: req.user,
      action: 'asset.created',
      entityType: 'project',
      entityId: asset._id,
      title: 'Asset uploaded',
      description: `${asset.name} was added to the asset library.`,
      relatedClient: asset.client,
      relatedProject: asset.project,
      metadata: { category: asset.category },
    });

    const hydrated = await hydrateAsset(asset._id);
    res.status(201).json({ success: true, asset: hydrated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    const access = await assertAssetAccess(req, asset);
    if (!access.allowed) return res.status(access.status).json({ success: false, message: access.message });
    if (req.user.role === 'client') return res.status(403).json({ success: false, message: 'Clients cannot update assets' });

    const payload = normalizeAssetPayload(req.body);
    if (payload.project || payload.client) {
      const nextClient = payload.client || asset.client;
      const nextProject = payload.project || asset.project;
      if (nextProject) {
        const project = await Project.findById(nextProject).select('client');
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.client?.toString() !== nextClient.toString()) {
          return res.status(400).json({ success: false, message: 'Selected project does not belong to the selected client' });
        }
      }
    }

    Object.assign(asset, payload);
    await asset.save();

    const hydrated = await hydrateAsset(asset._id);
    res.json({ success: true, asset: hydrated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    const access = await assertAssetAccess(req, asset);
    if (!access.allowed) return res.status(access.status).json({ success: false, message: access.message });
    if (req.user.role === 'client') return res.status(403).json({ success: false, message: 'Clients cannot delete assets' });

    await asset.deleteOne();
    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
