'use strict';

// Staff edit a form by presenting its whole Reference code on every save (ADR 0003). Each check
// uses its own documentation address (198.51.100.0/24), so the wrong codes sent here lock out
// nobody else.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION } = require('./form-helpers');
const { OK, NOT_FOUND, WRONG_CODES_ALLOWED, editWithCodeFrom, lookUpCodeFrom, expectLockedOut } = require('./lockout-helpers');
const {
  EDIT,
  storedForm,
  unissuedCode,
  wrongCodesCounted,
  expectUnchanged,
  withSubmittedForm,
} = require('./edit-with-code-helpers');

module.exports = [
  {
    name: 'a save with the right code updates the form and keeps its code and Division',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        const response = await editWithCodeFrom(baseUrl, '198.51.100.40', {
          ...EDIT,
          code: referenceCode.toLowerCase(),
          division: VALID_SUBMISSION.division,
        });
        assert.equal(response.status, OK);
        const text = await response.text();
        assert.ok(!text.includes(referenceCode), 'the answer does not echo the code');
        const { form, employees } = await storedForm(db, id);
        assert.equal(form.purpose, EDIT.purpose);
        assert.equal(form.location_from, EDIT.locationFrom);
        assert.equal(form.location_to, EDIT.locationTo);
        assert.equal(form.departure_time, EDIT.departureTime);
        assert.equal(form.return_time, EDIT.returnTime);
        assert.equal(form.date_of_ob, '2026-04-10');
        assert.deepEqual(JSON.parse(form.dates_of_ob), ['2026-04-10', '2026-04-14']);
        assert.deepEqual(employees, EDIT.employees);
        assert.equal(form.reference_code, referenceCode);
        assert.equal(form.division, VALID_SUBMISSION.division);
        assert.equal(form.office, VALID_SUBMISSION.office);
      });
    },
  },
  {
    name: 'a wrong, unknown, missing or empty code is refused alike, counted, and changes nothing',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        const address = '198.51.100.41';
        const codes = [unissuedCode(referenceCode), 'not a code at all', undefined, '', '   ', 42];
        const answers = [];
        for (const code of codes) {
          const response = await editWithCodeFrom(baseUrl, address, { ...EDIT, code });
          answers.push({ status: response.status, body: await response.text() });
        }
        assert.equal(answers[0].status, NOT_FOUND);
        assert.match(answers[0].body, /form not found/i);
        for (const answer of answers) assert.deepEqual(answer, answers[0]);
        const invalidAndWrong = await editWithCodeFrom(baseUrl, address, { code: unissuedCode(referenceCode) });
        assert.equal(invalidAndWrong.status, NOT_FOUND, 'a wrong code is refused before the fields are judged');
        assert.equal(await wrongCodesCounted(db, address), codes.length + 1);
        await expectUnchanged(db, id, referenceCode);
      });
    },
  },
  {
    name: 'ten wrong codes on edits refuse the next edit and lookup even with the right code',
    async run({ baseUrl, db }) {
      await withSubmittedForm(baseUrl, db, async ({ id, referenceCode }) => {
        const address = '198.51.100.42';
        for (let attempt = 0; attempt < WRONG_CODES_ALLOWED; attempt += 1) {
          const code = attempt % 2 === 0 ? `DOLEWRONG${attempt}` : undefined;
          assert.equal((await editWithCodeFrom(baseUrl, address, { ...EDIT, code })).status, NOT_FOUND);
        }
        await expectLockedOut(await editWithCodeFrom(baseUrl, address, { ...EDIT, code: referenceCode }));
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, referenceCode));
        await expectUnchanged(db, id, referenceCode);
        const elsewhere = await editWithCodeFrom(baseUrl, '198.51.100.43', { ...EDIT, code: referenceCode });
        assert.equal(elsewhere.status, OK);
      });
    },
  },
];
