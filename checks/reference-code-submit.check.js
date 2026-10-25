'use strict';

// One submission stores one form with one Reference code (ADR 0003), whichever Date mode is chosen.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, insertForm, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');
const { insertSubmission, expandSubmission } = require('../routes/form-creation');
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
    name: 'each Date mode gives its one stored form one code in the stated format',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const codes = [];
        for (const dateMode of DateMode.DATE_MODES) {
          const before = manilaMonthYear(new Date());
          const response = await submit(baseUrl, { ...SEPARATE, dateMode });
          assert.equal(response.status, OK);
          const { forms } = await response.json();
          const after = manilaMonthYear(new Date());
          assert.equal(forms.length, 1);
          const [form] = forms;
          assert.ok([before, after].some((monthYear) => codePattern(DIVISION_CODE, monthYear).test(form.referenceCode)),
            form.referenceCode);
          const stored = await db.get('SELECT reference_code FROM official_business WHERE id = ?', [form.id]);
          assert.equal(stored.reference_code, form.referenceCode);
          codes.push(form.referenceCode);
        }
        assert.equal(await countRows(db, 'official_business'), DateMode.DATE_MODES.length);
        assert.equal(new Set(codes).size, codes.length);
      });
    },
  },
  {
    name: 'a new form gets its code next to forms from before that have none',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await insertForm(db, {});
        await insertForm(db, {});
        const { forms } = await (await submit(baseUrl, { ...SEPARATE, dateMode: DateMode.MORE_THAN_ONE_DAY })).json();
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
        const created = await insertSubmission(SEPARATE, expandSubmission(SEPARATE), '2026-10-31T16:00:00.000Z');
        assert.match(created.referenceCode, codePattern(DIVISION_CODE, '1126'));
      });
    },
  },
  {
    name: 'when no free code is found the whole submission is rolled back with a clear error',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const alwaysFirst = () => 0;
        await insertSubmission(SEPARATE, expandSubmission(SEPARATE), new Date().toISOString(), { randomIndex: alwaysFirst });
        await db.run('DELETE FROM employees', []);
        await assert.rejects(
          insertSubmission(SEPARATE, expandSubmission(SEPARATE), new Date().toISOString(), { randomIndex: alwaysFirst }),
          { message: CODE_UNAVAILABLE_MESSAGE }
        );
        assert.equal(await countRows(db, 'official_business'), 1);
        assert.equal(await countRows(db, 'employees'), 0);
      });
    },
  },
];
