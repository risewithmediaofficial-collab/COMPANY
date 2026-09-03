// =============================================
// PORTAL ROUTES - Client Portal API
// =============================================

import express from 'express';
import {
  getPortalDashboard,
  getContentItems,
  getContentItem,
  approveContentItem,
  requestRevision,
  addContentFeedback,
  getReportingData,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  createReportingEntry,
  updateReportingEntry,
  deleteReportingEntry,
  getClientFinanceOverview,
  getClientInvoices,
  getClientProjects,
  getClientTasks,
  getClientAdBudget,
} from '../controllers/portal.controller.js';
import { authorize, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

// ─── CLIENT ROUTES ────────────────────────────────────────────────────────────
router.get('/dashboard', authorize('client'), getPortalDashboard);
router.get('/content', authorize('client'), getContentItems);
router.get('/content/:id', authorize('client'), getContentItem);
router.post('/content/:id/approve', authorize('client'), approveContentItem);
router.post('/content/:id/revision', authorize('client'), requestRevision);
router.post('/content/:id/feedback', authorize('client'), addContentFeedback);
router.get('/reporting', authorize('client', 'superAdmin', 'manager'), getReportingData);
router.get('/finance', authorize('client'), getClientFinanceOverview);
router.get('/invoices', authorize('client'), getClientInvoices);
router.get('/projects', authorize('client'), getClientProjects);
router.get('/tasks', authorize('client'), getClientTasks);
router.get('/budget', authorize('client'), getClientAdBudget);

// ─── ADMIN / MANAGER ROUTES ──────────────────────────────────────────────────
router.post('/content', authorize('superAdmin', 'manager', 'employee'), createContentItem);
router.put('/content/:id', authorize('superAdmin', 'manager', 'employee'), updateContentItem);
router.delete('/content/:id', authorize('superAdmin', 'manager'), deleteContentItem);

router.post('/reporting', authorize('superAdmin', 'manager'), createReportingEntry);
router.put('/reporting/:id', authorize('superAdmin', 'manager'), updateReportingEntry);
router.delete('/reporting/:id', authorize('superAdmin', 'manager'), deleteReportingEntry);

export default router;
