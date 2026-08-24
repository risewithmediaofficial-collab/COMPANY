// =============================================
// TASK NOTE CONTROLLER
// Employees & Managers create, track, organize, and assign task change notes & briefs
// =============================================

import TaskNote from '../models/taskNote.model.js';

const NOTE_POPULATE = [
  { path: 'submittedBy', select: 'name email role avatar department' },
  { path: 'assignedTo', select: 'name email role avatar department' },
  { path: 'reviewedBy', select: 'name email role avatar department' },
  { path: 'task', select: 'title taskTitle status priority dueDate client clientName' },
  { path: 'project', select: 'title client' },
  { path: 'client', select: 'name company' },
];

// ── Create a new task note / change log ──────────────────────────────────────
export const createNote = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      startDate,
      deadline,
      task,
      project,
      client,
      category,
      changeScope,
      tags,
      checklists,
      isPinned,
      color,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const note = await TaskNote.create({
      organizationId: req.user.organizationId,
      submittedBy: req.user._id,
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      startDate: startDate || null,
      deadline: deadline || null,
      task: task || null,
      project: project || null,
      client: client || null,
      category: category || 'task_change',
      changeScope: changeScope || 'minor_tweak',
      tags: Array.isArray(tags) ? tags : [],
      checklists: Array.isArray(checklists) ? checklists : [],
      isPinned: Boolean(isPinned),
      color: color || 'default',
    });

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.status(201).json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── List own notes ───────────────────────────────────────────────────────────
export const getMyNotes = async (req, res) => {
  try {
    const filter = { submittedBy: req.user._id };
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    if (req.query.task) {
      filter.task = req.query.task;
    }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const notes = await TaskNote.find(filter)
      .populate(NOTE_POPULATE)
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update a note ────────────────────────────────────────────────────────────
export const updateNote = async (req, res) => {
  try {
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const isOwner = note.submittedBy.toString() === req.user._id.toString();
    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isManagerOrAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const {
      title,
      description,
      priority,
      startDate,
      deadline,
      task,
      project,
      client,
      category,
      changeScope,
      tags,
      checklists,
      isPinned,
      color,
      status,
    } = req.body;

    if (title !== undefined) note.title = title.trim();
    if (description !== undefined) note.description = description;
    if (priority !== undefined) note.priority = priority;
    if (startDate !== undefined) note.startDate = startDate || null;
    if (deadline !== undefined) note.deadline = deadline || null;
    if (task !== undefined) note.task = task || null;
    if (project !== undefined) note.project = project || null;
    if (client !== undefined) note.client = client || null;
    if (category !== undefined) note.category = category;
    if (changeScope !== undefined) note.changeScope = changeScope;
    if (tags !== undefined) note.tags = Array.isArray(tags) ? tags : [];
    if (checklists !== undefined) note.checklists = Array.isArray(checklists) ? checklists : [];
    if (isPinned !== undefined) note.isPinned = Boolean(isPinned);
    if (color !== undefined) note.color = color;
    if (status !== undefined && isManagerOrAdmin) note.status = status;

    await note.save();

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Toggle Pin ───────────────────────────────────────────────────────────────
export const toggleNotePin = async (req, res) => {
  try {
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    note.isPinned = !note.isPinned;
    await note.save();

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Toggle Checklist Item ────────────────────────────────────────────────────
export const toggleChecklistItem = async (req, res) => {
  try {
    const { itemIndex } = req.body;
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    if (note.checklists && note.checklists[itemIndex]) {
      note.checklists[itemIndex].completed = !note.checklists[itemIndex].completed;
      await note.save();
    }

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete a note ────────────────────────────────────────────────────────────
export const deleteNote = async (req, res) => {
  try {
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const isOwner = note.submittedBy.toString() === req.user._id.toString();
    const isSuperAdmin = ['superAdmin', 'admin'].includes(req.user.role);
    if (!isOwner && !isSuperAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Manager / SuperAdmin / Employee: List notes ─────────────────────────────
export const getAllNotes = async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.user.role === 'employee') {
      filter.submittedBy = req.user._id;
    }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    if (req.query.task) {
      filter.task = req.query.task;
    }
    if (req.query.submittedBy && req.user.role !== 'employee') {
      filter.submittedBy = req.query.submittedBy;
    }

    const notes = await TaskNote.find(filter)
      .populate(NOTE_POPULATE)
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Manager: Assign a note to an employee ────────────────────────────────────
export const assignNote = async (req, res) => {
  try {
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const { assignedTo, managerNote, dueDate } = req.body;
    if (!assignedTo) return res.status(400).json({ success: false, message: 'assignedTo is required' });

    note.assignedTo = assignedTo;
    note.managerNote = managerNote || '';
    note.dueDate = dueDate || null;
    note.status = 'assigned';
    note.reviewedBy = req.user._id;
    note.reviewedAt = new Date();
    note.assignedAt = new Date();

    await note.save();

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Manager: Dismiss / Resolve a note ────────────────────────────────────────
export const dismissNote = async (req, res) => {
  try {
    const note = await TaskNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    note.status = req.body.status || 'dismissed';
    note.reviewedBy = req.user._id;
    note.reviewedAt = new Date();
    if (req.body.managerNote) note.managerNote = req.body.managerNote;
    await note.save();

    const populated = await TaskNote.findById(note._id).populate(NOTE_POPULATE);
    res.json({ success: true, note: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
