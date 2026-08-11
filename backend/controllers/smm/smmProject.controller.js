// =============================================
// SMM PROJECT CONTROLLER (Uses Agency CRM Project Model)
// =============================================
import Project from '../../models/project.model.js';
import SmmProject from '../../models/smm/smmProject.model.js';

export const getSmmProjects = async (req, res) => {
  try {
    const { client, status, search } = req.query;
    const query = {};
    if (client) query.client = client;
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const [crmProjects, smmProjectsList] = await Promise.all([
      Project.find(query).populate('client', 'name company logo').sort({ name: 1 }),
      SmmProject.find(query).populate('client', 'companyName brandLogo').sort({ name: 1 }),
    ]);

    const combinedMap = new Map();
    crmProjects.forEach((p) => {
      combinedMap.set(p._id.toString(), {
        _id: p._id,
        name: p.name,
        client: p.client,
        status: p.status,
        category: p.category,
        budget: p.budget,
        currency: p.currency || 'INR',
        source: 'CRM',
      });
    });

    smmProjectsList.forEach((p) => {
      if (!combinedMap.has(p._id.toString())) {
        combinedMap.set(p._id.toString(), {
          _id: p._id,
          name: p.name,
          client: p.client,
          status: p.status,
          category: 'social_media',
          budget: p.budget,
          currency: p.currency || 'INR',
          source: 'SMM',
        });
      }
    });

    const projects = Array.from(combinedMap.values());

    res.json({ success: true, data: projects, total: projects.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id).populate('client', 'name company logo');
    if (!project) {
      project = await SmmProject.findById(req.params.id).populate('client', 'companyName brandLogo');
    }
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      client: req.body.client,
      category: 'social_media',
      status: 'active',
      budget: req.body.budget || 0,
    });
    const populated = await Project.findById(project._id).populate('client', 'name company logo');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmProject = async (req, res) => {
  try {
    let project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) {
      project = await SmmProject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmProject = async (req, res) => {
  try {
    let project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      project = await SmmProject.findByIdAndDelete(req.params.id);
    }
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
