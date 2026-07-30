// =============================================
// SMM PROJECT CONTROLLER
// =============================================
import SmmProject from '../../models/smm/smmProject.model.js';
import SmmActivityLog from '../../models/smm/smmActivityLog.model.js';

export const getSmmProjects = async (req, res) => {
  try {
    const { client, status, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (client) query.client = client;
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const total = await SmmProject.countDocuments(query);
    const projects = await SmmProject.find(query)
      .populate('client', 'companyName brandLogo')
      .populate('projectManager', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: projects, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmProject = async (req, res) => {
  try {
    const project = await SmmProject.findById(req.params.id)
      .populate('client', 'companyName brandLogo website')
      .populate('projectManager', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmProject = async (req, res) => {
  try {
    const project = await SmmProject.create({ ...req.body, createdBy: req.user._id });
    await SmmActivityLog.create({
      action: 'Project Created',
      entity: 'SmmProject',
      entityId: project._id,
      entityName: project.name,
      performedBy: req.user._id,
    });
    const populated = await SmmProject.findById(project._id)
      .populate('client', 'companyName').populate('projectManager', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmProject = async (req, res) => {
  try {
    const project = await SmmProject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('client', 'companyName').populate('projectManager', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmProject = async (req, res) => {
  try {
    const project = await SmmProject.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
