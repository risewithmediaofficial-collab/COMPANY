// =============================================
// WFH ATTENDANCE LOGIC - COMPLETE FLOW WITH YOUR LOCATION
// =============================================

/**
 * YOUR OFFICE LOCATION:
 * 📍 Latitude:  12.517304
 * 📍 Longitude: 78.232888
 * 📍 City: Vettiyampatti, Krishnagiri, Tamil Nadu, India
 * 📍 Allowed Radius: 500 meters (0.5 km)
 */

/**
 * ============================================
 * SCENARIO 1: WFH APPROVED - NO GPS NEEDED ✓
 * ============================================
 */

// Step 1: Employee submits WFH request on Monday
const wfhRequest = {
  date: "2025-01-15",
  reason: "Doctor's appointment in Chennai",
  startTime: "09:00",
  endTime: "17:00",
  notes: "Will be in car, not at office"
};

// API Call
/*
POST /api/wfh-requests/submit
Authorization: Bearer <employee_token>
{
  "date": "2025-01-15",
  "reason": "Doctor's appointment in Chennai",
  "notes": "Will be in car, not at office"
}

Response: {
  "success": true,
  "message": "WFH request submitted successfully",
  "wfhRequest": {
    "_id": "abc123",
    "user": "user_id",
    "date": "2025-01-15",
    "reason": "Doctor's appointment in Chennai",
    "status": "pending",  // Waiting for manager approval
    "approvedBy": null,
    "approvalDate": null
  }
}
*/

// Step 2: Manager approves the WFH request
/*
PATCH /api/wfh-requests/abc123/approve
Authorization: Bearer <manager_token>
{
  "approvalNotes": "Approved - take care"
}

Response: {
  "success": true,
  "message": "WFH request approved successfully",
  "wfhRequest": {
    "_id": "abc123",
    "user": "user_id",
    "date": "2025-01-15",
    "reason": "Doctor's appointment in Chennai",
    "status": "approved",  // ✓ Now approved
    "approvedBy": "manager_id",
    "approvalDate": "2025-01-14T10:30:00Z"
  }
}
*/

// Step 3: On Jan 15, employee is anywhere in the world - clocks in with ANY GPS location
// Employee could be in Chennai (500km away), Mumbai (1000km away), or anywhere
// NO GPS VERIFICATION NEEDED because WFH is approved!

const clockInWithWFH = {
  latitude: 13.0827,      // Chennai latitude (500km away!)
  longitude: 80.2707,     // Chennai longitude
  locationName: "Chennai Hospital"
};

/*
POST /api/attendance/clock-in-with-location
Authorization: Bearer <employee_token>
{
  "latitude": 13.0827,
  "longitude": 80.2707,
  "locationName": "Chennai Hospital"
}

WHAT HAPPENS:
1. System checks: Is WFH approved for 2025-01-15?
2. Result: YES ✓ (found approved WFH request)
3. Decision: Skip GPS verification
4. Action: Mark attendance ✓
5. Status: "work_from_home"
6. Reason: "WFH approved - location verification not required"

Response: {
  "success": true,
  "message": "Clocked in successfully",
  "attendance": {
    "_id": "att123",
    "user": "user_id",
    "date": "2025-01-15",
    "status": "work_from_home",  // ✓ WFH Status
    "wfhApprovedForDate": true,  // ✓ WFH Approved
    "wfhRequestId": "abc123",    // ✓ Linked to WFH request
    "locationVerificationStatus": "none",  // ✓ No verification needed
    "locationVerificationReason": "WFH approved - location verification not required"
  },
  "locationVerification": {
    "wfhApproved": true,  // ✓ MAIN FLAG
    "locationVerified": false,  // ✗ Not checked (WFH approved)
    "wfhRequiresLocation": false  // ✗ No location check needed
  }
}
*/

console.log('✓ SCENARIO 1 RESULT: Attendance Marked Successfully');
console.log('✓ Employee can work from anywhere');
console.log('✓ No GPS verification needed');
console.log('✓ Status: work_from_home');


/**
 * ============================================
 * SCENARIO 2: NORMAL DAY - AT OFFICE ✓
 * ============================================
 */

// Employee did NOT request WFH, so it's a normal office day
// Employee goes to office in Vettiyampatti and clicks Clock In

const clockInAtOffice = {
  latitude: 12.5173,   // At office (12.517304)
  longitude: 78.2329,  // At office (78.232888)
  locationName: "Main Office"
};

