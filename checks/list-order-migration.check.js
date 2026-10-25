'use strict';

// Migration 0010 gives Divisions and Approvers a stored order. Lists kept before it must keep
// the order staff already knew (by name), so the migration is also run on its own database
// holding rows from before.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATIONS_BEFORE_ORDER = ['0004_divisions.sql', '0005_approvers.sql'];
const ORDER_MIGRATION = '0010_list_order.sql';
const BEFORE_ORDER_DATABASE = 'before-list-order.db';
const ORDERED_TABLES = ['divisions', 'approvers'];

function migrationSql(name) {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
}

async function sortOrderColumn(db, table) {
  const columns = await db.all(`PRAGMA table_info(${table})`, []);
  return columns.find((column) => column.name === 'sort_order');
}

async function indexesLeadingWith(db, table, column) {
  const names = [];
  for (const index of await db.all(`PRAGMA index_list(${table})`, [])) {
    const [first] = await db.all(`PRAGMA index_info(${index.name})`, []);
    if (first.name === column) names.push(index.name);
  }
  return names;
}

async function rowsInStoredOrder(client, table, columns) {
  const result = await client.execute(
    `SELECT ${columns}, sort_order FROM ${table} ORDER BY sort_order`,
  );
  return result.rows.map((row) => ({ ...row }));
}

module.exports = [
  {
    name: 'Divisions and Approvers have a whole-number order, 0 by default, with an index',
    async run({ db }) {
      for (const table of ORDERED_TABLES) {
        const column = await sortOrderColumn(db, table);
        assert.ok(column, `${table} has a sort_order column`);
        assert.equal(column.type, 'INTEGER');
        assert.equal(column.notnull, 1);
        assert.equal(column.dflt_value, '0');
        assert.equal((await indexesLeadingWith(db, table, 'sort_order')).length, 1, table);
      }
    },
  },
  {
    name: 'lists kept before the order existed start in the order they were listed, by name',
    async run({ tempDir }) {
      const client = createClient({
        url: `file:${path.join(tempDir, BEFORE_ORDER_DATABASE)}`,
      });
      try {
        for (const name of MIGRATIONS_BEFORE_ORDER)
          await client.executeMultiple(migrationSql(name));
        await client.executeMultiple(`
          INSERT INTO divisions (name, code) VALUES ('zeta Unit', 'ZU'), ('Beta Unit', 'BU'), ('alpha Unit', 'AU');
          INSERT INTO approvers (name, position) VALUES
            ('Zeta Santos', 'Chief'), ('ana Reyes', 'Officer in Charge'), ('Ana Cruz', 'Director'),
            ('ana Reyes', 'Director');
        `);
        await client.executeMultiple(migrationSql(ORDER_MIGRATION));
        assert.deepEqual(await rowsInStoredOrder(client, 'divisions', 'name'), [
          { name: 'alpha Unit', sort_order: 1 },
          { name: 'Beta Unit', sort_order: 2 },
          { name: 'zeta Unit', sort_order: 3 },
        ]);
        assert.deepEqual(await rowsInStoredOrder(client, 'approvers', 'name, position'), [
          { name: 'Ana Cruz', position: 'Director', sort_order: 1 },
          { name: 'ana Reyes', position: 'Director', sort_order: 2 },
          { name: 'ana Reyes', position: 'Officer in Charge', sort_order: 3 },
          { name: 'Zeta Santos', position: 'Chief', sort_order: 4 },
        ]);
      } finally {
        client.close();
      }
    },
  },
];
