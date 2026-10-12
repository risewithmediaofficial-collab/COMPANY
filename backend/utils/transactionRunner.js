// =============================================
// TRANSACTION RUNNER UTILITY
// Atomic multi-document operations with retry & fallback
// =============================================

import mongoose from 'mongoose';

/**
 * Executes a callback inside a MongoDB transaction session with retry support for transient errors.
 * If running on a standalone local test instance where transactions are unsupported,
 * falls back to sequential execution with proper error propagation.
 *
 * @param {Function} callback - async (session) => result
 * @returns {Promise<any>}
 */
export const runInTransaction = async (callback) => {
  let session = null;

  try {
    session = await mongoose.startSession();
  } catch (err) {
    // Sessions not supported by environment
    return await callback(null);
  }

  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }

      // If replica set is not configured (standalone mongo), run callback directly
      if (err.message && (err.message.includes('Transactions are not supported') || err.message.includes('replica set'))) {
        session.endSession();
        return await callback(null);
      }

      const isTransient = typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError');
      if (isTransient && attempts < maxRetries) {
        continue;
      }

      session.endSession();
      throw err;
    }
  }
};

export default runInTransaction;
