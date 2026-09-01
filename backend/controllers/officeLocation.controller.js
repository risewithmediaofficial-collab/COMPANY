// =============================================
// OFFICE LOCATION CONTROLLER
// =============================================

import OfficeLocation from '../models/officeLocation.model.js';

/**
 * Create new office location
 */
export const createOfficeLocation = async (req, res) => {
  try {
    const { name, latitude, longitude, radiusKm, address, city, country, organizationId } = req.body;

    // Only admins can create office locations
    if (!['superAdmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid latitude or longitude' 
      });
    }

    const officeLocation = new OfficeLocation({
      name,
      latitude,
      longitude,
      radiusKm: radiusKm || 0.5,
      address: address || '',
      city: city || '',
      country: country || '',
      organization: organizationId || req.user.organizationId,
    });

    await officeLocation.save();

    res.status(201).json({
      success: true,
      message: 'Office location created successfully',
      officeLocation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all office locations
 */
export const getOfficeLocations = async (req, res) => {
  try {
    const { organizationId, isActive = true } = req.query;

    const filter = {};
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (organizationId) {
      filter.organization = organizationId;
    }

    const officeLocations = await OfficeLocation.find(filter)
      .populate('organization', 'name');

    res.json({
      success: true,
      officeLocations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get office location by ID
 */
export const getOfficeLocationById = async (req, res) => {
  try {
    const { locationId } = req.params;

    const officeLocation = await OfficeLocation.findById(locationId)
      .populate('organization', 'name');

    if (!officeLocation) {
      return res.status(404).json({
        success: false,
        message: 'Office location not found',
      });
    }

    res.json({
      success: true,
      officeLocation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update office location
 */
export const updateOfficeLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { name, latitude, longitude, radiusKm, address, city, country, isActive } = req.body;

    // Only admins can update office locations
    if (!['superAdmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate coordinates if provided
    if (latitude && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude',
      });
    }

    if (longitude && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (latitude) updateData.latitude = latitude;
    if (longitude) updateData.longitude = longitude;
    if (radiusKm) updateData.radiusKm = radiusKm;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (country) updateData.country = country;
    if (isActive !== undefined) updateData.isActive = isActive;

    const officeLocation = await OfficeLocation.findByIdAndUpdate(
      locationId,
      updateData,
      { new: true }
    ).populate('organization', 'name');

    if (!officeLocation) {
      return res.status(404).json({
        success: false,
        message: 'Office location not found',
      });
    }

    res.json({
      success: true,
      message: 'Office location updated successfully',
      officeLocation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete office location
 */
export const deleteOfficeLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    // Only admins can delete office locations
    if (!['superAdmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const officeLocation = await OfficeLocation.findByIdAndDelete(locationId);

    if (!officeLocation) {
      return res.status(404).json({
        success: false,
        message: 'Office location not found',
      });
    }

    res.json({
      success: true,
      message: 'Office location deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
