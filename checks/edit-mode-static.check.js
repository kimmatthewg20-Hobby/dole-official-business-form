'use strict';

// The Reference code is the edit secret (ADR 0003). It may ride in an address fragment, which
// the browser never sends, but never in a query string, which reaches the server and its logs.
// The form page's edit mode is the only new caller of the code routes.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SOURCE_EXTENSIONS = ['.js', '.html'];
const CODE_IN_QUERY = /[?&](code|edit|referenceCode|reference_code)=/i;
const CODE_READ_FROM_QUERY = /req\.query\.(code|edit|referenceCode|reference_code)\b/;
const CODE_PUT_IN_SEARCH = /searchParams\.(set|append)\(\s*['"`](code|edit)/;
const SCRIPT_TAG = /<script src="(js\/[^"]+)"/g;
// Not preceded by a host name: a link to another site is not a call to our routes.
const API_ROUTE = /(?<![\w.-])\/api\/[A-Za-z/_-]+/g;
// What the form page may call: its own lists and submit, plus finding and saving with a code.
const FORM_PAGE_ROUTES = [
  '/api/settings',
  '/api/submit',
  '/api/divisions',
  '/api/approvers',
  '/api/directory/suggest',
  '/api/lookup/code',
  '/api/edit-with-code',
];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return SOURCE_EXTENSIONS.includes(path.extname(entry.name)) ? [full] : [];
  });
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

module.exports = [
  {
    name: "the tracker's Edit button sends the code after '#' through the shared edit link",
    run() {
      const source = read(path.join(PUBLIC_DIR, 'js', 'tracker-code-lookup.js'));
      assert.ok(source.includes('EditFragment.editLink(code)'));
      assert.ok(!CODE_IN_QUERY.test(source));
      assert.ok(read(path.join(PUBLIC_DIR, 'tracker.html')).includes('<script src="js/edit-fragment.js">'));
    },
  },
  {
    name: 'no server route or page source writes the code into a query string or reads it from one',
    run() {
      const files = [path.join(ROOT, 'server.js'), ...sourceFiles(path.join(ROOT, 'routes')), ...sourceFiles(PUBLIC_DIR)];
      for (const file of files) {
        const text = read(file);
        const name = path.relative(ROOT, file);
        assert.ok(!CODE_IN_QUERY.test(text), `${name} puts a code in a query string`);
        assert.ok(!CODE_READ_FROM_QUERY.test(text), `${name} reads a code from a query string`);
        assert.ok(!CODE_PUT_IN_SEARCH.test(text), `${name} adds a code to search parameters`);
      }
    },
  },
  {
    name: 'the form page and its scripts call only its own routes and the two Reference code routes',
    run() {
      const page = read(path.join(PUBLIC_DIR, 'index.html'));
      const scripts = [...page.matchAll(SCRIPT_TAG)].map((match) => read(path.join(PUBLIC_DIR, match[1])));
      const called = new Set([page, ...scripts].flatMap((text) => text.match(API_ROUTE) || []));
      assert.ok(called.has('/api/edit-with-code'), 'edit mode saves with the code');
      for (const route of called) assert.ok(FORM_PAGE_ROUTES.includes(route), `the form page calls ${route}`);
    },
  },
];
