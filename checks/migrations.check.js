'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyMigrations } = require('../scripts/migrate');

const ORDER_CHECK_DIR = 'order-check-migrations';

module.exports = [
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
];
