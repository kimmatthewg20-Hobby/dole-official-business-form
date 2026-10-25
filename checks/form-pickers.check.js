'use strict';

// A new form may only name a Division and an Approver from the lists the admin keeps.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, submit } = require('./form-helpers');

const { sendJson, loginCookie } = require('./admin-http');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');

const BAD_REQUEST = 400;
const OK = 200;
const EDIT_FORM_DATA = {
  office: 'DOLE',
  datesOfOB: ['2026-04-10'],
  location_from: 'Here',
  location_to: 'There',
  purpose: 'Edited purpose',
};
const UNLISTED_DIVISION = { ...VALID_SUBMISSION, division: 'Made Up Division' };
const UNLISTED_APPROVER = { ...VALID_SUBMISSION, approvedBy: 'Nobody Listed' };
const MISMATCHED_POSITION = { ...VALID_SUBMISSION, approvedByPosition: 'Some Other Position' };
const NO_DIVISION = { ...VALID_SUBMISSION, division: '' };
const NO_APPROVER = { ...VALID_SUBMISSION, approvedBy: '', approvedByPosition: '' };

async function assertRefused(baseUrl, body, message) {
  const response = await submit(baseUrl, body);
  assert.equal(response.status, BAD_REQUEST, message);
  assert.equal((await response.json()).error, message);
}

module.exports = [
  {
    name: 'a form naming a listed Division and Approver is accepted',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        assert.equal((await submit(baseUrl, VALID_SUBMISSION)).status, OK);
      });
    },
  },
  {
    name: 'a form naming a Division that is not in the list is refused and not stored',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const message = 'Please choose a Division from the list';
        await assertRefused(baseUrl, UNLISTED_DIVISION, message);
        await assertRefused(baseUrl, NO_DIVISION, message);
        assert.equal(await countRows(db, 'official_business'), 0);
      });
    },
  },
  {
    name: 'a form naming an Approver whose name and position are not listed together is refused',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const message = 'Please choose an Approved by from the list';
        await assertRefused(baseUrl, UNLISTED_APPROVER, message);
        await assertRefused(baseUrl, MISMATCHED_POSITION, message);
        await assertRefused(baseUrl, NO_APPROVER, message);
        assert.equal(await countRows(db, 'official_business'), 0);
      });
    },
  },
  {
    name: 'the admin editing a stored form still may name a Division and Approver that are no longer listed',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
        const edit = {
          formData: { ...EDIT_FORM_DATA, division: 'Old Division', approved_by: 'Old Head', approved_by_position: 'Old' },
          employees: [{ name: 'Dan Lim', position: 'Aide' }],
        };
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await sendJson(baseUrl, 'PUT', `/api/update/${id}`, edit, cookie);
        assert.equal(response.status, OK);
      });
    },
  },
];
