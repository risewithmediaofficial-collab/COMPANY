# Location-Based Attendance System Implementation Guide

## Overview

This is a comprehensive location-based attendance marking system that allows:
- **GPS Verification**: Verifies user location when marking attendance at office
- **WFH Approval Bypass**: Skip GPS verification if WFH (Work From Home) is approved
- **Flexible Approval Workflow**: Managers can approve/reject WFH requests
- **Distance Tracking**: Records distance from office for audit purposes

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTENDANCE MARKING                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User submits location (lat, long)                         │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────┐              │
│  │ Check WFH Approval for Date            │              │
│  │ (WFHRequest collection)                │              │
│  └─────────────────────────────────────────┘              │
│           │                                                 │
│    ┌──────┴──────┐                                         │
│    │             │                                          │
│   YES           NO                                          │
│    │             │                                          │
│    ▼             ▼                                          │
│  APPROVE    VERIFY LOCATION                               │
│  ATTENDANCE   (GPS Check)                                 │
│  No GPS      │                                             │
│  Required    ├─────┬──────┐                               │
│              │     │      │                                │
│          WITHIN CLOSE  TOO FAR                            │
│          RADIUS  BUT   FROM                               │
│          VERIFIED  ALLOW OFFICE                           │
│              │        │      │                             │
│              ▼        ▼      ▼                             │
│           APPROVED  APPROVED REJECTED                      │
│           ATTENDANCE ATTENDANCE ATTENDANCE                 │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Models

### 1. WFHRequest Model
Tracks work-from-home approval requests.

**Fields:**
- `user` - Reference to User
- `date` - Date for which WFH is requested
- `reason` - Reason for WFH
- `status` - 'pending', 'approved', 'rejected'
- `approvedBy` - Manager who approved
- `startTime` - Optional: HH:mm format for partial WFH
- `endTime` - Optional: HH:mm format for partial WFH
- `rejectionReason` - Reason if rejected

### 2. OfficeLocation Model
Stores office location coordinates and allowed radius.

**Fields:**
- `name` - Office name (e.g., "Main Office")
- `latitude` - GPS latitude
- `longitude` - GPS longitude
- `radiusKm` - Allowed radius in kilometers (default: 0.5 km = 500m)
- `address` - Physical address
- `city`, `country` - Location details
- `isActive` - Enable/disable location

### 3. Updated Attendance Model
Enhanced with location verification fields.

**New Fields:**
- `locationVerified` - Boolean: Whether location was verified
- `locationVerificationStatus` - 'none', 'pending', 'verified', 'failed'
- `wfhApprovedForDate` - Boolean: Whether WFH was approved
- `wfhRequestId` - Link to WFH request
- `locationVerificationReason` - Details about verification

**Enhanced Session Object:**
- `latitude` - User's GPS latitude at clock-in
- `longitude` - User's GPS longitude at clock-in
- `locationVerified` - Whether location was verified
- `distanceFromOffice` - Distance in meters

---

## API Endpoints

### WFH Management

#### Submit WFH Request
```
POST /api/wfh-requests/submit
Body: {
  "date": "2025-01-15",
  "reason": "Doctor's appointment",
  "startTime": "09:00",  // Optional
  "endTime": "14:00",    // Optional
  "notes": "Additional notes"
}
```

#### Get My WFH Requests
```
GET /api/wfh-requests/my-requests?status=approved&month=1&year=2025
```

#### Check WFH Status for Date
```
GET /api/wfh-requests/check-status?date=2025-01-15
Response: {
  "isWFHApproved": true/false,
  "wfhRequest": { ... }
}
```

#### Get All WFH Requests (Manager Only)
```
GET /api/wfh-requests?status=pending&userId=xyz&month=1&year=2025
```

#### Approve WFH Request (Manager Only)
```
PATCH /api/wfh-requests/{wfhRequestId}/approve
Body: {
  "approvalNotes": "Approved"
}
```

#### Reject WFH Request (Manager Only)
```
PATCH /api/wfh-requests/{wfhRequestId}/reject
Body: {
  "rejectionReason": "Please come to office"
}
```

### Office Location Management

