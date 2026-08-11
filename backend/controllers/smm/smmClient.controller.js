// =============================================
// SMM CLIENT CONTROLLER (Uses Agency CRM Client Model)
// =============================================
import Client from '../../models/client.model.js';
import SmmClient from '../../models/smm/smmClient.model.js';

export const getSmmClients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 100 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [crmClients, smmClientsList] = await Promise.all([
      Client.find(query).sort({ company: 1, name: 1 }),
      SmmClient.find(query).sort({ companyName: 1 }),
    ]);

    // Map to normalized list so both legacy SmmClient and CRM Client work seamlessly
    const combinedMap = new Map();
    crmClients.forEach((c) => {
      combinedMap.set(c._id.toString(), {
        _id: c._id,
        companyName: c.company || c.name,
        name: c.name,
        email: c.email,
        phone: c.phone,
        website: c.website,
        brandLogo: c.logo,
        status: c.status === 'active' ? 'Active' : 'Inactive',
        source: 'CRM',
      });
    });

    smmClientsList.forEach((c) => {
      if (!combinedMap.has(c._id.toString())) {
        combinedMap.set(c._id.toString(), {
          _id: c._id,
          companyName: c.companyName,
          name: c.companyName,
          email: c.email,
          phone: c.phone,
          website: c.website,
          brandLogo: c.brandLogo,
          status: c.status,
          source: 'SMM',
        });
      }
    });

    const clients = Array.from(combinedMap.values());

    res.json({ success: true, data: clients, total: clients.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSmmClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    if (!client) {
      client = await SmmClient.findById(req.params.id);
    }
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSmmClient = async (req, res) => {
  try {
    const client = await Client.create({
      name: req.body.companyName || req.body.name,
      company: req.body.companyName || req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      website: req.body.website,
      logo: req.body.brandLogo,
      status: 'active',
    });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateSmmClient = async (req, res) => {
  try {
    let client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) {
      client = await SmmClient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSmmClient = async (req, res) => {
  try {
    let client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      client = await SmmClient.findByIdAndDelete(req.params.id);
    }
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
