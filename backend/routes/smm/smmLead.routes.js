// =============================================
// SMM LEAD ROUTES
// =============================================
import express from 'express';
import {
  getSmmLeads,
  createSmmLead,
  updateSmmLead,
  deleteSmmLead,
  getSmmLeadStats,
} from '../../controllers/smm/smmLead.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSmmLeads);
router.get('/stats', getSmmLeadStats);
router.post('/', createSmmLead);
router.put('/:id', updateSmmLead);
router.delete('/:id', deleteSmmLead);

export default router;
