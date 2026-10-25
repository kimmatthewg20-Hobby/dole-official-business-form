'use strict';

// What the browser's Elements panel shows must be clean: no working notes in the markup, only
// the author's signature at the top of each page's <head>.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generatePrintableHTML } = require('../public/print');
const { SIGNATURE_COMMENT } = require('../public/signature');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMMENT = /<!--[\s\S]*?-->/g;
const ONE_SIGNATURE = 1;
const PRINT_FORM = {
  formData: { id: 1, dates_of_ob: '["2026-10-24"]', location_from: 'A', location_to: 'B',
    departure_time: '08:00', return_time: '17:00', purpose: 'Test' },
  employees: [{ name: 'Employee One', position: 'Clerk' }],
  settings: {},
};

function comments(html) {
  return html.match(COMMENT) || [];
}

module.exports = [
  {
    name: 'clean source: every page carries only the signature as a comment, at the top of its head',
    run() {
      const pages = fs.readdirSync(PUBLIC_DIR).filter((name) => name.endsWith('.html'));
      assert.ok(pages.length > 0);
      for (const page of pages) {
        const html = fs.readFileSync(path.join(PUBLIC_DIR, page), 'utf8');
        assert.deepEqual(comments(html), [SIGNATURE_COMMENT], `${page} has other comments`);
        assert.ok(html.includes(`<head>\n${SIGNATURE_COMMENT}\n`), `${page}: signature is not first in <head>`);
      }
    },
  },
  {
    name: 'clean source: the generated print page carries only the signature as a comment',
    run() {
      const found = comments(generatePrintableHTML(PRINT_FORM));
      assert.equal(found.length, ONE_SIGNATURE);
      assert.equal(found[0], SIGNATURE_COMMENT);
    },
  },
];
