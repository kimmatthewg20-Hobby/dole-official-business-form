'use strict';

// The admin sees each form's Reference code (spec story 53); forms from before have none.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { VALID_SUBMISSION, withFormsRestored, insertForm, submit } = require('./form-helpers');
const { submitSharedForm } = require('./shared-form-helpers');
const { ADMIN_FORMS_ROUTE, ADMIN_FORMS_PAGE_SIZE } = require('../routes/admin-forms');

const OK = 200;
const UNAUTHORIZED = 401;

async function adminForms(baseUrl, cookie, page = 1) {
  const response = await fetch(`${baseUrl}${ADMIN_FORMS_ROUTE}?page=${page}`, { headers: { Cookie: cookie } });
  assert.equal(response.status, OK);
  return response.json();
}

module.exports = [
  {
    name: 'the admin form list shows each form with its code, and none for a form from before',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const oldId = await insertForm(db, { daysAgo: 1, employees: ['Old Form Person'] });
        const { forms } = await submitSharedForm(baseUrl, db);
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const listed = await adminForms(baseUrl, cookie);
        assert.deepEqual(
          listed.forms.map((form) => [form.id, form.referenceCode]),
          [[forms[0].id, forms[0].referenceCode], [oldId, null]],
        );
        const newest = listed.forms[0];
        assert.equal(newest.division, VALID_SUBMISSION.division);
        assert.deepEqual(newest.datesOfOB, VALID_SUBMISSION.datesOfOB);
        assert.deepEqual(newest.employees, VALID_SUBMISSION.employees.map((employee) => employee.name));
        assert.deepEqual(listed.pagination, { page: 1, totalPages: 1, total: 2 });
      });
    },
  },
  {
    name: 'the admin form list is paginated, newest first',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const ids = [];
        for (let minute = 0; minute <= ADMIN_FORMS_PAGE_SIZE; minute += 1) {
          ids.push(await insertForm(db, { daysAgo: 1, minute }));
        }
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const first = await adminForms(baseUrl, cookie);
        assert.equal(first.forms.length, ADMIN_FORMS_PAGE_SIZE);
        assert.equal(first.forms[0].id, ids[ids.length - 1]);
        const second = await adminForms(baseUrl, cookie, 2);
        assert.deepEqual(second.forms.map((form) => form.id), [ids[0]]);
        assert.deepEqual(second.pagination, { page: 2, totalPages: 2, total: ADMIN_FORMS_PAGE_SIZE + 1 });
      });
    },
  },
  {
    name: 'the admin form list refuses a visitor without an admin login',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await submit(baseUrl, VALID_SUBMISSION);
        const response = await fetch(`${baseUrl}${ADMIN_FORMS_ROUTE}`);
        assert.equal(response.status, UNAUTHORIZED);
        assert.equal((await response.text()).includes('DOLE'), false);
      });
    },
  },
];
