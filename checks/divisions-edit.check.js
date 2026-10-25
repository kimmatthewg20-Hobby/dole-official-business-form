'use strict';

// The admin edits and removes Divisions (GLOSSARY.md); stored forms never change with them.

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
  CODE_MESSAGE,
  withNoDivisions,
  expectRejected,
  listDivisions,
  addDivision,
  addedId,
  editDivision,
  removeDivision,
  storedForm,
} = require('./division-helpers');

const UNKNOWN_ID = 999999;
const NOT_FOUND_MESSAGE = 'Division not found';
const FORGED_SESSION = 'adminSession=forged.token.value.here';

module.exports = [
  {
    name: 'an admin edits a Division name and code, and may save it unchanged',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedId(baseUrl, { name: 'Technical Support', code: 'TSS' }, cookie);
        assert.equal(
          (await editDivision(baseUrl, id, { name: 'Technical Support', code: 'TSS' }, cookie))
            .status,
          OK,
        );
        assert.equal(
          (await editDivision(baseUrl, id, { name: 'Tech Support Services', code: 'tsd' }, cookie))
            .status,
          OK,
        );
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Tech Support Services', code: 'TSD' },
        ]);
      });
    },
  },
  {
    name: 'an edit that clashes with another Division, has a bad code or names no Division is rejected',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addedId(baseUrl, { name: 'Internal Management', code: 'IMSD' }, cookie);
        const id = await addedId(baseUrl, { name: 'Technical Support', code: 'TSS' }, cookie);
        await expectRejected(
          await editDivision(baseUrl, id, { name: 'INTERNAL management', code: 'TSS' }, cookie),
          CONFLICT,
          'A Division named Internal Management already exists',
        );
        await expectRejected(
          await editDivision(baseUrl, id, { name: 'Technical Support', code: 'imsd' }, cookie),
          CONFLICT,
          'The code IMSD is already used by Internal Management',
        );
        await expectRejected(
          await editDivision(baseUrl, id, { name: 'Technical Support', code: 'T1' }, cookie),
          BAD_REQUEST,
          CODE_MESSAGE,
        );
        for (const unknown of [UNKNOWN_ID, 'abc']) {
          await expectRejected(
            await editDivision(baseUrl, unknown, { name: 'Anything', code: 'ANY' }, cookie),
            NOT_FOUND,
            NOT_FOUND_MESSAGE,
          );
        }
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Internal Management', code: 'IMSD' },
          { name: 'Technical Support', code: 'TSS' },
        ]);
      });
    },
  },
  {
    name: 'an admin removes a Division, and removing one that does not exist says so',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedId(baseUrl, { name: 'Technical Support', code: 'TSS' }, cookie);
        assert.equal((await removeDivision(baseUrl, id, cookie)).status, OK);
        assert.deepEqual(await listDivisions(baseUrl), []);
        await expectRejected(
          await removeDivision(baseUrl, id, cookie),
          NOT_FOUND,
          NOT_FOUND_MESSAGE,
        );
      });
    },
  },
  {
    name: 'renaming, recoding or removing a Division leaves stored forms unchanged',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, () =>
        withFormsRestored(db, async () => {
          const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
          const id = await addedId(
            baseUrl,
            { name: VALID_SUBMISSION.division, code: 'TSS' },
            cookie,
          );
          const submitted = await submit(baseUrl, VALID_SUBMISSION);
          assert.equal(submitted.status, OK);
          const formId = (await submitted.json()).id;
          const before = await storedForm(baseUrl, formId);
          assert.equal(before.formData.division, VALID_SUBMISSION.division);

          assert.equal(
            (await editDivision(baseUrl, id, { name: 'Renamed', code: 'REN' }, cookie)).status,
            OK,
          );
          assert.deepEqual(await storedForm(baseUrl, formId), before);
          assert.equal((await removeDivision(baseUrl, id, cookie)).status, OK);
          assert.deepEqual(await storedForm(baseUrl, formId), before);
        }),
      );
    },
  },
  {
    name: 'adding, editing and removing a Division are each denied without an admin session',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addedId(baseUrl, { name: 'Technical Support', code: 'TSS' }, cookie);
        for (const noSession of [undefined, FORGED_SESSION]) {
          assert.equal(
            (await addDivision(baseUrl, { name: 'Other', code: 'OTH' }, noSession)).status,
            UNAUTHORIZED,
          );
          assert.equal(
            (await editDivision(baseUrl, id, { name: 'Other', code: 'OTH' }, noSession)).status,
            UNAUTHORIZED,
          );
          assert.equal((await removeDivision(baseUrl, id, noSession)).status, UNAUTHORIZED);
        }
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Technical Support', code: 'TSS' },
        ]);
      });
    },
  },
];
