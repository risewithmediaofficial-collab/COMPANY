// =============================================
// SMM LEAD CONTROLLER
// =============================================
import SmmLead from '../../models/smm/smmLead.model.js';
import Campaign from '../../models/smm/campaign.model.js';
import SmmAdSpend from '../../models/smm/smmAdSpend.model.js';

export const getSmmLeads = async (req, res) => {
  try {
    const { client, project, campaign, status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (campaign) query.campaign = campaign;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.leadDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.leadDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.leadDate.$lte = e;
      }
    }

    const total = await SmmLead.countDocuments(query);
    const leads = await SmmLead.find(query)
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('campaign', 'name platform')
      .populate('createdBy', 'name')
      .sort({ leadDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, data: leads, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmLead = async (req, res) => {
  try {
    const { client, project, name } = req.body;

    if (!client || !project || !name) {
      return res.status(400).json({
        success: false,
        message: 'Client, Project, and Lead Name are required fields.',
      });
    }

    const lead = await SmmLead.create({
      ...req.body,
      createdBy: req.user?._id,
    });

    const populated = await SmmLead.findById(lead._id)
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('campaign', 'name platform');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmLead = async (req, res) => {
  try {
    const lead = await SmmLead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('campaign', 'name platform');

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmLead = async (req, res) => {
  try {
    const lead = await SmmLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmLeadStats = async (req, res) => {
  try {
    const { client, project } = req.query;
    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      leadsToday,
      leadsThisMonth,
      qualifiedLeads,
      convertedLeads,
      spendData,
    ] = await Promise.all([
      SmmLead.countDocuments(query),
      SmmLead.countDocuments({ ...query, leadDate: { $gte: startOfToday } }),
      SmmLead.countDocuments({ ...query, leadDate: { $gte: startOfMonth } }),
      SmmLead.countDocuments({ ...query, status: 'Qualified' }),
      SmmLead.countDocuments({ ...query, status: 'Converted' }),
      SmmAdSpend.aggregate([
        { $match: query },
        { $group: { _id: null, totalSpend: { $sum: '$amountSpent' } } },
      ]),
    ]);

    const totalSpend = spendData[0]?.totalSpend || 0;
    const costPerLead = totalLeads > 0 ? Number((totalSpend / totalLeads).toFixed(2)) : 0;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsToday,
        leadsThisMonth,
        qualifiedLeads,
        convertedLeads,
        costPerLead,
        conversionRate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
