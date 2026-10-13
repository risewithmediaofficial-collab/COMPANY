// =============================================
// WEEKLY TODO CONTROLLER
// Handles weekly todos for all team roles:
// - Admin & Manager: assign todos to employees, interns, or themselves; full update & delete access.
// - Employee & Intern: manage own weekly todos, toggle completion, add notes on assigned todos.
// =============================================

import WeeklyTodo from '../models/weeklyTodo.model.js';
import Notification from '../models/notification.model.js';

/**
 * Normalizes any given date string or Date object to the Monday (00:00:00.000 UTC) of that week.
 */
export const getMondayOfWeek = (inputDate) => {
  const d = inputDate ? new Date(inputDate) : new Date();
  if (isNaN(d.getTime())) {
    return getMondayOfWeek(new Date());
  }
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0: Sun, 1: Mon, ...
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  date.setUTCDate(diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const TODO_POPULATE = [
  { path: 'assignedTo', select: 'name email role avatar department' },
  { path: 'assignedBy', select: 'name email role avatar department' },
  { path: 'completedBy', select: 'name avatar' },
];

/**
 * GET /api/todos
 * Fetch weekly todos with weekly filtering and role-based scoping.
 */
export const getWeeklyTodos = async (req, res) => {
  try {
    const { weekStartDate, assignedTo, status, dayOfWeek, mine } = req.query;
    const filter = {};

    // Organization scope
    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId;
    }

    // Role-based visibility
    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);

    if (isManagerOrAdmin) {
      if (mine === 'true') {
        filter.assignedTo = req.user._id;
      } else if (assignedTo && assignedTo !== 'all') {
        filter.assignedTo = assignedTo;
      }
    } else {
      // Employees, Interns, and staff roles only see their own todos
      filter.assignedTo = req.user._id;
    }

    // Week start date filtering
    if (weekStartDate && weekStartDate !== 'all') {
      const monday = getMondayOfWeek(weekStartDate);
      const nextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
      filter.weekStartDate = { $gte: monday, $lt: nextMonday };
    }

    // Status filtering
    if (status && status !== 'all') {
      if (status === 'completed') {
        filter.isCompleted = true;
      } else if (status === 'pending') {
        filter.isCompleted = false;
      } else {
        filter.status = status;
      }
    }

    // Day of week filtering
    if (dayOfWeek && dayOfWeek !== 'all') {
      filter.dayOfWeek = dayOfWeek;
    }

    const todos = await WeeklyTodo.find(filter)
      .populate(TODO_POPULATE)
      .sort({ isCompleted: 1, order: 1, priority: -1, createdAt: 1 });

    // Calculate completion statistics
    const total = todos.length;
    const completed = todos.filter((t) => t.isCompleted).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      todos,
      summary: {
        total,
        completed,
        pending,
        completionRate,
      },
      activeWeekStart: weekStartDate && weekStartDate !== 'all' ? getMondayOfWeek(weekStartDate) : getMondayOfWeek(),
    });
  } catch (error) {
    console.error('getWeeklyTodos error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/todos
 * Create a weekly todo.
 * - Admin & Manager can assign to anyone.
 * - Employee & Intern can create for themselves.
 */
export const createWeeklyTodo = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      weekStartDate,
      targetDate,
      dayOfWeek,
      priority,
      category,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Todo title is required' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);

    // Determine target assignee
    let targetAssigneeId = req.user._id;
    if (isManagerOrAdmin && assignedTo) {
      targetAssigneeId = assignedTo;
    }

    // Determine normalized week start date
    const normalizedWeekStart = getMondayOfWeek(weekStartDate || targetDate || new Date());

    const todo = await WeeklyTodo.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      assignedTo: targetAssigneeId,
      assignedBy: req.user._id,
      weekStartDate: normalizedWeekStart,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      dayOfWeek: dayOfWeek || 'Weekly Target',
      priority: priority || 'medium',
      category: category || 'general',
      notes: notes ? notes.trim() : '',
      organizationId: req.user.organizationId,
      brandId: req.headers['x-workspace-id'] || undefined,
    });

    // Notify assignee if assigned by another person
    if (targetAssigneeId.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipient: targetAssigneeId,
          sender: req.user._id,
          type: 'general',
          title: 'New Weekly Todo Assigned',
          message: `${req.user.name} assigned you a weekly todo: "${title.trim()}" (${dayOfWeek || 'Weekly Target'})`,
          link: '/',
          metadata: { todoId: todo._id },
        });
      } catch (notifErr) {
        console.warn('Failed to send notification for weekly todo assignment:', notifErr.message);
      }
    }

    const populated = await WeeklyTodo.findById(todo._id).populate(TODO_POPULATE);
    res.status(201).json({ success: true, todo: populated });
  } catch (error) {
    console.error('createWeeklyTodo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/todos/:id
 * Update a weekly todo.
 */
export const updateWeeklyTodo = async (req, res) => {
  try {
    const todo = await WeeklyTodo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    const isOwnerCreator = todo.assignedBy.toString() === req.user._id.toString();
    const isAssignedPerson = todo.assignedTo.toString() === req.user._id.toString();

    if (!isManagerOrAdmin && !isOwnerCreator && !isAssignedPerson) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this todo' });
    }

    const {
      title,
      description,
      assignedTo,
      weekStartDate,
      targetDate,
      dayOfWeek,
      priority,
      category,
      status,
      isCompleted,
      notes,
      order,
    } = req.body;

    // Full editing allowed for managers/admins or the original creator
    if (isManagerOrAdmin || isOwnerCreator) {
      if (title !== undefined) todo.title = title.trim();
      if (description !== undefined) todo.description = description.trim();
      if (dayOfWeek !== undefined) todo.dayOfWeek = dayOfWeek;
      if (priority !== undefined) todo.priority = priority;
      if (category !== undefined) todo.category = category;
      if (notes !== undefined) todo.notes = notes.trim();
      if (order !== undefined) todo.order = Number(order) || 0;
      if (targetDate !== undefined) todo.targetDate = targetDate ? new Date(targetDate) : undefined;
      if (weekStartDate !== undefined) {
        todo.weekStartDate = getMondayOfWeek(weekStartDate);
      }
      if (isManagerOrAdmin && assignedTo !== undefined) {
        todo.assignedTo = assignedTo;
      }
    } else if (isAssignedPerson) {
      // Employees/Interns assigned this todo can update notes, status, and completion
      if (notes !== undefined) todo.notes = notes.trim();
    }

    // Status & Completion handling
    if (isCompleted !== undefined) {
      const willBeCompleted = Boolean(isCompleted);
      todo.isCompleted = willBeCompleted;
      todo.status = willBeCompleted ? 'completed' : 'pending';
      todo.completedAt = willBeCompleted ? new Date() : undefined;
      todo.completedBy = willBeCompleted ? req.user._id : undefined;
    } else if (status !== undefined) {
      todo.status = status;
      if (status === 'completed') {
        todo.isCompleted = true;
        todo.completedAt = new Date();
        todo.completedBy = req.user._id;
      } else {
        todo.isCompleted = false;
        todo.completedAt = undefined;
        todo.completedBy = undefined;
      }
    }

    await todo.save();
    const populated = await WeeklyTodo.findById(todo._id).populate(TODO_POPULATE);
    res.json({ success: true, todo: populated });
  } catch (error) {
    console.error('updateWeeklyTodo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/todos/:id/toggle
 * Toggle completion status of a weekly todo.
 */
export const toggleWeeklyTodo = async (req, res) => {
  try {
    const todo = await WeeklyTodo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    const isOwnerCreator = todo.assignedBy.toString() === req.user._id.toString();
    const isAssignedPerson = todo.assignedTo.toString() === req.user._id.toString();

    if (!isManagerOrAdmin && !isOwnerCreator && !isAssignedPerson) {
      return res.status(403).json({ success: false, message: 'Not authorized to toggle this todo' });
    }

    todo.isCompleted = !todo.isCompleted;
    todo.status = todo.isCompleted ? 'completed' : 'pending';
    todo.completedAt = todo.isCompleted ? new Date() : undefined;
    todo.completedBy = todo.isCompleted ? req.user._id : undefined;

    await todo.save();
    const populated = await WeeklyTodo.findById(todo._id).populate(TODO_POPULATE);
    res.json({ success: true, todo: populated });
  } catch (error) {
    console.error('toggleWeeklyTodo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/todos/:id
 * Delete a weekly todo.
 * - Admin & Manager: can delete any todo.
 * - Employee & Intern: can delete todos created by themselves.
 */
export const deleteWeeklyTodo = async (req, res) => {
  try {
    const todo = await WeeklyTodo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(req.user.role);
    const isOwnerCreator = todo.assignedBy.toString() === req.user._id.toString();

    if (!isManagerOrAdmin && !isOwnerCreator) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete todos you created yourself',
      });
    }

    await WeeklyTodo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Weekly todo deleted successfully' });
  } catch (error) {
    console.error('deleteWeeklyTodo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