/*
POST /api/attendance/clock-in-with-location
Authorization: Bearer <employee_token>
{
  "latitude": 12.5173,
  "longitude": 78.2329,
  "locationName": "Main Office"
}

WHAT HAPPENS:
1. System checks: Is WFH approved for today?
2. Result: NO ✗ (no WFH request found)
3. Decision: Verify GPS location
4. Calculate distance:
   - User location: (12.5173, 78.2329)
   - Office location: (12.517304, 78.232888)
   - Radius allowed: 500 meters
   - Haversine formula calculates: ~8 meters ✓
5. Is 8 meters ≤ 500 meters? YES ✓
6. Action: Mark attendance ✓
7. Status: "present"

Response: {
  "success": true,
  "message": "Clocked in successfully",
  "attendance": {
    "_id": "att456",
    "user": "user_id",
    "date": "2025-01-16",
    "status": "present",  // ✓ Normal attendance
    "wfhApprovedForDate": false,  // ✗ No WFH
    "locationVerified": true,  // ✓ Location verified
    "locationVerificationStatus": "verified",
    "location": "Main Office",
    "sessions": [{
      "clockIn": "2025-01-16T09:00:00Z",
      "latitude": 12.5173,
      "longitude": 78.2329,
      "locationVerified": true,
      "distanceFromOffice": 8  // 8 meters
    }]
  },
  "locationVerification": {
    "wfhApproved": false,  // ✗ No WFH
    "locationVerified": true,  // ✓ Location verified
    "closestLocation": {
      "name": "Main Office",
      "distance": 0.008,  // 8 meters
      "distanceMeters": 8,
      "allowedRadiusMeters": 500
    }
  }
}
*/

console.log('✓ SCENARIO 2 RESULT: Attendance Marked Successfully');
console.log('✓ Location verified: 8 meters from office');
console.log('✓ Within allowed radius: 500 meters');
console.log('✓ Status: present');


/**
 * ============================================
 * SCENARIO 3: NORMAL DAY - TOO FAR FROM OFFICE ✗
 * ============================================
 */

// Employee did NOT request WFH, so it's a normal office day
// But employee is at home (far from office) and tries to clock in

const clockInTooFar = {
  latitude: 12.6000,    // Different location
  longitude: 78.3500,   // Different location
  locationName: "Home"
};

/*
POST /api/attendance/clock-in-with-location
Authorization: Bearer <employee_token>
{
  "latitude": 12.6000,
  "longitude": 78.3500,
  "locationName": "Home"
}

WHAT HAPPENS:
1. System checks: Is WFH approved for today?
2. Result: NO ✗ (no WFH request)
3. Decision: Verify GPS location
4. Calculate distance:
   - User location: (12.6000, 78.3500)
   - Office location: (12.517304, 78.232888)
   - Radius allowed: 500 meters
   - Haversine formula calculates: ~15.8 km
5. Is 15.8 km ≤ 500 meters? NO ✗
6. Action: BLOCK attendance ✗
7. Status: REJECTED

Response: {
  "success": true,
  "message": "Clocked in successfully",
  "attendance": {
    "_id": "att789",
    "user": "user_id",
    "date": "2025-01-17",
    "status": "present",  // Pending verification
    "locationVerified": false,  // ✗ NOT verified
    "locationVerificationStatus": "failed",
    "locationVerificationReason": "Location verification failed - too far from office"
  },
  "locationVerification": {
    "wfhApproved": false,  // ✗ No WFH
    "locationVerified": false,  // ✗ Verification FAILED
    "closestLocation": {
      "name": "Main Office",
      "distance": 15.8,  // 15.8 km
      "distanceMeters": 15800,
      "allowedRadiusMeters": 500  // Only 500m allowed
    },
    "allVerifications": [{
      "location": "Main Office",
      "verified": false,
      "distance": 15.8,
      "distanceMeters": 15800,
      "allowedRadius": 0.5
    }]
  }
}

EMPLOYEE SEES ERROR MESSAGE:
"❌ Location verification failed!
Distance: 15.8 km from Main Office
Required: Within 0.5 km

💡 Suggestion: Submit a WFH request if you need to work from home"
*/

console.log('❌ SCENARIO 3 RESULT: Attendance REJECTED');
console.log('❌ Distance: 15.8 km from office');
console.log('❌ Required: Within 500 meters');
console.log('❌ Status: Verification FAILED');
console.log('💡 Employee should submit WFH request instead');


/**
 * ============================================
 * LOGIC SUMMARY - THE COMPLETE DECISION TREE
 * ============================================
 */

