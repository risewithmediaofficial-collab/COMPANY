// =============================================
// SMM CREATIVE CONTROLLER
// =============================================
import Creative from '../../models/smm/creative.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getCreatives = async (req, res) => {
  try {
    const { type, platform, tags, search, isArchived = false, page = 1, limit = 50 } = req.query;
    const query = { isArchived: isArchived === 'true' };
    if (type) query.type = type;
    if (platform) query.platform = { $in: [platform] };
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) query.$or = [
      { caption: { $regex: search, $options: 'i' } },
      { headline: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];

    const total = await Creative.countDocuments(query);
    const creatives = await Creative.find(query)
      .populate('uploadedBy', 'name')
      .populate('campaign', 'name')
      .populate('client', 'companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: creatives, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCreative = async (req, res) => {
  try {
    const creative = await Creative.create({ ...req.body, uploadedBy: req.user._id, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Creative Uploaded',
      entity: 'SmmCreative',
      entityId: creative._id,
      entityName: creative.headline || creative.type,
      performedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: creative });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCreative = async (req, res) => {
  try {
    const creative = await Creative.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('uploadedBy', 'name');
    if (!creative) return res.status(404).json({ success: false, message: 'Creative not found' });
    res.json({ success: true, data: creative });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteCreative = async (req, res) => {
  try {
    const creative = await Creative.findByIdAndDelete(req.params.id);
    if (!creative) return res.status(404).json({ success: false, message: 'Creative not found' });
    res.json({ success: true, message: 'Creative deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
