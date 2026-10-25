'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyMigrations } = require('../scripts/migrate');

const ORDER_CHECK_DIR = 'order-check-migrations';
const UNIQUE_INDEX = 1;

async function uniqueIndexedColumns(db, table) {
  const indexes = await db.all(`PRAGMA index_list(${table})`, []);
  const columns = [];
  for (const index of indexes.filter((row) => row.unique === UNIQUE_INDEX)) {
    const parts = await db.all(`PRAGMA index_info(${index.name})`, []);
    columns.push(...parts.map((part) => part.name));
  }
  return columns.sort();
}

async function leadingIndexedColumns(db, table) {
  const indexes = await db.all(`PRAGMA index_list(${table})`, []);
  const columns = [];
  for (const index of indexes) {
    const [first] = await db.all(`PRAGMA index_info(${index.name})`, []);
    columns.push(first.name);
  }
  return columns;
}

module.exports = [
  {
    name: 'the Employee directory has optional names, a last-used date and indexed lookups',
    async run({ db }) {
      const columns = await db.all('PRAGMA table_info(employees_directory)', []);
      const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
      for (const optional of ['employee_id', 'firstname', 'last_name']) {
        assert.equal(byName[optional].notnull, 0, `${optional} is optional`);
      }
      assert.ok(byName.last_used_at, 'the directory has a last-used date');
      const indexed = await leadingIndexedColumns(db, 'employees_directory');
      for (const column of ['name_key', 'last_used_at', 'full_name', 'assigned_unit']) {
        assert.ok(indexed.includes(column), `an index starts with ${column}`);
      }
    },
  },
  {
    name: 'applying the migrations again applies nothing and keeps the data',
    async run({ db }) {
      const before = await db.all('SELECT * FROM employees_directory ORDER BY id', []);
      assert.deepEqual(await applyMigrations(), []);
      assert.deepEqual(await db.all('SELECT * FROM employees_directory ORDER BY id', []), before);
    },
  },
  {
    name: 'migrations run in numeric order and each runs only once',
    async run({ tempDir }) {
      const dir = path.join(tempDir, ORDER_CHECK_DIR);
      fs.mkdirSync(dir);
      // A text sort would run 10 before 2 and fail, because 10 needs the table from 2.
      fs.writeFileSync(path.join(dir, '2_create_order_check.sql'), 'CREATE TABLE order_check (step TEXT);');
      fs.writeFileSync(
        path.join(dir, '10_fill_order_check.sql'),
        "INSERT INTO order_check (step) VALUES ('ten');"
      );

      assert.deepEqual(await applyMigrations({ migrationsDir: dir }), [
        '2_create_order_check.sql',
        '10_fill_order_check.sql',
      ]);
      assert.deepEqual(await applyMigrations({ migrationsDir: dir }), []);
    },
  },
  {
    name: 'a migration that fails is not recorded and leaves no partial schema',
    async run({ db, tempDir }) {
      const dir = path.join(tempDir, `${ORDER_CHECK_DIR}-failing`);
      fs.mkdirSync(dir);
      fs.writeFileSync(
        path.join(dir, '1_half_broken.sql'),
        'CREATE TABLE half_broken (id INTEGER);\nINSERT INTO no_such_table VALUES (1);'
      );

      await assert.rejects(applyMigrations({ migrationsDir: dir }));
      const table = await db.get("SELECT name FROM sqlite_master WHERE name = 'half_broken'", []);
      assert.equal(table, null);
      await assert.rejects(applyMigrations({ migrationsDir: dir }));
    },
  },
  {
    name: 'the Division list has unique indexes on name and code and the old division setting stays',
    async run({ db }) {
      assert.deepEqual(await uniqueIndexedColumns(db, 'divisions'), ['code', 'name']);
      const settingsColumns = await db.all('PRAGMA table_info(settings)', []);
      assert.ok(settingsColumns.some((column) => column.name === 'division_options'));
    },
  },
  {
    name: 'forms have an optional Reference code with a unique index',
    async run({ db }) {
      const columns = await db.all('PRAGMA table_info(official_business)', []);
      const referenceCode = columns.find((column) => column.name === 'reference_code');
      assert.ok(referenceCode, 'forms have a reference_code column');
      assert.equal(referenceCode.notnull, 0, 'forms from before keep no code');
      assert.deepEqual(await uniqueIndexedColumns(db, 'official_business'), ['reference_code']);
    },
  },
  {
    name: 'forms have an optional Date mode, empty for forms from before',
    async run({ db }) {
      const columns = await db.all('PRAGMA table_info(official_business)', []);
      const dateMode = columns.find((column) => column.name === 'date_mode');
      assert.ok(dateMode, 'forms have a date_mode column');
      assert.equal(dateMode.type, 'TEXT');
      assert.equal(dateMode.notnull, 0, 'forms from before keep no mode');
      assert.equal(dateMode.dflt_value, null);
    },
  },
  {
    name: 'failed attempts carry a kind, admin login by default, indexed with address and time',
    async run({ db }) {
      const columns = await db.all('PRAGMA table_info(failed_logins)', []);
      const kind = columns.find((column) => column.name === 'kind');
      assert.ok(kind, 'failed_logins has a kind column');
      assert.equal(kind.notnull, 1);
      assert.equal(kind.dflt_value, "'admin-login'");
      const indexes = await db.all('PRAGMA index_list(failed_logins)', []);
      const indexColumns = [];
      for (const index of indexes) {
        const parts = await db.all(`PRAGMA index_info(${index.name})`, []);
        indexColumns.push(parts.map((part) => part.name).join(','));
      }
      assert.ok(indexColumns.includes('kind,source_address,failed_at'), indexColumns.join(' | '));
      assert.ok(indexColumns.includes('failed_at'), 'cleanup by age keeps its index');
    },
  },
  {
    name: 'the Approver list has name and position, and its name column leads an index',
    async run({ db }) {
      const columns = await db.all('PRAGMA table_info(approvers)', []);
      assert.deepEqual(
        columns.map((column) => column.name),
        ['id', 'name', 'position'],
      );
      assert.ok((await leadingIndexedColumns(db, 'approvers')).includes('name'), 'an index starts with name');
    },
  },
];
