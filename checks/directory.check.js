'use strict';

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { postJson, loginCookie } = require('./admin-http');

const UNAUTHORIZED = 401;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const NEW_ENTRY = {
  employee_id: 'CHK-1',
  firstname: 'Check',
  middle_name: 'Middle',
  last_name: 'Person',
  position: 'Tester',
  assigned_unit: 'CHECKUNIT',
};

function sendJson(baseUrl, method, route, body, cookie) {
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  return fetch(`${baseUrl}${route}`, { method, headers, body: body && JSON.stringify(body) });
}

async function listDirectory(baseUrl, search = '') {
  const response = await fetch(`${baseUrl}/api/employees?search=${encodeURIComponent(search)}`);
  assert.equal(response.status, 200);
  return (await response.json()).employees;
}

// The directory is shared by every check, so the seeded rows are put back afterwards.
async function withDirectoryRestored(db, callback) {
  const savedRows = await db.all('SELECT * FROM employees_directory ORDER BY id', []);
  try {
    await callback();
  } finally {
    await db.transaction(async (client) => {
      await client.query('DELETE FROM employees_directory', []);
      for (const row of savedRows) {
        const columns = Object.keys(row);
        await client.query(
          `INSERT INTO employees_directory (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column])
        );
      }
    });
  }
}

async function addEntry(baseUrl, cookie, entry) {
  const response = await postJson(baseUrl, '/api/employees', entry, cookie);
  assert.equal(response.status, 200);
  return (await response.json()).id;
}

module.exports = [
  {
    name: 'lists in name order and searches by name, position and unit',
    async run({ baseUrl, db }) {
      const listed = await listDirectory(baseUrl);
      const sorted = [...listed].sort((a, b) => (a.full_name < b.full_name ? -1 : 1));
      assert.deepEqual(listed.map((e) => e.id), sorted.map((e) => e.id));
      const rows = await db.all('SELECT * FROM employees_directory ORDER BY full_name', []);
      assert.deepEqual(listed, rows);
      const byName = await listDirectory(baseUrl, listed[0].full_name);
      assert.ok(byName.some((e) => e.id === listed[0].id));
      assert.equal((await listDirectory(baseUrl, 'no-such-text-anywhere')).length, 0);
      const lookup = await fetch(`${baseUrl}/api/employees/${listed[0].id}`);
      assert.deepEqual((await lookup.json()).employee, listed[0]);
      assert.equal((await fetch(`${baseUrl}/api/employees/999999`)).status, NOT_FOUND);
    },
  },
  {
    name: 'changes are rejected without an admin login',
    async run({ baseUrl, db }) {
      const before = await listDirectory(baseUrl);
      const routes = [
        ['POST', '/api/employees', NEW_ENTRY],
        ['PUT', `/api/employees/${before[0].id}`, NEW_ENTRY],
        ['DELETE', `/api/employees/${before[0].id}`, undefined],
        ['POST', '/api/employees/bulk-replace', { employees: [NEW_ENTRY] }],
        ['POST', '/api/employees/initialize', undefined],
        ['GET', '/api/export-data', undefined],
        ['POST', '/api/import-data', { official_business: [], employees: [] }],
      ];
      for (const [method, route, body] of routes) {
        const response = await sendJson(baseUrl, method, route, body, '');
        assert.equal(response.status, UNAUTHORIZED, `${method} ${route}`);
      }
      assert.deepEqual(await listDirectory(baseUrl), before);
      assert.ok(db);
    },
  },
  {
    name: 'adds and edits an entry with server-side validation',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const invalid = await postJson(baseUrl, '/api/employees', { ...NEW_ENTRY, position: ' ' }, cookie);
        assert.equal(invalid.status, BAD_REQUEST);
        const id = await addEntry(baseUrl, cookie, NEW_ENTRY);
        const stored = await db.get('SELECT * FROM employees_directory WHERE id = ?', [id]);
        assert.equal(stored.full_name, 'Check M. Person');
        assert.equal(stored.assigned_unit, 'CHECKUNIT');
        const edited = { ...NEW_ENTRY, firstname: 'Edited', middle_name: '' };
        const put = await sendJson(baseUrl, 'PUT', `/api/employees/${id}`, edited, cookie);
        assert.equal(put.status, 200);
        const updated = await db.get('SELECT * FROM employees_directory WHERE id = ?', [id]);
        assert.equal(updated.full_name, 'Edited Person');
        const badPut = await sendJson(baseUrl, 'PUT', `/api/employees/${id}`, { ...edited, last_name: '' }, cookie);
        assert.equal(badPut.status, BAD_REQUEST);
        const missing = await sendJson(baseUrl, 'PUT', '/api/employees/999999', edited, cookie);
        assert.equal(missing.status, NOT_FOUND);
        const removed = await sendJson(baseUrl, 'DELETE', `/api/employees/${id}`, undefined, cookie);
        assert.equal(removed.status, 200);
        assert.equal(await db.get('SELECT id FROM employees_directory WHERE id = ?', [id]), null);
      });
    },
  },
  {
    name: 'a bulk replace swaps the whole directory',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const second = { ...NEW_ENTRY, employee_id: 'CHK-2', firstname: 'Second', middle_name: '' };
        const response = await postJson(baseUrl, '/api/employees/bulk-replace', { employees: [NEW_ENTRY, second] }, cookie);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).count, 2);
        const listed = await listDirectory(baseUrl);
        assert.deepEqual(listed.map((e) => e.full_name), ['Check M. Person', 'Second Person']);
      });
    },
  },
  {
    name: 'a bulk replace with one invalid row keeps the old directory',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const before = await listDirectory(baseUrl);
        const badRow = { ...NEW_ENTRY, firstname: 'Bad', last_name: '' };
        const response = await postJson(baseUrl, '/api/employees/bulk-replace', { employees: [NEW_ENTRY, badRow] }, cookie);
        assert.equal(response.status, BAD_REQUEST);
        assert.deepEqual(await listDirectory(baseUrl), before);
        const empty = await postJson(baseUrl, '/api/employees/bulk-replace', { employees: [] }, cookie);
        assert.equal(empty.status, BAD_REQUEST);
        assert.deepEqual(await listDirectory(baseUrl), before);
      });
    },
  },
  {
    name: 'a bulk replace that fails inside the transaction rolls back',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const before = await listDirectory(baseUrl);
        await db.query('CREATE TRIGGER fail_check BEFORE INSERT ON employees_directory WHEN NEW.employee_id = \'CHK-FAIL\' BEGIN SELECT RAISE(ABORT, \'forced failure\'); END', []);
        try {
          const failing = { ...NEW_ENTRY, employee_id: 'CHK-FAIL' };
          const response = await postJson(baseUrl, '/api/employees/bulk-replace', { employees: [NEW_ENTRY, failing] }, cookie);
          assert.equal(response.status, 500);
        } finally {
          await db.query('DROP TRIGGER fail_check', []);
        }
        assert.deepEqual(await listDirectory(baseUrl), before);
      });
    },
  },
];
