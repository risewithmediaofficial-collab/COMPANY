// =============================================
// UPDATED ATTENDANCE CONTROLLER - WITH LOCATION VERIFICATION
// =============================================

import Attendance from '../models/attendance.model.js';
import { processClockInWithLocation } from '../services/attendanceLocation.service.js';

const formatApproxDistanceKm = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm / 5) * 5} km`;
};

const formatAccuracyText = (accuracyMeters) => {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return '';
  if (accuracyMeters >= 1000) {
    return ` Browser location accuracy is about ${formatApproxDistanceKm(accuracyMeters / 1000)}, so the distance may vary.`;
  }
  return ` GPS accuracy is about ${Math.round(accuracyMeters)} m.`;
};

/**
 * Clock in with location verification
 */
export const clockInWithLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, locationName } = req.body;
    const parsedLatitude = latitude === undefined || latitude === null || latitude === '' ? undefined : Number(latitude);
    const parsedLongitude = longitude === undefined || longitude === null || longitude === '' ? undefined : Number(longitude);
    const parsedAccuracy = accuracy === undefined || accuracy === null || accuracy === '' ? undefined : Number(accuracy);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process location verification
    const locationResult = await processClockInWithLocation(
      req.user._id,
      parsedLatitude,
      parsedLongitude,
      req.user.organizationId
    );

    const locationVerified = locationResult.locationVerification?.verified || false;
    if (locationResult.requiresLocationVerification && !locationVerified) {
      const closestLocation = locationResult.locationVerification?.closestLocation;
      const approximateDistance = formatApproxDistanceKm(closestLocation?.distance);
      const reason = locationResult.locationVerification?.error ||
        (closestLocation
          ? `You are about ${approximateDistance} from ${closestLocation.name}. Please clock in from an approved office location.${formatAccuracyText(parsedAccuracy)}`
          : 'Location verification is required to clock in.');

      return res.status(403).json({
        success: false,
        message: reason,
        locationVerification: {
          wfhApproved: false,
          locationVerified: false,
          closestLocation,
          allVerifications: locationResult.locationVerification?.allVerifications || [],
        },
      });
    }

    let attendance = await Attendance.findOne({ user: req.user._id, date: today });
    const now = new Date();

    if (!attendance) {
      attendance = new Attendance({
        user: req.user._id,
        date: today,
        clockIn: now,
        clockOut: null,
        sessions: [{
          clockIn: now,
          clockOut: null,
          durationHours: 0,
          latitude: parsedLatitude ?? null,
          longitude: parsedLongitude ?? null,
          locationVerified: locationResult.locationVerification?.verified || false,
          distanceFromOffice: locationResult.locationVerification?.closestLocation?.distanceMeters || null,
        }],
        status: locationResult.wfhApprovedForDate ? 'work_from_home' : 'present',
        wfhApprovedForDate: locationResult.wfhApprovedForDate,
        wfhRequestId: locationResult.wfhRequest?._id || null,
        locationVerified: locationResult.locationVerification?.verified || locationResult.wfhApprovedForDate,
        locationVerificationStatus: locationResult.wfhApprovedForDate ? 'none' : 
          (locationResult.locationVerification?.verified ? 'verified' : 'failed'),
        location: locationName || locationResult.locationVerification?.closestLocation?.name || '',
        locationVerificationReason: locationResult.wfhApprovedForDate ?
          'WFH approved - location verification not required' :
          (locationResult.locationVerification?.error || ''),
      });
    } else {
      if (!attendance.sessions) {
        attendance.sessions = [];
      }

      // If sessions array is empty but legacy clockIn exists
      if (attendance.sessions.length === 0 && attendance.clockIn) {
        attendance.sessions.push({
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut || null,
          durationHours: attendance.totalHours || 0,
        });
      }

      // Check if user is currently clocked in (open session exists)
      const hasOpenSession = attendance.sessions.some((s) => !s.clockOut);
      if (hasOpenSession) {
        return res.status(400).json({
          success: false,
          message: 'Already clocked in',
        });
      }

      // Start new session (resuming shift after break)
      if (!attendance.clockIn) {
        attendance.clockIn = now;
      }
      attendance.clockOut = null;
      attendance.sessions.push({
        clockIn: now,
        clockOut: null,
        durationHours: 0,
        latitude: parsedLatitude ?? null,
        longitude: parsedLongitude ?? null,
        locationVerified: locationResult.locationVerification?.verified || false,
        distanceFromOffice: locationResult.locationVerification?.closestLocation?.distanceMeters || null,
      });

      if (['absent', 'half_day'].includes(attendance.status) || !attendance.status) {
        attendance.status = locationResult.wfhApprovedForDate ? 'work_from_home' : 'present';
      }

      // Update location tracking
      if (!attendance.wfhApprovedForDate && locationResult.locationVerification?.verified) {
        attendance.locationVerified = true;
        attendance.locationVerificationStatus = 'verified';
      }

      if (locationResult.wfhApprovedForDate) {
        attendance.wfhApprovedForDate = true;
        attendance.locationVerificationStatus = 'none';
      }
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Clocked in successfully',
      attendance: {
        ...attendance.toObject(),
        locationVerification: {
          wfhApproved: locationResult.wfhApprovedForDate,
          locationVerified: locationResult.locationVerification?.verified || false,
          wfhRequiresLocation: locationResult.requiresLocationVerification,
          closestLocation: locationResult.locationVerification?.closestLocation,
          allVerifications: locationResult.locationVerification?.allVerifications,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Original clock-in (without location) - kept for backward compatibility
 */
export const clockIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ user: req.user._id, date: today });
    const now = new Date();

    if (!attendance) {
      attendance = new Attendance({
        user: req.user._id,
        date: today,
        clockIn: now,
        clockOut: null,
        sessions: [{ clockIn: now, clockOut: null, durationHours: 0 }],
        status: 'present',
      });
    } else {
      if (!attendance.sessions) {
        attendance.sessions = [];
      }

      // If sessions array is empty but legacy clockIn exists
      if (attendance.sessions.length === 0 && attendance.clockIn) {
        attendance.sessions.push({
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut || null,
          durationHours: attendance.totalHours || 0,
        });
      }

      // Check if user is currently clocked in (open session exists)
      const hasOpenSession = attendance.sessions.some((s) => !s.clockOut);
      if (hasOpenSession) {
        return res.status(400).json({ success: false, message: 'Already clocked in' });
      }

      // Start new session (resuming shift after break)
      if (!attendance.clockIn) {
        attendance.clockIn = now;
      }
      attendance.clockOut = null;
      attendance.sessions.push({ clockIn: now, clockOut: null, durationHours: 0 });
      if (['absent', 'half_day'].includes(attendance.status) || !attendance.status) {
        attendance.status = 'present';
      }
    }

    await attendance.save();
    res.json({ success: true, message: 'Clocked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clock out
 */
export const clockOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No clock-in found for today' });
    }

    if (!attendance.sessions || attendance.sessions.length === 0) {
      if (!attendance.clockIn) {
        return res.status(400).json({ success: false, message: 'No clock-in found for today' });
      }
      attendance.sessions = [{
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut || null,
        durationHours: attendance.totalHours || 0,
      }];
    }

    const openSession = attendance.sessions.find((s) => !s.clockOut);
    if (!openSession) {
      return res.status(400).json({ success: false, message: 'Already clocked out' });
    }

    const now = new Date();
    openSession.clockOut = now;
    openSession.durationHours = parseFloat(((now - new Date(openSession.clockIn)) / 3600000).toFixed(2));

    // Calculate total cumulative working hours for today across all sessions
    const totalMs = attendance.sessions.reduce((sum, s) => {
      if (s.clockIn && s.clockOut) {
        return sum + (new Date(s.clockOut) - new Date(s.clockIn));
      }
      return sum;
    }, 0);

    attendance.clockOut = now;
    attendance.totalHours = parseFloat((totalMs / 3600000).toFixed(2));
    await attendance.save();

    res.json({ success: true, message: 'Clocked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manual clock in/out (for admins)
 */
export const manualClockInOut = async (req, res) => {
  try {
    const { userId, date, clockInTime, clockOutTime } = req.body;

    // Only admins can manual clock in/out
    if (!['superAdmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ user: userId, date: targetDate });

    if (!attendance) {
      attendance = new Attendance({
        user: userId,
        date: targetDate,
        status: 'present',
      });
    }

    if (!attendance.sessions) {
      attendance.sessions = [];
    }

    if (clockInTime && clockOutTime) {
      const clockIn = new Date(clockInTime);
      const clockOut = new Date(clockOutTime);
      const durationMs = clockOut - clockIn;
      const durationHours = parseFloat((durationMs / 3600000).toFixed(2));

      attendance.sessions.push({
        clockIn,
        clockOut,
        durationHours,
      });

      attendance.clockIn = clockIn;
      attendance.clockOut = clockOut;

      const totalMs = attendance.sessions.reduce((sum, s) => {
        if (s.clockIn && s.clockOut) {
          return sum + (new Date(s.clockOut) - new Date(s.clockIn));
        }
        return sum;
      }, 0);

      attendance.totalHours = parseFloat((totalMs / 3600000).toFixed(2));
    } else if (clockInTime) {
      attendance.clockIn = new Date(clockInTime);
      attendance.sessions.push({
        clockIn: attendance.clockIn,
        clockOut: null,
        durationHours: 0,
      });
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Manual clock in/out recorded successfully',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
