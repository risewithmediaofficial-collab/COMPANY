// =============================================
// LOCATION VERIFICATION UTILITY
// =============================================

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {number} lat1 - User's latitude
 * @param {number} lon1 - User's longitude
 * @param {number} lat2 - Office latitude
 * @param {number} lon2 - Office longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Verify if user is within office location radius
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} officeLat - Office latitude
 * @param {number} officeLon - Office longitude
 * @param {number} radiusKm - Allowed radius in kilometers
 * @returns {object} Verification result with distance and status
 */
export const verifyLocationWithinRadius = (userLat, userLon, officeLat, officeLon, radiusKm = 0.5) => {
  const distance = calculateDistance(userLat, userLon, officeLat, officeLon);
  const isWithinRadius = distance <= radiusKm;

  return {
    isVerified: isWithinRadius,
    distance: parseFloat(distance.toFixed(3)), // Distance in km
    distanceMeters: parseFloat((distance * 1000).toFixed(0)), // Distance in meters
    allowedRadiusKm: radiusKm,
    allowedRadiusMeters: parseFloat((radiusKm * 1000).toFixed(0)),
  };
};

/**
 * Validate location coordinates
 */
export const isValidCoordinates = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};
