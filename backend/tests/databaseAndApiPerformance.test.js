import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePagination, parseCursorPagination } from '../utils/pagination.js';
import { redactMongoUri } from '../config/db.js';

describe('Phase 4: Database & API Performance Tests', () => {
  it('parsePagination applies default page 1 and defaultLimit 25 when query is empty', () => {
    const result = parsePagination({});
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.limit, 25);
    assert.strictEqual(result.skip, 0);
  });

  it('parsePagination respects custom defaultLimit', () => {
    const result = parsePagination({}, { defaultLimit: 50 });
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.limit, 50);
    assert.strictEqual(result.skip, 0);
  });

  it('parsePagination parses valid page and limit and computes correct skip offset', () => {
    const result = parsePagination({ page: '3', limit: '20' });
    assert.strictEqual(result.page, 3);
    assert.strictEqual(result.limit, 20);
    assert.strictEqual(result.skip, 40);
  });

  it('parsePagination clamps limit exceeding maxLimit to 100', () => {
    const result = parsePagination({ page: 1, limit: 500 });
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.limit, 100);
    assert.strictEqual(result.skip, 0);
  });

  it('parsePagination rejects negative or zero page values with 400', () => {
    assert.throws(
      () => parsePagination({ page: 0 }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid page parameter')
    );
    assert.throws(
      () => parsePagination({ page: -5 }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid page parameter')
    );
  });

  it('parsePagination rejects non-integer or malformed page values with 400', () => {
    assert.throws(
      () => parsePagination({ page: 'abc' }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid page parameter')
    );
    assert.throws(
      () => parsePagination({ page: '2.5' }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid page parameter')
    );
  });

  it('parsePagination rejects negative, zero, or non-integer limit values with 400', () => {
    assert.throws(
      () => parsePagination({ limit: 0 }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid limit parameter')
    );
    assert.throws(
      () => parsePagination({ limit: -10 }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid limit parameter')
    );
    assert.throws(
      () => parsePagination({ limit: 'invalid' }),
      (err) => err.statusCode === 400 && err.message.includes('Invalid limit parameter')
    );
  });

  it('parseCursorPagination extracts cursor and clamps limit', () => {
    const res1 = parseCursorPagination({ cursor: '64f1234567890abcdef12345', limit: '300' });
    assert.strictEqual(res1.cursor, '64f1234567890abcdef12345');
    assert.strictEqual(res1.limit, 100);

    const res2 = parseCursorPagination({});
    assert.strictEqual(res2.cursor, null);
    assert.strictEqual(res2.limit, 25);
  });

  it('redactMongoUri removes username and password from MongoDB connection string', () => {
    const rawUri = 'mongodb://agency_admin:superSecretP@ssword123@cluster0.abc.mongodb.net:27017/agency_crm?ssl=true';
    const safeUri = redactMongoUri(rawUri);
    assert.strictEqual(safeUri.includes('superSecretP@ssword123'), false);
    assert.strictEqual(safeUri.includes('agency_admin'), false);
    assert.strictEqual(safeUri.startsWith('mongodb://***:***@cluster0.abc.mongodb.net'), true);
  });
});
