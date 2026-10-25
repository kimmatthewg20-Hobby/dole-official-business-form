'use strict';

// The admin edits and removes Approvers (GLOSSARY.md); stored forms never change with them.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const {
  OK,
  BAD_REQUEST,
  NOT_FOUND,
  UNAUTHORIZED,
  CONFLICT,
  expectRejected,
  storedForm,
} = require('./division-helpers');
const {
  withNoApprovers,
  listApprovers,
  addApprover,
  addedApproverId,
  editApprover,
  removeApprover,
} = require('./approver-helpers');

const UNKNOWN_ID = 999999;
const NOT_FOUND_MESSAGE = 'Approver not found';
const FORGED_SESSION = 'adminSession=forged.token.value.here';
const DIRECTOR = {
  name: 'Juan Dela Cruz',
  position: 'Assistant Regional Director',
};

module.exports = [
  {
    name: 'an admin edits an Approver name and position, and may save it unchanged',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedApproverId(baseUrl, DIRECTOR, cookie);
        assert.equal((await editApprover(baseUrl, id, DIRECTOR, cookie)).status, OK);
        const renamed = { name: 'Maria Santos', position: 'Regional Director' };
        assert.equal((await editApprover(baseUrl, id, renamed, cookie)).status, OK);
        assert.deepEqual(await listApprovers(baseUrl), [renamed]);
      });
    },
  },
  {
    name: 'an edit that repeats another Approver, is invalid or names no Approver is rejected',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addedApproverId(baseUrl, DIRECTOR, cookie);
        const other = { name: 'Maria Santos', position: 'Regional Director' };
        const id = await addedApproverId(baseUrl, other, cookie);
        await expectRejected(
          await editApprover(baseUrl, id, DIRECTOR, cookie),
          CONFLICT,
          'Juan Dela Cruz is already an Approver as Assistant Regional Director',
        );
        await expectRejected(
          await editApprover(baseUrl, id, { name: other.name, position: ' ' }, cookie),
          BAD_REQUEST,
          'Approver position is required',
        );
        for (const unknown of [UNKNOWN_ID, 'abc']) {
          await expectRejected(
            await editApprover(baseUrl, unknown, { name: 'Anyone', position: 'Chief' }, cookie),
            NOT_FOUND,
            NOT_FOUND_MESSAGE,
          );
        }
        assert.deepEqual(await listApprovers(baseUrl), [DIRECTOR, other]);
      });
    },
  },
  {
    name: 'an admin removes an Approver, and removing one that does not exist says so',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedApproverId(baseUrl, DIRECTOR, cookie);
        assert.equal((await removeApprover(baseUrl, id, cookie)).status, OK);
        assert.deepEqual(await listApprovers(baseUrl), []);
        for (const unknown of [id, 'abc']) {
          await expectRejected(
            await removeApprover(baseUrl, unknown, cookie),
            NOT_FOUND,
            NOT_FOUND_MESSAGE,
          );
        }
      });
    },
  },
  {
    name: 'editing or removing an Approver leaves stored forms unchanged',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, () =>
        withNoApprovers(db, async () => {
          const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
          const approver = {
            name: VALID_SUBMISSION.approvedBy,
            position: VALID_SUBMISSION.approvedByPosition,
          };
          const id = await addedApproverId(baseUrl, approver, cookie);
          const submitted = await submit(baseUrl, VALID_SUBMISSION);
          assert.equal(submitted.status, OK);
          const formId = (await submitted.json()).id;
          const before = await storedForm(baseUrl, formId);
          assert.equal(before.formData.approved_by, VALID_SUBMISSION.approvedBy);

          const renamed = {
            name: 'Renamed Person',
            position: 'Other Position',
          };
          assert.equal((await editApprover(baseUrl, id, renamed, cookie)).status, OK);
          assert.deepEqual(await storedForm(baseUrl, formId), before);
          assert.equal((await removeApprover(baseUrl, id, cookie)).status, OK);
          assert.deepEqual(await storedForm(baseUrl, formId), before);
        }),
      );
    },
  },
  {
    name: 'adding, editing and removing an Approver are each denied without an admin session',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedApproverId(baseUrl, DIRECTOR, cookie);
        const other = { name: 'Other Person', position: 'Chief' };
        for (const noSession of [undefined, FORGED_SESSION]) {
          assert.equal((await addApprover(baseUrl, other, noSession)).status, UNAUTHORIZED);
          assert.equal((await editApprover(baseUrl, id, other, noSession)).status, UNAUTHORIZED);
          assert.equal((await removeApprover(baseUrl, id, noSession)).status, UNAUTHORIZED);
        }
        assert.deepEqual(await listApprovers(baseUrl), [DIRECTOR]);
      });
    },
  },
];
