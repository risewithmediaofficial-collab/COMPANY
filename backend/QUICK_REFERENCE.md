# ⚡ QUICK REFERENCE CARD - Location-Based Attendance

## 🎯 Your Office Location
```
Latitude:  12.517304
Longitude: 78.232888
City:      Vettiyampathi, Krishnagiri, Tamil Nadu
Radius:    500 meters (0.5 km)
```

---

## 🚀 Setup (One-Time)

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Add routes to index.js
# (See INTEGRATION_STEPS.js)

# 3. Create office location
npm run setup-office-location

# ✓ Done! Ready to use
```

---

## 📋 WFH Logic (The Key Feature)

```
IF WFH Approved for Date?
  ├─ YES → ✅ Mark Attendance (Can be anywhere)
  │         No GPS check needed
  │
  └─ NO  → Verify GPS Distance
            ├─ Within 500m? → ✅ Mark Attendance
            └─ Outside?     → ❌ Rejected
```

---

## 🔗 API Endpoints Cheat Sheet

### WFH Requests
```
POST   /api/wfh-requests/submit           → Submit request
GET    /api/wfh-requests/my-requests      → View your requests
GET    /api/wfh-requests/check-status     → Check WFH status
PATCH  /api/wfh-requests/{id}/approve     → Manager approves
PATCH  /api/wfh-requests/{id}/reject      → Manager rejects
```

### Attendance
```
POST   /api/attendance/clock-in-with-location    → Clock in with GPS
POST   /api/attendance/clock-out                 → Clock out
```

### Office Locations
```
POST   /api/office-locations              → Create location (admin)
GET    /api/office-locations              → Get all locations
PATCH  /api/office-locations/{id}         → Update (admin)
DELETE /api/office-locations/{id}         → Delete (admin)
```

---

## 💡 Three Scenarios

### ✅ Scenario 1: WFH Approved
```
1. Employee: Submit WFH request
   → Date: 2025-01-15
   → Reason: Doctor appointment

2. Manager: Approve request
   → Status changes to "approved"

3. Employee: Clock in from anywhere
   → Even 500km away (Chennai, Mumbai, etc.)
   → GPS verification SKIPPED
   → Attendance: MARKED ✓
```

### ✅ Scenario 2: At Office
```
1. Employee: Clock in with GPS
   → Location: Office (12.517304, 78.232888)
   → Distance: ~0 meters

2. System: Verify distance
   → 0m ≤ 500m? YES ✓
   → Attendance: MARKED ✓
```

### ❌ Scenario 3: Too Far (No WFH)
```
1. Employee: Clock in with GPS
   → Location: Home (12.6000, 78.3500)
   → Distance: 15.8 km

2. System: Verify distance
   → 15.8km ≤ 500m? NO ✗
   → Attendance: REJECTED ✗

3. Solution: Submit WFH request (goes to Scenario 1)
```

---

## 🧪 Quick Tests

### Test 1: Setup
```bash
npm run setup-office-location
```
Expected: ✓ Office location created

### Test 2: WFH Request (as employee)
```bash
POST /api/wfh-requests/submit
Body: {
  "date": "2025-01-20",
  "reason": "Family commitment"
}
```
Expected: ✓ Status: pending

### Test 3: Approve (as manager)
```bash
PATCH /api/wfh-requests/{id}/approve
```
Expected: ✓ Status: approved

### Test 4: Clock in (anywhere, as employee)
```bash
POST /api/attendance/clock-in-with-location
Body: {
  "latitude": 13.0827,      // Chennai (far away)
  "longitude": 80.2707,
  "locationName": "Home"
}
```
Expected: ✓ Attendance marked (status: work_from_home)

### Test 5: Clock in at office
```bash
POST /api/attendance/clock-in-with-location
Body: {
  "latitude": 12.517304,    // Exact office
  "longitude": 78.232888,
  "locationName": "Office"
}
```
Expected: ✓ Attendance marked (status: present, distance: 0m)

### Test 6: Clock in too far
```bash
POST /api/attendance/clock-in-with-location
Body: {
  "latitude": 12.6000,      // 15.8km away
  "longitude": 78.3500,
  "locationName": "Home"
}
```
Expected: ✗ Verification failed (too far)

---

## 📂 Files Created

| File | Purpose |
|------|---------|
| `models/wfhRequest.model.js` | WFH request tracking |
| `models/officeLocation.model.js` | Office GPS coordinates |
| `controllers/wfhRequest.controller.js` | WFH business logic |
| `controllers/officeLocation.controller.js` | Location management |
| `controllers/attendanceWithLocation.controller.js` | Enhanced clock-in |
| `services/attendanceLocation.service.js` | Location verification logic |
| `utils/locationVerification.js` | GPS calculations |
| `routes/wfhRequest.routes.js` | WFH endpoints |
| `routes/officeLocation.routes.js` | Location endpoints |
| `utils/setupOfficeLocation.js` | One-time setup script |

---

## 🔧 Configuration

### Adjust Allowed Radius
```bash
# Default: 500 meters

# To change, update in setupOfficeLocation.js:
radiusKm: 0.5  // Change to 1.0 for 1km, 2.0 for 2km, etc.
```

### Multiple Office Locations
```bash
# Create multiple locations via API
POST /api/office-locations
{
  "name": "Branch Office",
  "latitude": 13.1939,
  "longitude": 79.7749,
  "radiusKm": 0.5,
  "address": "Chennai Branch"
}
```

---

## ⚠️ Important Notes

✓ **WFH Logic**: If approved → No GPS needed (can be anywhere)  
✓ **Normal Day**: Must be within 500m of office  
✓ **GPS Accuracy**: Uses Haversine formula (~1m accuracy)  
✓ **Audit Trail**: All GPS data & distances saved  
✓ **Manager Approval**: Required for all WFH requests  

---

## 🎓 Documentation Files

| File | Content |
|------|---------|
| `LOCATION_ATTENDANCE_GUIDE.md` | Complete API reference |
| `INTEGRATION_STEPS.js` | Step-by-step code examples |
| `README_LOCATION_ATTENDANCE.md` | System overview |
| `WFH_LOGIC_COMPLETE_FLOW.js` | Detailed scenarios & testing |
| `WFH_VISUAL_GUIDE.md` | Visual diagrams & flows |
| **This file** | Quick reference |

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| "No office locations" | Run: `npm run setup-office-location` |
| GPS not accurate | Increase `radiusKm` to 1.0 or 2.0 |
| WFH not working | Check manager approval status |
| Clock in fails | Must be within 500m OR have WFH |
| Location saved as null | Ensure GPS coordinates valid |

---

## ✅ Pre-Production Checklist

- [ ] Run `npm run setup-office-location`
- [ ] Add routes to `index.js`
- [ ] Test all 6 scenarios above
- [ ] Train managers on approval process
- [ ] Communicate to employees
- [ ] Set reasonable GPS radius
- [ ] Have manual clock-in fallback
- [ ] Monitor GPS accuracy
- [ ] Collect feedback

---

## 📞 Quick Help

**Setup**: `npm run setup-office-location`  
**Location**: 12.517304, 78.232888 (Vettiyampathi)  
**Radius**: 500 meters  
**WFH**: Skip GPS if approved ✓  
**Status**: Ready to deploy 🚀  

---

**Version**: 1.0  
**Office**: Vettiyampathi, Krishnagiri, Tamil Nadu  
**Last Updated**: 2025-01-01
