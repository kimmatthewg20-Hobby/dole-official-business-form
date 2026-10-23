'use strict';

const assert = require('node:assert/strict');
const { loginCookie } = require('./admin-http');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { withFormsRestored, insertForm, submit, VALID_SUBMISSION } = require('./form-helpers');

const FAILING_NAME = 'Boom Trigger';
const MISSING_ID = 999999;

const EDIT_BODY = {
  formData: {
    office: 'Edited Office',
    division: 'FAD',
    datesOfOB: ['2026-04-10'],
    location_from: 'Here',
    location_to: 'There',
    purpose: 'Edited purpose',
    approved_by: 'New Head',
    approved_by_position: 'Chief',
  },
  employees: [{ name: 'Dan Lim', position: 'Aide' }],
};

function sendJson(baseUrl, method, route, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${baseUrl}${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

function adminCookie(baseUrl) {
  return loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
}

async function count(db, table) {
  return (await db.get(`SELECT COUNT(*) AS total FROM ${table}`, [])).total;
}

async function employeeNames(db, id) {
  const rows = await db.all('SELECT name FROM employees WHERE ob_id = ? ORDER BY id', [id]);
  return rows.map((row) => row.name);
}

module.exports = [
  {
    name: 'editing a form updates its fields and replaces its employees with a different set',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
        const response = await sendJson(baseUrl, 'PUT', `/api/update/${id}`, EDIT_BODY);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, id: String(id) });
        const form = await db.get('SELECT * FROM official_business WHERE id = ?', [id]);
        assert.equal(form.purpose, 'Edited purpose');
        assert.equal(form.office, 'Edited Office');
        assert.equal(form.date_of_ob, '2026-04-10');
        assert.equal(form.departure_time, '08:00');
        assert.deepEqual(await employeeNames(db, id), ['Dan Lim']);
      });
    },
  },
  {
    name: 'a failed edit leaves the previous form and employees unchanged',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
        await db.run(
          `CREATE TRIGGER fail_edit BEFORE INSERT ON employees WHEN NEW.name = '${FAILING_NAME}'
           BEGIN SELECT RAISE(ABORT, 'forced failure'); END`,
          []
        );
        try {
          const failing = { ...EDIT_BODY, employees: [{ name: 'Dan Lim' }, { name: FAILING_NAME }] };
          const response = await sendJson(baseUrl, 'PUT', `/api/update/${id}`, failing);
          assert.equal(response.status, 500);
        } finally {
          await db.run('DROP TRIGGER fail_edit', []);
        }
        const form = await db.get('SELECT purpose FROM official_business WHERE id = ?', [id]);
        assert.equal(form.purpose, 'Site visit');
        assert.deepEqual(await employeeNames(db, id), ['Ana Reyes', 'Ben Cruz', 'Cora Diaz']);
      });
    },
  },
  {
    name: 'editing rejects invalid input and a form that does not exist, changing nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { id } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
        const noEmployees = await sendJson(baseUrl, 'PUT', `/api/update/${id}`, { ...EDIT_BODY, employees: [] });
        assert.equal(noEmployees.status, 400);
        const missing = await sendJson(baseUrl, 'PUT', `/api/update/${MISSING_ID}`, EDIT_BODY);
        assert.equal(missing.status, 404);
        assert.equal(typeof (await missing.json()).error, 'string');
        assert.deepEqual(await employeeNames(db, id), ['Ana Reyes', 'Ben Cruz', 'Cora Diaz']);
      });
    },
  },
  {
    name: 'deleting one form removes its employees and keeps other forms',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const doomed = await insertForm(db, { employees: ['A', 'B'] });
        const kept = await insertForm(db, { employees: ['C'] });
        const cookie = await adminCookie(baseUrl);
        const response = await sendJson(baseUrl, 'DELETE', `/api/delete/${doomed}`, null, cookie);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).success, true);
        assert.equal(await count(db, 'official_business'), 1);
        assert.deepEqual(await employeeNames(db, doomed), []);
        assert.deepEqual(await employeeNames(db, kept), ['C']);
        const missing = await sendJson(baseUrl, 'DELETE', `/api/delete/${doomed}`, null, cookie);
        assert.equal(missing.status, 404);
      });
    },
  },
  {
    name: 'deleting all forms removes every employee too',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await insertForm(db, { employees: ['A', 'B'] });
        await insertForm(db, { employees: ['C'] });
        const cookie = await adminCookie(baseUrl);
        const response = await sendJson(baseUrl, 'DELETE', '/api/delete-all', null, cookie);
        assert.equal(response.status, 200);
        assert.equal(await count(db, 'official_business'), 0);
        assert.equal(await count(db, 'employees'), 0);
      });
    },
  },
  {
    name: 'a non-admin cannot delete one form or all forms',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const id = await insertForm(db, { employees: ['A'] });
        assert.equal((await sendJson(baseUrl, 'DELETE', `/api/delete/${id}`)).status, 401);
        assert.equal((await sendJson(baseUrl, 'DELETE', '/api/delete-all')).status, 401);
        assert.equal(await count(db, 'official_business'), 1);
        assert.equal(await count(db, 'employees'), 1);
      });
    },
  },
];
