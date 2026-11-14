import CompanyAsset from '../models/companyAsset.model.js';
import { recordFinanceAudit } from '../services/financeCalculation.service.js';

export const getCompanyAssets = async (req, res) => {
  try {
    const { category, condition, status, search } = req.query;
    const filter = {};

    if (category && category !== 'all') filter.category = category;
    if (condition && condition !== 'all') filter.condition = condition;
    if (status && status !== 'all') filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { assignedToName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await CompanyAsset.find(filter)
      .populate('assignedTo', 'name email role avatar')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const totalValue = assets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
    const activeCount = assets.filter((a) => a.status === 'In Use').length;

    return res.json({
      success: true,
      assets,
      stats: {
        totalItems: assets.length,
        totalValue,
        activeCount,
        inMaintenanceCount: assets.filter((a) => a.status === 'Under Maintenance').length,
      },
    });
  } catch (error) {
    console.error('getCompanyAssets error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCompanyAsset = async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      model,
      serialNumber,
      purchaseDate,
      purchaseCost,
      currentValue,
      condition,
      status,
      assignedTo,
      assignedToName,
      location,
      vendor,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }

    const asset = await CompanyAsset.create({
      name,
      category: category || 'Other',
      brand: brand || '',
      model: model || '',
      serialNumber: serialNumber || '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchaseCost: Number(purchaseCost) || 0,
      currentValue: currentValue !== undefined ? Number(currentValue) : Number(purchaseCost) || 0,
      condition: condition || 'Good',
      status: status || 'In Use',
      assignedTo: assignedTo || null,
      assignedToName: assignedToName || '',
      location: location || 'Headquarters',
      vendor: vendor || '',
      notes: notes || '',
      createdBy: req.user?._id,
      organizationId: req.user?.organizationId || null,
    });

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'CREATE',
      entityType: 'CompanyAsset',
      entityId: asset._id,
      metadata: { name: asset.name, purchaseCost: asset.purchaseCost },
    }).catch(() => {});

    return res.status(201).json({ success: true, asset });
  } catch (error) {
    console.error('createCompanyAsset error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCompanyAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.purchaseCost !== undefined) {
      updateData.purchaseCost = Number(updateData.purchaseCost) || 0;
    }
    if (updateData.currentValue !== undefined) {
      updateData.currentValue = Number(updateData.currentValue) || 0;
    }

    const asset = await CompanyAsset.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name');

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'UPDATE',
      entityType: 'CompanyAsset',
      entityId: asset._id,
    }).catch(() => {});

    return res.json({ success: true, asset });
  } catch (error) {
    console.error('updateCompanyAsset error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCompanyAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await CompanyAsset.findByIdAndDelete(id);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await recordFinanceAudit({
      actorId: req.user?._id,
      actorName: req.user?.name,
      action: 'DELETE',
      entityType: 'CompanyAsset',
      entityId: id,
    }).catch(() => {});

    return res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('deleteCompanyAsset error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
