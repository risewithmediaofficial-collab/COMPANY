import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistance, verifyLocationWithinRadius, isValidCoordinates } from '../utils/locationVerification.js';

// Attendance duration and type helper
const evaluateAttendanceShift = (checkInTime, checkOutTime, shiftStartTime = '10:00', gracePeriodMinutes = 15) => {
  const inDate = new Date(checkInTime);
  const outDate = new Date(checkOutTime);
  const diffHours = (outDate - inDate) / (1000 * 60 * 60);

  // Parse shift start time on inDate day
  const [sHour, sMin] = shiftStartTime.split(':').map(Number);
  const graceDate = new Date(inDate);
  graceDate.setHours(sHour, sMin + gracePeriodMinutes, 0, 0);

  const isLate = inDate > graceDate;

  let shiftType = 'Absent';
  if (diffHours >= 8) shiftType = 'Full Day';
  else if (diffHours >= 4) shiftType = 'Half Day';

  return { diffHours: parseFloat(diffHours.toFixed(2)), shiftType, isLate };
};

// Leave / WFH duration helper
const calculateLeaveDays = (startDate, endDate, isHalfDay = false) => {
  if (isHalfDay) return 0.5;
  const s = new Date(startDate);
  const e = new Date(endDate);
  const diffTime = Math.abs(e - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

test('HR Location: isValidCoordinates validates boundaries and types', () => {
  assert.equal(isValidCoordinates(12.9716, 77.5946), true);
  assert.equal(isValidCoordinates(-90, 180), true);
  assert.equal(isValidCoordinates(91, 50), false, 'Latitude > 90 is invalid');
  assert.equal(isValidCoordinates(12, 181), false, 'Longitude > 180 is invalid');
  assert.equal(isValidCoordinates('12.5', 77.5), false, 'String coordinates are invalid');
  assert.equal(isValidCoordinates(null, undefined), false);
});

test('HR Location: calculateDistance computes accurate geographical distances', () => {
  // Distance from a point to itself is 0
  assert.equal(calculateDistance(12.9716, 77.5946, 12.9716, 77.5946), 0);

  // Bangalore (12.9716, 77.5946) to Chennai (13.0827, 80.2707) ~ 290 km
  const blrToMaa = calculateDistance(12.9716, 77.5946, 13.0827, 80.2707);
  assert.ok(blrToMaa >= 285 && blrToMaa <= 295, `Expected ~290km, got ${blrToMaa}km`);
});

test('HR Location: verifyLocationWithinRadius enforces office geofencing', () => {
  const officeLat = 12.9352;
  const officeLon = 77.6245;

  // Very close (~50 meters)
  const nearbyUserLat = 12.9354;
  const nearbyUserLon = 77.6247;
  const verified = verifyLocationWithinRadius(nearbyUserLat, nearbyUserLon, officeLat, officeLon, 0.5);
  assert.equal(verified.isVerified, true, 'User within 500m should be verified');
  assert.ok(verified.distanceMeters <= 500);

  // Far away (Hosur to Bangalore ~ 40 km)
  const farUserLat = 12.7409;
  const farUserLon = 77.8253;
  const rejected = verifyLocationWithinRadius(farUserLat, farUserLon, officeLat, officeLon, 0.5);
  assert.equal(rejected.isVerified, false, 'User outside radius must not be verified');
});

test('HR Attendance: Determines Full Day, Half Day, and Late Arrival correctly', () => {
  // Check-in on time at 10:05 AM, checkout at 6:35 PM (8.5 hrs)
  const shiftNormal = evaluateAttendanceShift('2026-09-29T10:05:00', '2026-09-29T18:35:00', '10:00', 15);
  assert.equal(shiftNormal.shiftType, 'Full Day');
  assert.equal(shiftNormal.isLate, false);

  // Late check-in at 10:30 AM (after 10:15 AM grace)
  const shiftLate = evaluateAttendanceShift('2026-09-29T10:30:00', '2026-09-29T18:30:00', '10:00', 15);
  assert.equal(shiftLate.isLate, true);

  // Half day (5 hours worked)
  const shiftHalf = evaluateAttendanceShift('2026-09-29T10:00:00', '2026-09-29T15:00:00', '10:00', 15);
  assert.equal(shiftHalf.shiftType, 'Half Day');
});

test('HR WFH & Leaves: Calculates single-day, multi-day, and half-day durations', () => {
  assert.equal(calculateLeaveDays('2026-10-01', '2026-10-01'), 1, 'Same day is 1 day');
  assert.equal(calculateLeaveDays('2026-10-01', '2026-10-05'), 5, 'Oct 1 to Oct 5 is 5 days');
  assert.equal(calculateLeaveDays('2026-10-01', '2026-10-01', true), 0.5, 'Half-day is 0.5 days');
});
