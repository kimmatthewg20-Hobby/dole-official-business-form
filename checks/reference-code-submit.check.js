'use strict';

// Submitting gives every created form its own Reference code (ADR 0003), stored with it.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, insertForm, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');
const { insertForms, expandSubmission } = require('../routes/form-creation');
const { CODE_UNAVAILABLE_MESSAGE } = require('../routes/reference-code');

const OK = 200;
const DIVISION_CODE = 'TSSD';
const SEPARATE = {
  ...VALID_SUBMISSION,
  dateMode: DateMode.MULTIPLE_SEPARATE_DAYS,
  datesOfOB: ['2026-03-02', '2026-03-03', '2026-03-05'],
  employees: VALID_SUBMISSION.employees.slice(0, 2),
};

// The month and year in Manila, worked out by Intl rather than by the code under check.
function manilaMonthYear(date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: '2-digit', year: '2-digit' })
    .formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return part('month') + part('year');
}

function codePattern(divisionCode, monthYear) {
  return new RegExp(`^DOLE${divisionCode}${monthYear}[A-HJKMNP-Z2-9]{4}$`);
}

module.exports = [
  {
    name: 'Multiple Separate Days gives every form its own stored code in the stated format',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const before = manilaMonthYear(new Date());
        const response = await submit(baseUrl, SEPARATE);
        assert.equal(response.status, OK);
        const { forms } = await response.json();
        const after = manilaMonthYear(new Date());
        assert.equal(forms.length, 6);
        for (const form of forms) {
          assert.ok([before, after].some((monthYear) => codePattern(DIVISION_CODE, monthYear).test(form.referenceCode)),
            form.referenceCode);
          const stored = await db.get('SELECT reference_code FROM official_business WHERE id = ?', [form.id]);
          assert.equal(stored.reference_code, form.referenceCode);
        }
        assert.equal(new Set(forms.map((form) => form.referenceCode)).size, 6);
      });
    },
  },
  {
    name: 'More Than One Day gives its one form one code, next to forms from before that have none',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await insertForm(db, {});
        await insertForm(db, {});
        const body = { ...SEPARATE, dateMode: DateMode.MORE_THAN_ONE_DAY };
        const { forms } = await (await submit(baseUrl, body)).json();
        assert.equal(forms.length, 1);
        assert.match(forms[0].referenceCode, /^DOLETSSD\d{4}[A-HJKMNP-Z2-9]{4}$/);
        const withoutCode = await db.get('SELECT COUNT(*) AS total FROM official_business WHERE reference_code IS NULL', []);
        assert.equal(withoutCode.total, 2);
      });
    },
  },
  {
    name: 'the code month comes from the submit clock in Philippine time',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const records = expandSubmission(SEPARATE);
        const created = await insertForms(SEPARATE, records, '2026-10-31T16:00:00.000Z');
        assert.ok(created.every((form) => codePattern(DIVISION_CODE, '1126').test(form.referenceCode)));
      });
    },
  },
  {
    name: 'when no free code is found the whole submission is rolled back with a clear error',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const records = expandSubmission(SEPARATE);
        const alwaysFirst = () => 0;
        await assert.rejects(
          insertForms(SEPARATE, records, new Date().toISOString(), { randomIndex: alwaysFirst }),
          { message: CODE_UNAVAILABLE_MESSAGE }
        );
        assert.equal(await countRows(db, 'official_business'), 0);
        assert.equal(await countRows(db, 'employees'), 0);
      });
    },
  },
];
