import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canViewFinanceOverview,
  canManageFinance,
} from '../utils/financeAccess.js';

test('manager can view overall finance but cannot manage finance', () => {
  const user = { role: 'manager', permissions: {} };

  assert.equal(canViewFinanceOverview(user), true);
  assert.equal(canManageFinance(user), false);
});

test('super admin can both view and manage finance', () => {
  const user = { role: 'superAdmin', permissions: {} };

  assert.equal(canViewFinanceOverview(user), true);
  assert.equal(canManageFinance(user), true);
});

test('custom finance permission allows full access without a manager role', () => {
  const user = { role: 'employee', permissions: { canManageFinance: true } };

  assert.equal(canViewFinanceOverview(user), true);
  assert.equal(canManageFinance(user), true);
});
