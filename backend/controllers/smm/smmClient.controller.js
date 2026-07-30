// =============================================
// SMM CLIENT CONTROLLER
// =============================================
import SmmClient from '../../models/smm/smmClient.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getSmmClients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$text = { $search: search };
    if (status) query.status = status;

    const total = await SmmClient.countDocuments(query);
    const clients = await SmmClient.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: clients, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmClient = async (req, res) => {
  try {
    const client = await SmmClient.findById(req.params.id).populate('createdBy', 'name');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmClient = async (req, res) => {
  try {
    const client = await SmmClient.create({ ...req.body, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Client Created',
      entity: 'SmmClient',
      entityId: client._id,
      entityName: client.companyName,
      performedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmClient = async (req, res) => {
  try {
    const client = await SmmClient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmClient = async (req, res) => {
  try {
    const client = await SmmClient.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
