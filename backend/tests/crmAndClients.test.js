import test from 'node:test';
import assert from 'node:assert/strict';

// Lead pipeline status helper
const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost'];

const calculateLeadScore = (lead) => {
  let score = 0;
  if (lead.budget && lead.budget >= 50000) score += 30;
  else if (lead.budget && lead.budget >= 20000) score += 15;

  if (lead.timeline === 'Immediate' || lead.timeline === '< 1 month') score += 25;
  else if (lead.timeline === '1-3 months') score += 15;

  if (lead.isDecisionMaker) score += 25;
  if (lead.servicesNeeded && lead.servicesNeeded.length >= 2) score += 20;

  return score;
};

// Domain renewal expiry calculation
const getDomainRenewalStatus = (expiryDate, currentDate = new Date()) => {
  const diffMs = new Date(expiryDate) - new Date(currentDate);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'Expired', daysRemaining: diffDays, urgent: true };
  if (diffDays <= 7) return { status: 'Critical', daysRemaining: diffDays, urgent: true };
  if (diffDays <= 30) return { status: 'Expiring Soon', daysRemaining: diffDays, urgent: false };
  return { status: 'Active', daysRemaining: diffDays, urgent: false };
};

// Referral commission calculation
const calculateReferralPayout = (dealAmount, commissionPct = 10) => {
  if (!dealAmount || dealAmount <= 0) return 0;
  return Math.round((dealAmount * commissionPct) / 100);
};

// Followup status helper
const isFollowupOverdue = (scheduledDate, isCompleted, now = new Date()) => {
  if (isCompleted) return false;
  return new Date(scheduledDate) < new Date(now);
};

test('CRM: Lead stages are properly defined in sequential sales funnel', () => {
  assert.equal(LEAD_STAGES.length, 6);
  assert.equal(LEAD_STAGES[0], 'New');
  assert.equal(LEAD_STAGES[4], 'Won');
  assert.equal(LEAD_STAGES[5], 'Lost');
});

test('CRM: Lead scoring assigns correct points based on qualification parameters', () => {
  const highValueLead = {
    budget: 75000,
    timeline: 'Immediate',
    isDecisionMaker: true,
    servicesNeeded: ['SMM', 'Web Development'],
  };
  assert.equal(calculateLeadScore(highValueLead), 100, 'Top tier lead should score 100');

  const midLead = {
    budget: 25000,
    timeline: '1-3 months',
    isDecisionMaker: false,
    servicesNeeded: ['SEO'],
  };
  assert.equal(calculateLeadScore(midLead), 30);
});

test('Domain Renewals: Accurately flags expired, critical, and upcoming renewals', () => {
  const baseDate = new Date('2026-09-29T10:00:00Z');

  // Expired 5 days ago
  const expired = getDomainRenewalStatus('2026-09-24T10:00:00Z', baseDate);
  assert.equal(expired.status, 'Expired');
  assert.equal(expired.urgent, true);

  // 3 days left -> Critical
  const critical = getDomainRenewalStatus('2026-10-02T10:00:00Z', baseDate);
  assert.equal(critical.status, 'Critical');
  assert.equal(critical.urgent, true);

  // 20 days left -> Expiring Soon
  const soon = getDomainRenewalStatus('2026-10-19T10:00:00Z', baseDate);
  assert.equal(soon.status, 'Expiring Soon');
  assert.equal(soon.urgent, false);

  // 120 days left -> Active
  const active = getDomainRenewalStatus('2027-01-27T10:00:00Z', baseDate);
  assert.equal(active.status, 'Active');
  assert.equal(active.urgent, false);
});

test('Referral: Commission calculations compute accurate reward amount', () => {
  assert.equal(calculateReferralPayout(50000, 10), 5000);
  assert.equal(calculateReferralPayout(125000, 15), 18750);
  assert.equal(calculateReferralPayout(0, 10), 0);
});

test('Follow-ups: Correctly identifies overdue and pending client touches', () => {
  const pastDate = '2026-09-20T10:00:00Z';
  const futureDate = '2026-10-15T10:00:00Z';
  const now = new Date('2026-09-29T10:00:00Z');

  assert.equal(isFollowupOverdue(pastDate, false, now), true, 'Past incomplete task is overdue');
  assert.equal(isFollowupOverdue(pastDate, true, now), false, 'Past completed task is not overdue');
  assert.equal(isFollowupOverdue(futureDate, false, now), false, 'Future task is not overdue');
});
