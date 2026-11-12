// =============================================
// DATABASE CONNECTION CONFIG
// =============================================

import mongoose from 'mongoose';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getEnv } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');

export const redactMongoUri = (uri = '') => {
  if (!uri) return '';
  return uri.replace(/\/\/(.*)@([^\/]+)/, '//***:***@$2');
};

let listenersAttached = false;
let retryTimer = null;
let warnedServiceHint = false;
let attemptedLocalMongoStart = false;

const isTcpPortOpen = (host, port, timeoutMs = 400) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(Number(port), host);
  });

const waitForPortOpen = async (host, port, maxWaitMs = 8000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (await isTcpPortOpen(host, port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
};

const findLocalMongodBinary = () => {
  if (process.platform !== 'win32') return null;

  const candidates = [
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const tryStartLocalMongod = async (mongoUri = '') => {
  if (attemptedLocalMongoStart) return false;
  attemptedLocalMongoStart = true;

  let parsedUrl;
  try {
    parsedUrl = new URL(mongoUri);
  } catch {
    return false;
  }

  const host = parsedUrl.hostname === 'localhost' ? '127.0.0.1' : parsedUrl.hostname;
  if (host !== '127.0.0.1') return false;

  const port = parsedUrl.port || '27017';
  if (await isTcpPortOpen(host, port)) return true;

  const mongodPath = findLocalMongodBinary();
  if (!mongodPath) return false;

  const dbPath = path.join(workspaceRoot, 'db_data', 'live');
  const logDir = path.join(workspaceRoot, 'db_data');
  const logPath = path.join(logDir, 'mongod.log');

  try {
    fs.mkdirSync(dbPath, { recursive: true });
    const child = spawn(
      mongodPath,
      [
        '--dbpath',
        dbPath,
        '--logpath',
        logPath,
        '--logappend',
        '--bind_ip',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }
    );
    child.unref();
    console.log(`Starting local MongoDB on 127.0.0.1:${port} (${dbPath})...`);
    return await waitForPortOpen(host, port, 10000);
  } catch (spawnErr) {
    console.warn(`Could not auto-start local MongoDB: ${spawnErr.message}`);
    return false;
  }
};

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) return;
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    if (mongoose.connection.readyState === 0) {
      console.warn('MongoDB disconnected. Waiting for reconnection...');
    }
  });
};

export const connectDB = async () => {
  const env = getEnv();
  const safeUri = redactMongoUri(env.mongoUri);

  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.isProduction) {
    try {
      const parsed = new URL(env.mongoUri);
      const localHost = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
      if (localHost === '127.0.0.1') {
        const localPort = parsed.port || '27017';
        const isUp = await isTcpPortOpen(localHost, localPort);
        if (!isUp) {
          await tryStartLocalMongod(env.mongoUri);
        }
      }
    } catch {
      // Ignore URI parse failure and fall through to mongoose.connect
    }
  }

  try {
    attachConnectionListeners();

    const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 25;
    const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2;

    const conn = await mongoose.connect(env.mongoUri, {
      dbName: env.mongoDbName,
      maxPoolSize,
      minPoolSize,
      family: 4,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    warnedServiceHint = false;
    console.log(`MongoDB Connected: ${conn.connection.host} [Pool: ${minPoolSize}-${maxPoolSize}]`);
    console.log(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    // Retry on connection refused in development instead of crashing the API server
    if (!env.isProduction && (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED'))) {
      console.error(`MongoDB connection failed (${safeUri}): ${error.message}`);
      if (!warnedServiceHint) {
        warnedServiceHint = true;
        console.warn('👉 MongoDB service is not running or stopped (check Windows Services -> MongoDB & C: drive free space).');
      }
      console.warn('MongoDB not reachable. Retrying in 5 seconds...');
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB();
      }, 5000);
      retryTimer.unref?.();
      return null;
    }

    console.error(`MongoDB connection failed (${safeUri}): ${error.message}`);
    process.exit(1);
  }
};
