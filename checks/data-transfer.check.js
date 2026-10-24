'use strict';

// The admin's JSON export and import (GET /api/export-data, POST /api/import-data):
// they carry forms, employees and settings, but never the admin password.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { postJson, login, loginCookie, withFallbackPassword } = require('./admin-http');

const EXPORT_ROUTE = '/api/export-data';
const IMPORT_ROUTE = '/api/import-data';
const UNAUTHORIZED = 401;
const RESTORED_TABLES = ['employees', 'official_business', 'settings'];
const OLD_EXPORTED_PASSWORD = 'password-from-an-old-export';
const BOOTSTRAP_PASSWORD = 'bootstrap-admin-password';
const IMPORTED_SETTING = {
  id: 41,
  office: 'Check Regional Office',
  office_head: 'Check Head',
  office_head_position: 'Check Director',
  location_from: 'Check City',
  division_options: '["TSSD","IMSD"]',
};
const IMPORTED_FORM = {
  id: 501,
  date_created: '2026-10-01T08:00:00.000Z',
  office: 'Check Regional Office',
  division: 'TSSD',
  date_of_ob: '2026-10-02',
  dates_of_ob: '2026-10-02',
  location_from: 'Check City',
  location_to: 'Sample Town',
  departure_time: '08:00',
  return_time: '17:00',
  purpose: 'Inspect a sample establishment',
  approved_by: 'Check Head',
  approved_by_position: 'Check Director',
};
const IMPORTED_EMPLOYEE = { id: 601, ob_id: 501, name: 'Sample Person', position: 'Inspector' };

// Import replaces whole tables that later checks rely on, so put every row back.
async function withTablesRestored(db, callback) {
  const saved = {};
  for (const table of RESTORED_TABLES) saved[table] = await db.all(`SELECT * FROM ${table}`, []);
  try {
    await callback();
  } finally {
    await db.transaction(async (client) => {
      for (const table of RESTORED_TABLES) await client.query(`DELETE FROM ${table}`, []);
      for (const table of [...RESTORED_TABLES].reverse()) {
        for (const row of saved[table]) {
          const columns = Object.keys(row);
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            columns.map((column) => row[column]),
          );
        }
      }
    });
  }
}

function oldExport(settings) {
  return { official_business: [IMPORTED_FORM], employees: [IMPORTED_EMPLOYEE], settings };
}

async function exportData(baseUrl, cookie) {
  const response = await fetch(`${baseUrl}${EXPORT_ROUTE}`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  return response.json();
}

async function importData(baseUrl, cookie, body) {
  const response = await postJson(baseUrl, IMPORT_ROUTE, body, cookie);
  assert.equal(response.status, 200);
}

function storedPassword(db) {
  return db.get('SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1', []);
}

module.exports = [
  {
    name: 'the export contains no admin password field or value',
    async run({ baseUrl, db }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      const exported = await exportData(baseUrl, cookie);
      const { admin_password: stored } = await storedPassword(db);
      assert.ok(exported.settings.length > 0);
      for (const setting of exported.settings) assert.ok(!('admin_password' in setting));
      const text = JSON.stringify(exported);
      assert.ok(!text.includes(stored), 'the stored password hash was exported');
      assert.ok(!text.includes('admin_password'));
    },
  },
  {
    name: 'importing an old export with a password keeps the current admin password',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const withPassword = { ...IMPORTED_SETTING, admin_password: OLD_EXPORTED_PASSWORD };
        await importData(baseUrl, cookie, oldExport([withPassword]));
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, OLD_EXPORTED_PASSWORD)).status, UNAUTHORIZED);
      });
    },
  },
  {
    name: 'an import with no settings keeps the current admin password',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, oldExport([]));
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
      });
    },
  },
  {
    name: 'other settings, forms and employees still export and import as before',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, oldExport([IMPORTED_SETTING]));
        const exported = await exportData(baseUrl, cookie);
        assert.equal(exported.settings.length, 1);
        assert.deepEqual(exported.settings[0], {
          ...IMPORTED_SETTING,
          assistant_regional_director: 'ATTY. NEPOMUCENO A. LEAÑO II, CPA',
        });
        assert.deepEqual(exported.official_business, [{ ...IMPORTED_FORM, timestamp: null }]);
        assert.deepEqual(exported.employees, [IMPORTED_EMPLOYEE]);
      });
    },
  },
  {
    name: 'with no stored password an import leaves it empty, whatever the file holds',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        await db.run('UPDATE settings SET admin_password = NULL', []);
        await withFallbackPassword(BOOTSTRAP_PASSWORD, async () => {
          const cookie = await loginCookie(baseUrl, BOOTSTRAP_PASSWORD);
          await importData(baseUrl, cookie, oldExport([IMPORTED_SETTING]));
          assert.equal((await storedPassword(db)).admin_password, null);
          const withPassword = { ...IMPORTED_SETTING, admin_password: OLD_EXPORTED_PASSWORD };
          await importData(baseUrl, cookie, oldExport([withPassword]));
          assert.equal((await storedPassword(db)).admin_password, null);
          assert.equal((await login(baseUrl, BOOTSTRAP_PASSWORD)).status, 200);
        });
      });
    },
  },
  {
    name: 'export and import refuse requests without an admin login',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const before = await db.all('SELECT * FROM settings ORDER BY id', []);
        assert.equal((await fetch(`${baseUrl}${EXPORT_ROUTE}`)).status, UNAUTHORIZED);
        const response = await postJson(baseUrl, IMPORT_ROUTE, oldExport([IMPORTED_SETTING]));
        assert.equal(response.status, UNAUTHORIZED);
        assert.deepEqual(await db.all('SELECT * FROM settings ORDER BY id', []), before);
      });
    },
  },
];