#### Create Office Location (Admin Only)
```
POST /api/office-locations
Body: {
  "name": "Main Office",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "radiusKm": 0.5,
  "address": "123 Business Park",
  "city": "New Delhi",
  "country": "India"
}
```

#### Get All Office Locations
```
GET /api/office-locations?isActive=true
```

#### Update Office Location (Admin Only)
```
PATCH /api/office-locations/{locationId}
Body: {
  "radiusKm": 0.8,
  "isActive": true
}
```

#### Delete Office Location (Admin Only)
```
DELETE /api/office-locations/{locationId}
```

### Attendance with Location

#### Clock In with Location Verification
```
POST /api/attendance/clock-in-with-location
Body: {
  "latitude": 28.6139,
  "longitude": 77.2090,
  "locationName": "Main Office"
}
Response: {
  "success": true,
  "attendance": { ... },
  "locationVerification": {
    "wfhApproved": false,
    "locationVerified": true,
    "closestLocation": {
      "name": "Main Office",
      "distance": 0.05,
      "distanceMeters": 50
    }
  }
}
```

#### Clock Out
```
POST /api/attendance/clock-out
Response: {
  "success": true,
  "attendance": { ... }
}
```

---

## Integration Steps

### Step 1: Import Routes in `index.js`

```javascript
import wfhRequestRoutes from './routes/wfhRequest.routes.js';
import officeLocationRoutes from './routes/officeLocation.routes.js';
import { clockInWithLocation } from './controllers/attendanceWithLocation.controller.js';

// In your route setup:
app.use('/api/wfh-requests', wfhRequestRoutes);
app.use('/api/office-locations', officeLocationRoutes);

// Add new clock-in endpoint to attendance routes
app.post('/api/attendance/clock-in-with-location', protect, clockInWithLocation);
```

### Step 2: Create at least one office location (as admin)

```bash
POST http://localhost:5000/api/office-locations
Headers: Authorization: Bearer <admin_token>
Body: {
  "name": "Main Office",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "radiusKm": 0.5,
  "address": "Business Park, New Delhi",
  "city": "New Delhi",
  "country": "India"
}
```

### Step 3: Users submit WFH requests

```bash
POST http://localhost:5000/api/wfh-requests/submit
Headers: Authorization: Bearer <user_token>
Body: {
  "date": "2025-01-15",
  "reason": "Working from home - family commitment",
  "notes": "Will be available on calls"
}
```

### Step 4: Managers approve/reject WFH requests

```bash
PATCH http://localhost:5000/api/wfh-requests/{wfhRequestId}/approve
Headers: Authorization: Bearer <manager_token>
Body: {
  "approvalNotes": "Approved"
}
```

### Step 5: Users clock in with location

```bash
POST http://localhost:5000/api/attendance/clock-in-with-location
Headers: Authorization: Bearer <user_token>
Body: {
  "latitude": 28.6139,
  "longitude": 77.2090,
  "locationName": "Main Office"
}
```

---

## Frontend Implementation

### Mobile App Clock-In Example (React Native)

```javascript
import Geolocation from '@react-native-community/geolocation';

const handleClockIn = async () => {
  try {
    // Get user's current location
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Call clock-in API with location
        const response = await fetch('/api/attendance/clock-in-with-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude,
            longitude,
            locationName: 'Office',
          }),
        });

        const data = await response.json();

        if (data.locationVerification.wfhApproved) {
          showAlert('WFH Approved - Attendance Marked!');
        } else if (data.locationVerification.locationVerified) {
          showAlert('Location Verified - Attendance Marked!');
        } else {
          showAlert(
            `Location verification failed!\n` +
            `Distance: ${data.locationVerification.closestLocation.distance} km\n` +
            `Required: Within ${data.locationVerification.closestLocation.allowedRadius} km`
          );
        }
      },
      (error) => showAlert('Failed to get location: ' + error.message)
    );
  } catch (error) {
    console.error('Clock-in error:', error);
  }
};
```

### Web App Clock-In Example (React)

