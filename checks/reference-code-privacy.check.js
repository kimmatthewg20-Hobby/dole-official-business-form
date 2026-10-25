'use strict';

// The Reference code is the edit secret (ADR 0003): no response a visitor without an admin
// session can get, and no printout, may carry it. Every GET route of the app is either walked
// here or admin-only, so a new route cannot quietly leak codes.

const assert = require('node:assert/strict');
const app = require('../server');
const { adminApiOnly } = require('../routes/admin-auth');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const DateMode = require('../public/js/date-mode');

const OK = 200;
const UNAUTHORIZED = 401;
const CODE_FIELD_NAMES = ['reference_code', 'referenceCode'];
// Pages and probes that list no forms, and the cron route that answers only with counts.
const NOT_FORM_LISTINGS = ['/favicon.ico', '/admin', '/', '/tracker', '/healthz', '/api/admin/check', '/api/cron/cleanup'];
const SEPARATE = {
  ...VALID_SUBMISSION,
  dateMode: DateMode.MULTIPLE_SEPARATE_DAYS,
  datesOfOB: ['2026-03-02', '2026-03-03'],
  employees: VALID_SUBMISSION.employees.slice(0, 1),
};

// Walks the mounted routers and returns each GET route with whether its first handler is adminApiOnly.
function getRoutes() {
  const routes = [];
  const visit = (stack) => {
    for (const layer of stack) {
      if (layer.route && layer.route.methods.get) {
        routes.push({ path: layer.route.path, adminOnly: layer.route.stack[0].handle === adminApiOnly });
      } else if (layer.handle && Array.isArray(layer.handle.stack)) {
        visit(layer.handle.stack);
      }
    }
  };
  visit(app._router.stack);
  return routes;
}

// Each public GET route, filled in with real ids so it answers with the forms submitted below.
function publicUrls(formIds, employeeId) {
  return {
    '/api/settings': ['/api/settings'],
    '/api/entries': ['/api/entries', '/api/entries?search=Ana'],
    '/api/entries/paginated': ['/api/entries/paginated'],
    '/api/entries/:id': formIds.map((id) => `/api/entries/${id}`),
    '/api/retrieve/:id': formIds.map((id) => `/api/retrieve/${id}`),
    '/api/tracker': ['/api/tracker'],
    '/api/tracker/all': ['/api/tracker/all'],
    '/print/:id': formIds.map((id) => `/print/${id}`),
    '/api/employees': ['/api/employees', '/api/employees?search=Ana'],
    '/api/employees/:id': [`/api/employees/${employeeId}`],
    '/api/employees/:id/history': [`/api/employees/${employeeId}/history`],
    '/api/directory/suggest': ['/api/directory/suggest?q=Ana'],
    '/api/divisions': ['/api/divisions'],
    '/api/approvers': ['/api/approvers'],
  };
}

// Admin-only routes that read forms, asked without a session: the refusal must carry no code.
const ADMIN_ONLY_URLS = ['/api/admin/forms', '/api/export-data', '/api/cleanup/test?dryRun=true&days=1'];

async function assertNoCode(baseUrl, url, codes, expectedStatus) {
  const response = await fetch(`${baseUrl}${url}`);
  const text = await response.text();
  assert.equal(response.status, expectedStatus, url);
  for (const code of codes) assert.ok(!text.includes(code), `${url} carries a Reference code`);
  for (const field of CODE_FIELD_NAMES) assert.ok(!text.includes(field), `${url} names ${field}`);
}

module.exports = [
  {
    name: 'every GET route is either checked for codes here or needs an admin session',
    async run() {
      const walked = Object.keys(publicUrls([], 0));
      const routes = getRoutes();
      assert.ok(routes.some((route) => route.path === '/api/tracker'), 'the walk reaches the mounted routers');
      assert.ok(routes.some((route) => route.adminOnly), 'the walk tells admin-only routes apart');
      const unchecked = routes
        .filter((route) => !route.adminOnly && !walked.includes(route.path) && !NOT_FORM_LISTINGS.includes(route.path))
        .map((route) => route.path);
      assert.deepEqual(unchecked, []);
    },
  },
  {
    name: 'no public response or printout carries a Reference code',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { forms } = await (await submit(baseUrl, SEPARATE)).json();
        const codes = forms.map((form) => form.referenceCode);
        assert.equal(codes.length, 2);
        assert.ok(codes.every(Boolean));
        const employee = await db.get('SELECT id FROM employees_directory WHERE full_name = ?', [SEPARATE.employees[0].name]);
        assert.ok(employee, 'the submitted employee joined the directory');
        const routes = publicUrls(forms.map((form) => form.id), employee.id);
        for (const url of Object.values(routes).flat()) await assertNoCode(baseUrl, url, codes, OK);
        for (const url of ADMIN_ONLY_URLS) await assertNoCode(baseUrl, url, codes, UNAUTHORIZED);
      });
    },
  },
];
