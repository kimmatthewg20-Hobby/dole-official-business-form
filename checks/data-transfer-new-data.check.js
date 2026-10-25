'use strict';

// The export and import carry Divisions, Approvers, Reference codes and the Employee directory
// with its last-used dates, and an older export without them still imports.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const {
  RESTORED_TABLES,
  withTablesRestored,
  snapshot,
  exportData,
  importData,
} = require('./data-transfer-helpers');
const {
  FIRST_CODE,
  SECOND_CODE,
  DIVISIONS,
  APPROVERS,
  DIRECTORY,
  newExport,
  oldExport,
} = require('./data-transfer-fixtures');

const ISO_DATE_LENGTH = 10;
const SETTINGS_TABLE = 'settings';

function today() {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

// Settings stay because they hold the admin password the checks log in with; the import
// replaces every other settings column anyway.
async function emptyDatabase(db) {
  for (const table of RESTORED_TABLES.filter((name) => name !== SETTINGS_TABLE)) {
    await db.run(`DELETE FROM ${table}`, []);
  }
}

module.exports = [
  {
    name: 'an export contains Divisions, Approvers, Reference codes and last-used dates',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, newExport());
        const exported = await exportData(baseUrl, cookie);
        assert.deepEqual(exported.divisions, DIVISIONS);
        assert.deepEqual(exported.approvers, APPROVERS);
        assert.deepEqual(exported.employees_directory, DIRECTORY);
        assert.deepEqual(
          exported.official_business.map((row) => row.reference_code),
          [FIRST_CODE, SECOND_CODE],
        );
      });
    },
  },
  {
    name: 'importing an export on an empty database restores all of it, codes still unique',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, newExport());
        const exported = await exportData(baseUrl, cookie);
        const before = await snapshot(db);
        await emptyDatabase(db);
        await importData(baseUrl, cookie, exported);
        assert.deepEqual(await snapshot(db), before);
        const codes = (await db.all('SELECT reference_code FROM official_business', [])).map(
          (row) => row.reference_code,
        );
        assert.equal(new Set(codes).size, codes.length);
      });
    },
  },
  {
    name: 'an older export imports, leaving codes empty and the Division, Approver and directory lists alone',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, newExport());
        const before = await snapshot(db);
        await importData(baseUrl, cookie, oldExport());
        const after = await snapshot(db);
        assert.deepEqual(after.divisions, before.divisions);
        assert.deepEqual(after.approvers, before.approvers);
        assert.deepEqual(after.employees_directory, before.employees_directory);
        assert.deepEqual(
          after.official_business.map((row) => row.reference_code),
          [null],
        );
      });
    },
  },
  {
    name: 'imported employees without a last-used date start from the import day, with a fresh name key',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const { last_used_at: omitted, ...undated } = DIRECTORY[0];
        const entry = {
          ...undated,
          full_name: '  ANA   Sample ',
          name_key: 'someone else',
        };
        await importData(baseUrl, cookie, newExport({ employees_directory: [entry] }));
        const stored = await db.get('SELECT name_key, last_used_at FROM employees_directory', []);
        assert.deepEqual(stored, {
          name_key: 'ana sample',
          last_used_at: today(),
        });
      });
    },
  },
  {
    name: 'imported Division codes are stored in capitals',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(
          baseUrl,
          cookie,
          newExport({ divisions: [{ name: 'Check Division', code: 'cn' }] }),
        );
        assert.deepEqual(await db.all('SELECT name, code FROM divisions', []), [
          { name: 'Check Division', code: 'CN' },
        ]);
      });
    },
  },
];
