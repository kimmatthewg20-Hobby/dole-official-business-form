'use strict';

// One-off move of the Supabase export into the database chosen by TURSO_DATABASE_URL.
// It reads files only and never connects to Postgres. Only counts are printed: the
// rows hold staff names and the admin password.

const db = require('../db');
const { readTableExport } = require('./import/read-export');
const { validateExport } = require('./import/validate');
const { loadExport, ImportRefusedError } = require('./import/load');
const { TABLES_IN_INSERT_ORDER } = require('./import/tables');

const FORCE_FLAG = '--force';
const HELP_FLAGS = ['--help', '-h'];
const LOCAL_URL_SCHEME = 'file:';

class UsageError extends Error {}

const HELP_TEXT = `Usage: npm run db:import -- \\
  --official-business=PATH --employees=PATH --employees-directory=PATH --settings=PATH [--force]

Loads the four tables exported from the Supabase dashboard into the database named by
TURSO_DATABASE_URL (default: file:local.db; a Turso URL also needs TURSO_AUTH_TOKEN).
Apply the migrations to that database first (npm run db:migrate).

Each PATH is a .csv file (header row, as the Supabase dashboard exports it; an unquoted
empty field or an unquoted NULL becomes NULL) or a .json file (an array of row objects).
Rows keep their original ids. Every row is checked first and everything is written in one
transaction: one invalid row means nothing is written. Columns that are not in the
schema are rejected, and every employee's ob_id must match an imported form.

The import refuses to run if any of the four tables already has rows.
${FORCE_FLAG}  DELETES every existing row of official_business, employees,
         employees_directory and settings, in the same transaction, before importing.`;

function optionName(table) {
  return `--${table.replace(/_/g, '-')}`;
}

function parseArguments(args) {
  const files = {};
  let force = false;
  for (const arg of args) {
    if (HELP_FLAGS.includes(arg)) return { help: true };
    if (arg === FORCE_FLAG) {
      force = true;
      continue;
    }
    const [name, ...rest] = arg.split('=');
    const table = TABLES_IN_INSERT_ORDER.find((candidate) => optionName(candidate) === name);
    const filePath = rest.join('=');
    if (!table || !filePath) throw new UsageError(`unknown argument ${name}`);
    files[table] = filePath;
  }
  const missing = TABLES_IN_INSERT_ORDER.filter((table) => !files[table]).map(optionName);
  if (missing.length > 0) throw new UsageError(`missing ${missing.join(', ')}`);
  return { files, force };
}

// The host only: a Turso URL may carry the auth token in its query string.
function describeTarget(url) {
  if (url.startsWith(LOCAL_URL_SCHEME)) return `local file ${url.slice(LOCAL_URL_SCHEME.length)}`;
  try {
    return `Turso host ${new URL(url).host}`;
  } catch {
    return 'a URL that could not be read';
  }
}

function readExport(files) {
  const rowsByTable = {};
  for (const table of TABLES_IN_INSERT_ORDER) rowsByTable[table] = readTableExport(files[table]);
  return validateExport(rowsByTable);
}

function rowCounts(rowsByTable) {
  return Object.fromEntries(TABLES_IN_INSERT_ORDER.map((table) => [table, rowsByTable[table].length]));
}

function printCounts(heading, counts) {
  console.log(heading);
  for (const table of TABLES_IN_INSERT_ORDER) console.log(`  ${table}: ${counts[table]}`);
}

async function importData(args) {
  const { help, files, force } = parseArguments(args);
  if (help) {
    console.log(HELP_TEXT);
    return;
  }
  console.log(`Target database: ${describeTarget(db.databaseUrl)}`);
  const rowsByTable = readExport(files);
  printCounts('Rows in the export files:', rowCounts(rowsByTable));
  if (force) console.log(`${FORCE_FLAG}: existing rows of the four tables will be deleted first.`);
  const imported = await loadExport(db, rowsByTable, { force });
  printCounts('Rows now in the database:', imported);
}

async function main() {
  try {
    await importData(process.argv.slice(2));
  } catch (err) {
    if (err instanceof ImportRefusedError) console.error(`Refusing to import: ${err.message}`);
    else console.error(`Import failed, nothing was written: ${err.message}`);
    if (err instanceof UsageError) console.error(`\n${HELP_TEXT}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (require.main === module) main();

module.exports = { importData };
