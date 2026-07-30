// =============================================
// SMM TASK CONTROLLER
// =============================================
import SmmTask from '../../models/smm/smmTask.model.js';

export const getSmmTasks = async (req, res) => {
  try {
    const { campaign, assignedTo, status, priority, page = 1, limit = 100 } = req.query;
    const query = {};
    if (campaign) query.campaign = campaign;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const total = await SmmTask.countDocuments(query);
    const tasks = await SmmTask.find(query)
      .populate('assignedTo', 'name')
      .populate('campaign', 'name')
      .populate('createdBy', 'name')
      .sort({ deadline: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: tasks, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmTask = async (req, res) => {
  try {
    const task = await SmmTask.create({ ...req.body, createdBy: req.user._id });
    const populated = await SmmTask.findById(task._id).populate('assignedTo', 'name').populate('campaign', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmTask = async (req, res) => {
  try {
    const task = await SmmTask.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name').populate('campaign', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmTask = async (req, res) => {
  try {
    const task = await SmmTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const task = await SmmTask.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { text: req.body.text, author: req.user._id } } },
      { new: true }
    ).populate('comments.author', 'name');
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
