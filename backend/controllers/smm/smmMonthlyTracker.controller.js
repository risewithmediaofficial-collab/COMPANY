// =============================================
// SMM MONTHLY TRACKER CONTROLLER
// =============================================
import SmmMonthlyTracker from '../../models/smm/smmMonthlyTracker.model.js';
import SmmClient from '../../models/smm/smmClient.model.js';
import SmmContent from '../../models/smm/smmContent.model.js';
import Client from '../../models/client.model.js';
import { emitLiveEvent } from '../../utils/socketEmitter.js';

// ── Helper: build empty days array for a month ─────────────────────────────
const buildEmptyDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    postLabel: '',
    postStatus: 'todo',
    storyLabel: '',
    storyStatus: 'todo',
    note: '',
    items: [],
  }));
};

// ── Helper: detect if label contains actual poster/content text (not just dashes or blank) ──
const hasPosterContent = (label) => {
  if (!label) return false;
  const clean = String(label).trim();
  if (!clean) return false;
  return !/^[-—–\s]+$/.test(clean);
};

// ── Helper: determine if a day is before the live date (in the past) ────────
const isDayBeforeToday = (dayNum, month, year) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const numYear = Number(year);
  const numMonth = Number(month);
  const numDay = Number(dayNum);

  if (numYear < currentYear) return true;
  if (numYear > currentYear) return false;
  if (numMonth < currentMonth) return true;
  if (numMonth > currentMonth) return false;
  return numDay < currentDay;
};

// ── Helper: resolve a client object from either SmmClient or CRM Client ────
const resolveClientObj = async (clientId) => {
  if (!clientId) return null;
  const idStr = clientId.toString();
  try {
    const smmClient = await SmmClient.findById(idStr).select('companyName status brandLogo email phone').lean();
    if (smmClient) {
      return {
        _id: smmClient._id,
        companyName: smmClient.companyName || 'Client',
        status: smmClient.status || 'Active',
      };
    }
    const crmClient = await Client.findById(idStr).select('company name status logo email phone').lean();
    if (crmClient) {
      const cName = crmClient.company || crmClient.name || 'Client';
      // Auto-mirror to SmmClient so future queries & refs also find it
      SmmClient.findByIdAndUpdate(
        crmClient._id,
        {
          $setOnInsert: {
            _id: crmClient._id,
            companyName: cName,
            status: crmClient.status === 'active' || crmClient.status === 'Active' ? 'Active' : 'Inactive',
            email: crmClient.email || '',
            phone: crmClient.phone || '',
          },
        },
        { upsert: true }
      ).catch(() => {});

      return {
        _id: crmClient._id,
        companyName: cName,
        status: crmClient.status === 'active' || crmClient.status === 'Active' ? 'Active' : 'Inactive',
      };
    }
  } catch (err) {
    console.error('resolveClientObj error:', err);
  }
  return { _id: clientId, companyName: 'Client', status: 'Active' };
};

