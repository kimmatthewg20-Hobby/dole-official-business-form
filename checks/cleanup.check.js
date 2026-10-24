'use strict';

const assert = require('node:assert/strict');
const { loginCookie } = require('./admin-http');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { withFormsRestored, insertForm, countRows } = require('./form-helpers');
const { cleanupOldRecords, DEFAULT_RETENTION_DAYS } = require('../routes/cleanup');

const DAYS_PAST_CUTOFF = DEFAULT_RETENTION_DAYS + 2;
const DAYS_BEFORE_CUTOFF = DEFAULT_RETENTION_DAYS - 2;

async function seed(db) {
  const oldId = await insertForm(db, { daysAgo: DAYS_PAST_CUTOFF, employees: ['Old One', 'Old Two'] });
  const recentId = await insertForm(db, { daysAgo: DAYS_BEFORE_CUTOFF, employees: ['Recent One'] });
  return { oldId, recentId };
}

async function callEndpoint(baseUrl, query, cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  return fetch(`${baseUrl}/api/cleanup/test${query}`, { headers, redirect: 'manual' });
}

async function employeeCount(db, obId) {
  return (await db.get('SELECT COUNT(*) AS total FROM employees WHERE ob_id = ?', [obId])).total;
}

module.exports = [
  {
    name: 'the cleanup endpoint refuses a caller who is not logged in and deletes nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await seed(db);
        const response = await callEndpoint(baseUrl, '');
        assert.equal(response.status, 401);
        assert.equal(await countRows(db, 'official_business'), 2);
      });
    },
  },
  {
    name: 'a dry run reports the forms older than the cut-off and deletes nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { oldId } = await seed(db);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await callEndpoint(baseUrl, '?dryRun=true', cookie);
        assert.equal(response.status, 200);
        const { result } = await response.json();
        assert.equal(result.deleted, 0);
        assert.equal(result.wouldDelete, 1);
        assert.deepEqual(result.records.map((record) => record.id), [oldId]);
        assert.equal(await countRows(db, 'official_business'), 2);
        assert.equal(await countRows(db, 'employees'), 3);
      });
    },
  },
  {
    name: 'a real run through the endpoint deletes only the old form and its employees',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { oldId, recentId } = await seed(db);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await callEndpoint(baseUrl, '', cookie);
        assert.equal(response.status, 200);
        const { result } = await response.json();
        assert.equal(result.deleted, 1);
        assert.deepEqual(result.ids, [oldId]);
        assert.equal(await db.get('SELECT id FROM official_business WHERE id = ?', [oldId]), null);
        assert.equal(await employeeCount(db, oldId), 0);
        assert.equal(await employeeCount(db, recentId), 1);
        assert.equal(await countRows(db, 'official_business'), 1);
      });
    },
  },
  {
    name: 'cleanupOldRecords called directly (as the cron route does) deletes the old form and keeps the recent one',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const { oldId, recentId } = await seed(db);
        const result = await cleanupOldRecords();
        assert.equal(result.deleted, 1);
        assert.equal(await employeeCount(db, oldId), 0);
        assert.equal(await employeeCount(db, recentId), 1);
      });
    },
  },
];
