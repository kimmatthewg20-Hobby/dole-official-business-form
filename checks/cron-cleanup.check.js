'use strict';

const assert = require('node:assert/strict');
const { withFormsRestored, insertForm, countRows } = require('./form-helpers');
const { DEFAULT_RETENTION_DAYS } = require('../routes/cleanup');
const { sixMonthCutoff } = require('../routes/directory-cleanup');

const CRON_ROUTE = '/api/cron/cleanup';
const TEST_CRON_SECRET = 'check-cron-secret-not-real';
const WRONG_SAME_LENGTH_SECRET = 'check-cron-secret-not-fake';
const DAYS_PAST_CUTOFF = DEFAULT_RETENTION_DAYS + 2;
const DAYS_BEFORE_CUTOFF = DEFAULT_RETENTION_DAYS - 2;
const UNAUTHORIZED = 401;
const SEEDED_FORM_COUNT = 2;
const LONG_UNUSED_DAY = '2020-01-01';

// The route reads CRON_SECRET per request, so each check sets (or removes) it in this process.
async function withCronSecret(secret, callback) {
  const hadValue = Object.prototype.hasOwnProperty.call(process.env, 'CRON_SECRET');
  const previous = process.env.CRON_SECRET;
  if (secret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = secret;
  try {
    await callback();
  } finally {
    if (hadValue) process.env.CRON_SECRET = previous;
    else delete process.env.CRON_SECRET;
  }
}

function callCron(baseUrl, authorization) {
  const headers = authorization === undefined ? {} : { Authorization: authorization };
  return fetch(`${baseUrl}${CRON_ROUTE}`, { headers, redirect: 'manual' });
}

async function seed(db) {
  const oldId = await insertForm(db, { daysAgo: DAYS_PAST_CUTOFF, employees: ['Old One', 'Old Two'] });
  const recentId = await insertForm(db, { daysAgo: DAYS_BEFORE_CUTOFF, employees: ['Recent One'] });
  return { oldId, recentId };
}

function rejectionCheck(name, configuredSecret, authorization) {
  return {
    name,
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await seed(db);
        await withCronSecret(configuredSecret, async () => {
          const response = await callCron(baseUrl, authorization);
          assert.equal(response.status, UNAUTHORIZED);
        });
        assert.equal(await countRows(db, 'official_business'), SEEDED_FORM_COUNT);
        assert.equal(await countRows(db, 'employees'), 3);
      });
    },
  };
}

module.exports = [
  {
    name: 'the cron call with the right secret deletes only the form older than the cut-off',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { oldId, recentId } = await seed(db);
        await withCronSecret(TEST_CRON_SECRET, async () => {
          const response = await callCron(baseUrl, `Bearer ${TEST_CRON_SECRET}`);
          assert.equal(response.status, 200);
          const body = await response.json();
          assert.equal(body.success, true);
          assert.equal(body.deleted, 1);
        });
        assert.equal(await db.get('SELECT id FROM official_business WHERE id = ?', [oldId]), null);
        assert.deepEqual(await db.get('SELECT id FROM official_business WHERE id = ?', [recentId]), {
          id: recentId,
        });
        assert.equal(await countRows(db, 'employees'), 1);
      });
    },
  },
  {
    name: 'the cron call also removes the employee unused for six months and keeps the recent one',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await db.run('DELETE FROM employees_directory', []);
        const sql = 'INSERT INTO employees_directory (full_name, last_used_at) VALUES (?, ?)';
        await db.run(sql, ['Long Unused', LONG_UNUSED_DAY]);
        await db.run(sql, ['Recently Used', sixMonthCutoff(new Date())]);
        await withCronSecret(TEST_CRON_SECRET, async () => {
          const response = await callCron(baseUrl, `Bearer ${TEST_CRON_SECRET}`);
          assert.equal(response.status, 200);
          assert.equal((await response.json()).employeesDeleted, 1);
        });
        const names = await db.all('SELECT full_name FROM employees_directory', []);
        assert.deepEqual(names, [{ full_name: 'Recently Used' }]);
      });
    },
  },
  rejectionCheck('the cron call with no secret is refused and deletes nothing', TEST_CRON_SECRET, undefined),
  rejectionCheck(
    'the cron call with a wrong secret of the same length is refused and deletes nothing',
    TEST_CRON_SECRET,
    `Bearer ${WRONG_SAME_LENGTH_SECRET}`
  ),
  rejectionCheck(
    'the cron call with a wrong secret of another length is refused and deletes nothing',
    TEST_CRON_SECRET,
    'Bearer short'
  ),
  rejectionCheck(
    'the cron call with the secret but no Bearer prefix is refused and deletes nothing',
    TEST_CRON_SECRET,
    TEST_CRON_SECRET
  ),
  rejectionCheck(
    'with CRON_SECRET unset every cron call is refused and deletes nothing',
    undefined,
    'Bearer undefined'
  ),
  rejectionCheck(
    'with CRON_SECRET set to an empty value an empty Bearer is refused and deletes nothing',
    '',
    'Bearer '
  ),
];
