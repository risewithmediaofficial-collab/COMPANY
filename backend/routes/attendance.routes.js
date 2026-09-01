import express from 'express';
import { authorize, protect } from '../middleware/auth.middleware.js';
import {
  clockOut,
  getAttendance,
  getEodReports,
  getTeamAttendance,
  submitEOD,
  assignHoliday,
  submitLeave,
  submitAbsent,
  submitWFH,
  approveOrRejectAttendanceRequest,
} from '../controllers/attendance.controller.js';
import { clockInWithLocation as clockIn } from '../controllers/attendanceWithLocation.controller.js';

const router = express.Router();
router.use(protect);

router.get('/team/today', authorize('superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'), getTeamAttendance);
router.get('/eod-reports', getEodReports);
router.get('/', getAttendance);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.post('/absent', submitAbsent);
router.post('/leave', submitLeave);
router.post('/eod', submitEOD);
router.post('/holiday', authorize('superAdmin', 'admin', 'organizationOwner', 'manager'), assignHoliday);
router.post('/wfh', submitWFH);
router.put('/:id/approve', authorize('superAdmin', 'admin', 'organizationOwner', 'manager', 'accountManager'), approveOrRejectAttendanceRequest);

export default router;
