'use strict';

// Applies migrations/*.sql to the database chosen by TURSO_DATABASE_URL, in numeric
// order, recording each one so a repeat run only applies new files.

const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SQL_FILE_SUFFIX = '.sql';
// The name is written into the recording statement, so only these characters are allowed.
const MIGRATION_FILE_PATTERN = /^(\d+)_[a-z0-9_]+\.sql$/;
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)`;

function migrationNumber(name) {
  return Number(MIGRATION_FILE_PATTERN.exec(name)[1]);
}

function listMigrationFiles(migrationsDir) {
  const names = fs.readdirSync(migrationsDir).filter((name) => name.endsWith(SQL_FILE_SUFFIX));
  const badName = names.find((name) => !MIGRATION_FILE_PATTERN.test(name));
  if (badName) {
    throw new Error(`Migration file name must look like 0001_lowercase_words.sql: ${badName}`);
  }
  return names.sort((a, b) => migrationNumber(a) - migrationNumber(b) || a.localeCompare(b));
}

// The file and its record run as one transaction, so a failed file leaves nothing behind.
function migrationScript(name, sql) {
  return [
    'BEGIN;',
    sql,
    ';',
    `INSERT INTO schema_migrations (name, applied_at) VALUES ('${name}', datetime('now'));`,
    'COMMIT;',
  ].join('\n');
}

async function applyMigrations({ migrationsDir = MIGRATIONS_DIR } = {}) {
  await db.run(CREATE_MIGRATIONS_TABLE, []);
  const appliedRows = await db.all('SELECT name FROM schema_migrations', []);
  const alreadyApplied = new Set(appliedRows.map((row) => row.name));
  const newlyApplied = [];
  for (const name of listMigrationFiles(migrationsDir)) {
    if (alreadyApplied.has(name)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    await db.executeScript(migrationScript(name, sql));
    newlyApplied.push(name);
  }
  return newlyApplied;
}

async function main() {
  try {
    const applied = await applyMigrations();
    console.log(
      applied.length === 0
        ? 'No new migrations to apply.'
        : `Applied ${applied.length} migration(s):\n  ${applied.join('\n  ')}`
    );
  } catch (err) {
    console.error(`Migration failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (require.main === module) main();

module.exports = { applyMigrations };
