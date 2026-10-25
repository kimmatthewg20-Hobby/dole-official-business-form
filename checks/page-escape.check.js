'use strict';

// The admin page and its Employees tab show names, positions, units, purposes and destinations
// typed by staff. Every value reaching innerHTML must go through the shared escaping helper.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { employeeRowHtml, messageRowHtml, historyRowHtml } = require('../public/js/employee-rows');
const views = require('../public/js/admin-cleanup-views');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ADMIN_PAGE = 'admin.html';
const EMPLOYEES_TAB_SCRIPT = /^admin-employees.*\.js$/;
const PAYLOAD = '<img src=x onerror=alert(1)>';
const INNER_HTML_STATEMENT = /innerHTML\s*=[^;]*;/g;
const INTERPOLATION = /\$\{([^}]*)\}/g;

function readPublic(name) {
  return fs.readFileSync(path.join(PUBLIC_DIR, name), 'utf8');
}

function employeesTabScripts() {
  return fs.readdirSync(path.join(PUBLIC_DIR, 'js'))
    .filter((name) => EMPLOYEES_TAB_SCRIPT.test(name))
    .map((name) => path.join('js', name));
}

function assertInert(html) {
  assert.ok(!html.includes('<img'), html);
  assert.ok(html.includes('&lt;img'), html);
}

module.exports = [
  {
    name: 'neither the admin page nor its Employees tab assigns raw interpolated text to innerHTML',
    run() {
      const scripts = employeesTabScripts();
      assert.ok(scripts.length > 0, 'the Employees tab scripts are found');
      for (const page of [ADMIN_PAGE, ...scripts]) {
        const source = readPublic(page);
        for (const [statement] of source.matchAll(INNER_HTML_STATEMENT)) {
          for (const [, expression] of statement.matchAll(INTERPOLATION)) {
            assert.fail(`${page}: ${expression} is put into innerHTML without escaping`);
          }
        }
      }
    },
  },
  {
    name: 'the admin page uses the shared stylesheet, keeps no inline style block and loads the escaping helper',
    run() {
      const source = readPublic(ADMIN_PAGE);
      assert.ok(!source.includes('<style'));
      assert.ok(source.includes('css/tokens.css') && source.includes('css/components.css'));
      assert.ok(source.indexOf('js/escape-html.js') < source.indexOf('js/employee-rows.js'), 'escaping loads before the row builders');
      assert.ok(source.indexOf('js/employee-rows.js') !== -1);
    },
  },
  {
    name: 'employee rows never contain user markup',
    run() {
      const employee = { id: `1"${PAYLOAD}`, full_name: PAYLOAD, position: PAYLOAD, assigned_unit: PAYLOAD };
      const html = employeeRowHtml(employee, PAYLOAD);
      assertInert(html);
      assert.ok(!html.includes('data-id="1""'));
    },
  },
  {
    name: 'history rows and messages never contain user markup',
    run() {
      assertInert(historyRowHtml({ travelId: PAYLOAD, dateDisplay: PAYLOAD, locationText: PAYLOAD }));
      assertInert(messageRowHtml(PAYLOAD, 4, 'table-message'));
    },
  },
  {
    name: 'cleanup results never contain markup from the server',
    run() {
      assertInert(views.errorHtml(PAYLOAD));
      assertInert(views.nothingToDeleteHtml(PAYLOAD));
      const result = { wouldDelete: 1, records: [{ id: PAYLOAD, date_created: PAYLOAD, age_days: PAYLOAD }] };
      assertInert(views.dryRunHtml(result, PAYLOAD));
      assertInert(views.cleanupDoneHtml({ deleted: 1, ids: [PAYLOAD] }));
    },
  },
  {
    name: 'admin toasts are built with text, not markup',
    run() {
      const source = readPublic('admin.html');
      assert.ok(!source.includes('toast.innerHTML'));
      assert.ok(source.includes('text.textContent = message'));
    },
  },
];
