'use strict';

// Helpers shared by the edit-with-code checks. Not a check file itself: the runner only loads
// files ending in .check.js.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const { onVercel } = require('./lockout-helpers');

const EDIT = {
  employees: [{ name: 'Dan Lim', position: 'Aide' }],
  datesOfOB: ['2026-04-14', '2026-04-10'],
  locationFrom: 'Field Office',
  locationTo: 'Provincial Capitol',
  departureTime: '09:15',
  returnTime: '16:45',
  purpose: 'Edited purpose',
  approvedBy: VALID_SUBMISSION.approvedBy,
  approvedByPosition: VALID_SUBMISSION.approvedByPosition,
};

async function storedForm(db, id) {
  const form = await db.get('SELECT * FROM official_business WHERE id = ?', [id]);
  const rows = await db.all('SELECT name, position FROM employees WHERE ob_id = ? ORDER BY id', [id]);
  return { form, employees: rows.map((row) => ({ name: row.name, position: row.position })) };
}

// Same length and shape as a real code, but its random part is one no form was given.
function unissuedCode(code) {
  return code.slice(0, -4) + (code.endsWith('AAAA') ? 'BBBB' : 'AAAA');
}

async function wrongCodesCounted(db, address) {
  const row = await db.get('SELECT COUNT(*) AS total FROM failed_logins WHERE source_address = ?', [address]);
  return row.total;
}

async function expectUnchanged(db, id, referenceCode) {
  const { form, employees } = await storedForm(db, id);
  assert.equal(form.purpose, VALID_SUBMISSION.purpose);
  assert.equal(form.reference_code, referenceCode);
  assert.deepEqual(employees, VALID_SUBMISSION.employees);
}

// Every check starts from one submitted form and edits it from its own address.
function withSubmittedForm(baseUrl, db, callback) {
  return withFormsRestored(db, async () => {
    const { forms } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
    await onVercel(() => callback(forms[0]));
  });
}

module.exports = { EDIT, storedForm, unissuedCode, wrongCodesCounted, expectUnchanged, withSubmittedForm };
