'use strict';

// Helpers shared by the Employee directory checks. Not a check file itself: the runner
// only loads files ending in .check.js.

const assert = require('node:assert/strict');
const { postJson } = require('./admin-http');

function sendJson(baseUrl, method, route, body, cookie) {
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  return fetch(`${baseUrl}${route}`, { method, headers, body: body && JSON.stringify(body) });
}

async function listDirectory(baseUrl, search = '') {
  const response = await fetch(`${baseUrl}/api/employees?search=${encodeURIComponent(search)}`);
  assert.equal(response.status, 200);
  return (await response.json()).employees;
}

async function restoreRows(client, table, rows) {
  await client.query(`DELETE FROM ${table}`, []);
  for (const row of rows) {
    const columns = Object.keys(row);
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => row[column])
    );
  }
}

// The directory is shared by every check, so the seeded rows are put back afterwards.
async function withDirectoryRestored(db, callback) {
  const savedRows = await db.all('SELECT * FROM employees_directory ORDER BY id', []);
  try {
    await callback();
  } finally {
    await db.transaction((client) => restoreRows(client, 'employees_directory', savedRows));
  }
}

async function addEntry(baseUrl, cookie, entry) {
  const response = await postJson(baseUrl, '/api/employees', entry, cookie);
  assert.equal(response.status, 200);
  return (await response.json()).id;
}

module.exports = { sendJson, listDirectory, withDirectoryRestored, addEntry };
