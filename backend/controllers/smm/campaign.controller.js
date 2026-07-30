// =============================================
// SMM CAMPAIGN CONTROLLER
// =============================================
import Campaign from '../../models/smm/campaign.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

const populateCampaign = (query) =>
  query
    .populate('client', 'name company email logo')
    .populate({ path: 'project', select: 'name status client', populate: { path: 'client', select: 'name company' } })
    .populate('team.campaignManager', 'name')
    .populate('team.performanceMarketer', 'name')
    .populate('team.designer', 'name')
    .populate('team.videoEditor', 'name')
    .populate('team.copywriter', 'name')
    .populate('createdBy', 'name');

export const getCampaigns = async (req, res) => {
  try {
    const { project, status, platform, objective, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (project) query.project = project;
    if (status) query.status = status;
    if (platform) query.platform = platform;
    if (objective) query.objective = objective;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await Campaign.countDocuments(query);
    const campaigns = await populateCampaign(
      Campaign.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
    );

    res.json({ success: true, data: campaigns, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaign = async (req, res) => {
  try {
    const campaign = await populateCampaign(Campaign.findById(req.params.id));
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Campaign Created',
      entity: 'SmmCampaign',
      entityId: campaign._id,
      entityName: campaign.name,
      performedBy: req.user._id,
    });
    const populated = await populateCampaign(Campaign.findById(campaign._id));
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const prevCampaign = await Campaign.findById(req.params.id);
    const campaign = await populateCampaign(
      Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    );
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const action = prevCampaign?.status !== req.body.status
      ? 'Status Changed'
      : prevCampaign?.dailyBudget !== req.body.dailyBudget
        ? 'Budget Changed'
        : 'Campaign Updated';

    await SmmActivityLog.create({
      action,
      entity: 'SmmCampaign',
      entityId: campaign._id,
      entityName: campaign.name,
      performedBy: req.user._id,
      metadata: { changes: req.body },
    });

    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCampaignPerformance = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { performance: req.body } },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkUpdateCampaignStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ success: false, message: 'ids and status required' });
    await Campaign.updateMany({ _id: { $in: ids } }, { status });
    res.json({ success: true, message: `${ids.length} campaigns updated` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
