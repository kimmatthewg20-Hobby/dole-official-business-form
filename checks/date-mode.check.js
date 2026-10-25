'use strict';

// Date mode decides how many forms one submission creates; all are stored or none.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');
const { insertForms, expandSubmission, insertForm } = require('../routes/form-creation');

const BAD_REQUEST = 400;
const OK = 200;
const THREE_DATES = ['2026-03-02', '2026-03-03', '2026-03-05'];
const TWO_EMPLOYEES = VALID_SUBMISSION.employees.slice(0, 2);
const SEPARATE = { ...VALID_SUBMISSION, dateMode: DateMode.MULTIPLE_SEPARATE_DAYS, datesOfOB: THREE_DATES, employees: TWO_EMPLOYEES };
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FAIL_ON_FORM_NUMBER = 3;

function manyDates(count) {
  const start = Date.UTC(2026, 3, 1);
  return Array.from({ length: count }, (_, index) => new Date(start + index * MS_PER_DAY).toISOString().slice(0, 10));
}

async function assertNothingStored(db) {
  assert.equal(await countRows(db, 'official_business'), 0);
  assert.equal(await countRows(db, 'employees'), 0);
}

module.exports = [
  {
    name: 'date-mode: Multiple Separate Days makes one form per date per employee',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const response = await submit(baseUrl, SEPARATE);
        assert.equal(response.status, OK);
        const { success, id, forms } = await response.json();
        assert.equal(success, true);
        assert.equal(forms.length, 6);
        assert.equal(id, forms[0].id);
        assert.ok(forms.every((form) => form.datesOfOB.length === 1));
        assert.equal(new Set(forms.map((form) => form.id)).size, 6);
        assert.equal(await countRows(db, 'official_business'), 6);
        assert.equal(await countRows(db, 'employees'), 6);
        const pairs = await db.all(
          'SELECT o.date_of_ob AS date, e.name FROM official_business o JOIN employees e ON e.ob_id = o.id', []);
        assert.equal(new Set(pairs.map((row) => `${row.date}|${row.name}`)).size, 6);
      });
    },
  },
  {
    name: 'date-mode: More Than One Day makes one form with all dates and employees',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const body = { ...SEPARATE, dateMode: DateMode.MORE_THAN_ONE_DAY };
        const { forms } = await (await submit(baseUrl, body)).json();
        assert.equal(forms.length, 1);
        assert.deepEqual(forms[0].datesOfOB, THREE_DATES);
        assert.equal(await countRows(db, 'official_business'), 1);
        assert.equal(await countRows(db, 'employees'), 2);
      });
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
    name: 'date-mode: more forms than the cap is refused with a clear message',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const dates = manyDates(DateMode.MAX_FORMS_PER_SUBMISSION / 2 + 1);
        const response = await submit(baseUrl, { ...SEPARATE, datesOfOB: dates });
        assert.equal(response.status, BAD_REQUEST);
        assert.equal((await response.json()).error, DateMode.formLimitMessage(dates.length * 2));
        await assertNothingStored(db);

        const atCap = manyDates(DateMode.MAX_FORMS_PER_SUBMISSION / 2);
        const accepted = await (await submit(baseUrl, { ...SEPARATE, datesOfOB: atCap })).json();
        assert.equal(accepted.forms.length, DateMode.MAX_FORMS_PER_SUBMISSION);
        const tooManyInOneForm = await submit(baseUrl, { ...SEPARATE, dateMode: DateMode.MORE_THAN_ONE_DAY, datesOfOB: dates });
        assert.equal(tooManyInOneForm.status, OK);
      });
    },
  },
  {
    name: 'date-mode: a failure part-way stores no forms at all',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const records = expandSubmission(SEPARATE);
        let formNumber = 0;
        const failingInsert = async (client, body, record, now) => {
          formNumber += 1;
          if (formNumber === FAIL_ON_FORM_NUMBER) throw new Error('forced failure');
          return insertForm(client, body, record, now);
        };
        await assert.rejects(insertForms(SEPARATE, records, new Date().toISOString(), { insertOne: failingInsert }), /forced failure/);
        await assertNothingStored(db);
      });
    },
  },
];
