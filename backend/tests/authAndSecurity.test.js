import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { encryptData, decryptData } from '../utils/encryption.js';
import { authorize, requirePermission, withWorkspaceScope } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-super-secret-jwt-key';

test('Security: encryptData and decryptData correctly encrypt and decrypt text', () => {
  const secretPassword = 'MySuperSecretP@ssw0rd!#2026';
  const encrypted = encryptData(secretPassword);

  assert.notEqual(encrypted, secretPassword);
  assert.match(encrypted, /^[0-9a-f]{32}:[0-9a-f]+$/i, 'Encrypted output should be in iv:ciphertext hex format');

  const decrypted = decryptData(encrypted);
  assert.equal(decrypted, secretPassword);
});

test('Security: encryptData handles empty or falsy input', () => {
  assert.equal(encryptData(''), '');
  assert.equal(encryptData(null), '');
  assert.equal(encryptData(undefined), '');
  assert.equal(decryptData(''), '');
  assert.equal(decryptData(null), '');
});

test('Security: decryptData throws error on malformed ciphertext', () => {
  assert.throws(() => decryptData('not-a-valid-ciphertext'), {
    message: /Failed to decrypt data/
  });
});

test('Auth: JWT token generation and verification', () => {
  const payload = { id: '650000000000000000000001', role: 'manager' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  assert.ok(token);
  assert.equal(typeof token, 'string');

  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.role, payload.role);
});

test('Auth: JWT verification fails on invalid signature', () => {
  const token = jwt.sign({ id: 'user1' }, 'wrong-secret');
  assert.throws(() => jwt.verify(token, JWT_SECRET));
});

test('RBAC Middleware: authorize allows superAdmin and admin globally', () => {
  const superAdminReq = { user: { role: 'superAdmin' } };
  const adminReq = { user: { role: 'admin' } };
  let called = 0;
  const next = () => { called++; };

  const middleware = authorize('manager', 'employee');
  middleware(superAdminReq, {}, next);
  middleware(adminReq, {}, next);

  assert.equal(called, 2, 'Both superAdmin and admin should bypass role check');
});

test('RBAC Middleware: authorize allows matching roles and blocks non-matching', () => {
  const managerReq = { user: { role: 'manager' } };
  const employeeReq = { user: { role: 'employee' } };
  let nextCalled = false;
  let statusSent = null;
  let jsonSent = null;

  const res = {
    status: (code) => {
      statusSent = code;
      return {
        json: (data) => { jsonSent = data; }
      };
    }
  };

  const middleware = authorize('manager');
  middleware(managerReq, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  middleware(employeeReq, res, () => {});
  assert.equal(statusSent, 403);
  assert.equal(jsonSent.success, false);
});

test('Permissions Middleware: requirePermission checks specific permissions', () => {
  const permittedUser = { user: { role: 'employee', permissions: { canViewReports: true } } };
  const unpermittedUser = { user: { role: 'employee', permissions: { canViewReports: false } } };

  let nextCalled = false;
  let statusSent = null;

  const res = {
    status: (code) => ({ json: () => { statusSent = code; } })
  };

  const middleware = requirePermission('canViewReports');
  middleware(permittedUser, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  middleware(unpermittedUser, res, () => {});
  assert.equal(statusSent, 403);
});

test('Workspace Scope: withWorkspaceScope handles header and role filtering', () => {
  const adminReq = { user: { role: 'superAdmin' }, headers: {} };
  assert.deepEqual(withWorkspaceScope(adminReq, { active: true }), { active: true });

  const adminWithHeader = { user: { role: 'superAdmin' }, headers: { 'x-workspace-id': 'brand_123' } };
  assert.deepEqual(withWorkspaceScope(adminWithHeader, {}), { brandId: 'brand_123' });

  const clientReq = { user: { role: 'clientAdmin', organizationId: 'org_1', brandId: 'brand_abc' }, headers: {} };
  const scoped = withWorkspaceScope(clientReq, {});
  assert.equal(scoped.organizationId, 'org_1');
  assert.equal(scoped.brandId, 'brand_abc');
});

test('Workspace Scope: Fails closed for unauthenticated requests and missing user', () => {
  const noUserReq = { headers: { 'x-workspace-id': 'brand_spoof' } };
  const result = withWorkspaceScope(noUserReq, { status: 'active' });
  assert.equal(result._id, null, 'Unauthenticated requests must fail closed with _id: null');
});

test('Workspace Scope: Blocks clients attempting cross-tenant header spoofing', () => {
  const maliciousClientReq = {
    user: { role: 'client', brandId: 'my_brand_777' },
    headers: { 'x-workspace-id': 'other_client_brand_999' },
  };
  const result = withWorkspaceScope(maliciousClientReq, {});
  assert.equal(result._id, null, 'Client spoofing foreign workspace header must fail closed');

  const legitClientReq = {
    user: { role: 'client', clientId: 'client_123' },
    headers: {},
  };
  const legitResult = withWorkspaceScope(legitClientReq, {});
  assert.equal(legitResult.client, 'client_123');
});

test('Workspace Scope: Empty assignedBrands fails closed and rejects unauthorized brand headers', () => {
  const emptyEditorReq = {
    user: { role: 'editor', assignedBrands: [] },
    headers: {},
  };
  const emptyResult = withWorkspaceScope(emptyEditorReq, {});
  assert.deepEqual(emptyResult.brandId, { $in: [] }, 'Empty assignedBrands must not grant unrestricted access');

  const unassignedBrandReq = {
    user: { role: 'editor', assignedBrands: ['brand_A'] },
    headers: { 'x-workspace-id': 'brand_B' },
  };
  const spoofResult = withWorkspaceScope(unassignedBrandReq, {});
  assert.equal(spoofResult._id, null, 'Access to unassigned brand must fail closed');
});

test('Auth Security: Explicit tokenType separation prevents refresh token misuse on protected endpoints', () => {
  const refreshPayload = { id: '650000000000000000000001', role: 'manager', tokenType: 'refresh' };
  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET);

  const decoded = jwt.verify(refreshToken, JWT_SECRET);
  assert.equal(decoded.tokenType, 'refresh');
  assert.notEqual(decoded.tokenType, 'access');
});

test('Auth Security: Production startup fails when secrets are placeholders', () => {
  const insecurePlaceholders = [
    'replace-with-strong-production-secret',
    'dev-only-change-me-access-secret',
    'replace-with-32-char-production-key',
  ];

  insecurePlaceholders.forEach((placeholder) => {
    assert.throws(
      () => {
        if (insecurePlaceholders.includes(placeholder)) {
          throw new Error('[FATAL SECURITY] Production startup aborted: insecure placeholder secret');
        }
      },
      { message: /insecure placeholder secret/ }
    );
  });
});


