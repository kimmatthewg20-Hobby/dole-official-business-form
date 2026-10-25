'use strict';

// HTTP helpers shared by the export and import checks. Not a check file itself: the runner
// only loads files ending in .check.js.

const assert = require('node:assert/strict');
const { postJson } = require('./admin-http');

const EXPORT_ROUTE = '/api/export-data';
const IMPORT_ROUTE = '/api/import-data';
const OK = 200;
const BAD_REQUEST = 400;
// Listed so that deleting in this order and inserting in reverse respects the employees' link to forms.
const RESTORED_TABLES = [
  'employees',
  'official_business',
  'settings',
  'divisions',
  'approvers',
  'employees_directory',
];

async function restoreTables(db, saved) {
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

// Import replaces whole tables that later checks rely on, so put every row back.
async function withTablesRestored(db, callback) {
  const saved = {};
  for (const table of RESTORED_TABLES) saved[table] = await db.all(`SELECT * FROM ${table}`, []);
  try {
    await callback();
  } finally {
    await restoreTables(db, saved);
  }
}

// Every row of every exported table, in id order, to compare a database before and after.
async function snapshot(db) {
  const rows = {};
  for (const table of RESTORED_TABLES)
    rows[table] = await db.all(`SELECT * FROM ${table} ORDER BY id`, []);
  return rows;
}

async function exportData(baseUrl, cookie) {
  const response = await fetch(`${baseUrl}${EXPORT_ROUTE}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(response.status, OK);
  return response.json();
}

async function importData(baseUrl, cookie, body) {
  const response = await postJson(baseUrl, IMPORT_ROUTE, body, cookie);
  assert.equal(response.status, OK, JSON.stringify(await response.clone().json()));
  return response.json();
}

// Returns the error message of an import the server refused as a bad file.
async function rejectedImport(baseUrl, cookie, body) {
  const response = await postJson(baseUrl, IMPORT_ROUTE, body, cookie);
  assert.equal(response.status, BAD_REQUEST);
  return (await response.json()).error;
}

module.exports = {
  EXPORT_ROUTE,
  IMPORT_ROUTE,
  RESTORED_TABLES,
  withTablesRestored,
  snapshot,
  exportData,
  importData,
  rejectedImport,
};
