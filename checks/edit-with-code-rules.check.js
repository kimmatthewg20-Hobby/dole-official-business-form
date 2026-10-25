'use strict';

// An edit with a Reference code follows the submit rules: the same validation, the Approver
// list, the Employee directory memory and all-or-nothing writes; only its Division is locked.
// Each check uses its own documentation address (198.51.100.0/24).

const assert = require('node:assert/strict');
const { VALID_SUBMISSION } = require('./form-helpers');
const { listDirectory } = require('./directory-helpers');
const { captureConsole } = require('./admin-http');
const { OK, editWithCodeFrom } = require('./lockout-helpers');
const { EDIT, storedForm, wrongCodesCounted, expectUnchanged, withSubmittedForm } = require('./edit-with-code-helpers');

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;
const FAILING_NAME = 'Edit Boom';

module.exports = [
  {
    name: 'a save that changes the Division is refused and the form keeps its Division and code',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        await db.run('INSERT INTO divisions (name, code) VALUES (?, ?)', ['Other Division', 'OTD']);
        const response = await editWithCodeFrom(baseUrl, '198.51.100.44', {
          ...EDIT,
          code: referenceCode,
          division: 'Other Division',
        });
        assert.equal(response.status, BAD_REQUEST);
        assert.match((await response.json()).error, /Division/);
        await expectUnchanged(db, id, referenceCode);
        assert.equal((await storedForm(db, id)).form.division, VALID_SUBMISSION.division);
      });
    },
  },
  {
    name: 'an edit is validated like a submission and its Approver must be on the list',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        const address = '198.51.100.45';
        const invalid = {
          noEmployees: { employees: [] },
          badDate: { datesOfOB: ['2026-02-30'] },
          noPurpose: { purpose: ' ' },
          badTime: { departureTime: 'soon' },
          unlistedApprover: { approvedBy: 'Someone Else' },
          mismatchedPosition: { approvedByPosition: 'Janitor' },
        };
        for (const [label, change] of Object.entries(invalid)) {
          const response = await editWithCodeFrom(baseUrl, address, { ...EDIT, ...change, code: referenceCode });
          assert.equal(response.status, BAD_REQUEST, label);
          assert.equal(typeof (await response.json()).error, 'string', label);
        }
        assert.equal(await wrongCodesCounted(db, address), 0, 'a right code is never counted');
        await expectUnchanged(db, id, referenceCode);
      });
    },
  },
  {
    name: 'a new employee named on an edit joins the directory under the stored Division',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ referenceCode }) => {
        const employees = [{ name: '  Edna   Editnew ', position: 'Planner' }];
        const response = await editWithCodeFrom(baseUrl, '198.51.100.46', { ...EDIT, employees, code: referenceCode });
        assert.equal(response.status, OK);
        const [entry, ...others] = await listDirectory(baseUrl, 'Editnew');
        assert.equal(others.length, 0);
        assert.equal(entry.full_name, 'Edna Editnew');
        assert.equal(entry.position, 'Planner');
        assert.equal(entry.assigned_unit, VALID_SUBMISSION.division);
        assert.equal(entry.last_used_at, new Date().toISOString().slice(0, 10));
      });
    },
  },
  {
    name: 'an edit that fails part-way leaves the form, its employees and the directory unchanged',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        await db.run(
          `CREATE TRIGGER fail_code_edit BEFORE INSERT ON employees WHEN NEW.name = '${FAILING_NAME}'
           BEGIN SELECT RAISE(ABORT, 'forced failure'); END`,
          []
        );
        try {
          const employees = [{ name: 'Fresh Rollback', position: 'Aide' }, { name: FAILING_NAME }];
          let answer = '';
          const logged = await captureConsole(async () => {
            const response = await editWithCodeFrom(baseUrl, '198.51.100.47', { ...EDIT, employees, code: referenceCode });
            assert.equal(response.status, SERVER_ERROR);
            answer = await response.text();
          });
          assert.ok(!answer.includes(referenceCode), 'the answer does not carry the code');
          assert.ok(!logged.includes(referenceCode), 'the log does not carry the code');
        } finally {
          await db.run('DROP TRIGGER fail_code_edit', []);
        }
        await expectUnchanged(db, id, referenceCode);
        assert.deepEqual(await listDirectory(baseUrl, 'Fresh Rollback'), []);
      });
    },
  },
];
