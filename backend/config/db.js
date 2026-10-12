// =============================================
// DATABASE CONNECTION CONFIG
// =============================================

import mongoose from 'mongoose';
import { getEnv } from './env.js';

export const redactMongoUri = (uri = '') => {
  if (!uri) return '';
  return uri.replace(/\/\/(.*)@([^\/]+)/, '//***:***@$2');
};

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Underlying driver is handling reconnect...');
  });
};

export const connectDB = async () => {
  const env = getEnv();
  const safeUri = redactMongoUri(env.mongoUri);

  try {
    attachConnectionListeners();

    const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 25;
    const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2;

    const conn = await mongoose.connect(env.mongoUri, {
      dbName: env.mongoDbName,
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host} [Pool: ${minPoolSize}-${maxPoolSize}]`);
    console.log(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed (${safeUri}): ${error.message}`);

    // Retry on connection refused in development
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.warn('MongoDB not reachable. Retrying in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};
