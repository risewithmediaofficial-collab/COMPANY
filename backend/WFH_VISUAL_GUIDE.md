# Location-Based Attendance with WFH Logic - Visual Guide

## 🎯 Your Office Location

```
📍 Latitude:  12.517304
📍 Longitude: 78.232888
📍 Location: Vettiyampatti, Krishnagiri, Tamil Nadu, India
📍 Allowed Radius: 500 meters (can be adjusted)
```

---

## 🔄 Complete Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  EMPLOYEE CLICKS "CLOCK IN"                      │
│            (with GPS location captured from device)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │  QUERY: WFH APPROVED FOR TODAY?     │
         │  (Check WFHRequest collection)      │
         └──────────┬──────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
        YES                   NO
         │                     │
         ▼                     ▼
    ╔════════════════╗    ┌──────────────────────┐
    ║  WFH APPROVED  ║    │ VERIFY GPS LOCATION  │
    ║                ║    │                      │
    ║ ✓ Skip GPS     ║    │ Calculate distance   │
    ║ ✓ No location  ║    │ from office:         │
    ║   required     ║    │ (12.517304,78.232888)│
    ║                ║    └──────┬───────────────┘
    ║ Status:        ║           │
    ║ "work_from_    ║    ┌──────┴──────────┐
    ║  home"         ║    │                 │
    ║                ║   ✓ ≤500m           ✗ >500m
    ║ ✓ ATTENDANCE   ║    │                 │
    ║   MARKED       ║    ▼                 ▼
    ╚════════════════╝ ╔═════════════╗  ╔═════════════╗
                       ║ LOCATION    ║  ║ VERIFICATION║
                       ║ VERIFIED ✓  ║  ║ FAILED ✗    ║
                       ║             ║  ║             ║
                       ║ Status:     ║  ║ Status:     ║
                       ║ "present"   ║  ║ REJECTED    ║
                       ║             ║  ║             ║
                       ║ ✓ ATTENDANCE║  ║ ❌ NO       ║
                       ║   MARKED    ║  ║ ATTENDANCE  ║
                       ╚═════════════╝  ╚═════════════╝
```

---

## 📊 Three Real Scenarios

### SCENARIO 1: ✅ Employee with WFH Approval (Can be Anywhere)

```
DAY: Monday, January 15, 2025
EMPLOYEE: Raj (raj@company.com)
LOCATION: Chennai (500km away from office)
SITUATION: Doctor's appointment

┌────────────────────────────────────────────────────┐
│ MONDAY: Employee submits WFH request               │
├────────────────────────────────────────────────────┤
│ POST /api/wfh-requests/submit                      │
│ {                                                  │
│   "date": "2025-01-15",                           │
│   "reason": "Doctor's appointment in Chennai",    │
│   "notes": "Will be away for consultation"        │
│ }                                                  │
│                                                    │
│ Response: Status = "pending" (waiting approval)   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ MONDAY: Manager approves WFH request              │
├────────────────────────────────────────────────────┤
│ PATCH /api/wfh-requests/{id}/approve              │
│                                                    │
│ Response: Status = "approved" ✓                   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ TUESDAY (Jan 15): Employee clocks in from Chennai │
├────────────────────────────────────────────────────┤
│ GPS Coordinates: 13.0827°N, 80.2707°E            │
│ (This is ~500km from office!)                     │
│                                                    │
│ POST /api/attendance/clock-in-with-location       │
│ {                                                  │
│   "latitude": 13.0827,                           │
│   "longitude": 80.2707,                          │
│   "locationName": "Chennai Hospital"             │
│ }                                                  │
│                                                    │
│ SYSTEM LOGIC:                                     │
│ ✓ Check WFH for 2025-01-15?                      │
│ ✓ Found: WFH Request (status = approved)         │
│ ✓ Decision: SKIP GPS verification                │
│ ✓ Mark Attendance: YES                           │
│                                                    │
│ Response: {                                        │
│   "success": true,                                │
│   "attendance": {                                 │
│     "status": "work_from_home",                  │
│     "wfhApprovedForDate": true,                  │
│     "locationVerificationStatus": "none",       │
│     "locationVerificationReason":                │
│       "WFH approved - no verification needed"   │
│   },                                              │
│   "locationVerification": {                       │
│     "wfhApproved": true,  ← MAIN FLAG           │
│     "locationVerified": false  ← NOT CHECKED    │
│   }                                               │
│ }                                                  │
│                                                    │
│ ✅ ATTENDANCE MARKED SUCCESSFULLY                │
│ 📍 Location: Anywhere (500km away, no problem)   │
│ 🏢 No GPS verification needed                    │
│ 📋 Status: "work_from_home"                      │
└────────────────────────────────────────────────────┘
```

---

### SCENARIO 2: ✅ Normal Day - Employee at Office (Within Radius)

```
DAY: Wednesday, January 17, 2025
EMPLOYEE: Priya (priya@company.com)
LOCATION: Office in Vettiyampatti
SITUATION: Normal working day

