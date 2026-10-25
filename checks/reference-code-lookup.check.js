'use strict';

// Pasting a Reference code on the tracker finds that one form (ADR 0003). Each check uses its
// own documentation address (198.51.100.0/24), so the wrong codes typed here lock out nobody else.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, insertForm, submit } = require('./form-helpers');
const { captureConsole } = require('./admin-http');
const { OK, NOT_FOUND, lookUpCodeFrom, onVercel } = require('./lockout-helpers');

const BAD_REQUEST = 400;
const CODE_FIELD_NAMES = ['reference_code', 'referenceCode'];

async function submittedForm(baseUrl) {
  const { forms } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
  assert.equal(forms.length, 1);
  return forms[0];
}

// How a staff member might paste it: lower case, spaces around and inside.
function pastedCarelessly(code) {
  return `  ${code.slice(0, 4).toLowerCase()} ${code.slice(4, 8)}\t${code.slice(8).toLowerCase()} `;
}

// Same length and shape as a real code, but its random part is one no form was given.
function unissuedCode(code) {
  return code.slice(0, -4) + (code.endsWith('AAAA') ? 'BBBB' : 'AAAA');
}

async function answerOf(response) {
  return { status: response.status, body: await response.text() };
}

module.exports = [
  {
    name: 'a valid code in any capitalisation with stray spaces shows that form, without its code',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await submittedForm(baseUrl);
        const form = await submittedForm(baseUrl);
        await onVercel(async () => {
          const response = await lookUpCodeFrom(baseUrl, '198.51.100.1', pastedCarelessly(form.referenceCode));
          assert.equal(response.status, OK);
          const text = await response.text();
          assert.ok(!text.includes(form.referenceCode), 'the answer does not echo the code');
          for (const field of CODE_FIELD_NAMES) assert.ok(!text.includes(field), `the answer names ${field}`);
          const { formData, employees } = JSON.parse(text);
          assert.equal(formData.id, form.id);
          assert.equal(formData.purpose, VALID_SUBMISSION.purpose);
          assert.equal(formData.location_to, VALID_SUBMISSION.locationTo);
          assert.deepEqual(formData.datesOfOB, VALID_SUBMISSION.datesOfOB);
          assert.deepEqual(
            employees.map((employee) => employee.name).sort(),
            VALID_SUBMISSION.employees.map((employee) => employee.name).sort()
          );
        });
      });
    },
  },
  {
    name: 'a wrong code and an unknown code give identical answers',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const form = await submittedForm(baseUrl);
        await insertForm(db, {});
        await onVercel(async () => {
          const address = '198.51.100.2';
          const wrong = await answerOf(await lookUpCodeFrom(baseUrl, address, unissuedCode(form.referenceCode)));
          const unknown = await answerOf(await lookUpCodeFrom(baseUrl, address, 'not a code at all'));
          assert.equal(wrong.status, NOT_FOUND);
          assert.deepEqual(unknown, wrong);
          assert.match(wrong.body, /form not found/i);
        });
      });
    },
  },
  {
    name: 'an empty or missing code is refused as a bad request and not counted as a wrong code',
    async run({ baseUrl, db }) {
      await onVercel(async () => {
        const address = '198.51.100.3';
        for (const code of ['', '   ', undefined, 42]) {
          assert.equal((await lookUpCodeFrom(baseUrl, address, code)).status, BAD_REQUEST);
        }
      });
      const counted = await db.get('SELECT COUNT(*) AS total FROM failed_logins WHERE source_address = ?', [
        '198.51.100.3',
      ]);
      assert.equal(counted.total, 0);
    },
  },
  {
    name: 'a wrong code is neither stored nor logged, only the address and the time',
    async run({ baseUrl, db }) {
      const typed = 'DOLETSSD0326QQQQ';
      const logged = await captureConsole(() =>
        onVercel(() => lookUpCodeFrom(baseUrl, '198.51.100.4', typed))
      );
      assert.ok(!logged.toUpperCase().includes(typed), 'the typed code is not logged');
      const rows = await db.all('SELECT * FROM failed_logins WHERE source_address = ?', ['198.51.100.4']);
      assert.equal(rows.length, 1);
      assert.ok(!JSON.stringify(rows).toUpperCase().includes(typed), 'the typed code is not stored');
    },
  },
];
