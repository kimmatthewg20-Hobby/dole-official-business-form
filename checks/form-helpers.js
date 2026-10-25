'use strict';

// Helpers shared by the form checks. Not a check file itself: the runner only
// loads files ending in .check.js.

const assert = require('node:assert/strict');
const { postJson } = require('./admin-http');

const TRACKER_PAGE_SIZE = 15;
const TRACKER_WINDOW_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FORM_COUNT_FOR_PAGING = 17;
const ENTRIES_PAGE_LIMIT = 2;

const VALID_SUBMISSION = {
  employees: [
    { name: 'Ana Reyes', position: 'Clerk' },
    { name: 'Ben Cruz', position: 'Driver' },
    { name: 'Cora Diaz', position: 'Engineer' },
  ],
  office: 'Department of Labor and Employment',
  division: 'TSSD',
  dateMode: 'more-than-one-day',
  datesOfOB: ['2026-03-02', '2026-03-03'],
  locationFrom: 'Regional Office',
  locationTo: 'Municipal Hall',
  departureTime: '08:00',
  returnTime: '17:30',
  purpose: 'Site visit',
  approvedBy: 'Head Person',
  approvedByPosition: 'Provincial Head',
};

const FORM_TABLES = ['official_business', 'employees'];
const LIST_TABLES = ['divisions', 'approvers'];
const VALID_DIVISION_CODE = 'TSSD';

// Forms are shared by every check, so each one starts with none and puts the
// original rows back afterwards, whatever happened. A submission is only accepted
// for a listed Division and Approver, so the lists hold just those of VALID_SUBMISSION.
async function withFormsRestored(db, callback) {
  const saved = {};
  for (const table of [...FORM_TABLES, ...LIST_TABLES]) {
    saved[table] = await db.all(`SELECT * FROM ${table} ORDER BY id`, []);
  }
  for (const table of LIST_TABLES) await db.run(`DELETE FROM ${table}`, []);
  await db.run('INSERT INTO divisions (name, code) VALUES (?, ?)', [VALID_SUBMISSION.division, VALID_DIVISION_CODE]);
  await db.run('INSERT INTO approvers (name, position) VALUES (?, ?)', [
    VALID_SUBMISSION.approvedBy,
    VALID_SUBMISSION.approvedByPosition,
  ]);
  await db.run('DELETE FROM employees', []);
  await db.run('DELETE FROM official_business', []);
  try {
    await callback();
  } finally {
    await db.transaction(async (client) => {
      await client.query('DELETE FROM employees', []);
      await client.query('DELETE FROM official_business', []);
      for (const table of LIST_TABLES) await client.query(`DELETE FROM ${table}`, []);
      for (const table of [...FORM_TABLES, ...LIST_TABLES]) {
        for (const row of saved[table]) {
          const columns = Object.keys(row);
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            columns.map((column) => row[column])
          );
        }
      }
    });
  }
}

async function getJson(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`);
  assert.equal(response.status, 200, route);
  return response.json();
}

async function countRows(db, table) {
  return (await db.get(`SELECT COUNT(*) AS total FROM ${table}`, [])).total;
}

// Inserts a form straight into the database, created `daysAgo` days ago plus `minute` minutes.
async function insertForm(db, { daysAgo = 0, minute = 0, office = 'DOLE', employees = ['Solo Person'] }) {
  const created = new Date(Date.now() - daysAgo * MS_PER_DAY + minute * 60 * 1000).toISOString();
  const { lastID } = await db.run(
    `INSERT INTO official_business (date_created, office, division, date_of_ob, dates_of_ob,
       location_from, location_to, departure_time, return_time, purpose, timestamp)
     VALUES (?, ?, 'TSSD', '2026-03-02', '["2026-03-02"]', 'A', 'B', '08:00', '17:00', 'Purpose', ?) RETURNING id`,
    [created, office, created]
  );
  for (const name of employees) {
    await db.run('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [lastID, name, 'Staff']);
  }
  return lastID;
}

async function submit(baseUrl, body) {
  return postJson(baseUrl, '/api/submit', body);
}

module.exports = {
  TRACKER_PAGE_SIZE,
  TRACKER_WINDOW_DAYS,
  FORM_COUNT_FOR_PAGING,
  ENTRIES_PAGE_LIMIT,
  VALID_SUBMISSION,
  withFormsRestored,
  getJson,
  countRows,
  insertForm,
  submit,
};