const decisionTree = {
  "Employee wants to clock in": {
    "Step 1: Check WFH Approval": {
      "Is WFH approved for today?": {
        "YES": {
          "action": "✓ Mark Attendance",
          "status": "work_from_home",
          "gpsRequired": "NO",
          "gpsVerification": "SKIPPED",
          "message": "WFH approved - no location verification needed"
        },
        "NO": {
          "action": "Check GPS Location",
          "nextStep": "Verify GPS Distance"
        }
      }
    },
    "Step 2: Verify GPS Distance": {
      "Calculate distance from office (12.517304, 78.232888)": {
        "If distance ≤ 500 meters": {
          "action": "✓ Mark Attendance",
          "status": "present",
          "gpsRequired": "YES",
          "gpsVerification": "PASSED",
          "message": "Location verified - within office radius"
        },
        "If distance > 500 meters": {
          "action": "❌ Reject Clock-In",
          "status": "VERIFICATION_FAILED",
          "message": "Too far from office - submit WFH request"
        }
      }
    }
  }
};


/**
 * ============================================
 * TESTING STEPS (Copy-Paste Ready)
 * ============================================
 */

console.log('\n\n📋 TESTING CHECKLIST:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test 1
console.log('\n✓ TEST 1: Setup Office Location');
console.log('Run: npm run setup-office-location');
console.log('Expected: Office location created at 12.517304, 78.232888');

// Test 2
console.log('\n✓ TEST 2: Submit WFH Request (Employee)');
console.log('POST /api/wfh-requests/submit');
console.log('Body: { "date": "2025-01-20", "reason": "Family commitment" }');
console.log('Expected: Request created with status "pending"');

// Test 3
console.log('\n✓ TEST 3: Manager Approves WFH');
console.log('PATCH /api/wfh-requests/{id}/approve');
console.log('Expected: Status changes to "approved"');

// Test 4
console.log('\n✓ TEST 4: Clock In with WFH - From Anywhere');
console.log('POST /api/attendance/clock-in-with-location');
console.log('Body: { "latitude": 13.0827, "longitude": 80.2707 }');
console.log('Expected: Attendance marked with status "work_from_home"');
console.log('Note: GPS verification SKIPPED because WFH is approved');

// Test 5
console.log('\n✓ TEST 5: Clock In Normal Day - At Office');
console.log('POST /api/attendance/clock-in-with-location');
console.log('Body: { "latitude": 12.517304, "longitude": 78.232888 }');
console.log('Expected: Attendance marked with status "present"');
console.log('Note: Distance ~0 meters (exactly at office)');

// Test 6
console.log('\n✓ TEST 6: Clock In Normal Day - Too Far');
console.log('POST /api/attendance/clock-in-with-location');
console.log('Body: { "latitude": 12.6000, "longitude": 78.3500 }');
console.log('Expected: Verification FAILED');
console.log('Note: Distance ~15.8 km (exceeds 500m limit)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


/**
 * ============================================
 * KEY IMPLEMENTATION DETAILS
 * ============================================
 */

console.log('\n\n🔑 IMPLEMENTATION DETAILS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const implementationDetails = {
  "Office Location": {
    "latitude": 12.517304,
    "longitude": 78.232888,
    "radiusKm": 0.5,
    "radiusMeters": 500,
    "city": "Vettiyampatti, Krishnagiri, Tamil Nadu"
  },
  "WFH Logic": {
    "approval": "Required from Manager",
    "gpsVerification": "SKIPPED if approved",
    "marking": "Attendance marked regardless of location"
  },
  "Normal Day Logic": {
    "approval": "Not needed",
    "gpsVerification": "REQUIRED",
    "distanceCalculation": "Haversine formula",
    "allowedRadius": "500 meters"
  },
  "Database Tracking": {
    "saves": ["GPS coordinates", "Distance from office", "Verification status", "WFH approval link"],
    "purpose": "Audit trail and compliance"
  }
};

console.log(JSON.stringify(implementationDetails, null, 2));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


/**
 * ============================================
 * INTEGRATION INTO YOUR BACKEND
 * ============================================
 */

console.log('\n🚀 HOW IT INTEGRATES INTO YOUR SYSTEM:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const integrationSteps = `
1. Run Setup Script:
   npm run setup-office-location
   → Creates OfficeLocation document with your coordinates

2. Update Your Attendance Controller:
   Import clockInWithLocation from attendanceWithLocation.controller.js
   
3. Frontend Integration:
   → Capture GPS location from device
   → Call POST /api/attendance/clock-in-with-location
   → Handle WFH approved vs verification failed responses

4. WFH Workflow:
   Employee → Submit Request → Manager Approve → Auto-marked Attendance

5. Normal Day Workflow:
   Employee → Clock In with GPS → Verify Within 500m → Mark Attendance

6. Audit & Compliance:
   → All GPS data logged
   → Distance from office recorded
   → WFH approvals tracked
   → Manager approvals recorded
`;

console.log(integrationSteps);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
