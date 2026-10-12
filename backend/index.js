// =============================================
// MAIN SERVER ENTRY POINT
// Agency CRM & Project Management System
// =============================================

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/db.js';
import { getEnv, loadEnv } from './config/env.js';
import { initSocket } from './config/socket.js';
import { initCronJobs } from './services/cron.service.js';
import User from './models/user.model.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import leadRoutes from './routes/lead.routes.js';
import clientRoutes from './routes/client.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import financeRoutes from './routes/finance.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import hrRoutes from './routes/hr.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import referralRoutes from './routes/referral.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import automationRoutes from './routes/automation.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import communicationRoutes from './routes/communication.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import aiRoutes from './routes/ai.routes.js';
import portalRoutes from './routes/portal.routes.js';
import brandRoutes from './routes/brand.routes.js';
import accessRequestRoutes from './routes/accessRequest.routes.js';
import credentialRoutes from './routes/credential.routes.js';
import clientFollowupRoutes from './routes/clientFollowup.routes.js';
import assetRoutes from './routes/asset.routes.js';
import domainRenewalRoutes from './routes/domainRenewal.routes.js';
import sopRoutes from './routes/sop.routes.js';
import proposalRoutes from './routes/proposal.routes.js';
import taskNoteRoutes from './routes/taskNote.routes.js';
import dmCalendarRoutes from './routes/dmCalendar.routes.js';
import influencerRoutes from './routes/influencer.routes.js';
import smmClientRoutes from './routes/smm/smmClient.routes.js';
import smmProjectRoutes from './routes/smm/smmProject.routes.js';
import smmContentRoutes from './routes/smm/smmContent.routes.js';
import smmCampaignRoutes from './routes/smm/campaign.routes.js';
import smmAdSetRoutes from './routes/smm/adSet.routes.js';
import smmAdRoutes from './routes/smm/ad.routes.js';
import smmAdSpendRoutes from './routes/smm/smmAdSpend.routes.js';
import smmLeadRoutes from './routes/smm/smmLead.routes.js';
import smmCreativeRoutes from './routes/smm/creative.routes.js';
import smmTaskRoutes from './routes/smm/smmTask.routes.js';
import smmNoteRoutes from './routes/smm/smmNote.routes.js';
import smmDashboardRoutes from './routes/smm/smmDashboard.routes.js';
import smmDailyReportRoutes from './routes/smm/smmDailyReport.routes.js';
import smmBudgetRoutes from './routes/smm/smmBudget.routes.js';
import smmCallLogRoutes from './routes/smm/smmCallLog.routes.js';
import smmMonthlyTrackerRoutes from './routes/smm/smmMonthlyTracker.routes.js';
import developmentRoutes from './routes/development.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

loadEnv();
const env = getEnv();

await connectDB();

const ensureDefaultAdmin = async () => {
  // Never automatically create default admin with hardcoded password in production
  if (env.isProduction) return;

  const existingUsers = await User.estimatedDocumentCount();
  if (existingUsers > 0) return;

  const name = process.env.DEFAULT_ADMIN_NAME || 'DINESH M';
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@agencycrm.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
  await User.create({
    name,
    email,
    password,
    role: 'superAdmin',
    isActive: true,
    permissions: {
      canManageLeads: true,
      canManageFinance: true,
      canManageHR: true,
      canViewReports: true,
    },
  });
  console.log(`[Dev Bootstrap] Default super admin created: ${email}`);
};

await ensureDefaultAdmin();

const app = express();
const httpServer = http.createServer(app);

// Configure trust proxy
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
} else if (env.isProduction) {
  app.set('trust proxy', 1);
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [env.clientUrl, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!env.isProduction || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Workspace-Id',
    'x-workspace-id',
    'Idempotency-Key',
    'idempotency-key',
  ],
};

const io = new SocketIO(httpServer, {
  cors: corsOptions,
});

initSocket(io);
initCronJobs(io);

app.set('io', io);
global.io = io;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));

// Standard API rate limiter - NO Authorization header bypass
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 1500 : 5000,
  skip: (req) => req.path === '/health',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Strict rate limiters for sensitive endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes before retrying.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again after 1 hour.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload requests. Please slow down.' },
});

// Parse body BEFORE mongoSanitize so req.body is sanitized properly
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Secure static uploads serving - prevent script execution on app origin
const safeUploadStatic = express.static(env.uploadDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    if (['.html', '.htm', '.svg', '.xml'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Type', 'text/plain');
    }
  },
});
app.use('/uploads', safeUploadStatic);
app.use('/api/uploads', safeUploadStatic);

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Agency CRM API is running',
    timestamp: new Date().toISOString(),
    env: env.nodeEnv,
  });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/call-history', financeRoutes);
app.use('/api/finance/salaries', salaryRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/access-requests', accessRequestRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/client-followups', clientFollowupRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/domain-renewals', domainRenewalRoutes);
app.use('/api/sop', sopRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/task-notes', taskNoteRoutes);
app.use('/api/dm-calendar', dmCalendarRoutes);
app.use('/api/influencers', influencerRoutes);

// SMM Module Routes
app.use('/api/smm/dashboard', smmDashboardRoutes);
app.use('/api/smm/clients', smmClientRoutes);
app.use('/api/smm/projects', smmProjectRoutes);
app.use('/api/smm/content', smmContentRoutes);
app.use('/api/smm/campaigns', smmCampaignRoutes);
app.use('/api/smm/adsets', smmAdSetRoutes);
app.use('/api/smm/ads', smmAdRoutes);
app.use('/api/smm/ad-spend', smmAdSpendRoutes);
app.use('/api/smm/leads', smmLeadRoutes);
app.use('/api/smm/creatives', smmCreativeRoutes);
app.use('/api/smm/tasks', smmTaskRoutes);
app.use('/api/smm/notes', smmNoteRoutes);
app.use('/api/smm/daily-reports', smmDailyReportRoutes);
app.use('/api/smm/budgets', smmBudgetRoutes);
app.use('/api/smm/call-logs', smmCallLogRoutes);
app.use('/api/smm/tracker', smmMonthlyTrackerRoutes);

// Development Module Routes
app.use('/api/development', developmentRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Any route that doesn't start with /api or /uploads gets sent to the React app
  app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${env.port} is already in use by another running process.`);
    console.error(`👉 To free port ${env.port} on Windows, run: npx kill-port ${env.port}\n`);
  } else {
    console.error('Server startup failed:', error.message);
  }
  process.exit(1);
});

httpServer.listen(env.port, () => {
  console.log(`\nAgency CRM Server running on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`Client URL: ${env.clientUrl}`);
  console.log(`API Health: http://localhost:${env.port}/api/health\n`);
});

export default app;
