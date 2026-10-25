'use strict';

const assert = require('node:assert/strict');
const {
  TRACKER_PAGE_SIZE,
  TRACKER_WINDOW_DAYS,
  FORM_COUNT_FOR_PAGING,
  ENTRIES_PAGE_LIMIT,
  VALID_SUBMISSION,
  withFormsRestored,
  getJson,
  countRows,
  insertForm,
  submit,
} = require('./form-helpers');
const { submitSharedForm } = require('./shared-form-helpers');
const { loginCookie } = require('./admin-http');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');

const INVALID_SUBMISSIONS = {
  'no employees': { ...VALID_SUBMISSION, employees: [] },
  'employee without a name': { ...VALID_SUBMISSION, employees: [{ name: 'Ana', position: 'x' }, { name: '  ' }] },
  'no dates': { ...VALID_SUBMISSION, datesOfOB: [] },
  'malformed date': { ...VALID_SUBMISSION, datesOfOB: ['2026-13-45'] },
  'no destination': { ...VALID_SUBMISSION, locationTo: '' },
  'no purpose': { ...VALID_SUBMISSION, purpose: '' },
  'bad departure time': { ...VALID_SUBMISSION, departureTime: 'soon' },
  'employees not a list': { ...VALID_SUBMISSION, employees: 'Ana' },
};

