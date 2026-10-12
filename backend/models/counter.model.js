// =============================================
// ATOMIC SEQUENCE COUNTER MODEL
// Concurrency-safe sequence numbering
// =============================================

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increment and get next sequence number
 * @param {string} name - The counter identifier (e.g., 'invoiceNumber')
 * @param {number} [initialValue] - Value to initialize with if counter doesn't exist
 * @returns {Promise<number>}
 */
export const getNextSequence = async (name, initialValue = 0) => {
  const result = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // If newly created and initialValue > 0, ensure it starts at least at initialValue
  if (result.seq < initialValue) {
    const updated = await Counter.findOneAndUpdate(
      { name, seq: { $lt: initialValue } },
      { $set: { seq: initialValue } },
      { new: true }
    );
    return updated ? updated.seq : result.seq;
  }

  return result.seq;
};

export default Counter;
