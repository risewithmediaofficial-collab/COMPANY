// =============================================
// SMM AD SET CONTROLLER
// =============================================
import AdSet from '../../models/smm/adSet.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getAdSets = async (req, res) => {
  try {
    const { campaign, status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (campaign) query.campaign = campaign;
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await AdSet.countDocuments(query);
    const adSets = await AdSet.find(query)
      .populate('campaign', 'name platform status')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: adSets, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdSet = async (req, res) => {
  try {
    const adSet = await AdSet.findById(req.params.id)
      .populate('campaign', 'name platform status project');
    if (!adSet) return res.status(404).json({ success: false, message: 'Ad Set not found' });
    res.json({ success: true, data: adSet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAdSet = async (req, res) => {
  try {
    const adSet = await AdSet.create({ ...req.body, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Ad Set Created',
      entity: 'SmmAdSet',
      entityId: adSet._id,
      entityName: adSet.name,
      performedBy: req.user._id,
    });
    const populated = await AdSet.findById(adSet._id).populate('campaign', 'name platform');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateAdSet = async (req, res) => {
  try {
    const adSet = await AdSet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('campaign', 'name platform');
    if (!adSet) return res.status(404).json({ success: false, message: 'Ad Set not found' });
    await SmmActivityLog.create({
      action: 'Ad Set Updated',
      entity: 'SmmAdSet',
      entityId: adSet._id,
      entityName: adSet.name,
      performedBy: req.user._id,
    });
    res.json({ success: true, data: adSet });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteAdSet = async (req, res) => {
  try {
    const adSet = await AdSet.findByIdAndDelete(req.params.id);
    if (!adSet) return res.status(404).json({ success: false, message: 'Ad Set not found' });
    res.json({ success: true, message: 'Ad Set deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
