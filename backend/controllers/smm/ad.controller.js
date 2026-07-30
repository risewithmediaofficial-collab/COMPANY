// =============================================
// SMM AD CONTROLLER
// =============================================
import Ad from '../../models/smm/ad.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getAds = async (req, res) => {
  try {
    const { adSet, status, approvalStatus, creativeType, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (adSet) query.adSet = adSet;
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (creativeType) query.creativeType = creativeType;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await Ad.countDocuments(query);
    const ads = await Ad.find(query)
      .populate('adSet', 'name campaign')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: ads, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate('adSet', 'name campaign').populate('createdBy', 'name');
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAd = async (req, res) => {
  try {
    const ad = await Ad.create({ ...req.body, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Ad Published',
      entity: 'SmmAd',
      entityId: ad._id,
      entityName: ad.name,
      performedBy: req.user._id,
    });
    const populated = await Ad.findById(ad._id).populate('adSet', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('adSet', 'name');
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    await SmmActivityLog.create({
      action: 'Ad Updated',
      entity: 'SmmAd',
      entityId: ad._id,
      entityName: ad.name,
      performedBy: req.user._id,
    });
    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    res.json({ success: true, message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAdApproval = async (req, res) => {
  try {
    const { approvalStatus, approvalNotes } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { approvalStatus, approvalNotes },
      { new: true }
    );
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    await SmmActivityLog.create({
      action: approvalStatus === 'Approved' ? 'Approval Given' : 'Approval Rejected',
      entity: 'SmmAd',
      entityId: ad._id,
      entityName: ad.name,
      performedBy: req.user._id,
      metadata: { approvalStatus, approvalNotes },
    });
    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateAdPerformance = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $set: { performance: req.body } },
      { new: true, runValidators: true }
    ).populate('adSet', 'name');
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    
    await SmmActivityLog.create({
      action: 'Ad Metrics Updated',
      entity: 'SmmAd',
      entityId: ad._id,
      entityName: ad.name,
      performedBy: req.user._id,
      metadata: { performance: req.body },
    });

    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