module.exports = [
  {
    name: 'a stored form with several employees is read back by id with all its fields',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { success, id } = await submitSharedForm(baseUrl, db);
        assert.equal(success, true);
        assert.equal(typeof id, 'number');

        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const { formData, employees } = await getJson(baseUrl, `/api/retrieve/${id}`, cookie);
        assert.equal(formData.location_to, 'Municipal Hall');
        assert.equal(formData.approved_by, 'Head Person');
        assert.deepEqual(formData.datesOfOB, ['2026-03-02', '2026-03-03']);
        assert.equal(formData.date_of_ob, '2026-03-02');
        assert.deepEqual(employees, VALID_SUBMISSION.employees);

        const entry = await getJson(baseUrl, `/api/entries/${id}`);
        assert.equal(entry.formData.time, '08:00 - 17:30');
        assert.equal(entry.employees.length, 3);
        assert.equal(entry.formData.purpose, 'Site visit');

        const missing = await fetch(`${baseUrl}/api/retrieve/${id + 1000}`, { headers: { Cookie: cookie } });
        assert.equal(missing.status, 404);
        assert.equal((await fetch(`${baseUrl}/api/retrieve/${id}`)).status, 401, 'reading by id needs an admin session');
      });
    },
  },
  {
    name: 'a rejected submission stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        for (const [label, body] of Object.entries(INVALID_SUBMISSIONS)) {
          const response = await submit(baseUrl, body);
          assert.equal(response.status, 400, label);
          assert.equal(typeof (await response.json()).error, 'string', label);
        }
        assert.equal(await countRows(db, 'official_business'), 0);
        assert.equal(await countRows(db, 'employees'), 0);
      });
    },
  },
  {
    name: 'the print page shows every employee with user text escaped',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const body = {
          ...VALID_SUBMISSION,
          purpose: '<script>alert(1)</script>',
          employees: [{ name: 'Ana <b>Reyes</b>', position: 'Clerk' }, { name: 'Ben Cruz', position: 'Driver' }],
        };
        const { id } = await submitSharedForm(baseUrl, db, body);
        const response = await fetch(`${baseUrl}/print/${id}`);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.ok(!html.includes('<script>alert(1)'));
        assert.ok(!html.includes('<B>REYES'));
        assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
        assert.ok(html.includes('BEN CRUZ'));
        assert.equal((await fetch(`${baseUrl}/print/${id + 1000}`)).status, 404);
      });
    },
  },
  {
    name: 'the tracker pages 15 per page, newest first, with correct totals and only recent forms',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const ids = [];
        for (let i = 0; i < FORM_COUNT_FOR_PAGING; i += 1) ids.push(await insertForm(db, { minute: i }));
        await insertForm(db, { daysAgo: TRACKER_WINDOW_DAYS + 5 });

        const first = await getJson(baseUrl, '/api/tracker?page=1');
        assert.equal(first.entries.length, TRACKER_PAGE_SIZE);
        assert.deepEqual(first.entries.map((e) => e.id), ids.slice().reverse().slice(0, TRACKER_PAGE_SIZE));
        assert.deepEqual(first.pagination, {
          currentPage: 1, totalPages: 2, totalEntries: FORM_COUNT_FOR_PAGING, hasNext: true, hasPrev: false,
        });

        const second = await getJson(baseUrl, '/api/tracker?page=2');
        assert.deepEqual(second.entries.map((e) => e.id), ids.slice(0, 2).reverse());
        assert.equal(second.pagination.hasNext, false);
        assert.equal(second.pagination.hasPrev, true);

        const all = await getJson(baseUrl, '/api/tracker/all');
        assert.equal(all.entries.length, FORM_COUNT_FOR_PAGING);
        assert.deepEqual(all.entries[0], first.entries[0]);
      });
    },
  },
  {
    name: 'the tracker lists employee names and formatted dates and times for a submitted form',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await submitSharedForm(baseUrl, db);
        const { entries } = await getJson(baseUrl, '/api/tracker');
        assert.equal(entries.length, 1);
        assert.equal(entries[0].id, id);
        assert.equal(entries[0].employees, 'Ana Reyes, Ben Cruz, Cora Diaz');
        assert.equal(entries[0].dateOfOB, 'March 2-3, 2026');
        assert.equal(entries[0].timeOfOB, '08:00 AM to 05:30 PM');
        assert.equal(entries[0].destination, 'Regional Office - Municipal Hall');
      });
    },
  },
  {
    name: 'the entries list searches by employee or office and keeps paging values in order',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const first = await insertForm(db, { minute: 1, office: 'Alpha Office', employees: ['Zed Match'] });
        const second = await insertForm(db, { minute: 2, office: 'Beta Office', employees: ['Zed Match', 'Other'] });
        const third = await insertForm(db, { minute: 3, office: 'Zed Office', employees: ['Nobody'] });
        await insertForm(db, { minute: 4, office: 'Gamma', employees: ['Else'] });

        const found = await getJson(baseUrl, '/api/entries?search=Zed');
        assert.deepEqual(found.entries.map((e) => e.id).sort(), [first, second, third].sort());
        assert.equal(found.pagination.total, 3);
        assert.equal(found.pagination.totalPages, 1);

        const paged = await getJson(baseUrl, `/api/entries?search=Zed&limit=${ENTRIES_PAGE_LIMIT}&page=2`);
        assert.equal(paged.entries.length, 1);
        assert.equal(paged.pagination.total, 3);
        assert.equal(paged.pagination.totalPages, 2);
        assert.equal(paged.pagination.currentPage, 2);

        const byOffice = await getJson(baseUrl, '/api/entries?search=Gamma');
        assert.equal(byOffice.entries.length, 1);
        assert.equal(byOffice.entries[0].formData.name, 'Else');

        const none = await getJson(baseUrl, '/api/entries?search=NoSuchThing');
        assert.deepEqual(none.entries, []);
        assert.equal(none.pagination.total, 0);

        const everything = await getJson(baseUrl, '/api/entries');
        assert.equal(everything.pagination.total, 4);
        assert.equal(everything.entries[0].employees.length > 0, true);
      });
    },
  },
  {
    name: 'the paginated entries list orders newest first and reports totals',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const ids = [];
        for (let i = 0; i < 3; i += 1) ids.push(await insertForm(db, { minute: i }));
        const page = await getJson(baseUrl, '/api/entries/paginated?page=2&limit=2');
        assert.deepEqual(page.entries.map((e) => e.id), [ids[0]]);
        assert.deepEqual(page.pagination, { total: 3, page: 2, limit: 2, totalPages: 2 });
        assert.equal(page.entries[0].employees.length, 1);
      });
    },
  },
];
