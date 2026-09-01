// =============================================
// ATTENDANCE SERVICE - Location Verification Logic
// =============================================

import Attendance from '../models/attendance.model.js';
import WFHRequest from '../models/wfhRequest.model.js';
import OfficeLocation from '../models/officeLocation.model.js';
import { verifyLocationWithinRadius, isValidCoordinates } from '../utils/locationVerification.js';

/**
 * Check if WFH is approved for a specific date
 */
export const checkWFHApprovalForDate = async (userId, date) => {
  try {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const wfhRequest = await WFHRequest.findOne({
      user: userId,
      date: targetDate,
      status: 'approved',
    });

    return {
      isApproved: !!wfhRequest,
      wfhRequest: wfhRequest,
    };
  } catch (error) {
    console.error('Error checking WFH approval:', error);
    return { isApproved: false, wfhRequest: null };
  }
};

/**
 * Verify location for attendance
 */
export const verifyAttendanceLocation = async (userId, latitude, longitude, organizationId) => {
  try {
    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return {
        success: false,
        verified: false,
        error: 'Invalid latitude or longitude coordinates',
      };
    }

    // Get office locations
    const officeLocations = await OfficeLocation.find({
      isActive: true,
      organization: organizationId,
    });

    if (officeLocations.length === 0) {
      return {
        success: false,
        verified: false,
        error: 'No office locations configured for your organization',
      };
    }

    // Check if user is within any office location
    let isVerified = false;
    let closestLocation = null;
    let minDistance = Infinity;
    let verificationDetails = [];

    for (const location of officeLocations) {
      const verification = verifyLocationWithinRadius(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
        location.radiusKm
      );

      verificationDetails.push({
        location: location.name,
        address: location.address,
        verified: verification.isVerified,
        distance: verification.distance,
        distanceMeters: verification.distanceMeters,
        allowedRadius: location.radiusKm,
      });

      if (verification.distance < minDistance) {
        minDistance = verification.distance;
        closestLocation = {
          name: location.name,
          address: location.address,
          distance: verification.distance,
          distanceMeters: verification.distanceMeters,
        };
      }

      if (verification.isVerified) {
        isVerified = true;
      }
    }

    return {
      success: true,
      verified: isVerified,
      closestLocation,
      allVerifications: verificationDetails,
    };
  } catch (error) {
    console.error('Error verifying location:', error);
    return {
      success: false,
      verified: false,
      error: error.message,
    };
  }
};

/**
 * Process clock-in with location verification
 */
export const processClockInWithLocation = async (userId, latitude, longitude, organizationId, date = null) => {
  try {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Check if WFH is approved for this date
    const wfhCheck = await checkWFHApprovalForDate(userId, targetDate);
    
    let locationVerification = null;
    let requiresLocationVerification = true;
    let wfhApprovedForDate = false;

    if (wfhCheck.isApproved) {
      // WFH approved - no location verification needed
      requiresLocationVerification = false;
      wfhApprovedForDate = true;
    } else if (latitude && longitude) {
      // Normal office day - verify location
      locationVerification = await verifyAttendanceLocation(userId, latitude, longitude, organizationId);
    }

    return {
      requiresLocationVerification,
      wfhApprovedForDate,
      locationVerification,
      wfhRequest: wfhCheck.wfhRequest,
    };
  } catch (error) {
    console.error('Error processing clock-in location:', error);
    throw error;
  }
};

/**
 * Save location data to attendance session
 */
export const saveLocationToSession = async (attendanceId, sessionIndex, latitude, longitude, distanceFromOffice, locationVerified) => {
  try {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance || !attendance.sessions[sessionIndex]) {
      throw new Error('Attendance or session not found');
    }

    attendance.sessions[sessionIndex].latitude = latitude;
    attendance.sessions[sessionIndex].longitude = longitude;
    attendance.sessions[sessionIndex].distanceFromOffice = distanceFromOffice;
    attendance.sessions[sessionIndex].locationVerified = locationVerified;

    await attendance.save();
    return { success: true, message: 'Location saved to session' };
  } catch (error) {
    console.error('Error saving location to session:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get attendance with location details
 */
export const getAttendanceWithLocationDetails = async (attendanceId) => {
  try {
    const attendance = await Attendance.findById(attendanceId)
      .populate('user', 'name email department')
      .populate('wfhRequestId', 'reason approvalDate');

    if (!attendance) {
      return null;
    }

    return {
      ...attendance.toObject(),
      locationSummary: {
        wfhApproved: attendance.wfhApprovedForDate,
        locationVerified: attendance.locationVerified,
        verificationStatus: attendance.locationVerificationStatus,
        sessionsWithLocation: attendance.sessions.map(s => ({
          clockIn: s.clockIn,
          clockOut: s.clockOut,
          latitude: s.latitude,
          longitude: s.longitude,
          distanceFromOffice: s.distanceFromOffice,
          locationVerified: s.locationVerified,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting attendance with location details:', error);
    return null;
  }
};
