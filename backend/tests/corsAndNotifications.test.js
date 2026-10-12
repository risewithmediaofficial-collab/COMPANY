import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isOriginAllowed,
  normalizeOrigin,
  createCorsError,
  getAllowedOrigins,
} from '../config/cors.js';
import { errorHandler } from '../middleware/error.middleware.js';
import { subscribePush } from '../controllers/notification.controller.js';

test('CORS: normalizeOrigin strips whitespace and trailing slashes', () => {
  assert.equal(normalizeOrigin('  https://company.risewithmedia.com/  '), 'https://company.risewithmedia.com');
  assert.equal(normalizeOrigin('HTTP://LOCALHOST:5173/'), 'http://localhost:5173');
  assert.equal(normalizeOrigin(''), '');
  assert.equal(normalizeOrigin(null), '');
});

test('CORS: Explicitly whitelists production domain https://company.risewithmedia.com', () => {
  assert.equal(isOriginAllowed('https://company.risewithmedia.com'), true);
  assert.equal(isOriginAllowed('https://company.risewithmedia.com/'), true);
  assert.equal(isOriginAllowed('http://company.risewithmedia.com'), true);
});

test('CORS: Whitelists risewithmedia.com wildcard subdomains and apex domain', () => {
  assert.equal(isOriginAllowed('https://risewithmedia.com'), true);
  assert.equal(isOriginAllowed('https://crm.risewithmedia.com'), true);
  assert.equal(isOriginAllowed('https://admin.risewithmedia.com'), true);
  assert.equal(isOriginAllowed('https://staging.company.risewithmedia.com'), true);
});

test('CORS: Allows non-browser requests with missing or empty Origin header', () => {
  assert.equal(isOriginAllowed(null), true);
  assert.equal(isOriginAllowed(undefined), true);
  assert.equal(isOriginAllowed(''), true);
});

test('CORS: Allows development localhost and 127.0.0.1 origins', () => {
  assert.equal(isOriginAllowed('http://localhost:5173'), true);
  assert.equal(isOriginAllowed('http://localhost:3000'), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:5173'), true);
});

test('CORS: Dynamically accepts same-origin requests matching Host header', () => {
  const reqWithHost = {
    headers: { host: 'custom-internal.domain.local' },
  };
  assert.equal(isOriginAllowed('https://custom-internal.domain.local', reqWithHost), true);
});

test('CORS: Dynamically accepts same-origin requests matching X-Forwarded-Host reverse proxy header', () => {
  const reqWithProxy = {
    headers: { 'x-forwarded-host': 'proxy.agencycrm.internal, 10.0.0.1' },
  };
  assert.equal(isOriginAllowed('https://proxy.agencycrm.internal', reqWithProxy), true);
});

test('CORS: Rejects unauthorized third-party origins', () => {
  assert.equal(isOriginAllowed('https://malicious-phishing.com'), false);
  assert.equal(isOriginAllowed('https://evil-risewithmedia.com.attacker.com'), false);
  assert.equal(isOriginAllowed('https://fake-risewithmedia.org'), false);
});

test('CORS: createCorsError attaches statusCode 403 and isCors flag (never 500)', () => {
  const err = createCorsError('https://malicious-phishing.com');
  assert.equal(err.statusCode, 403);
  assert.equal(err.isCors, true);
  assert.match(err.message, /Origin https:\/\/malicious-phishing\.com not allowed/);
});

test('CORS Error Handling: errorHandler converts CORS errors to 403 Forbidden instead of 500', () => {
  let capturedStatus = 0;
  let capturedBody = null;

  const mockRes = {
    statusCode: 200,
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(data) {
      capturedBody = data;
      return this;
    },
  };

  const corsError = new Error('CORS policy: Origin https://malicious.com not allowed');
  errorHandler(corsError, {}, mockRes, () => {});

  assert.equal(capturedStatus, 403, 'CORS rejection must return 403 Forbidden, not 500');
  assert.equal(capturedBody?.success, false);
  assert.match(capturedBody?.message, /Origin https:\/\/malicious\.com not allowed/);
});

test('Notification Subscribe: Returns 400 for missing or invalid subscription payload without throwing 500', async () => {
  let capturedStatus = 0;
  let capturedBody = null;

  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(data) {
      capturedBody = data;
      return this;
    },
  };

  // Missing subscription payload
  await subscribePush({ body: {} }, mockRes);
  assert.equal(capturedStatus, 400);
  assert.equal(capturedBody?.success, false);

  // Incomplete subscription payload
  capturedStatus = 0;
  capturedBody = null;
  await subscribePush(
    {
      body: {
        subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/xyz' },
      },
    },
    mockRes
  );
  assert.equal(capturedStatus, 400);
  assert.equal(capturedBody?.success, false);

  // Malformed JSON string subscription payload
  capturedStatus = 0;
  capturedBody = null;
  await subscribePush(
    {
      body: {
        subscription: '{ bad-json-payload',
      },
    },
    mockRes
  );
  assert.equal(capturedStatus, 400);
  assert.equal(capturedBody?.success, false);
});
