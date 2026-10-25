'use strict';

// The Employee directory, each employee's history and whole forms read by id hold personal data.
// Only the admin's Employees tab reads them, so the server refuses every caller without an admin
// session; staff get only the bounded name suggestions (directory-suggest.check.js).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { withFormsRestored, insertForm } = require('./form-helpers');

const OK = 200;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REMOVED_PAGE = 'employees.html';
const FORM_EMPLOYEE = 'Ana Reyes';

function adminOnlyReads(employeeId, formId) {
  return [
    '/api/employees',
    '/api/employees?search=Ana',
    `/api/employees/${employeeId}`,
    `/api/employees/${employeeId}/history`,
    `/api/entries/${formId}`,
    '/api/entries',
    '/api/entries?search=Ana',
    '/api/entries/paginated',
  ];
}

function statusOf(baseUrl, route, cookie) {
  return fetch(`${baseUrl}${route}`, { headers: cookie ? { Cookie: cookie } : {} }).then((r) => r.status);
}

function publicFiles(dir = PUBLIC_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? publicFiles(full) : [full];
  });
}

module.exports = [
  {
    name: 'directory, history and form-by-id reads are refused without an admin session and answer with one',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const formId = await insertForm(db, { employees: [FORM_EMPLOYEE] });
        const { lastID: employeeId } = await db.run(
          'INSERT INTO employees_directory (full_name, position, assigned_unit) VALUES (?, ?, ?) RETURNING id',
          [FORM_EMPLOYEE, 'Clerk', 'TSSD']
        );
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        for (const route of adminOnlyReads(employeeId, formId)) {
          assert.equal(await statusOf(baseUrl, route), UNAUTHORIZED, `${route} without a session`);
          assert.equal(await statusOf(baseUrl, route, cookie), OK, `${route} with a session`);
        }
      });
    },
  },
  {
    name: 'the standalone Employees page is gone and nothing in public/ links to it',
    async run({ baseUrl }) {
      assert.equal(await statusOf(baseUrl, `/${REMOVED_PAGE}`), NOT_FOUND);
      for (const file of publicFiles()) {
        assert.ok(!fs.readFileSync(file, 'utf8').includes(REMOVED_PAGE), `${path.relative(PUBLIC_DIR, file)} names ${REMOVED_PAGE}`);
      }
    },
  },
];
