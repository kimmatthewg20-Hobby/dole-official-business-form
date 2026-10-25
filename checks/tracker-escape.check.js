'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { escapeHtml } = require('../public/js/escape-html');
const { rowHtml, errorHtml } = require('../public/js/tracker-rows');

const PAYLOAD = '<script>alert(1)</script>';
const ENTRY = {
  id: 7,
  dateOfOB: 'Jan 1',
  timeOfOB: '8:00 AM',
  employees: `Ana ${PAYLOAD}`,
  purpose: `<img src=x onerror=alert(1)>`,
  destination: `"quoted" & 'single'`,
  dateFiled: 'Jan 2',
};

module.exports = [
  {
    name: 'escapeHtml makes markup characters inert',
    run() {
      assert.equal(escapeHtml(PAYLOAD), '&lt;script&gt;alert(1)&lt;/script&gt;');
      assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
      assert.equal(escapeHtml(null), '');
    },
  },
  {
    name: 'tracker rows never contain user markup',
    run() {
      const html = rowHtml(ENTRY);
      assert.ok(!html.includes('<script'));
      assert.ok(!html.includes('<img'));
      assert.ok(html.includes('&lt;script&gt;'));
      assert.ok(html.includes('&quot;quoted&quot; &amp; &#39;single&#39;'));
      assert.ok(html.includes('viewForm(7)'));
    },
  },
  {
    name: 'tracker rows keep a dash for empty values and a numeric view id',
    run() {
      const html = rowHtml({ id: '7);alert(1', dateOfOB: '' });
      assert.ok(html.includes('viewForm(0)'));
      assert.ok(html.includes('>-<'));
    },
  },
  {
    name: 'tracker error message is escaped',
    run() {
      assert.ok(!errorHtml(PAYLOAD).includes('<script'));
    },
  },
  {
    name: 'tracker page loads the helpers and has no inline style block or raw interpolation',
    run() {
      const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'tracker.html'), 'utf8');
      assert.ok(page.includes('js/escape-html.js'));
      assert.ok(page.includes('js/tracker-rows.js'));
      assert.ok(!page.includes('<style'));
      assert.ok(!page.includes('${error.message}'));
      assert.ok(!page.includes('${entry.'));
    },
  },
];
