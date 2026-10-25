'use strict';

// Employees added from a submitted form have only a full name, position and unit. Their rows on
// the admin's Employees tab are tagged so the admin can find and complete them.

const assert = require('node:assert/strict');
const { employeeRowHtml } = require('../public/js/employee-rows');

const NEEDS_DETAILS = 'Needs details';
const COMPLETE = {
  id: 1, employee_id: 'E-1', firstname: 'Ana', middle_name: '', last_name: 'Reyes',
  full_name: 'Ana Reyes', position: 'Clerk', assigned_unit: 'TSSD',
};
const AUTO_ADDED = { id: 2, employee_id: '', firstname: '', last_name: '', full_name: 'Ben Cruz', position: 'Driver', assigned_unit: 'TSSD' };

module.exports = [
  {
    name: 'a row lacking the ID or first or last name is tagged as needing details',
    run() {
      assert.ok(employeeRowHtml(AUTO_ADDED, 'N/A').includes(NEEDS_DETAILS));
      assert.ok(employeeRowHtml({ ...COMPLETE, employee_id: null }, 'N/A').includes(NEEDS_DETAILS));
      assert.ok(employeeRowHtml({ ...COMPLETE, last_name: '' }, 'N/A').includes(NEEDS_DETAILS));
      assert.ok(!employeeRowHtml(COMPLETE, 'N/A').includes(NEEDS_DETAILS));
    },
  },
  {
    name: 'each row has Edit and Delete actions that name the employee and show their words',
    run() {
      const html = employeeRowHtml(COMPLETE, 'N/A');
      for (const action of ['Edit', 'Delete', 'History']) {
        assert.ok(html.includes(`aria-label="${action} Ana Reyes"`), action);
        assert.ok(html.includes(`>${action}</span>`), `${action} is shown as text`);
      }
    },
  },
];
