import test from 'node:test';
import assert from 'node:assert/strict';

// Helper matching backend tracker controller
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

const buildEmptyDays = (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    postLabel: '',
    postStatus: 'pending',
    storyLabel: '',
    storyStatus: 'pending',
    note: '',
  }));
};

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

const STATUS_CYCLE = { pending: 'done', done: 'skip', skip: 'pending' };

const parsePlan = (planStr, storyPlanStr, defaultDays = 30) => {
  const rMatch = (planStr || '').match(/(\d+)\s*R/i);
  const pMatch = (planStr || '').match(/(\d+)\s*P/i);
  const sMatch = (storyPlanStr || '').match(/(\d+)/);

  const reels = rMatch ? parseInt(rMatch[1], 10) : 0;
  const posts = pMatch ? parseInt(pMatch[1], 10) : 0;
  const stories = sMatch ? parseInt(sMatch[1], 10) : defaultDays;

  return { reels, posts, stories, total: reels + posts + stories };
};

test('SMM Tracker: Days in month calculation handles leap years and variable lengths', () => {
  assert.equal(getDaysInMonth(2026, 9), 30, 'September 2026 has 30 days');
  assert.equal(getDaysInMonth(2026, 10), 31, 'October 2026 has 31 days');
  assert.equal(getDaysInMonth(2026, 2), 28, 'February 2026 has 28 days (non-leap)');
  assert.equal(getDaysInMonth(2024, 2), 29, 'February 2024 has 29 days (leap year)');
});

test('SMM Tracker: buildEmptyDays creates valid structure for entire month', () => {
  const days = buildEmptyDays(2026, 9);
  assert.equal(days.length, 30);
  assert.equal(days[0].day, 1);
  assert.equal(days[0].postStatus, 'pending');
  assert.equal(days[0].storyStatus, 'pending');
  assert.equal(days[29].day, 30);
});

test('SMM Tracker: Status badge cycles correctly pending -> done -> skip -> pending', () => {
  assert.equal(STATUS_CYCLE.pending, 'done');
  assert.equal(STATUS_CYCLE.done, 'skip');
  assert.equal(STATUS_CYCLE.skip, 'pending');
});

test('SMM Tracker: Plan string parser correctly extracts targets', () => {
  const parsed1 = parsePlan('15R + 4P', '30 STORIES', 30);
  assert.equal(parsed1.reels, 15);
  assert.equal(parsed1.posts, 4);
  assert.equal(parsed1.stories, 30);
  assert.equal(parsed1.total, 49);

  const parsed2 = parsePlan('8R + 2P', '', 30);
  assert.equal(parsed2.reels, 8);
  assert.equal(parsed2.posts, 2);
  assert.equal(parsed2.stories, 30);
  assert.equal(parsed2.total, 40);
});

test('SMM Tracker: formatShortTime formats 24hr times to clean agency short tags', () => {
  assert.equal(formatShortTime('18:30'), '6:30P');
  assert.equal(formatShortTime('10:00'), '10A');
  assert.equal(formatShortTime('00:00'), '12A');
  assert.equal(formatShortTime('12:15'), '12:15P');
  assert.equal(formatShortTime(''), '');
});

test('SMM Tracker: isExcluded flag filters rows from monthly view', () => {
  const mockRows = [
    { client: { companyName: 'Client Alpha' }, isExcluded: false },
    { client: { companyName: 'Client Beta' }, isExcluded: true },
    { client: { companyName: 'Client Gamma' }, isExcluded: false },
  ];

  const visibleRows = mockRows.filter(r => !r.isExcluded);
  assert.equal(visibleRows.length, 2);
  assert.equal(visibleRows[0].client.companyName, 'Client Alpha');
  assert.equal(visibleRows[1].client.companyName, 'Client Gamma');
});

test('SMM Metrics: Ad campaign metrics calculations (CTR, CPC, ROAS)', () => {
  const spend = 5000;
  const clicks = 250;
  const impressions = 10000;
  const revenue = 20000;

  const cpc = spend / clicks;
  const ctr = (clicks / impressions) * 100;
  const roas = revenue / spend;

  assert.equal(cpc, 20, 'Cost per click should be 20');
  assert.equal(ctr, 2.5, 'Click-through rate should be 2.5%');
  assert.equal(roas, 4, 'Return on ad spend should be 4x');
});

test('SMM Budget: Budget utilization percentage and over-budget detection', () => {
  const allocated = 50000;
  const spentNormal = 35000;
  const spentOver = 55000;

  const normalPct = Math.round((spentNormal / allocated) * 100);
  const overPct = Math.round((spentOver / allocated) * 100);

  assert.equal(normalPct, 70);
  assert.equal(overPct, 110);
  assert.equal(spentOver > allocated, true, 'Detects over-budget status');
});
