// =============================================
// SMM NOTE CONTROLLER
// =============================================
import SmmNote from '../../models/smm/smmNote.model.js';

export const getSmmNotes = async (req, res) => {
  try {
    const { entityType, entityId, type } = req.query;
    const query = {};
    if (entityType) query['relatedTo.entityType'] = entityType;
    if (entityId) query['relatedTo.entityId'] = entityId;
    if (type) query.type = type;

    const notes = await SmmNote.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmNote = async (req, res) => {
  try {
    const note = await SmmNote.create({ ...req.body, createdBy: req.user._id });
    const populated = await SmmNote.findById(note._id).populate('createdBy', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmNote = async (req, res) => {
  try {
    const note = await SmmNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
