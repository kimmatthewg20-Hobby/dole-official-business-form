'use strict';

// Writes validated rows with their original ids. Everything, including the --force
// delete, goes in one batch, so a failure anywhere leaves the database as it was.
// Inserting explicit ids into AUTOINCREMENT tables moves sqlite_sequence past the
// highest id, so rows created later never collide with imported ones.

const { TABLE_COLUMNS, TABLES_IN_INSERT_ORDER } = require('./tables');
const { nameKey } = require('../../routes/directory-name');

const DIRECTORY_TABLE = 'employees_directory';
const NAME_KEY_COLUMN = 'name_key';

class ImportRefusedError extends Error {}

// The export has no matching key, so it is made here; without it an imported employee would
// never be recognised on a form and would be added a second time.
function derivedColumns(table, row) {
  if (table !== DIRECTORY_TABLE || typeof row.full_name !== 'string') return { columns: [], values: [] };
  return { columns: [NAME_KEY_COLUMN], values: [nameKey(row.full_name)] };
}

// Table and column names come only from TABLE_COLUMNS and the constants above, never from the export file.
function insertStatement(table, row) {
  const derived = derivedColumns(table, row);
  const exported = TABLE_COLUMNS[table].filter((column) => column in row);
  const columns = [...exported, ...derived.columns];
  const placeholders = columns.map(() => '?').join(', ');
  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    args: [...exported.map((column) => row[column]), ...derived.values],
  };
}

function deleteStatements() {
  return [...TABLES_IN_INSERT_ORDER].reverse().map((table) => ({ sql: `DELETE FROM ${table}`, args: [] }));
}

async function countRows(db) {
  const counts = {};
  for (const table of TABLES_IN_INSERT_ORDER) {
    const row = await db.get(`SELECT COUNT(*) AS count FROM ${table}`, []);
    counts[table] = Number(row.count);
  }
  return counts;
}

function describeCounts(counts) {
  return Object.entries(counts)
    .map(([table, count]) => `${table}: ${count}`)
    .join(', ');
}

// Returns the row counts found in the database after the import.
async function loadExport(db, rowsByTable, { force = false } = {}) {
  const existing = await countRows(db);
  const hasRows = Object.values(existing).some((count) => count > 0);
  if (hasRows && !force) {
    throw new ImportRefusedError(
      `the target database already has rows (${describeCounts(existing)}). ` +
        'Re-run with --force to delete them and replace them with the export.'
    );
  }
  const inserts = TABLES_IN_INSERT_ORDER.flatMap((table) =>
    rowsByTable[table].map((row) => insertStatement(table, row))
  );
  await db.batch([...(force ? deleteStatements() : []), ...inserts]);
  return countRows(db);
}

module.exports = { loadExport, describeCounts, ImportRefusedError };
