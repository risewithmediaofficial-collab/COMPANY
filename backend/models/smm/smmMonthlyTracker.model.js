// =============================================
// SMM MONTHLY TRACKER MODEL
// One-Page Tracker: Client × Day status grid
// =============================================
import mongoose from 'mongoose';

// Each day cell entry for a client
const dayCellSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1, max: 31 }, // 1-31
    // Post/Reel section
    postLabel: { type: String, default: '' },     // e.g. "R1 6:30P", "P2 1P"
    postStatus: {
      type: String,
      enum: ['pending', 'done', 'skip', ''],
      default: 'pending',
    },
    // Story section
    storyLabel: { type: String, default: '' },    // e.g. "S1 9A/7P"
    storyStatus: {
      type: String,
      enum: ['pending', 'done', 'skip', ''],
      default: 'pending',
    },
    // Optional notes per day
    note: { type: String, default: '' },
  },
  { _id: false }
);

const smmMonthlyTrackerSchema = new mongoose.Schema(
  {
    // Which month/year this tracker is for
    month: { type: Number, required: true, min: 1, max: 12 }, // 1-12
    year:  { type: Number, required: true },                   // e.g. 2026

    // Client reference
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmmClient',
      required: true,
    },

    // Team label (e.g. "RWM")
    team: { type: String, default: 'RWM', trim: true },

    // Monthly plan quota (e.g. "15R + 2P", "8R + 4P")
    plan: { type: String, default: '', trim: true },

    // Story plan (e.g. "30 STORIES")
    storyPlan: { type: String, default: '30 STORIES', trim: true },

    // Array of day-by-day cells (up to 31 entries)
    days: [dayCellSchema],

    // If true, this client is excluded/removed from this month's tracker
    isExcluded: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One tracker doc per client per month/year
smmMonthlyTrackerSchema.index({ client: 1, month: 1, year: 1 }, { unique: true });
smmMonthlyTrackerSchema.index({ month: 1, year: 1 });

const SmmMonthlyTracker = mongoose.model('SmmMonthlyTracker', smmMonthlyTrackerSchema);
export default SmmMonthlyTracker;