┌────────────────────────────────────────────────────┐
│ WEDNESDAY: Employee at office, clicks Clock In   │
├────────────────────────────────────────────────────┤
│ GPS Coordinates: 12.5173°N, 78.2329°E            │
│ (This is ~8 meters from office!)                 │
│                                                    │
│ POST /api/attendance/clock-in-with-location       │
│ {                                                  │
│   "latitude": 12.5173,                           │
│   "longitude": 78.2329,                          │
│   "locationName": "Main Office"                  │
│ }                                                  │
│                                                    │
│ SYSTEM LOGIC:                                     │
│ ✓ Check WFH for 2025-01-17?                      │
│ ✗ Not found: No WFH request                      │
│ ✓ Decision: VERIFY GPS location                  │
│                                                    │
│ Distance Calculation (Haversine Formula):        │
│ User: (12.5173, 78.2329)                         │
│ Office: (12.517304, 78.232888)                   │
│ Difference: ~8 meters                            │
│                                                    │
│ ✓ Is 8m ≤ 500m (allowed radius)? YES ✓          │
│ ✓ Location Verified: YES                         │
│ ✓ Mark Attendance: YES                           │
│                                                    │
│ Response: {                                        │
│   "success": true,                                │
│   "attendance": {                                 │
│     "status": "present",                         │
│     "locationVerified": true,                    │
│     "locationVerificationStatus": "verified",   │
│     "sessions": [{                               │
│       "latitude": 12.5173,                       │
│       "longitude": 78.2329,                      │
│       "distanceFromOffice": 8,  ← 8 meters     │
│       "locationVerified": true                   │
│     }]                                            │
│   },                                              │
│   "locationVerification": {                       │
│     "wfhApproved": false,                        │
│     "locationVerified": true,  ← ✓ PASSED       │
│     "closestLocation": {                         │
│       "name": "Main Office",                     │
│       "distance": 0.008,  ← 8 meters            │
│       "distanceMeters": 8,                       │
│       "allowedRadiusMeters": 500                │
│     }                                             │
│   }                                               │
│ }                                                  │
│                                                    │
│ ✅ ATTENDANCE MARKED SUCCESSFULLY                │
│ 📍 Location: Verified (8m from office)           │
│ 🎯 Within allowed radius: 500 meters             │
│ 📋 Status: "present"                             │
└────────────────────────────────────────────────────┘
```

---

### SCENARIO 3: ❌ Normal Day - Employee Too Far (Outside Radius)

```
DAY: Thursday, January 18, 2025
EMPLOYEE: Arun (arun@company.com)
LOCATION: Home (15.8km from office)
SITUATION: Tried to clock in without WFH approval

┌────────────────────────────────────────────────────┐
│ THURSDAY: Employee at home, tries to clock in    │
├────────────────────────────────────────────────────┤
│ GPS Coordinates: 12.6000°N, 78.3500°E            │
│ (This is ~15.8km from office!)                   │
│                                                    │
│ POST /api/attendance/clock-in-with-location       │
│ {                                                  │
│   "latitude": 12.6000,                           │
│   "longitude": 78.3500,                          │
│   "locationName": "Home"                         │
│ }                                                  │
│                                                    │
│ SYSTEM LOGIC:                                     │
│ ✓ Check WFH for 2025-01-18?                      │
│ ✗ Not found: No WFH request                      │
│ ✓ Decision: VERIFY GPS location                  │
│                                                    │
│ Distance Calculation (Haversine Formula):        │
│ User: (12.6000, 78.3500)                         │
│ Office: (12.517304, 78.232888)                   │
│ Difference: ~15.8 kilometers                     │
│                                                    │
│ ✗ Is 15.8km ≤ 500m? NO ✗                        │
│ ✗ Location NOT Verified                          │
│ ❌ Attendance REJECTED                           │
│                                                    │
│ Response: {                                        │
│   "success": true,                                │
│   "attendance": {                                 │
│     "status": "present",                         │
│     "locationVerified": false,                   │
│     "locationVerificationStatus": "failed",     │
│     "locationVerificationReason":                │
│       "Location too far from office"            │
│   },                                              │
│   "locationVerification": {                       │
│     "wfhApproved": false,                        │
│     "locationVerified": false,  ← ✗ FAILED      │
│     "closestLocation": {                         │
│       "name": "Main Office",                     │
│       "distance": 15.8,  ← 15.8 km              │
│       "distanceMeters": 15800,                   │
│       "allowedRadiusMeters": 500  ← Only 500m!│
│     }                                             │
│   }                                               │
│ }                                                  │
│                                                    │
│ ❌ ATTENDANCE REJECTED                           │
│ 📍 Location: Outside allowed radius              │
│ 🎯 Distance: 15.8 km (exceeds 500m limit)       │
│ 📋 Status: VERIFICATION FAILED                   │
│                                                    │
│ EMPLOYEE SEES ERROR:                              │
│ ┌──────────────────────────────────────────┐    │
│ │ ❌ Location Verification Failed!          │    │
│ │                                           │    │
│ │ Distance: 15.8 km from Main Office       │    │
│ │ Required: Within 500 meters              │    │
│ │                                           │    │
│ │ 💡 Solution: Submit a WFH request if     │    │
│ │    you need to work from home            │    │
│ └──────────────────────────────────────────┘    │
│                                                    │
│ NEXT STEP: Employee should submit WFH request   │
│ (Same as Scenario 1)                            │
└────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Implementation Steps

