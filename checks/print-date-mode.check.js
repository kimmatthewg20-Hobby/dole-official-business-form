'use strict';

// The stored Date mode decides how the one stored form prints (GLOSSARY.md): All Dates prints
// one form per employee with every date, Separated Dates one form per employee per date. Forms
// from before the mode was stored print as All Dates. The Reference code never reaches the print.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');

const OK = 200;
const DATES = ['2026-03-05', '2026-03-02', '2026-03-03'];
const ALL_DATES_WORDING = 'March 2-3 and 5, 2026';
const SINGLE_DATE_WORDINGS = ['March 2, 2026', 'March 3, 2026', 'March 5, 2026'];
const NAMES = ['ANA REYES', 'BEN CRUZ', 'CORA DIAZ'];
const FORM_PAGE = '<div class="form-page">';
const SHEET = '<section class="sheet">';

function count(text, part) {
  return text.split(part).length - 1;
}

// Each printed form as [employee name, date wording], in print order.
function printedForms(html) {
  return html.split(FORM_PAGE).slice(1).map((page) => [
    page.match(/Name of Employee:<br>\s*<strong>([^<]*)<\/strong>/)[1],
    page.match(/Date of Official Business:<br>\s*<strong>([^<]*)<\/strong>/)[1],
  ]);
}

async function submitAndPrint(baseUrl, dateMode, afterSubmit = async () => {}) {
  const response = await submit(baseUrl, { ...VALID_SUBMISSION, datesOfOB: DATES, dateMode });
  assert.equal(response.status, OK);
  const { id, forms } = await response.json();
  await afterSubmit(id);
  const printed = await fetch(`${baseUrl}/print/${id}`);
  assert.equal(printed.status, OK);
  const html = await printed.text();
  assert.ok(!html.includes(forms[0].referenceCode), 'the print never carries the Reference code');
  return html;
}

function expectAllDatesPrint(html) {
  assert.deepEqual(printedForms(html), NAMES.map((name) => [name, ALL_DATES_WORDING]));
  assert.equal(count(html, SHEET), 2);
}

module.exports = [
  {
    name: 'print: All Dates prints one form per employee, each with all the dates',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        expectAllDatesPrint(await submitAndPrint(baseUrl, DateMode.MORE_THAN_ONE_DAY));
      });
    },
  },
  {
    name: 'print: Separated Dates prints one form per employee per date, employee by employee, two per sheet',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const html = await submitAndPrint(baseUrl, DateMode.MULTIPLE_SEPARATE_DAYS);
        const expected = NAMES.flatMap((name) => SINGLE_DATE_WORDINGS.map((wording) => [name, wording]));
        assert.deepEqual(printedForms(html), expected);
        assert.equal(count(html, SHEET), 5);
      });
    },
  },
  {
    name: 'print: a form from before the Date mode was stored prints like All Dates',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const html = await submitAndPrint(baseUrl, DateMode.MULTIPLE_SEPARATE_DAYS, (id) =>
          db.run('UPDATE official_business SET date_mode = NULL WHERE id = ?', [id]));
        expectAllDatesPrint(html);
      });
    },
  },
];