// ── GET all tracker rows for a given month/year ─────────────────────────────
// GET /api/smm/tracker?month=9&year=2026
export const getMonthlyTrackers = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    // 1. Fetch all active clients from BOTH CRM Client and SMM Client
    const [crmClients, smmClientsList] = await Promise.all([
      Client.find({ status: { $regex: /^active$/i } }).sort({ company: 1, name: 1 }).lean(),
      SmmClient.find({ status: { $regex: /^active$/i } }).sort({ companyName: 1 }).lean(),
    ]);

    // Build unified active client map
    const clientMap = new Map();
    crmClients.forEach((c) => {
      const cName = c.company || c.name || 'Client';
      clientMap.set(c._id.toString(), {
        _id: c._id,
        companyName: cName,
        status: 'Active',
      });
      // Background mirror to SmmClient for consistency
      SmmClient.findByIdAndUpdate(
        c._id,
        {
          $setOnInsert: {
            _id: c._id,
            companyName: cName,
            status: 'Active',
            email: c.email || '',
            phone: c.phone || '',
          },
        },
        { upsert: true }
      ).catch(() => {});
    });

    smmClientsList.forEach((c) => {
      if (!clientMap.has(c._id.toString())) {
        clientMap.set(c._id.toString(), {
          _id: c._id,
          companyName: c.companyName || 'Client',
          status: c.status || 'Active',
        });
      }
    });

    // 2. Fetch existing tracker docs for this month/year
    const existingTrackers = await SmmMonthlyTracker.find({ month, year }).lean();

    // Look for any client IDs in existingTrackers not yet in clientMap
    const missingClientIds = existingTrackers
      .map(t => t.client?.toString())
      .filter(id => id && !clientMap.has(id));

    if (missingClientIds.length > 0) {
      const [extraCrm, extraSmm] = await Promise.all([
        Client.find({ _id: { $in: missingClientIds } }).lean(),
        SmmClient.find({ _id: { $in: missingClientIds } }).lean(),
      ]);
      extraCrm.forEach(c => clientMap.set(c._id.toString(), { _id: c._id, companyName: c.company || c.name || 'Client', status: 'Active' }));
      extraSmm.forEach(c => {
        if (!clientMap.has(c._id.toString())) {
          clientMap.set(c._id.toString(), { _id: c._id, companyName: c.companyName || 'Client', status: c.status || 'Active' });
        }
      });
    }

    const trackerMap = {};
    const existingPopulatedList = [];

    existingTrackers.forEach((t) => {
      const cIdStr = t.client?.toString();
      if (cIdStr) {
        let modified = false;
        const updatedDays = (t.days || []).map((day) => {
          const isPast = isDayBeforeToday(day.day, month, year);
          let newDay = day;
          if (isPast) {
            if (hasPosterContent(day.postLabel) && (!day.postStatus || day.postStatus === 'todo')) {
              if (newDay === day) newDay = { ...day };
              newDay.postStatus = 'pending';
              modified = true;
            }
            if (hasPosterContent(day.storyLabel) && (!day.storyStatus || day.storyStatus === 'todo')) {
              if (newDay === day) newDay = { ...day };
              newDay.storyStatus = 'pending';
              modified = true;
            }
          }
          return newDay;
        });

        if (modified && t._id) {
          SmmMonthlyTracker.findByIdAndUpdate(t._id, { $set: { days: updatedDays } }).catch(() => {});
        }

        const clientObj = clientMap.get(cIdStr) || { _id: t.client, companyName: 'Client', status: 'Active' };
        const pop = { ...t, days: updatedDays, client: clientObj };
        trackerMap[cIdStr] = pop;
        existingPopulatedList.push(pop);
      }
    });

    const handledClientIds = new Set();
    const rows = [];

    // For active clients, return existing (if not excluded) or scaffold (if not excluded)
    for (const [cIdStr, client] of clientMap.entries()) {
      handledClientIds.add(cIdStr);
      const existing = trackerMap[cIdStr];

      // If explicitly marked as excluded for this month, skip it
      if (existing?.isExcluded) {
        continue;
      }

      if (existing) {
        rows.push(existing);
      } else {
        // Scaffold (not yet saved)
        rows.push({
          _id: null,
          client: { _id: client._id, companyName: client.companyName },
          team: 'RWM',
          plan: '',
          storyPlan: '30 STORIES',
          month,
          year,
          days: buildEmptyDays(year, month),
          _scaffold: true,
        });
      }
    }

    // Also include any other non-excluded trackers for this month
    for (const existing of existingPopulatedList) {
      const cIdStr = existing.client?._id?.toString();
      if (cIdStr && !handledClientIds.has(cIdStr) && !existing.isExcluded) {
        rows.push(existing);
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    res.json({ success: true, data: { rows, month, year, daysInMonth } });
  } catch (err) {
    console.error('getMonthlyTrackers error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


// ── GET single tracker row by clientId + month/year ─────────────────────────
export const getTrackerByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const tracker = await SmmMonthlyTracker.findOne({ client: clientId, month, year }).lean();

    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }
    let modified = false;
    const updatedDays = (tracker.days || []).map((day) => {
      const isPast = isDayBeforeToday(day.day, month, year);
      let newDay = day;
      if (isPast) {
        if (hasPosterContent(day.postLabel) && (!day.postStatus || day.postStatus === 'todo')) {
          if (newDay === day) newDay = { ...day };
          newDay.postStatus = 'pending';
          modified = true;
        }
        if (hasPosterContent(day.storyLabel) && (!day.storyStatus || day.storyStatus === 'todo')) {
          if (newDay === day) newDay = { ...day };
          newDay.storyStatus = 'pending';
          modified = true;
        }
      }
      return newDay;
    });

    if (modified && tracker._id) {
      SmmMonthlyTracker.findByIdAndUpdate(tracker._id, { $set: { days: updatedDays } }).catch(() => {});
    }

    tracker.days = updatedDays;
    tracker.client = await resolveClientObj(clientId);
    res.json({ success: true, data: tracker });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ── UPSERT (create or update) a tracker row ─────────────────────────────────
// POST /api/smm/tracker  { clientId, month, year, plan, storyPlan, team, days }
export const upsertTracker = async (req, res) => {
  try {
    const { clientId, month, year, plan, storyPlan, team, days } = req.body;

    if (!clientId || !month || !year) {
      return res.status(400).json({ success: false, message: 'clientId, month, year are required' });
    }

    const tracker = await SmmMonthlyTracker.findOneAndUpdate(
      { client: clientId, month, year },
      {
        $set: {
          team: team || 'RWM',
          plan: plan || '',
          storyPlan: storyPlan || '30 STORIES',
          days: days || buildEmptyDays(year, month),
          isExcluded: false,
          updatedBy: req.user?._id,
        },
        $setOnInsert: {
          client: clientId,
          month,
          year,
          createdBy: req.user?._id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    tracker.client = await resolveClientObj(clientId);

    emitLiveEvent('smmTrackerUpdated', {
      trackerId: tracker._id,
      clientId,
      month,
      year,
    });

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error('upsertTracker error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ── PATCH a single day cell status & items ─────────────────────────────────
// PATCH /api/smm/tracker/:id/day/:day  { field, value } OR { items, postStatus, postLabel, storyStatus, storyLabel, note }
export const updateDayCell = async (req, res) => {
  try {
    const { id, day } = req.params;
    const dayNum = parseInt(day);

    const tracker = await SmmMonthlyTracker.findById(id);
    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }

    let dayCell = tracker.days.find((d) => d.day === dayNum);
    if (!dayCell) {
      dayCell = { day: dayNum, postLabel: '', postStatus: 'todo', storyLabel: '', storyStatus: 'todo', items: [] };
      tracker.days.push(dayCell);
      dayCell = tracker.days.find((d) => d.day === dayNum);
    }

    // 1. Direct items update (from Day Details Drawer)
    if (req.body.items !== undefined) {
      const itemsList = Array.isArray(req.body.items) ? req.body.items : [];
      dayCell.items = itemsList;

      // Automatically sync primary post/story fields from items if not explicitly provided
      const contentItems = itemsList.filter((it) => ['reel', 'post', 'video', 'carousel'].includes(it.type));
      const storyItems = itemsList.filter((it) => it.type === 'story');

      if (req.body.postLabel !== undefined) {
        dayCell.postLabel = req.body.postLabel;
      } else if (contentItems.length > 0) {
        dayCell.postLabel = contentItems[0].label || '';
      }

      if (req.body.postStatus !== undefined) {
        dayCell.postStatus = req.body.postStatus;
      } else if (contentItems.length > 0) {
        // If all done, done; if any pending, pending; else first item status
        const allDone = contentItems.every((it) => it.status === 'done');
        const anyPending = contentItems.some((it) => it.status === 'pending');
        dayCell.postStatus = allDone ? 'done' : (anyPending ? 'pending' : (contentItems[0].status || 'todo'));
      }

      if (req.body.storyLabel !== undefined) {
        dayCell.storyLabel = req.body.storyLabel;
      } else if (storyItems.length > 0) {
        dayCell.storyLabel = storyItems[0].label || '';
      }

      if (req.body.storyStatus !== undefined) {
        dayCell.storyStatus = req.body.storyStatus;
      } else if (storyItems.length > 0) {
        const allDone = storyItems.every((it) => it.status === 'done');
        const anyPending = storyItems.some((it) => it.status === 'pending');
        dayCell.storyStatus = allDone ? 'done' : (anyPending ? 'pending' : (storyItems[0].status || 'todo'));
      }

      if (req.body.note !== undefined) {
        dayCell.note = req.body.note;
      }
    } else if (req.body.field) {
      // 2. Legacy single-field update
      const { field, value } = req.body;
      const allowedFields = ['postStatus', 'postLabel', 'storyStatus', 'storyLabel', 'note', 'items'];
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: 'Invalid field' });
      }
      dayCell[field] = value;
    } else {
      // 3. Selective field updates
      if (req.body.postLabel !== undefined) dayCell.postLabel = req.body.postLabel;
      if (req.body.postStatus !== undefined) dayCell.postStatus = req.body.postStatus;
      if (req.body.storyLabel !== undefined) dayCell.storyLabel = req.body.storyLabel;
      if (req.body.storyStatus !== undefined) dayCell.storyStatus = req.body.storyStatus;
      if (req.body.note !== undefined) dayCell.note = req.body.note;
    }

    tracker.updatedBy = req.user?._id;
    await tracker.save();

    const result = tracker.toObject();
    result.client = await resolveClientObj(tracker.client);

    emitLiveEvent('smmTrackerCellUpdated', {
      trackerId: tracker._id.toString(),
      clientId: tracker.client?._id?.toString() || tracker.client?.toString(),
      day: dayNum,
      cell: dayCell,
      field: req.body.field || 'cell',
      value: req.body.value !== undefined ? req.body.value : dayCell,
      month: tracker.month,
      year: tracker.year,
      updatedBy: req.user?._id,
    });
    emitLiveEvent('smmTrackerUpdated', {
      trackerId: tracker._id.toString(),
      month: tracker.month,
      year: tracker.year,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('updateDayCell error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ── PATCH plan/team/storyPlan meta for a tracker ─────────────────────────────
// PATCH /api/smm/tracker/:id/meta  { plan, storyPlan, team }
export const updateTrackerMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, storyPlan, team } = req.body;

    const tracker = await SmmMonthlyTracker.findByIdAndUpdate(
      id,
      { $set: { plan, storyPlan, team, updatedBy: req.user?._id } },
      { new: true }
    ).lean();

    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }
    tracker.client = await resolveClientObj(tracker.client);

    emitLiveEvent('smmTrackerMetaUpdated', {
      trackerId: tracker._id.toString(),
      clientId: tracker.client?._id?.toString() || tracker.client?.toString(),
      month: tracker.month,
      year: tracker.year,
      plan,
      storyPlan,
      team,
    });
    emitLiveEvent('smmTrackerUpdated', {
      trackerId: tracker._id.toString(),
      clientId: tracker.client?._id?.toString() || tracker.client?.toString(),
      month: tracker.month,
      year: tracker.year,
    });

    res.json({ success: true, data: tracker });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ── Helper: format "18:30" -> "6:30P", "10:00" -> "10A"
const formatShortTime = (timeStr) => {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? 'P' : 'A';
  h = h % 12 || 12;
  return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`;
};

// ── POST /api/smm/tracker/sync-content ──────────────────────────────────────
// Auto-pulls Reels, Posts, and Stories from SmmContent module into the tracker
export const syncContentWithTracker = async (req, res) => {
  try {
    const month = parseInt(req.body.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.body.year)  || new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all content items for this month
    const contents = await SmmContent.find({
      $or: [
        { scheduledDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { actualPostedDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    }).populate('client', 'companyName name company').lean();

    // Map contents by client ID and client companyName
    const contentByClient = {};
    contents.forEach((item) => {
      const cId = item.client?._id?.toString();
      const cName = (item.client?.companyName || item.client?.company || item.client?.name || '').trim().toUpperCase();
      if (cId) {
        if (!contentByClient[cId]) contentByClient[cId] = [];
        contentByClient[cId].push(item);
      }
      if (cName) {
        if (!contentByClient[cName]) contentByClient[cName] = [];
        contentByClient[cName].push(item);
      }
    });

    // Fetch all active clients from BOTH CRM Client and SmmClient
    const [crmClients, smmClientsList] = await Promise.all([
      Client.find({ status: { $regex: /^active$/i } }).lean(),
      SmmClient.find({ status: { $regex: /^active$/i } }).lean(),
    ]);

    const clientMap = new Map();
    crmClients.forEach((c) => {
      clientMap.set(c._id.toString(), { _id: c._id, companyName: c.company || c.name || 'Client' });
    });
    smmClientsList.forEach((c) => {
      if (!clientMap.has(c._id.toString())) {
        clientMap.set(c._id.toString(), { _id: c._id, companyName: c.companyName || 'Client' });
      }
    });

    const clients = Array.from(clientMap.values());

    let updatedCount = 0;
    for (const client of clients) {
      const cId = client._id.toString();
      const cName = (client.companyName || '').trim().toUpperCase();
      const items = contentByClient[cId] || contentByClient[cName] || [];

      if (items.length === 0) continue;

      let tracker = await SmmMonthlyTracker.findOne({ client: client._id, month, year });
      const days = tracker?.days && tracker.days.length > 0 ? tracker.days : buildEmptyDays(year, month);

      let reelIdx = 1, postIdx = 1, storyIdx = 1;
      let reelsCount = 0, postsCount = 0, storiesCount = 0;

      // Sort items chronologically
      items.sort((a, b) => new Date(a.scheduledDate || a.createdAt) - new Date(b.scheduledDate || b.createdAt));

      items.forEach((item) => {
        const dDate = item.scheduledDate || item.actualPostedDate || item.createdAt;
        const dayNum = new Date(dDate).getDate();
        if (dayNum < 1 || dayNum > daysInMonth) return;

        const timeStr = formatShortTime(item.scheduledTime || item.actualPostedTime);
        const status = item.postingStatus === 'Published' ? 'done' : item.postingStatus === 'Cancelled' ? 'skip' : 'pending';

        const dayCell = days.find((d) => d.day === dayNum);
        if (!dayCell) return;

        if (['Reel', 'Video', 'Short'].includes(item.contentType)) {
          reelsCount++;
          dayCell.postLabel = `R${reelIdx++} ${timeStr}`.trim();
          dayCell.postStatus = status;
        } else if (item.contentType === 'Post') {
          postsCount++;
          dayCell.postLabel = `P${postIdx++} ${timeStr}`.trim();
          dayCell.postStatus = status;
        } else if (item.contentType === 'Story') {
          storiesCount++;
          dayCell.storyLabel = `S${storyIdx++} ${timeStr}`.trim();
          dayCell.storyStatus = status;
        } else if (item.contentType === 'Reel / Story') {
          reelsCount++;
          storiesCount++;
          dayCell.postLabel = `R${reelIdx++} ${timeStr}`.trim();
          dayCell.postStatus = status;
          dayCell.storyLabel = `S${storyIdx++} ${timeStr}`.trim();
          dayCell.storyStatus = status;
        }
      });

      const plan = `${reelsCount}R + ${postsCount}P`;
      const storyPlan = `${storiesCount || 30} STORIES`;

      await SmmMonthlyTracker.findOneAndUpdate(
        { client: client._id, month, year },
        {
          $set: {
            plan,
            storyPlan,
            days,
            isExcluded: false,
            updatedBy: req.user?._id,
          },
        },
        { upsert: true, new: true }
      );
      updatedCount++;
    }

    emitLiveEvent('smmTrackerUpdated', { month, year });

    res.json({
      success: true,
      message: `Successfully synced ${contents.length} content items across ${updatedCount} clients`,
      syncedClients: updatedCount,
      totalContents: contents.length,
    });
  } catch (err) {
    console.error('syncContentWithTracker error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ── DELETE a tracker row ─────────────────────────────────────────────────────
export const deleteTracker = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteClient = req.query.deleteClient === 'true' || req.body?.deleteClient === true;
    const month = parseInt(req.query.month) || parseInt(req.body?.month);
    const year = parseInt(req.query.year) || parseInt(req.body?.year);
    const clientId = req.query.clientId || req.body?.clientId;

    let targetClientId = clientId;

    // If id is a valid Mongo tracker ID, locate tracker
    if (id && id !== 'scaffold' && id !== 'null' && id !== 'undefined') {
      const tracker = await SmmMonthlyTracker.findById(id);
      if (tracker) {
        if (!targetClientId && tracker.client) {
          targetClientId = tracker.client.toString();
        }
        if (!deleteClient) {
          tracker.isExcluded = true;
          tracker.updatedBy = req.user?._id;
          await tracker.save();
        }
      }
    }

    if (deleteClient && targetClientId) {
      // Permanently remove client and all trackers for this client
      await SmmMonthlyTracker.deleteMany({ client: targetClientId });
      await Promise.allSettled([
        SmmClient.findByIdAndDelete(targetClientId),
        Client.findByIdAndDelete(targetClientId),
      ]);

      emitLiveEvent('clientDeleted', targetClientId);
      emitLiveEvent('smmTrackerDeleted', { trackerId: id, clientId: targetClientId, month, year });
      emitLiveEvent('smmTrackerUpdated', { month, year });

      return res.json({ success: true, message: 'Client and all tracker data permanently deleted' });
    }

    if (!deleteClient && targetClientId && month && year) {
      // Exclude from this month's tracker so scaffold doesn't regenerate it
      await SmmMonthlyTracker.findOneAndUpdate(
        { client: targetClientId, month, year },
        {
          $set: {
            isExcluded: true,
            updatedBy: req.user?._id,
          },
          $setOnInsert: {
            days: buildEmptyDays(year, month),
            createdBy: req.user?._id,
          },
        },
        { upsert: true, new: true }
      );

      emitLiveEvent('smmTrackerDeleted', { trackerId: id, clientId: targetClientId, month, year });
      emitLiveEvent('smmTrackerUpdated', { month, year });

      return res.json({ success: true, message: 'Client removed from monthly tracker' });
    }

    emitLiveEvent('smmTrackerUpdated', { month, year });
    res.json({ success: true, message: 'Tracker updated' });
  } catch (err) {
    console.error('deleteTracker error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

