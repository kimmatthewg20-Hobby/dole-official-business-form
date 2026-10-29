'use strict';

// Assistant filing: submit_official_business files one Official Business form through the
// website's own submit path and hands back the print link, the Reference code and a summary.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { WEBSITE_OFFICE, DEFAULT_FROM } = require('../routes/mcp-filing-body');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const { storedForm } = require('./division-helpers');
const { postJson } = require('./admin-http');
const { callTool } = require('./mcp-helpers');

const OK = 200;
const FORM_PAGE = path.join(__dirname, '..', 'public', 'index.html');
const SUBMIT = 'submit_official_business';
const CODE_PATTERN = /^DOLETSSD\d{4}[A-HJKMNP-Z2-9]{4}$/;
const NOT_COMPARED = ['id', 'date_created', 'timestamp'];
const FILING = {
  employees: VALID_SUBMISSION.employees,
  dates: VALID_SUBMISSION.datesOfOB,
  destination: VALID_SUBMISSION.locationTo,
  departureTime: VALID_SUBMISSION.departureTime,
  returnTime: VALID_SUBMISSION.returnTime,
  purpose: VALID_SUBMISSION.purpose,
  division: VALID_SUBMISSION.division,
  approver: VALID_SUBMISSION.approvedBy,
};

// A stored form without what differs between any two submissions: its id and when it was made.
async function comparableForm(baseUrl, id) {
  const { formData, employees } = await storedForm(baseUrl, id);
  const kept = Object.fromEntries(Object.entries(formData).filter(([key]) => !NOT_COMPARED.includes(key)));
  return { formData: kept, employees };
}

module.exports = [
  {
    name: 'an Assistant filing sends the office and From the form page sends',
    run() {
      const page = fs.readFileSync(FORM_PAGE, 'utf8');
      assert.ok(page.includes(`office: '${WEBSITE_OFFICE}'`), 'the form page office');
      assert.ok(page.includes(`id="locationFrom" placeholder="" value="${DEFAULT_FROM}"`), 'the form page From');
    },
  },
  {
    name: 'submit_official_business stores one form whose print link opens and whose code finds it',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const filed = await callTool(baseUrl, SUBMIT, FILING);
        assert.deepEqual(Object.keys(filed).sort(), ['id', 'printLink', 'referenceCode', 'summary']);
        assert.equal(filed.printLink, `${baseUrl}/print/${filed.id}`);
        assert.match(filed.referenceCode, CODE_PATTERN);
        const { formData, employees } = await storedForm(baseUrl, filed.id);
        assert.deepEqual(employees, VALID_SUBMISSION.employees);
        assert.deepEqual(formData.datesOfOB, ['2026-03-02', '2026-03-03']);

        const found = await postJson(baseUrl, '/api/lookup/code', { code: filed.referenceCode });
        assert.equal(found.status, OK);
        assert.equal((await found.json()).formData.id, filed.id);
        const printed = await fetch(filed.printLink);
        assert.equal(printed.status, OK);
        assert.ok((await printed.text()).includes('CORA DIAZ'));
      });
    },
  },
  {
    name: 'the summary names the employees, dates, place, times, purpose, Division, Approver and Date mode',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { summary } = await callTool(baseUrl, SUBMIT, FILING);
        const expected = ['Ana Reyes', 'Ben Cruz', 'Cora Diaz', '2026-03-02', '2026-03-03', 'Official Station',
          'Municipal Hall', '08:00', '17:30', 'Site visit', 'TSSD', 'Head Person', 'Provincial Head', 'All Dates'];
        for (const text of expected) assert.ok(summary.includes(text), `${text} in: ${summary}`);
      });
    },
  },
  {
    name: 'the stored form equals what the website stores for the same input',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const website = await (await submit(baseUrl, VALID_SUBMISSION)).json();
        const filed = await callTool(baseUrl, SUBMIT, { ...FILING, from: VALID_SUBMISSION.locationFrom });
        assert.deepEqual(await comparableForm(baseUrl, filed.id), await comparableForm(baseUrl, website.id));
      });
    },
  },
  {
    name: 'From defaults to Official Station and Date mode to All Dates; past dates and typed times are accepted',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const past = { ...FILING, dates: ['2020-01-06'], departureTime: '8:00', returnTime: '5:30 PM' };
        const { formData } = await storedForm(baseUrl, (await callTool(baseUrl, SUBMIT, past)).id);
        assert.equal(formData.location_from, 'Official Station');
        assert.equal(formData.date_mode, 'more-than-one-day');
        assert.equal(formData.date_of_ob, '2020-01-06');
        assert.equal(formData.departure_time, '08:00');
        assert.equal(formData.return_time, '17:30');
      });
    },
  },
  {
    name: 'Multiple Separate Days is stored when given and the summary says Separated Dates',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const filed = await callTool(baseUrl, SUBMIT, { ...FILING, dateMode: 'Multiple Separate Days' });
        assert.equal((await storedForm(baseUrl, filed.id)).formData.date_mode, 'multiple-separate-days');
        assert.ok(filed.summary.includes('Separated Dates'), filed.summary);
      });
    },
  },
  {
    name: 'a new employee on an Assistant filing is remembered in the Employee directory',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await callTool(baseUrl, SUBMIT, { ...FILING, employees: [{ name: 'Zora Quill', position: 'Analyst' }] });
        const { employees } = await callTool(baseUrl, 'find_employee', { name: 'Zora Qu' });
        assert.deepEqual(employees, [{ name: 'Zora Quill', position: 'Analyst', unit: 'TSSD' }]);
      });
    },
  },
  {
    name: 'text with HTML is stored as given and shows escaped on the print page',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const purpose = '<script>alert(1)</script>';
        const employees = [{ name: 'Ana <b>Reyes</b>', position: 'Clerk' }];
        const filed = await callTool(baseUrl, SUBMIT, { ...FILING, purpose, employees });
        const stored = await storedForm(baseUrl, filed.id);
        assert.equal(stored.formData.purpose, purpose);
        assert.deepEqual(stored.employees, employees);
        const html = await (await fetch(filed.printLink)).text();
        assert.ok(!html.includes('<script>alert(1)'));
        assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
      });
    },
  },
];
