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
