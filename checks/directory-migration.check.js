'use strict';

// Migration 0006 rebuilds the Employee directory on a database that already holds entries,
// as it will on Turso. It runs in a child process against its own file, so the shared check
// database is never touched.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { withReader, rowsOf } = require('./import-helpers');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATE_MODULE = path.join(__dirname, '..', 'scripts', 'migrate.js');
const DB_MODULE = path.join(__dirname, '..', 'db.js');
const DIRECTORY_MIGRATION = '0006_directory_last_used.sql';
const UPGRADE_NAME = 'directory-upgrade';
const OLD_COLUMNS = 'id, employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit';
const DELETED_ID = 30;

function applyMigrationsIn(dir, databaseUrl) {
  const script = `require(${JSON.stringify(MIGRATE_MODULE)}).applyMigrations({ migrationsDir: ${JSON.stringify(dir)} })
    .then(() => require(${JSON.stringify(DB_MODULE)}).close())
    .catch((err) => { console.error(err.message); process.exit(1); });`;
  const result = spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, TURSO_DATABASE_URL: databaseUrl, TURSO_AUTH_TOKEN: '' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
}

function copyMigrations(dir, keep) {
  for (const name of fs.readdirSync(MIGRATIONS_DIR).filter(keep)) {
    fs.copyFileSync(path.join(MIGRATIONS_DIR, name), path.join(dir, name));
  }
}

async function fillOldDirectory(reader) {
  await reader.execute(`INSERT INTO employees_directory (${OLD_COLUMNS}) VALUES
    (7, 'OLD-1', 'José', 'Mora', 'Peña', 'JOSÉ  M.   PEÑA', 'Clerk', 'TSSD'),
    (12, NULL, NULL, NULL, NULL, 'Ana Reyes', 'Driver', NULL),
    (${DELETED_ID}, 'GONE', 'Gone', '', 'Person', 'Gone Person', 'Aide', 'IMSD')`);
  await reader.execute(`DELETE FROM employees_directory WHERE id = ${DELETED_ID}`);
}

module.exports = [
  {
    name: 'migration 0006 keeps every entry and starts its last-used date on the migration day',
    async run({ tempDir }) {
      const dir = path.join(tempDir, UPGRADE_NAME);
      fs.mkdirSync(dir);
      const databaseUrl = `file:${path.join(tempDir, `${UPGRADE_NAME}.db`)}`;
      copyMigrations(dir, (name) => name.endsWith('.sql') && name < DIRECTORY_MIGRATION);
      applyMigrationsIn(dir, databaseUrl);
      const before = await withReader(databaseUrl, async (reader) => {
        await fillOldDirectory(reader);
        return rowsOf(reader, `SELECT ${OLD_COLUMNS} FROM employees_directory ORDER BY id`);
      });

      copyMigrations(dir, (name) => name === DIRECTORY_MIGRATION);
      applyMigrationsIn(dir, databaseUrl);

      await withReader(databaseUrl, async (reader) => {
        const [{ today }] = await rowsOf(reader, "SELECT date('now') AS today");
        assert.deepEqual(await rowsOf(reader, `SELECT ${OLD_COLUMNS} FROM employees_directory ORDER BY id`), before);
        const keys = await rowsOf(reader, 'SELECT name_key, last_used_at FROM employees_directory ORDER BY id');
        assert.deepEqual(keys, [
          { name_key: 'josé m. peña', last_used_at: today },
          { name_key: 'ana reyes', last_used_at: today },
        ]);
        await reader.execute("INSERT INTO employees_directory (full_name, position) VALUES ('New One', 'Aide')");
        const [added] = await rowsOf(reader, "SELECT id, last_used_at FROM employees_directory WHERE full_name = 'New One'");
        assert.deepEqual(added, { id: DELETED_ID + 1, last_used_at: today });
      });
    },
  },
];
