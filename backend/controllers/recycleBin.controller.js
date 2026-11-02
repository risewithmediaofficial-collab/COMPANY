import mongoose from 'mongoose';
import RecycleBin from '../models/recycleBin.model.js';
import { createActivityLog } from '../utils/activity.js';

// Ensure models are registered with Mongoose
import '../models/task.model.js';
import '../models/project.model.js';
import '../models/client.model.js';
import '../models/lead.model.js';
import '../models/expense.model.js';
import '../models/invoice.model.js';
import '../models/proposal.model.js';
import '../models/sop.model.js';
import '../models/asset.model.js';

/**
 * Get all deleted items in Recycle Bin
 * @route GET /api/recycle-bin
 */
export const getRecycleBinItems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;
    const { entityType, search } = req.query;

    const query = {};
    if (entityType && entityType !== 'all') {
      query.entityType = entityType.toLowerCase();
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { subtitle: { $regex: s, $options: 'i' } },
        { originalLocation: { $regex: s, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      RecycleBin.find(query)
        .populate('deletedBy', 'name email avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RecycleBin.countDocuments(query),
    ]);

    // Also get breakdown counts by entityType
    const breakdown = await RecycleBin.aggregate([
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
    ]);

    const countsByType = { all: total };
    breakdown.forEach((b) => {
      countsByType[b._id] = b.count;
    });

    res.json({
      success: true,
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      countsByType,
    });
  } catch (error) {
    console.error('getRecycleBinItems error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Restore an item from Recycle Bin back to its original location
 * @route POST /api/recycle-bin/:id/restore
 */
export const restoreItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await RecycleBin.findById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in Recycle Bin' });
    }

    let Model;
    try {
      Model = mongoose.model(item.modelName);
    } catch (e) {
      return res.status(400).json({ success: false, message: `Unknown model: ${item.modelName}` });
    }

    const docData = item.documentData || {};
    let restoredDoc = null;

    // Check if a document with originalId already exists (e.g. marked soft-deleted)
    const existing = await Model.findById(item.originalId);
    if (existing) {
      if ('isDeleted' in existing) {
        existing.isDeleted = false;
        existing.deletedAt = undefined;
        restoredDoc = await existing.save();
      } else {
        restoredDoc = await Model.findByIdAndUpdate(item.originalId, docData, { new: true, upsert: true });
      }
    } else {
      // Re-create the document with original data (including _id)
      try {
        restoredDoc = await Model.create(docData);
      } catch (createErr) {
        // If unique index conflict with _id, try without _id
        const docCopy = { ...docData };
        delete docCopy._id;
        restoredDoc = await Model.create(docCopy);
      }
    }

    // If metadata contains associated tasks (e.g. tasks belonging to a deleted project), restore them too
    if (Array.isArray(item.metadata?.associatedTasks) && item.metadata.associatedTasks.length > 0) {
      try {
        const TaskModel = mongoose.model('Task');
        for (const t of item.metadata.associatedTasks) {
          const taskExists = await TaskModel.findById(t._id);
          if (!taskExists) {
            await TaskModel.create(t).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed restoring associated tasks:', err.message);
      }
    }

    // Remove from Recycle Bin
    await RecycleBin.findByIdAndDelete(id);

    // Record in Audit Logs
    await createActivityLog({
      actor: req.user,
      action: `${item.entityType}.restored`,
      entityType: item.entityType,
      entityId: restoredDoc?._id || item.originalId,
      title: `${item.title} restored`,
      description: `Restored "${item.title}" to its original location (${item.originalLocation || item.entityType}).`,
      metadata: {
        originalLocation: item.originalLocation,
        modelName: item.modelName,
        restoredAt: new Date(),
      },
    });

    // Real-time socket events
    if (global.io) {
      global.io.emit('recycleBinItemRestored', { id, entityType: item.entityType, originalId: item.originalId });
      global.io.emit(`${item.entityType}Created`, restoredDoc);
      global.io.emit('metricsUpdated', { action: 'restored', entityType: item.entityType });
    }

    res.json({
      success: true,
      message: `"${item.title}" successfully restored to ${item.originalLocation || 'its original location'}!`,
      restoredDoc,
    });
  } catch (error) {
    console.error('restoreItem error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Permanently delete an item from Recycle Bin
 * @route DELETE /api/recycle-bin/:id/permanent
 */
export const permanentDeleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await RecycleBin.findById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in Recycle Bin' });
    }

    // If underlying model has soft-deleted doc, remove it permanently
    try {
      const Model = mongoose.model(item.modelName);
      if (Model) {
        await Model.findByIdAndDelete(item.originalId);
      }
    } catch (e) {}

    await RecycleBin.findByIdAndDelete(id);

    // Record in Audit Logs
    await createActivityLog({
      actor: req.user,
      action: `${item.entityType}.permanently_deleted`,
      entityType: item.entityType,
      entityId: item.originalId,
      title: `${item.title} permanently deleted`,
      description: `"${item.title}" was permanently purged from the system.`,
      metadata: {
        originalLocation: item.originalLocation,
        modelName: item.modelName,
      },
    });

    if (global.io) {
      global.io.emit('recycleBinItemDeleted', { id });
    }

    res.json({ success: true, message: `"${item.title}" permanently deleted.` });
  } catch (error) {
    console.error('permanentDeleteItem error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Empty all items from Recycle Bin
 * @route POST /api/recycle-bin/empty
 */
export const emptyRecycleBin = async (req, res) => {
  try {
    const count = await RecycleBin.countDocuments();
    await RecycleBin.deleteMany({});

    await createActivityLog({
      actor: req.user,
      action: 'recycle_bin.emptied',
      entityType: 'recycle_bin',
      entityId: req.user._id,
      title: 'Recycle Bin emptied',
      description: `All ${count} items were permanently purged from the Recycle Bin.`,
    });

    if (global.io) {
      global.io.emit('recycleBinEmptied', { count });
    }

    res.json({ success: true, message: `All ${count} items permanently deleted.` });
  } catch (error) {
    console.error('emptyRecycleBin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
