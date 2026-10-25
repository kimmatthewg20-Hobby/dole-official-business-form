'use strict';

// Submitting a form remembers its employees in the Employee directory, in the same
// transaction as the forms.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { VALID_SUBMISSION, withFormsRestored, countRows, submit } = require('./form-helpers');
const { listDirectory, addEntry } = require('./directory-helpers');

const OK = 200;
const SERVER_ERROR = 500;
const LONG_AGO = '2025-01-15';
const EXISTING = { firstname: 'Ana', middle_name: '', last_name: 'Reyes', position: 'Clerk', assigned_unit: 'IMSD' };
const FAILING_NAME = 'CHECK FAIL';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function submission(employees) {
  return { ...VALID_SUBMISSION, employees };
}

async function addLongUnusedEntry(baseUrl, db) {
  const id = await addEntry(baseUrl, await loginCookie(baseUrl, TEST_ADMIN_PASSWORD), EXISTING);
  await db.run('UPDATE employees_directory SET last_used_at = ? WHERE id = ?', [LONG_AGO, id]);
  return id;
}

module.exports = [
  {
    name: 'a new name on a submission joins the directory with its position and the Division as unit',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const response = await submit(baseUrl, submission([{ name: '  Zed   Newperson ', position: 'Analyst' }]));
        assert.equal(response.status, OK);
        const [entry, ...others] = await listDirectory(baseUrl, 'Newperson');
        assert.equal(others.length, 0);
        assert.equal(entry.full_name, 'Zed Newperson');
        assert.equal(entry.position, 'Analyst');
        assert.equal(entry.assigned_unit, VALID_SUBMISSION.division);
        assert.equal(entry.last_used_at, today());
        for (const field of ['employee_id', 'firstname', 'middle_name', 'last_name']) assert.equal(entry[field], null);
      });
    },
  },
  {
    name: 'a name in other capitals and spacing reuses its entry, refreshes it and keeps its position',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const id = await addLongUnusedEntry(baseUrl, db);
        const response = await submit(baseUrl, submission([{ name: 'ANA  REYES', position: 'Acting Head' }]));
        assert.equal(response.status, OK);
        const matches = await listDirectory(baseUrl, 'Reyes');
        assert.deepEqual(matches.map((entry) => entry.id), [id]);
        assert.equal(matches[0].position, EXISTING.position);
        assert.equal(matches[0].last_used_at, today());
        const stored = await db.get('SELECT name, position FROM employees', []);
        assert.deepEqual(stored, { name: 'ANA  REYES', position: 'Acting Head' });
      });
    },
  },
  {
    name: 'the same new name twice in one submission is remembered once',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const twice = [{ name: 'Lee Ong', position: 'Aide' }, { name: 'lee  ONG', position: 'Aide' }];
        assert.equal((await submit(baseUrl, submission(twice))).status, OK);
        assert.equal((await listDirectory(baseUrl, 'Ong')).length, 1);
      });
    },
  },
  {
    name: 'a failure while remembering employees stores no forms and no directory changes',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const id = await addLongUnusedEntry(baseUrl, db);
        await db.query(
          `CREATE TRIGGER fail_remember BEFORE INSERT ON employees_directory WHEN NEW.full_name = '${FAILING_NAME}'
           BEGIN SELECT RAISE(ABORT, 'forced failure'); END`,
          []
        );
        try {
          const employees = [
            { name: 'ana reyes', position: 'Clerk' },
            { name: 'Mia Brandnew', position: 'Aide' },
            { name: FAILING_NAME, position: 'Aide' },
          ];
          assert.equal((await submit(baseUrl, submission(employees))).status, SERVER_ERROR);
        } finally {
          await db.query('DROP TRIGGER fail_remember', []);
        }
        assert.equal(await countRows(db, 'official_business'), 0);
        assert.equal(await countRows(db, 'employees'), 0);
        assert.equal((await listDirectory(baseUrl, 'Brandnew')).length, 0);
        const [kept] = await listDirectory(baseUrl, 'Reyes');
        assert.deepEqual([kept.id, kept.last_used_at], [id, LONG_AGO]);
      });
    },
  },
];
