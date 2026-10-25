'use strict';

// The form page explains each Date mode by what it prints, and the success screen names the
// one stored form with its one Reference code and a Print button that carries the code.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JS_DIR = path.join(__dirname, '..', 'public', 'js');

function script(name) {
  return fs.readFileSync(path.join(JS_DIR, name), 'utf8');
}

module.exports = [
  {
    name: 'date-mode ui: the hover tips say what each mode prints',
    run() {
      const source = script('date-mode-form.js');
      assert.ok(source.includes("tip: 'One form per employee, listing all the dates'"));
      assert.ok(source.includes("tip: 'One form per employee for each date'"));
    },
  },
  {
    name: 'date-mode ui: the success line names the form by its number and the Print link carries the code',
    run() {
      const source = script('created-forms.js');
      assert.ok(source.includes('`Form No. ${form.id}: `'), 'the line reads "Form No. 13: October 26-28, 2026"');
      assert.ok(source.includes('#code=${encodeURIComponent(form.referenceCode)}'));
    },
  },
];
