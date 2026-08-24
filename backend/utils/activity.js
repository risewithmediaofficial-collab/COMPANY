import ActivityLog from '../models/activityLog.model.js';

export const createActivityLog = async ({
  actor,
  action,
  entityType,
  entityId,
  title,
  description = '',
  relatedClient,
  relatedProject,
  relatedTask,
  relatedInvoice,
  relatedUser,
  metadata = {},
}) => {
  try {
    const log = await ActivityLog.create({
      actor: actor?._id || actor || undefined,
      actorRole: actor?.role || '',
      action,
      entityType,
      entityId,
      title,
      description,
      relatedClient,
      relatedProject,
      relatedTask,
      relatedInvoice,
      relatedUser,
      metadata,
    });

    if (global.io) {
      try {
        const populated = await ActivityLog.findById(log._id)
          .populate('actor', 'name email avatar role')
          .lean();
        global.io.emit('activityLogged', populated || log);
        global.io.emit('metricsUpdated', { action, entityType, entityId });
      } catch (emitErr) {
        console.error('Failed to emit activity socket:', emitErr.message);
      }
    }

    return log;
  } catch (error) {
    console.error('Activity log failed:', error.message);
    return null;
  }
};
