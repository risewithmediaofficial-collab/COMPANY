// =============================================
// QUICK INTEGRATION GUIDE
// =============================================

/**
 * Step 1: Update your index.js file
 * Add these imports and route registrations
 */

// Add these imports at the top
import wfhRequestRoutes from './routes/wfhRequest.routes.js';
import officeLocationRoutes from './routes/officeLocation.routes.js';
import { clockInWithLocation } from './controllers/attendanceWithLocation.controller.js';

// Add these before your app.listen() call
// ============================================

// WFH Request Routes
app.use('/api/wfh-requests', wfhRequestRoutes);

// Office Location Routes
app.use('/api/office-locations', officeLocationRoutes);

// Update existing attendance route or add new one
// Option 1: If you want to keep both old and new clock-in
app.post('/api/attendance/clock-in', protect, clockIn); // Keep old one
app.post('/api/attendance/clock-in-with-location', protect, clockInWithLocation); // Add new one

// Option 2: Or replace old clock-in completely
app.post('/api/attendance/clock-in', protect, clockInWithLocation); // Replace


/**
 * Step 2: Setup Instructions (Run in order)
 */

// 1. Make sure all new files are in correct locations:
/*
   backend/models/wfhRequest.model.js
   backend/models/officeLocation.model.js
   backend/controllers/wfhRequest.controller.js
   backend/controllers/officeLocation.controller.js
   backend/controllers/attendanceWithLocation.controller.js
   backend/services/attendanceLocation.service.js
   backend/utils/locationVerification.js
   backend/routes/wfhRequest.routes.js
   backend/routes/officeLocation.routes.js
*/

// 2. Restart your backend server
// npm run dev

// 3. Test health check
// GET http://localhost:5000/api/health

// 4. Login as admin and get auth token
// POST http://localhost:5000/api/auth/login
// Body: { email: "admin@example.com", password: "..." }
// Response: { token: "eyJ..." }

// 5. Create office location
// POST http://localhost:5000/api/office-locations
// Headers: Authorization: Bearer <token>
// Body: {
//   "name": "Main Office",
//   "latitude": 28.6139,
//   "longitude": 77.2090,
//   "radiusKm": 0.5,
//   "address": "Business Park, New Delhi",
//   "city": "New Delhi",
//   "country": "India"
// }

// 6. Test as regular user
// - Login with regular user token
// - Submit WFH request
// - Approve as manager
// - Clock in with location


/**
 * Step 3: Frontend Integration (React Example)
 */

import { useEffect, useState } from 'react';
import axios from 'axios';

const AttendanceClockIn = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);

  const handleClockInWithLocation = async () => {
    setLoading(true);
    try {
      // Get user's current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Call backend API
      const response = await axios.post(
        '/api/attendance/clock-in-with-location',
        {
          latitude,
          longitude,
          locationName: 'Office',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { locationVerification } = response.data;

      if (locationVerification.wfhApproved) {
        setLocationStatus({
          status: 'success',
          message: '✓ WFH Approved - Attendance Marked!',
        });
      } else if (locationVerification.locationVerified) {
        setLocationStatus({
          status: 'success',
          message: `✓ Location Verified (${locationVerification.closestLocation.distance.toFixed(2)}km away)`,
        });
      } else {
        const loc = locationVerification.closestLocation;
        setLocationStatus({
          status: 'error',
          message: `✗ Location verification failed!\nDistance: ${(loc.distance * 1000).toFixed(0)}m from ${loc.name}\nRequired: Within ${(loc.allowedRadius * 1000).toFixed(0)}m`,
        });
      }
    } catch (error) {
      setLocationStatus({
        status: 'error',
        message: 'Failed to get location or clock in',
      });
      console.error('Clock-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-section">
      <button 
        onClick={handleClockInWithLocation} 
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Getting Location...' : 'Clock In'}
      </button>

      {locationStatus && (
        <div className={`status-message status-${locationStatus.status}`}>
          {locationStatus.message}
        </div>
      )}
    </div>
  );
};


/**
 * Step 4: WFH Request Component
 */

const WFHRequestForm = ({ token, userId }) => {
  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/wfh-requests/submit',
        {
          date: new Date(formData.date).toISOString(),
          reason: formData.reason,
          notes: formData.notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage({
        type: 'success',
        text: 'WFH request submitted! Waiting for manager approval.',
      });
      setFormData({ date: '', reason: '', notes: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit WFH request',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="wfh-form">
      <div className="form-group">
        <label>Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Reason</label>
        <input
          type="text"
          placeholder="Doctor's appointment, home commitment, etc."
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Additional Notes</label>
        <textarea
          placeholder="Any additional information..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Submitting...' : 'Submit WFH Request'}
      </button>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}
    </form>
  );
};


/**
 * Step 5: Manager Dashboard for Approvals
 */

const WFHApprovalList = ({ token, userRole }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWFHRequests();
  }, []);

  const fetchWFHRequests = async () => {
    try {
      const response = await axios.get(
        '/api/wfh-requests?status=pending',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(response.data.wfhRequests);
    } catch (error) {
      console.error('Failed to fetch WFH requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await axios.patch(
        `/api/wfh-requests/${requestId}/approve`,
        { approvalNotes: 'Approved' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('WFH request approved!');
      fetchWFHRequests(); // Refresh list
    } catch (error) {
      alert('Failed to approve: ' + error.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.patch(
        `/api/wfh-requests/${requestId}/reject`,
        { rejectionReason: 'Please come to office' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('WFH request rejected!');
      fetchWFHRequests(); // Refresh list
    } catch (error) {
      alert('Failed to reject: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="wfh-approval-list">
      <h2>Pending WFH Requests</h2>
      {requests.length === 0 ? (
        <p>No pending requests</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.user.name}</td>
                <td>{new Date(req.date).toLocaleDateString()}</td>
                <td>{req.reason}</td>
                <td>
                  <button
                    onClick={() => handleApprove(req._id)}
                    className="btn btn-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req._id)}
                    className="btn btn-danger"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};


/**
 * Step 6: Testing Endpoints with Postman/cURL
 */

// Test WFH Request Submission
/*
curl -X POST http://localhost:5000/api/wfh-requests/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15",
    "reason": "Doctor appointment",
    "notes": "Will be back by 3 PM"
  }'
*/

// Test Clock In with Location
/*
curl -X POST http://localhost:5000/api/attendance/clock-in-with-location \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "locationName": "Main Office"
  }'
*/


/**
 * IMPORTANT: Database Backups
 * Before deploying, backup your existing Attendance collection
 * The new fields are optional and won't break existing records
 */

// MongoDB backup command:
// mongodump --uri="mongodb://localhost:27017/your_db_name" --out ./backup

// Restore:
// mongorestore --uri="mongodb://localhost:27017/your_db_name" ./backup


/**
 * Troubleshooting
 */

// Issue: "No office locations configured"
// Solution: Admin must create at least one office location first

// Issue: GPS not accurate enough
// Solution: Increase radiusKm in OfficeLocation to 1.0 (1km radius)

// Issue: WFH request not working
// Solution: Check that user role has permission (should work for all users)

// Issue: Clock in fails with invalid coordinates
// Solution: Ensure latitude is -90 to 90, longitude is -180 to 180

// Need Help? Check LOCATION_ATTENDANCE_GUIDE.md for detailed documentation
