import express from 'express';
import { checkDuplicateRecord } from '../controllers/duplicateCheck.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.post('/', checkDuplicateRecord);

export default router;
