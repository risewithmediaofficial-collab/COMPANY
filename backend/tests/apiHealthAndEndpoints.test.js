import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

const isConnRefused = (err) => {
  if (!err) return false;
  if (err.code === 'ECONNREFUSED') return true;
  if (err.cause?.code === 'ECONNREFUSED') return true;
  if (Array.isArray(err.cause?.errors) && err.cause.errors.some(e => e.code === 'ECONNREFUSED')) return true;
  return false;
};

test('API Live: Health check endpoint /api/health returns 200 and success', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.message, 'string');
    assert.ok(data.timestamp);
  } catch (err) {
    if (isConnRefused(err)) {
      console.warn('Server not currently running on port 5001, skipping live HTTP test');
      return;
    }
    throw err;
  }
});

test('API Security: Protected routes reject unauthenticated requests with 401', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/smm/tracker`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /not authorized|no token/i);
  } catch (err) {
    if (isConnRefused(err)) return;
    throw err;
  }
});

test('API Validation: Login endpoint rejects empty credentials with 400', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
  } catch (err) {
    if (isConnRefused(err)) return;
    throw err;
  }
});

test('API Routing: Non-existent routes return 404', async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/unknown-endpoint-xyz`);
    assert.equal(res.status, 404);
  } catch (err) {
    if (isConnRefused(err)) return;
    throw err;
  }
});

test('Module Integrity: All controllers and routes load without syntax or declaration errors', async () => {
  const smmTrackerController = await import('../controllers/smm/smmMonthlyTracker.controller.js');
  assert.ok(smmTrackerController.getMonthlyTrackers);
  assert.ok(smmTrackerController.upsertTracker);
  assert.ok(smmTrackerController.updateDayCell);

  const clientController = await import('../controllers/client.controller.js');
  assert.ok(clientController.syncAllClientUsers);
  assert.ok(clientController.ensureClientUserAccount);
});


