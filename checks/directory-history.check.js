'use strict';

// An entry added from a form has only a full name, so its history is found by that name.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { withFormsRestored, insertForm, getJson } = require('./form-helpers');
const { addEntry } = require('./directory-helpers');

const AUTO_ADDED_NAME = 'Zed Autoadded';
const SPLIT_ENTRY = { firstname: 'Pia', middle_name: '', last_name: 'Cruz', position: 'Clerk', assigned_unit: 'IMSD' };

module.exports = [
  {
    name: 'history of an entry with only a full name finds its forms, whatever the capitals',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { lastID } = await db.run(
          'INSERT INTO employees_directory (full_name, position, assigned_unit) VALUES (?, ?, ?) RETURNING id',
          [AUTO_ADDED_NAME, 'Analyst', 'TSSD']
        );
        const formId = await insertForm(db, { employees: [AUTO_ADDED_NAME.toUpperCase()] });
        const { employee, history } = await getJson(baseUrl, `/api/employees/${lastID}/history`);
        assert.equal(employee.full_name, AUTO_ADDED_NAME);
        assert.deepEqual(history.map((entry) => entry.id), [formId]);
      });
    },
  },
  {
    name: 'history of an entry with only a full name does not match the text "null null"',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { lastID } = await db.run(
          'INSERT INTO employees_directory (full_name) VALUES (?) RETURNING id',
          [AUTO_ADDED_NAME]
        );
        await insertForm(db, { employees: ['null null'] });
        const { history } = await getJson(baseUrl, `/api/employees/${lastID}/history`);
        assert.equal(history.length, 0);
      });
    },
  },
  {
    name: 'history still finds forms written as "first last" and "last, first"',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const id = await addEntry(baseUrl, cookie, SPLIT_ENTRY);
        const first = await insertForm(db, { employees: ['Pia Cruz'] });
        const second = await insertForm(db, { minute: 1, employees: ['Cruz, Pia'] });
        const { history } = await getJson(baseUrl, `/api/employees/${id}/history`);
        assert.deepEqual(history.map((entry) => entry.id).sort(), [first, second].sort());
      });
    },
  },
];