### Step 1: Setup Office Location
```bash
npm run setup-office-location
```
Output:
```
✓ Connected to MongoDB
✓ Office location created successfully!

📍 OFFICE LOCATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: Main Office
Latitude: 12.517304
Longitude: 78.232888
Address: Krishnagiri, Vettiyampatti
Allowed Radius: 500 meters
Status: Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Register Routes in `index.js`
```javascript
import wfhRequestRoutes from './routes/wfhRequest.routes.js';
import officeLocationRoutes from './routes/officeLocation.routes.js';
import { clockInWithLocation } from './controllers/attendanceWithLocation.controller.js';

app.use('/api/wfh-requests', wfhRequestRoutes);
app.use('/api/office-locations', officeLocationRoutes);
app.post('/api/attendance/clock-in-with-location', protect, clockInWithLocation);
```

### Step 3: Test with Your Location

#### Test 1: Clock In from Home (Should be rejected)
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in-with-location \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.6000,
    "longitude": 78.3500,
    "locationName": "Home"
  }'

Response: ❌ Location verification failed (15.8km away)
```

#### Test 2: Submit WFH Request
```bash
curl -X POST http://localhost:5000/api/wfh-requests/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-20",
    "reason": "Working from home",
    "notes": "Will attend all meetings online"
  }'

Response: ✓ WFH request created (status: pending)
```

#### Test 3: Manager Approves WFH
```bash
curl -X PATCH http://localhost:5000/api/wfh-requests/{requestId}/approve \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalNotes": "Approved"
  }'

Response: ✓ WFH approved
```

#### Test 4: Clock In with WFH Approved (From home - now works!)
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in-with-location \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.6000,
    "longitude": 78.3500,
    "locationName": "Home"
  }'

Response: ✓ Attendance marked (status: work_from_home)
Note: GPS verification SKIPPED because WFH is approved!
```

#### Test 5: Clock In at Office
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in-with-location \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.517304,
    "longitude": 78.232888,
    "locationName": "Main Office"
  }'

Response: ✓ Attendance marked (status: present)
Distance: 0 meters (exactly at office)
```

---

## 📱 Frontend Implementation (React Example)

```javascript
const ClockInWithLocation = ({ token }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      // Get GPS location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Call backend
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
      const loc = data.locationVerification;

      if (loc.wfhApproved) {
        setStatus({
          type: 'success',
          message: '✅ WFH Approved - Attendance Marked!',
          details: `Working from home for today`,
        });
      } else if (loc.locationVerified) {
        setStatus({
          type: 'success',
          message: '✅ Location Verified - Attendance Marked!',
          details: `Distance from office: ${(loc.closestLocation.distance * 1000).toFixed(0)}m`,
        });
      } else {
        const dist = (loc.closestLocation.distanceMeters / 1000).toFixed(1);
        setStatus({
          type: 'error',
          message: '❌ Location Verification Failed',
          details: `
            Distance from office: ${dist}km
            Required: Within 0.5km
            
            💡 Suggestion: Submit a WFH request to work from home
          `,
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: '❌ Error',
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clock-in-section">
      <button
        onClick={handleClockIn}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? '⏳ Getting Location...' : '🎯 Clock In'}
      </button>

      {status && (
        <div className={`status ${status.type}`}>
          <p className="message">{status.message}</p>
          <p className="details">{status.details}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 Key Points to Remember

| Point | Details |
|-------|---------|
| **Office Location** | 12.517304°N, 78.232888°E (Vettiyampatti) |
| **Allowed Radius** | 500 meters (adjustable) |
| **WFH Logic** | If approved → No GPS verification needed |
| **Normal Day** | Must be within 500m of office |
| **Distance Calculation** | Haversine formula (accurate to ~1 meter) |
| **Database Tracking** | All GPS data & distances recorded |
| **Manager Approval** | Required for all WFH requests |
| **Audit Trail** | Complete history of approvals & locations |

---

## ✅ Checklist for Production

- [ ] Run `npm run setup-office-location`
- [ ] Add routes to `index.js`
- [ ] Test WFH submission
- [ ] Test WFH approval
- [ ] Test clock-in at office (pass)
- [ ] Test clock-in from home without WFH (fail)
- [ ] Test clock-in from home with WFH (pass)
- [ ] Verify GPS data saved in database
- [ ] Test on mobile device (GPS accuracy)
- [ ] Train managers on approval process
- [ ] Brief employees on system

---

**Status**: ✅ **READY TO IMPLEMENT**  
**Office Location**: Vettiyampatti, Krishnagiri (12.517304, 78.232888)  
**Distance Radius**: 500 meters  
**WFH Logic**: Skip GPS if approved ✓
