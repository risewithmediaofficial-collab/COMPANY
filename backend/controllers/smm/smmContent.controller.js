// =============================================
// SMM CONTENT CONTROLLER (Video OS Central Object)
// =============================================
import SmmContent from '../../models/smm/smmContent.model.js';
import Client from '../../models/client.model.js';
import Project from '../../models/project.model.js';

// Rule-based Video Performance Scoring & Ad Recommendation
export const calculatePerformanceScore = (p = {}) => {
  const views = Number(p.views || p.videoViews || p.plays || 0);
  const likes = Number(p.likes || 0);
  const comments = Number(p.comments || 0);
  const shares = Number(p.shares || 0);
  const saves = Number(p.saves || 0);
  const reach = Number(p.reach || p.impressions || views || 1);

  // Interactions (weighted for virality)
  const totalInteractions = likes + (comments * 2) + (shares * 3) + (saves * 3);
  let calculatedEngagementRate = p.engagementRate;
  if (!calculatedEngagementRate && reach > 0) {
    calculatedEngagementRate = Math.min(100, Number(((totalInteractions / reach) * 100).toFixed(2)));
  }

  // Normalized score components
  const viewScore = Math.min(35, (views / 40000) * 35);
  const engScore = Math.min(35, ((calculatedEngagementRate || 0) / 8) * 35);
  const viralityScore = Math.min(30, (((shares + saves) / 300) * 30));

  const totalScore = Math.max(0, Math.min(100, Math.round(viewScore + engScore + viralityScore)));
  
  let recommendation = 'Under Review';
  if (totalScore >= 65 || (views >= 10000 && (calculatedEngagementRate || 0) >= 4.5)) {
    recommendation = '🔥 HIGH POTENTIAL';
  } else if (totalScore >= 35) {
    recommendation = 'Good Organic';
  } else {
    recommendation = 'Do not boost yet';
  }

  return { totalScore, recommendation, calculatedEngagementRate };
};

export const getSmmContents = async (req, res) => {
  try {
    const {
      client,
      project,
      contentType,
      postingStatus,
      notPostedReason,
      platform,
      search,
      tab,
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;
    if (contentType) query.contentType = contentType;
    if (postingStatus) query.postingStatus = postingStatus;
    if (notPostedReason) query.notPostedReason = notPostedReason;
    if (platform) query.platforms = platform;

    // View tab shortcuts
    if (tab === 'posted') {
      query.postingStatus = 'Published';
    } else if (tab === 'not_posted') {
      query.postingStatus = { $in: ['Draft', 'Ready', 'Revision Required', 'Pending Approval'] };
    } else if (tab === 'scheduled') {
      query.postingStatus = 'Scheduled';
    } else if (tab === 'pending_approval') {
      query.postingStatus = 'Pending Approval';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
        { notPostedReason: { $regex: search, $options: 'i' } },
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
      .populate('advertising.campaign', 'name status platform dailyBudget amountSpent')
      .populate('linkedAdCampaignIds', 'name status platform dailyBudget amountSpent')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Calculate dynamic approval aging for pending items
    const now = new Date();
    const formatted = contents.map((doc) => {
      const item = doc.toObject();
      if (item.postingStatus === 'Pending Approval') {
        const refDate = item.approvalRequestedAt || item.createdAt;
        const diffMs = now - new Date(refDate);
        const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        item.approvalAgingDays = days;
      }
      return item;
    });

    res.json({ success: true, data: formatted, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmContentById = async (req, res) => {
  try {
    const content = await SmmContent.findById(req.params.id)
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .populate('advertising.campaign', 'name status platform dailyBudget amountSpent remainingBalance')
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
    const { client, project, name, contentType, platforms, performance, advertising } = req.body;

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

    // Auto-calculate performance score & recommendation
    if (performance) {
      const { totalScore, recommendation, calculatedEngagementRate } = calculatePerformanceScore(performance);
      payload.performanceScore = totalScore;
      payload.adRecommendation = recommendation;
      if (!payload.performance) payload.performance = {};
      payload.performance.engagementRate = calculatedEngagementRate;
    }

    // Handle actual posted date/time tracking
    if (req.body.postingStatus === 'Published' && !req.body.actualPostedDate) {
      payload.actualPostedDate = new Date();
      payload.actualPostedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (req.body.postingStatus === 'Pending Approval' && !req.body.approvalRequestedAt) {
      payload.approvalRequestedAt = new Date();
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

    if (updates.postingStatus === 'Pending Approval' && !updates.approvalRequestedAt) {
      updates.approvalRequestedAt = new Date();
    }

    if (updates.performance) {
      const { totalScore, recommendation, calculatedEngagementRate } = calculatePerformanceScore(updates.performance);
      updates.performanceScore = totalScore;
      updates.adRecommendation = recommendation;
      updates.performance.engagementRate = calculatedEngagementRate;
    }

    const content = await SmmContent.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .populate('advertising.campaign', 'name status platform dailyBudget amountSpent');

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

    const mergedPerf = { ...content.performance.toObject(), ...performance };
    const { totalScore, recommendation, calculatedEngagementRate } = calculatePerformanceScore(mergedPerf);
    mergedPerf.engagementRate = calculatedEngagementRate;

    content.performance = mergedPerf;
    content.performanceScore = totalScore;
    content.adRecommendation = recommendation;
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
      .select('name contentType platforms actualPostedDate scheduledDate mediaUpload thumbnail caption client project postingStatus performance performanceScore adRecommendation')
      .populate('client', 'name company logo')
      .populate('project', 'name category status')
      .sort({ performanceScore: -1, actualPostedDate: -1, createdAt: -1 });

    res.json({ success: true, data: publishedContents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
