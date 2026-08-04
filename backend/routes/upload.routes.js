import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware.js';
import { getEnv } from '../config/env.js';

const router = express.Router();
const env = getEnv();

router.use(protect);

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    cb(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  return res.json({
    success: true,
    url: `/api/uploads/${req.file.filename}`,
    name: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    type: req.file.mimetype,
  });
});

export default router;
