'use strict';

// Runs the import script as Kim would, in a child process pointed at its own throwaway
// database file under tempDir, so the shared check database is never touched.

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@libsql/client');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const IMPORT_SCRIPT = path.join(SCRIPTS_DIR, 'import-data.js');
const MIGRATE_SCRIPT = path.join(SCRIPTS_DIR, 'migrate.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'import');
const INVALID_EMPLOYEES_FIXTURE = path.join(FIXTURES_DIR, 'invalid', 'employees.csv');
const TABLES = ['official_business', 'employees', 'employees_directory', 'settings'];

function fixtureArgs(format, overrides = {}) {
  return TABLES.map((table) => {
    const file = overrides[table] || path.join(FIXTURES_DIR, format, `${table}.${format}`);
    return `--${table.replace(/_/g, '-')}=${file}`;
  });
}

function runNode(script, args, databaseUrl) {
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, TURSO_DATABASE_URL: databaseUrl, TURSO_AUTH_TOKEN: '' },
    encoding: 'utf8',
  });
}

function freshDatabase(tempDir, name) {
  const databaseUrl = `file:${path.join(tempDir, `${name}.db`)}`;
  const migrated = runNode(MIGRATE_SCRIPT, [], databaseUrl);
  assert.equal(migrated.status, 0, migrated.stderr);
  return databaseUrl;
}

function importInto(databaseUrl, args) {
  return runNode(IMPORT_SCRIPT, args, databaseUrl);
}

function assertSucceeded(result) {
  assert.equal(result.status, 0, `import failed:\n${result.stdout}\n${result.stderr}`);
}

async function withReader(databaseUrl, callback) {
  const reader = createClient({ url: databaseUrl });
  try {
    return await callback(reader);
  } finally {
    reader.close();
  }
}

async function rowsOf(reader, sql) {
  return (await reader.execute(sql)).rows.map((row) => ({ ...row }));
}

function countsIn(databaseUrl) {
  return withReader(databaseUrl, async (reader) => {
    const counts = {};
    for (const table of TABLES) {
      const [row] = await rowsOf(reader, `SELECT COUNT(*) AS count FROM ${table}`);
      counts[table] = Number(row.count);
    }
    return counts;
  });
}

module.exports = {
  INVALID_EMPLOYEES_FIXTURE,
  fixtureArgs,
  freshDatabase,
  importInto,
  assertSucceeded,
  withReader,
  rowsOf,
  countsIn,
};
