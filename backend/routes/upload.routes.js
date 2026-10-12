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

import crypto from 'crypto';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.csv',
  '.txt',
  '.mp4',
  '.mov',
  '.mp3',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.svg',
  '.xml',
  '.js',
  '.mjs',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.py',
  '.cgi',
  '.dll',
  '.vbs',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const randomKey = crypto.randomUUID();
    cb(null, `${randomKey}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return cb(new Error('Executable or script files are strictly prohibited for upload.'), false);
  }
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return cb(new Error('Invalid file type. Only standard images, documents, and media are allowed.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize, files: 1 },
  fileFilter,
});

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
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
});

export default router;
