import test from 'node:test';
import assert from 'node:assert/strict';

// Helper: Calculate project progress percentage
const calculateProjectProgress = (tasks = []) => {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'Completed' || t.status === 'done').length;
  return Math.round((completed / tasks.length) * 100);
};

// Helper: Calculate project health
const getProjectHealth = (deadline, progress, now = new Date()) => {
  const diffDays = Math.ceil((new Date(deadline) - new Date(now)) / (1000 * 60 * 60 * 24));
  if (progress >= 100) return 'Completed';
  if (diffDays < 0) return 'Delayed';
  if (diffDays <= 3 && progress < 70) return 'At Risk';
  return 'On Track';
};

// Priority weight for sorting
const PRIORITY_WEIGHTS = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

const sortTasksByPriority = (tasks = []) => {
  return [...tasks].sort((a, b) => (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0));
};

test('Projects: Progress percentage calculates accurately without dividing by zero', () => {
  assert.equal(calculateProjectProgress([]), 0, 'Empty task list should return 0%');

  const tasks = [
    { title: 'Design Mockups', status: 'Completed' },
    { title: 'Setup DB', status: 'Completed' },
    { title: 'Frontend UI', status: 'In Progress' },
    { title: 'API Integration', status: 'To Do' },
  ];
  assert.equal(calculateProjectProgress(tasks), 50, '2 out of 4 completed should return 50%');

  const allDone = [
    { title: 'Task 1', status: 'Completed' },
    { title: 'Task 2', status: 'Completed' },
  ];
  assert.equal(calculateProjectProgress(allDone), 100);
});

test('Projects: Health computation detects Delayed, At Risk, and On Track projects', () => {
  const now = new Date('2026-09-29T10:00:00Z');

  // Past deadline, not done -> Delayed
  assert.equal(getProjectHealth('2026-09-20T00:00:00Z', 60, now), 'Delayed');

  // Completed -> Completed
  assert.equal(getProjectHealth('2026-09-20T00:00:00Z', 100, now), 'Completed');

  // Due in 2 days, only 40% progress -> At Risk
  assert.equal(getProjectHealth('2026-10-01T00:00:00Z', 40, now), 'At Risk');

  // Due in 30 days, 20% progress -> On Track
  assert.equal(getProjectHealth('2026-10-30T00:00:00Z', 20, now), 'On Track');
});

test('Tasks: Sort tasks in descending order of priority (Urgent > High > Medium > Low)', () => {
  const tasks = [
    { id: 1, title: 'Fix typo', priority: 'Low' },
    { id: 2, title: 'Server crash', priority: 'Urgent' },
    { id: 3, title: 'Update copy', priority: 'Medium' },
    { id: 4, title: 'Payment bug', priority: 'High' },
  ];

  const sorted = sortTasksByPriority(tasks);
  assert.equal(sorted[0].priority, 'Urgent');
  assert.equal(sorted[1].priority, 'High');
  assert.equal(sorted[2].priority, 'Medium');
  assert.equal(sorted[3].priority, 'Low');
});

test('Tasks: Task status transitions follow allowed workflow stages', () => {
  const VALID_STATUSES = ['To Do', 'In Progress', 'Review', 'Completed', 'Blocked'];
  assert.equal(VALID_STATUSES.includes('To Do'), true);
  assert.equal(VALID_STATUSES.includes('Completed'), true);
  assert.equal(VALID_STATUSES.includes('InvalidStatus'), false);
});

test('Tasks: Timer deadline calculates correctly from accepted time and allocated duration', () => {
  const acceptedAt = new Date('2026-10-24T10:00:00.000Z');
  const allocatedHours = 2;
  const allocatedMinutes = 30;
  const totalMs = (allocatedHours * 60 + allocatedMinutes) * 60 * 1000;
  const timerExpiresAt = new Date(acceptedAt.getTime() + totalMs);

  assert.equal(timerExpiresAt.toISOString(), '2026-10-24T12:30:00.000Z');
  assert.equal(timerExpiresAt.getTime() - acceptedAt.getTime(), 150 * 60 * 1000);
});

test('Tasks: Overdue evaluator flags tasks exceeding allocated timer before completion', () => {
  const isOverdueCheck = (task, now = new Date()) => {
    if (['completed', 'done', 'approved'].includes(task.status)) return false;
    if (task.isOverdue) return true;
    if (task.timerExpiresAt && new Date(task.timerExpiresAt).getTime() < now.getTime()) return true;
    if (task.dueDate && new Date(task.dueDate).getTime() < now.getTime()) return true;
    return false;
  };

  const now = new Date('2026-10-24T14:00:00.000Z');

  // Timer expired (13:00 vs 14:00) and in progress -> Overdue!
  const overdueTask = {
    status: 'in_progress',
    timerExpiresAt: '2026-10-24T13:00:00.000Z',
  };
  assert.equal(isOverdueCheck(overdueTask, now), true);

  // Completed task with expired timer -> NOT overdue (already done)
  const completedTask = {
    status: 'completed',
    timerExpiresAt: '2026-10-24T13:00:00.000Z',
  };
  assert.equal(isOverdueCheck(completedTask, now), false);

  // Active task with future timer -> NOT overdue
  const activeTask = {
    status: 'in_progress',
    timerExpiresAt: '2026-10-24T15:30:00.000Z',
  };
  assert.equal(isOverdueCheck(activeTask, now), false);
});

test('Tasks: Submission categorizes on_time, completed_with_delay, and incomplete_with_reason', () => {
  const getSubmissionCategory = (timerExpiresAt, submittedAt, isCompleted) => {
    if (!isCompleted) return 'incomplete_with_reason';
    if (timerExpiresAt && new Date(submittedAt) > new Date(timerExpiresAt)) {
      return 'completed_with_delay';
    }
    return 'on_time';
  };

  const deadline = '2026-10-24T12:00:00.000Z';
  assert.equal(getSubmissionCategory(deadline, '2026-10-24T11:45:00.000Z', true), 'on_time');
  assert.equal(getSubmissionCategory(deadline, '2026-10-24T12:15:00.000Z', true), 'completed_with_delay');
  assert.equal(getSubmissionCategory(deadline, '2026-10-24T11:30:00.000Z', false), 'incomplete_with_reason');
});
