'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADMIN_PAGE = path.join(__dirname, '..', 'public', 'admin.html');
const CATEGORY_NAMES = ['Form options', 'Security', 'Data', 'Employees'];
const CATEGORY_PANELS = {
  'form-options': 'divisionList',
  security: 'changePasswordForm',
  data: 'runCleanupBtn',
  employees: 'employeeTableBody',
};
// The Employees tab replaces the old standalone page: its table, search, pagination and modals.
const EMPLOYEE_CONTROLS = ['employeeSearch', 'employeePagination', 'employeeModal', 'employeeDeleteModal', 'employeeHistoryModal', 'employeeSummaryModal'];
const EMPLOYEE_SCRIPTS = ['/js/employee-rows.js', '/js/admin-employees.js'];

module.exports = [
  {
    name: 'admin page has four categories, each holding its controls',
    run() {
      const html = fs.readFileSync(ADMIN_PAGE, 'utf8');
      for (const name of CATEGORY_NAMES) assert.ok(html.includes(`>${name}</button>`), name);
      assert.ok(html.includes('/js/admin-tabs.js'));
      assert.ok(html.includes('/js/admin-divisions.js'));
      assert.ok(html.includes('id="divisionModal"'));
      assert.ok(html.includes('/js/admin-list-modal.js'), 'one modal helper for both lists');
      assert.ok(html.includes('/js/admin-approvers.js'));
      assert.ok(html.includes('id="approverModal"'));
      assert.ok(!html.includes('id="divisionOptions"'), 'the comma-separated text box is gone');
      const formOptions = html.indexOf('data-tab-panel="form-options"');
      const security = html.indexOf('data-tab-panel="security"');
      const approverList = html.indexOf('id="approverList"');
      assert.ok(approverList > formOptions && approverList < security, 'Approvers in Form options');
      for (const [tab, controlId] of Object.entries(CATEGORY_PANELS)) {
        const start = html.indexOf(`data-tab-panel="${tab}"`);
        const end = html.indexOf('data-tab-panel=', start + 1);
        const panel = html.slice(start, end === -1 ? undefined : end);
        assert.ok(panel.includes(`id="${controlId}"`), `${tab} holds ${controlId}`);
      }
      for (const id of EMPLOYEE_CONTROLS) assert.ok(html.includes(`id="${id}"`), id);
      for (const script of EMPLOYEE_SCRIPTS) assert.ok(html.includes(`src="${script}"`), script);
      assert.match(html, /<th[^>]*>Last Used<\/th>/);
    },
  },
];
