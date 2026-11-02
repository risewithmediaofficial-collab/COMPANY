import RecycleBin from '../models/recycleBin.model.js';
import { createActivityLog } from './activity.js';

/**
 * Move a deleted document into the RecycleBin collection
 */
export const moveToRecycleBin = async ({
  entityType,
  originalId,
  title,
  subtitle = '',
  originalLocation = '',
  modelName,
  documentData,
  user,
  metadata = {},
}) => {
  try {
    if (!documentData) return null;

    // Convert Mongoose doc or mongoose query result to plain object
    let plainDoc = documentData;
    if (typeof documentData.toObject === 'function') {
      plainDoc = documentData.toObject();
    } else {
      plainDoc = JSON.parse(JSON.stringify(documentData));
    }

    delete plainDoc.__v;

    const resolvedId = originalId || plainDoc._id;
    const resolvedTitle = title || plainDoc.name || plainDoc.title || plainDoc.invoiceNumber || plainDoc.company || 'Untitled Item';

    const binItem = await RecycleBin.create({
      entityType: String(entityType).toLowerCase(),
      originalId: resolvedId,
      title: resolvedTitle,
      subtitle: subtitle || plainDoc.company || plainDoc.clientName || '',
      originalLocation: originalLocation || entityType,
      modelName,
      documentData: plainDoc,
      deletedBy: user?._id || user,
      deletedByRole: user?.role || '',
      metadata,
    });

    if (global.io) {
      try {
        const populated = await RecycleBin.findById(binItem._id)
          .populate('deletedBy', 'name email avatar role')
          .lean();
        global.io.emit('recycleBinItemAdded', populated || binItem);
      } catch (e) {
        console.error('Recycle bin socket emit error:', e.message);
      }
    }

    return binItem;
  } catch (error) {
    console.error('Failed to move item to Recycle Bin:', error.message);
    return null;
  }
};
