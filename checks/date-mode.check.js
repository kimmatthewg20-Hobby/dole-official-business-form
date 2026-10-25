'use strict';

// One submission stores one form with every employee and every date, whichever Date mode is
// chosen; the mode is stored with it and only changes how the form prints (GLOSSARY.md).

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');
const { insertSubmission, expandSubmission, insertForm } = require('../routes/form-creation');

const BAD_REQUEST = 400;
const OK = 200;
const MAX_PRINTED = 60;
const UNSORTED_DATES = ['2026-03-05', '2026-03-02', '2026-03-03'];
const SORTED_DATES = ['2026-03-02', '2026-03-03', '2026-03-05'];
const SEPARATE = { ...VALID_SUBMISSION, dateMode: DateMode.MULTIPLE_SEPARATE_DAYS, datesOfOB: UNSORTED_DATES };
const ALL_DATES = { ...SEPARATE, dateMode: DateMode.MORE_THAN_ONE_DAY };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function manyDates(count) {
  const start = Date.UTC(2026, 3, 1);
  return Array.from({ length: count }, (_, index) => new Date(start + index * MS_PER_DAY).toISOString().slice(0, 10));
}

function manyEmployees(count) {
  return Array.from({ length: count }, (_, index) => ({ name: `Person ${index}`, position: 'Clerk' }));
}

async function assertNothingStored(db) {
  assert.equal(await countRows(db, 'official_business'), 0);
  assert.equal(await countRows(db, 'employees'), 0);
}

async function expectOneStoredForm(baseUrl, db, body) {
  const response = await submit(baseUrl, body);
  assert.equal(response.status, OK);
  const { success, id, forms } = await response.json();
  assert.equal(success, true);
  assert.equal(forms.length, 1);
  assert.equal(forms[0].id, id);
  assert.deepEqual(forms[0].datesOfOB, SORTED_DATES);
  assert.match(forms[0].referenceCode, /^DOLETSSD\d{4}[A-HJKMNP-Z2-9]{4}$/);
  const rows = await db.all('SELECT id, dates_of_ob, date_of_ob, date_mode, reference_code FROM official_business', []);
  assert.deepEqual(rows, [{
    id, dates_of_ob: JSON.stringify(SORTED_DATES), date_of_ob: SORTED_DATES[0],
    date_mode: body.dateMode, reference_code: forms[0].referenceCode,
  }]);
  const employees = await db.all('SELECT ob_id, name, position FROM employees ORDER BY id', []);
  assert.deepEqual(employees, VALID_SUBMISSION.employees.map((employee) => ({ ob_id: id, ...employee })));
}

module.exports = [
  {
    name: 'date-mode: Separated Dates stores one form with all employees, all dates, the mode and one code',
    run: ({ baseUrl, db }) => withFormsRestored(db, () => expectOneStoredForm(baseUrl, db, SEPARATE)),
  },
  {
    name: 'date-mode: All Dates stores one form with all employees, all dates, the mode and one code',
    run: ({ baseUrl, db }) => withFormsRestored(db, () => expectOneStoredForm(baseUrl, db, ALL_DATES)),
  },
  {
    name: 'date-mode: the default and first mode is More Than One Day',
    async run() {
      assert.equal(DateMode.DEFAULT_DATE_MODE, DateMode.MORE_THAN_ONE_DAY);
      assert.equal(DateMode.DATE_MODES[0], DateMode.DEFAULT_DATE_MODE);
    },
  },
  {
    name: 'date-mode: printed forms are one per employee for All Dates and one per employee per date for Separated Dates',
    async run() {
      assert.equal(DateMode.countForms(DateMode.MORE_THAN_ONE_DAY, 3, 3), 3);
      assert.equal(DateMode.countForms(DateMode.MULTIPLE_SEPARATE_DAYS, 3, 3), 9);
      assert.equal(DateMode.formLimitMessage(61),
        'This would print 61 forms, but one submission can print at most 60. Remove some dates or employees.');
    },
  },
  {
    name: 'date-mode: a missing or unknown mode is refused and stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        for (const dateMode of [undefined, 'sometimes', 5]) {
          const response = await submit(baseUrl, { ...SEPARATE, dateMode });
          assert.equal(response.status, BAD_REQUEST);
        }
        await assertNothingStored(db);
      });
    },
  },
  {
    name: 'date-mode: existing validation still applies in both modes',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        for (const dateMode of DateMode.DATE_MODES) {
          for (const bad of [{ employees: [] }, { datesOfOB: [] }, { purpose: '' }, { locationTo: '' }, { division: 'Nope' }]) {
            const response = await submit(baseUrl, { ...SEPARATE, dateMode, ...bad });
            assert.equal(response.status, BAD_REQUEST, `${dateMode} ${JSON.stringify(bad)}`);
          }
        }
        await assertNothingStored(db);
      });
    },
  },
  {
    name: 'date-mode: Separated Dates refuses more than 60 printed forms (dates x employees) and stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const twoEmployees = VALID_SUBMISSION.employees.slice(0, 2);
        const refused = await submit(baseUrl, { ...SEPARATE, employees: twoEmployees, datesOfOB: manyDates(31) });
        assert.equal(refused.status, BAD_REQUEST);
        assert.equal((await refused.json()).error, DateMode.formLimitMessage(MAX_PRINTED + 2));
        await assertNothingStored(db);

        const accepted = await submit(baseUrl, { ...SEPARATE, employees: twoEmployees, datesOfOB: manyDates(30) });
        assert.equal(accepted.status, OK);
        assert.equal((await accepted.json()).forms.length, 1);
        assert.equal(await countRows(db, 'official_business'), 1);
      });
    },
  },
  {
    name: 'date-mode: All Dates counts one printed form per employee: 60 accepted, 61 refused',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const refused = await submit(baseUrl, { ...ALL_DATES, employees: manyEmployees(MAX_PRINTED + 1) });
        assert.equal(refused.status, BAD_REQUEST);
        assert.equal((await refused.json()).error, DateMode.formLimitMessage(MAX_PRINTED + 1));
        await assertNothingStored(db);

        const manyDatesOneForm = await submit(baseUrl, { ...ALL_DATES, datesOfOB: manyDates(31) });
        assert.equal(manyDatesOneForm.status, OK, 'in All Dates mode dates do not multiply the printed forms');
        const accepted = await submit(baseUrl, { ...ALL_DATES, employees: manyEmployees(MAX_PRINTED) });
        assert.equal(accepted.status, OK);
        assert.equal((await accepted.json()).forms.length, 1);
        assert.equal(await countRows(db, 'official_business'), 2);
      });
    },
  },
  {
    name: 'date-mode: a failure after the form is written stores nothing at all',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const record = expandSubmission(SEPARATE);
        assert.deepEqual(record, { employees: VALID_SUBMISSION.employees, datesOfOB: SORTED_DATES });
        const failingInsert = async (client, body, record, now) => {
          await insertForm(client, body, record, now);
          throw new Error('forced failure');
        };
        await assert.rejects(insertSubmission(SEPARATE, record, new Date().toISOString(), { insertOne: failingInsert }), /forced failure/);
        await assertNothingStored(db);
      });
    },
  },
];
