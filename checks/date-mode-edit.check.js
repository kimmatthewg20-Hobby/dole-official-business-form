'use strict';

// Editing a stored form changes its content, never its Date mode: the mode was chosen when it
// was submitted and still decides how it prints.

const assert = require('node:assert/strict');
const { loginCookie } = require('./admin-http');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const { OK, editWithCodeFrom, onVercel } = require('./lockout-helpers');
const { EDIT } = require('./edit-with-code-helpers');
const DateMode = require('../public/js/date-mode');

const ADMIN_EDIT = {
  formData: { division: VALID_SUBMISSION.division, datesOfOB: ['2026-04-10'], location_to: 'There', purpose: 'Edited by the admin' },
  employees: [{ name: 'Dan Lim', position: 'Aide' }],
};

async function submitSeparated(baseUrl) {
  const body = { ...VALID_SUBMISSION, dateMode: DateMode.MULTIPLE_SEPARATE_DAYS };
  const { forms } = await (await submit(baseUrl, body)).json();
  return forms[0];
}

async function storedDateMode(db, id) {
  return (await db.get('SELECT date_mode FROM official_business WHERE id = ?', [id])).date_mode;
}

module.exports = [
  {
    name: 'the admin edit keeps the stored Date mode',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await submitSeparated(baseUrl);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await fetch(`${baseUrl}/api/update/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify(ADMIN_EDIT),
        });
        assert.equal(response.status, OK);
        assert.equal((await db.get('SELECT purpose FROM official_business WHERE id = ?', [id])).purpose, 'Edited by the admin');
        assert.equal(await storedDateMode(db, id), DateMode.MULTIPLE_SEPARATE_DAYS);
      });
    },
  },
  {
    name: 'the edit with a Reference code keeps the stored Date mode',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id, referenceCode } = await submitSeparated(baseUrl);
        await onVercel(async () => {
          const body = { ...EDIT, code: referenceCode, division: VALID_SUBMISSION.division };
          assert.equal((await editWithCodeFrom(baseUrl, '198.51.100.60', body)).status, OK);
        });
        assert.equal((await db.get('SELECT purpose FROM official_business WHERE id = ?', [id])).purpose, EDIT.purpose);
        assert.equal(await storedDateMode(db, id), DateMode.MULTIPLE_SEPARATE_DAYS);
      });
    },
  },
];
