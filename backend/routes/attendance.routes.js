import express from 'express';
import { authorize, protect } from '../middleware/auth.middleware.js';
import {
  clockIn,
  clockOut,
  getAttendance,
  getEodReports,
  getTeamAttendance,
  submitEOD,
  assignHoliday,
  submitLeave,
  submitWFH,
} from '../controllers/attendance.controller.js';

const router = express.Router();
router.use(protect);

router.get('/team/today', authorize('superAdmin', 'manager'), getTeamAttendance);
router.get('/eod-reports', authorize('superAdmin', 'organizationOwner', 'manager', 'accountManager', 'employee', 'client'), getEodReports);
router.get('/', authorize('superAdmin', 'manager', 'employee'), getAttendance);
router.post('/clock-in', authorize('superAdmin', 'manager', 'employee'), clockIn);
router.post('/clock-out', authorize('superAdmin', 'manager', 'employee'), clockOut);
router.post('/eod', authorize('superAdmin', 'manager', 'employee'), submitEOD);
router.post('/holiday', authorize('superAdmin', 'manager'), assignHoliday);
router.post('/leave', authorize('superAdmin', 'manager'), submitLeave);
router.post('/wfh', authorize('superAdmin', 'manager', 'employee'), submitWFH);

export default router;
