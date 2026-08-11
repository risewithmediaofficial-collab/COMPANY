// =============================================
// SMM CONTENT CONTROLLER
// =============================================
import SmmContent from '../../models/smm/smmContent.model.js';
import Client from '../../models/client.model.js';
import Project from '../../models/project.model.js';

export const getSmmContents = async (req, res) => {
  try {
    const {
      client,
      project,
      contentType,
      postingStatus,
      platform,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;
    if (contentType) query.contentType = contentType;
    if (postingStatus) query.postingStatus = postingStatus;
    if (platform) query.platforms = platform;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const total = await SmmContent.countDocuments(query);
    const contents = await SmmContent.find(query)
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, data: contents, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmContentById = async (req, res) => {
  try {
    const content = await SmmContent.findById(req.params.id)
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .populate('linkedAdCampaignIds', 'name status platform dailyBudget amountSpent')
      .populate('createdBy', 'name');

    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmContent = async (req, res) => {
  try {
    const { client, project, name, contentType, platforms } = req.body;

    if (!client || !project) {
      return res.status(400).json({
        success: false,
        message: 'Client and Project selection are required before creating content.',
      });
    }

    if (!name || !contentType || !platforms || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content Name, Content Type, and Platform(s) are required fields.',
      });
    }

    // Verify client & project exist
    const clientExists = await Client.findById(client);
    if (!clientExists) return res.status(404).json({ success: false, message: 'Selected Client not found' });

    const projectExists = await Project.findById(project);
    if (!projectExists) return res.status(404).json({ success: false, message: 'Selected Project not found' });

    // Validate project belongs to client
    if (projectExists.client.toString() !== client.toString()) {
      return res.status(400).json({
        success: false,
        message: 'The selected project does not belong to the selected client.',
      });
    }

    const payload = {
      ...req.body,
      createdBy: req.user?._id,
    };

    // Handle actual posted date/time tracking
    if (req.body.postingStatus === 'Published' && !req.body.actualPostedDate) {
      payload.actualPostedDate = new Date();
      payload.actualPostedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const content = await SmmContent.create(payload);
    const populated = await SmmContent.findById(content._id)
      .populate('client', 'name company logo')
      .populate('project', 'name category status');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmContent = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.client && updates.project) {
      const projectExists = await Project.findById(updates.project);
      if (projectExists && projectExists.client.toString() !== updates.client.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Selected project does not belong to selected client.',
        });
      }
    }

    if (updates.postingStatus === 'Published' && !updates.actualPostedDate) {
      updates.actualPostedDate = new Date();
      updates.actualPostedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const content = await SmmContent.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('client', 'name company logo')
      .populate('project', 'name category status');

    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateContentPerformance = async (req, res) => {
  try {
    const { performance } = req.body;
    const content = await SmmContent.findById(req.params.id);

    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });

    content.performance = { ...content.performance.toObject(), ...performance };
    await content.save();

    res.json({ success: true, data: content });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmContent = async (req, res) => {
  try {
    const content = await SmmContent.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublishedContentForAd = async (req, res) => {
  try {
    const { client, project, platform } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (platform) query.platforms = platform;

    const publishedContents = await SmmContent.find(query)
      .select('name contentType platforms actualPostedDate scheduledDate mediaUpload thumbnail caption client project postingStatus')
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .sort({ actualPostedDate: -1, createdAt: -1 });

    res.json({ success: true, data: publishedContents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
