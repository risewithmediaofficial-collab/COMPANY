import Influencer from '../models/influencer.model.js';

export const getInfluencers = async (req, res) => {
  try {
    const { influencerType, platform, category, city, search } = req.query;
    const filter = { isDeleted: false };

    if (influencerType && influencerType !== 'all') {
      filter.influencerType = influencerType;
    }
    if (platform && platform !== 'all') {
      filter.platform = platform;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (city && city !== 'all') {
      filter.cityLocation = { $regex: city, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { handle: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { cityLocation: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const influencers = await Influencer.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: influencers.length, influencers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInfluencer = async (req, res) => {
  try {
    if (!req.body.name || !req.body.handle) {
      return res.status(400).json({ success: false, message: 'Name and Handle are required.' });
    }

    const influencer = await Influencer.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, influencer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateInfluencer = async (req, res) => {
  try {
    const influencer = await Influencer.findOne({ _id: req.params.id, isDeleted: false });
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }

    Object.assign(influencer, req.body, { updatedBy: req.user._id });
    await influencer.save();

    res.json({ success: true, influencer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteInfluencer = async (req, res) => {
  try {
    const influencer = await Influencer.findOne({ _id: req.params.id, isDeleted: false });
    if (!influencer) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }

    influencer.isDeleted = true;
    influencer.deletedBy = req.user._id;
    influencer.deletedAt = new Date();
    await influencer.save();

    res.json({ success: true, message: 'Influencer record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInfluencerSummary = async (req, res) => {
  try {
    const [all, localCount, standardCount] = await Promise.all([
      Influencer.find({ isDeleted: false }),
      Influencer.countDocuments({ isDeleted: false, influencerType: 'Local Influencer' }),
      Influencer.countDocuments({ isDeleted: false, influencerType: 'Standard Influencer' }),
    ]);

    let totalReach = 0;
    let sumReelCost = 0;
    let reelCount = 0;

    all.forEach((inf) => {
      totalReach += inf.followersCount || 0;
      if (inf.pricing?.reelCost > 0) {
        sumReelCost += inf.pricing.reelCost;
        reelCount += 1;
      }
    });

    const avgReelCost = reelCount > 0 ? Math.round(sumReelCost / reelCount) : 0;

    res.json({
      success: true,
      summary: {
        totalInfluencers: all.length,
        localInfluencersCount: localCount,
        standardInfluencersCount: standardCount,
        totalReach,
        avgReelCost,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
