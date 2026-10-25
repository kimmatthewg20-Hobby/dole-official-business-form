'use strict';

// The daily cleanup also removes Employee directory entries unused for six months. Unused
// means the last-used date is before the cut-off day; that day itself is still kept.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { withFormsRestored, countRows } = require('./form-helpers');
const { cleanupUnusedEmployees, sixMonthCutoff } = require('../routes/directory-cleanup');

const OK = 200;
const UNAUTHORIZED = 401;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 10;
const CLEANUP_ROUTE = '/api/cleanup/test';
// Worked by hand: a month without the day counts to its last day, leap years included.
const CUTOFF_EXAMPLES = [
  ['2026-10-25T12:00:00Z', '2026-04-25'],
  ['2026-03-15T00:00:00Z', '2025-09-15'],
  ['2026-08-31T23:59:59Z', '2026-02-28'],
  ['2024-08-31T08:00:00Z', '2024-02-29'],
  ['2026-12-31T00:00:00Z', '2026-06-30'],
];
// Unreadable dates are never treated as old: deleting personal data needs a real date.
const UNREADABLE_DATES = ['', '1999-02-30', 'someday'];

function isoDay(date) {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

function dayBefore(day) {
  return isoDay(new Date(Date.parse(`${day}T00:00:00Z`) - MS_PER_DAY));
}

async function addDirectoryEntry(db, fullName, lastUsedAt) {
  if (lastUsedAt === undefined) {
    return (await db.run('INSERT INTO employees_directory (full_name) VALUES (?) RETURNING id', [fullName])).lastID;
  }
  const sql = 'INSERT INTO employees_directory (full_name, last_used_at) VALUES (?, ?) RETURNING id';
  return (await db.run(sql, [fullName, lastUsedAt])).lastID;
}

// Only the just-outside entry is older than six months; every other one must stay.
async function seedDirectory(db) {
  await db.run('DELETE FROM employees_directory', []);
  const cutoff = sixMonthCutoff(new Date());
  const outsideId = await addDirectoryEntry(db, 'Just Outside', dayBefore(cutoff));
  await addDirectoryEntry(db, 'Just Inside', cutoff);
  await addDirectoryEntry(db, 'Used Today', isoDay(new Date()));
  await addDirectoryEntry(db, 'Never Used');
  for (const [index, value] of UNREADABLE_DATES.entries()) await addDirectoryEntry(db, `Unreadable ${index}`, value);
  return { outsideId, total: 4 + UNREADABLE_DATES.length };
}

async function callCleanup(baseUrl, query, cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  return fetch(`${baseUrl}${CLEANUP_ROUTE}${query}`, { headers, redirect: 'manual' });
}

async function remainingNames(db) {
  return (await db.all('SELECT full_name FROM employees_directory ORDER BY id', [])).map((row) => row.full_name);
}

module.exports = [
  {
    name: 'the six-month cut-off is the same day six months back, or that month’s last day',
    async run() {
      for (const [now, expected] of CUTOFF_EXAMPLES) assert.equal(sixMonthCutoff(new Date(now)), expected, now);
    },
  },
  {
    name: 'the cleanup removes only the employee last used just over six months ago',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const { outsideId, total } = await seedDirectory(db);
        const result = await cleanupUnusedEmployees();
        assert.deepEqual(result, { deleted: 1, ids: [outsideId] });
        assert.equal(await countRows(db, 'employees_directory'), total - 1);
        assert.ok(!(await remainingNames(db)).includes('Just Outside'));
      });
    },
  },
  {
    name: 'an employee never used on a form and one used today (as after migration day) are kept',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        await seedDirectory(db);
        await cleanupUnusedEmployees();
        const names = await remainingNames(db);
        for (const name of ['Just Inside', 'Used Today', 'Never Used']) assert.ok(names.includes(name), name);
      });
    },
  },
  {
    name: 'an admin dry run reports the employee that would be removed and deletes nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { outsideId, total } = await seedDirectory(db);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await callCleanup(baseUrl, '?dryRun=true', cookie);
        assert.equal(response.status, OK);
        const { result } = await response.json();
        assert.equal(result.employees.deleted, 0);
        assert.equal(result.employees.wouldDelete, 1);
        assert.deepEqual(
          result.employees.entries.map((entry) => [entry.id, entry.full_name]),
          [[outsideId, 'Just Outside']]
        );
        assert.equal(await countRows(db, 'employees_directory'), total);
      });
    },
  },
  {
    name: 'an admin real run removes the employee unused for six months',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { outsideId, total } = await seedDirectory(db);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await callCleanup(baseUrl, '', cookie);
        assert.equal(response.status, OK);
        const { result } = await response.json();
        assert.deepEqual(result.employees, { deleted: 1, ids: [outsideId] });
        assert.equal(await countRows(db, 'employees_directory'), total - 1);
      });
    },
  },
  {
    name: 'the cleanup endpoint still refuses a caller who is not logged in and removes no employee',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { total } = await seedDirectory(db);
        const response = await callCleanup(baseUrl, '');
        assert.equal(response.status, UNAUTHORIZED);
        assert.equal(await countRows(db, 'employees_directory'), total);
      });
    },
  },
  {
    name: 'the Employees page has a Last Used column',
    async run({ baseUrl }) {
      const page = await (await fetch(`${baseUrl}/employees.html`)).text();
      assert.match(page, /<th>Last Used<\/th>/);
    },
  },
];
