'use strict';

// The admin and Employees pages show names, positions, units, purposes and destinations typed by
// staff. Every value reaching innerHTML must go through the shared escaping helper.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { employeeRowHtml, messageRowHtml, historyRowHtml } = require('../public/js/employee-rows');
const views = require('../public/js/admin-cleanup-views');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['admin.html', 'employees.html'];
const PAYLOAD = '<img src=x onerror=alert(1)>';
const INNER_HTML_STATEMENT = /innerHTML\s*=[^;]*;/g;
const INTERPOLATION = /\$\{([^}]*)\}/g;

function readPublic(name) {
  return fs.readFileSync(path.join(PUBLIC_DIR, name), 'utf8');
}

function assertInert(html) {
  assert.ok(!html.includes('<img'), html);
  assert.ok(html.includes('&lt;img'), html);
}

module.exports = [
  {
    name: 'no admin or Employees page assigns raw interpolated text to innerHTML',
    run() {
      for (const page of PAGES) {
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
    name: 'the admin and Employees pages use the shared stylesheet and keep no inline style block',
    run() {
      for (const page of PAGES) {
        const source = readPublic(page);
        assert.ok(!source.includes('<style'), page);
        assert.ok(source.includes('css/tokens.css') && source.includes('css/components.css'), page);
      }
      assert.ok(readPublic('employees.html').includes('js/escape-html.js'));
      assert.ok(readPublic('admin.html').includes('js/escape-html.js'));
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
