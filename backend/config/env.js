import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(serverRoot, '..');

let loaded = false;

export const loadEnv = () => {
  if (loaded) return;

  dotenv.config({ path: path.join(serverRoot, '.env') });
  dotenv.config({ path: path.join(workspaceRoot, '.env') });

  process.env.NODE_ENV ||= 'development';
  process.env.PORT ||= '5000';
  process.env.CLIENT_URL ||= 'http://localhost:5173';
  process.env.MONGO_URI ||= process.env.MONGODB_URI || 'mongodb://localhost:27017/agency_crm';
  process.env.JWT_SECRET ||= process.env.NODE_ENV === 'production' ? 'replace-with-strong-production-secret' : 'dev-only-change-me-access-secret';
  process.env.JWT_REFRESH_SECRET ||= process.env.JWT_SECRET;
  process.env.JWT_EXPIRE ||= '30d';
  process.env.JWT_REFRESH_EXPIRE ||= '365d';
  process.env.ENCRYPTION_KEY ||= process.env.NODE_ENV === 'production' ? 'replace-with-32-char-production-key' : 'rise-with-media-development-credential-key';
  process.env.MAX_FILE_SIZE ||= String(10 * 1024 * 1024);
  process.env.PAGINATION_LIMIT ||= '20';
  process.env.UPLOAD_DIR ||= path.join(serverRoot, 'uploads');
  process.env.DEFAULT_ADMIN_NAME ||= 'DINESH M';
  process.env.DEFAULT_ADMIN_EMAIL ||= 'admin@agencycrm.com';
  process.env.DEFAULT_ADMIN_PASSWORD ||= 'password123';

  loaded = true;
};

export const getEnv = () => {
  loadEnv();

  return {
    nodeEnv: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    port: Number(process.env.PORT) || 5000,
    clientUrl: process.env.CLIENT_URL,
    mongoUri: process.env.MONGO_URI,
    mongoDbName: process.env.MONGO_DB_NAME || undefined,
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtExpire: process.env.JWT_EXPIRE,
    jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE,
    uploadDir: process.env.UPLOAD_DIR,
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    paginationLimit: Number(process.env.PAGINATION_LIMIT) || 20,
  };
};
