import test from 'node:test';
import assert from 'node:assert/strict';

// Proposal pricing & validity helper
const evaluateProposal = (deliverables = [], validDays = 15, createdAt = new Date()) => {
  const totalAmount = deliverables.reduce((sum, d) => sum + (d.price || 0), 0);
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + validDays);

  const isExpired = new Date() > expiryDate;
  return { totalAmount, expiryDate, isExpired };
};

// SOP checklist verification helper
const verifySopChecklist = (steps = []) => {
  if (!steps || steps.length === 0) return { isComplete: false, progressPct: 0 };
  const completed = steps.filter(s => s.completed).length;
  const progressPct = Math.round((completed / steps.length) * 100);
  const isComplete = completed === steps.length;
  return { isComplete, progressPct, completed, total: steps.length };
};

// DM Promotion scheduler conflict detector
const hasScheduleConflict = (existingBookings = [], newBooking) => {
  const newStart = new Date(newBooking.startTime).getTime();
  const newEnd = new Date(newBooking.endTime).getTime();

  return existingBookings.some(b => {
    if (b.creatorId !== newBooking.creatorId) return false;
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return (newStart < bEnd && newEnd > bStart);
  });
};

test('Proposals: Calculates total deliverables price and expiration timeline', () => {
  const deliverables = [
    { title: 'Brand Identity & Logo', price: 15000 },
    { title: 'Responsive Website (5 pages)', price: 35000 },
    { title: '30 Days Social Media Campaign', price: 25000 },
  ];

  const evalResult = evaluateProposal(deliverables, 30, '2026-09-01T00:00:00Z');
  assert.equal(evalResult.totalAmount, 75000);
  assert.equal(evalResult.isExpired, false);

  const expiredResult = evaluateProposal(deliverables, 7, '2026-08-01T00:00:00Z');
  assert.equal(expiredResult.isExpired, true);
});

test('SOP: Progress and checklist completion verified accurately', () => {
  const steps = [
    { id: 1, title: 'Raw Footage Ingest', completed: true },
    { id: 2, title: 'Color Grading', completed: true },
    { id: 3, title: 'Sound Design & Mix', completed: false },
    { id: 4, title: 'Client Review Export', completed: false },
  ];

  const status = verifySopChecklist(steps);
  assert.equal(status.isComplete, false);
  assert.equal(status.progressPct, 50);
  assert.equal(status.completed, 2);
  assert.equal(status.total, 4);

  // Mark all completed
  steps.forEach(s => s.completed = true);
  const finished = verifySopChecklist(steps);
  assert.equal(finished.isComplete, true);
  assert.equal(finished.progressPct, 100);
});

test('DM Promotions: Detects schedule overlaps for video shoots and talent bookings', () => {
  const existingBookings = [
    {
      creatorId: 'vj_kavitha',
      startTime: '2026-10-05T14:00:00Z',
      endTime: '2026-10-05T16:00:00Z',
    },
  ];

  // Overlapping booking for same creator (15:00 to 17:00)
  const overlappingBooking = {
    creatorId: 'vj_kavitha',
    startTime: '2026-10-05T15:00:00Z',
    endTime: '2026-10-05T17:00:00Z',
  };
  assert.equal(hasScheduleConflict(existingBookings, overlappingBooking), true);

  // Non-overlapping booking for same creator (17:00 to 19:00)
  const clearBooking = {
    creatorId: 'vj_kavitha',
    startTime: '2026-10-05T17:00:00Z',
    endTime: '2026-10-05T19:00:00Z',
  };
  assert.equal(hasScheduleConflict(existingBookings, clearBooking), false);

  // Different creator at same time -> no conflict
  const otherCreatorBooking = {
    creatorId: 'rj_ramesh',
    startTime: '2026-10-05T14:30:00Z',
    endTime: '2026-10-05T15:30:00Z',
  };
  assert.equal(hasScheduleConflict(existingBookings, otherCreatorBooking), false);
});