```javascript
import axios from 'axios';

const ClockInButton = () => {
  const handleClockIn = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      const response = await axios.post('/api/attendance/clock-in-with-location', {
        latitude,
        longitude,
        locationName: 'Office',
      });

      const { locationVerification } = response.data;

      if (locationVerification.wfhApproved) {
        alert('✓ WFH Approved - Attendance Marked!');
      } else if (locationVerification.locationVerified) {
        alert('✓ Location Verified - Attendance Marked!');
      } else {
        const loc = locationVerification.closestLocation;
        alert(
          `✗ Location verification failed!\n` +
          `Distance: ${loc.distance.toFixed(2)} km\n` +
          `Required: Within ${loc.allowedRadius} km`
        );
      }
    } catch (error) {
      alert('Failed to clock in: ' + error.message);
    }
  };

  return <button onClick={handleClockIn}>Clock In</button>;
};
```

---

## Location Verification Logic

### Distance Calculation
Uses **Haversine formula** to calculate distance between two GPS coordinates:

```javascript
distance = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)))
where R = 6371 km (Earth's radius)
```

### Verification Process
1. **Get User Location**: GPS coordinates from device
2. **Get Office Locations**: From OfficeLocation collection
3. **Calculate Distance**: Between user and each office location
4. **Check Radius**: If distance ≤ radiusKm, location is verified
5. **Record Details**: Save lat/lon, distance, and verification status

---

## Security Considerations

1. **GPS Spoofing**: System can be enhanced with:
   - IP address verification
   - Device fingerprinting
   - Suspicious location alerts
   - Photo verification (user takes selfie at office)

2. **WFH Abuse Prevention**:
   - Managers can review WFH patterns
   - Project managers can check actual activity
   - EOD reports must be submitted

3. **Data Protection**:
   - Never store GPS data longer than required
   - Encrypt location data in transit (HTTPS)
   - Audit trail for all approvals

---

## Testing

### Test Cases

```javascript
// Test 1: Clock in from office
POST /api/attendance/clock-in-with-location
Lat: 28.6139, Lon: 77.2090  // Exact office location
Result: ✓ Attendance marked, location verified

// Test 2: Clock in from nearby (within radius)
POST /api/attendance/clock-in-with-location
Lat: 28.6140, Lon: 77.2091  // ~100m away
Result: ✓ Attendance marked, location verified

// Test 3: Clock in from far away (outside radius)
POST /api/attendance/clock-in-with-location
Lat: 28.6200, Lon: 77.2100  // ~1km away
Result: ✗ Attendance NOT marked, distance verification failed

// Test 4: Clock in with WFH approval
WFH Request: Approved for 2025-01-15
POST /api/attendance/clock-in-with-location
Lat: 28.7000, Lon: 77.3000  // Far away
Result: ✓ Attendance marked, WFH approved (no GPS needed)
```

---

## FAQ

### Q: What if GPS is not available?
A: User can only clock in if WFH is approved. Otherwise, attendance cannot be marked.

### Q: Can user modify location data?
A: GPS coordinates are captured directly from device API. Spoofing is possible but can be mitigated with additional security measures.

### Q: What about network issues?
A: Implement retry mechanism and offline queueing on mobile apps.

### Q: Can partial WFH be approved?
A: Yes! Use `startTime` and `endTime` fields in WFHRequest to approve partial WFH (e.g., 2pm-5pm).

### Q: How to handle remote employees?
A: Create virtual office location or always approve their WFH requests.

---

## Next Steps for Enhancement

1. **Photo Verification**: Require selfie at office for additional verification
2. **Route Tracking**: Track employee's movement throughout the day
3. **Geofencing**: Real-time alerts when employee leaves office
4. **QR Code Verification**: Physical QR code at office for verification
5. **IP Whitelist**: Combine GPS with IP address verification
6. **Machine Learning**: Detect suspicious patterns in attendance

---

## Support & Debugging

### Common Errors

**"Invalid latitude or longitude coordinates"**
- Ensure latitude is between -90 and 90
- Ensure longitude is between -180 and 180

**"No office locations configured"**
- Admin must create at least one office location before users can clock in

**"Already clocked in"**
- User is already clocked in, must clock out first

**"WFH request not found"**
- WFH request doesn't exist or is from another date

---

**Last Updated**: 2025-01-01
**Version**: 1.0.0
