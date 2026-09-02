import express from 'express';
import {
  addCompletedFiles,
  addComment,
  addTaskAttachments,
  addProgressUpdate,
  approveTask,
  createDailyTask,
  createTask,
  deleteTask,
  getCalendarTasks,
  getTask,
  getTaskResponseDetails,
  getTasks,
  getWeeklyTaskReport,
  logTime,
  submitClientTaskResponse,
  updateTask,
  updateTaskStatus,
} from '../controllers/task.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getTasks);
router.get('/calendar', authorize('superAdmin', 'admin', 'manager', 'employee', 'client', 'referral'), getCalendarTasks);
router.get('/weekly-report', authorize('superAdmin', 'admin', 'manager', 'employee'), getWeeklyTaskReport);
router.post('/daily', authorize('superAdmin', 'admin', 'manager', 'employee'), createDailyTask);
router.get('/:id', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getTask);
router.post('/', authorize('superAdmin', 'admin', 'manager', 'employee'), createTask);
router.put('/:id', authorize('superAdmin', 'admin', 'manager', 'employee'), updateTask);
router.patch('/:id/status', authorize('superAdmin', 'admin', 'manager', 'employee'), updateTaskStatus);
router.post('/:id/comment', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), addComment);
router.post('/:id/progress', authorize('superAdmin', 'admin', 'manager', 'employee'), addProgressUpdate);
router.post('/:id/attachments', authorize('superAdmin', 'admin', 'manager', 'employee'), addTaskAttachments);
router.post('/:id/completed-files', authorize('superAdmin', 'admin', 'manager', 'employee'), addCompletedFiles);
router.post('/:id/approve', authorize('superAdmin', 'admin', 'manager', 'client'), approveTask);
router.get('/:id/response', authorize('superAdmin', 'admin', 'manager', 'employee', 'client'), getTaskResponseDetails);
router.post('/:id/client-response', authorize('client'), submitClientTaskResponse);
router.post('/:id/log-time', authorize('superAdmin', 'admin', 'manager', 'employee'), logTime);
router.delete('/:id', authorize('superAdmin', 'admin', 'manager'), deleteTask);

export default router;
