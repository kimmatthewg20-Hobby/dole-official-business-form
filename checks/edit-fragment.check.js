'use strict';

// The tracker sends staff to the form page in edit mode with the Reference code in the address
// fragment, which the browser never sends to the server (ADR 0003). The form page reads it once
// and wipes it from the address at once.

const assert = require('node:assert/strict');
const EditFragment = require('../public/js/edit-fragment');

const CODE = 'DOLECN1026K7QX';
const PAGE_PATH = '/';

function fakeAddress(hash, search = '') {
  const replaced = [];
  return {
    location: { hash, search, pathname: PAGE_PATH },
    history: { replaceState: (state, title, url) => replaced.push(url) },
    replaced,
  };
}

module.exports = [
  {
    name: 'a whole code in the #edit fragment is read, lower case included',
    run() {
      assert.equal(EditFragment.codeFromFragment(`#edit=${CODE}`), CODE);
      assert.equal(EditFragment.codeFromFragment('#edit=dolecn1026k7qx'), CODE);
    },
  },
  {
    name: 'junk, a too short or too long code, another key and markup are not read as a code',
    run() {
      for (const hash of [
        '',
        '#',
        '#edit=',
        '#edit=ABC12',
        `#edit=${'A'.repeat(25)}`,
        `#code=${CODE}`,
        '#edit=ABC<script>alert(1)</script>',
        "#edit=ABC123' OR '1'='1",
        '#edit=ABC%20DEF123',
        '#edit=ABCDEF%0A123',
      ]) {
        assert.equal(EditFragment.codeFromFragment(hash), '', hash);
      }
    },
  },
  {
    name: 'taking the code from the address clears the fragment and keeps the path and query',
    run() {
      const address = fakeAddress(`#edit=${CODE}`, '?paper=a4');
      assert.equal(EditFragment.takeCodeFromAddress(address.location, address.history), CODE);
      assert.deepEqual(address.replaced, ['/?paper=a4']);
    },
  },
  {
    name: 'a fragment that holds no code is cleared too, and an address without one is left alone',
    run() {
      const junk = fakeAddress('#edit=<b>');
      assert.equal(EditFragment.takeCodeFromAddress(junk.location, junk.history), '');
      assert.deepEqual(junk.replaced, [PAGE_PATH]);
      const plain = fakeAddress('');
      assert.equal(EditFragment.takeCodeFromAddress(plain.location, plain.history), '');
      assert.deepEqual(plain.replaced, []);
    },
  },
  {
    name: 'the edit link carries the code only after # and never in a query string',
    run() {
      const link = EditFragment.editLink(CODE);
      assert.equal(link, `/#edit=${CODE}`);
      assert.ok(!link.includes('?'));
      assert.equal(EditFragment.codeFromFragment(link.slice(link.indexOf('#'))), CODE);
    },
  },
  {
    name: 'a code typed with spaces or in lower case links the same way the server reads it',
    run() {
      assert.equal(EditFragment.editLink(' dolecn 1026k7qx\n'), `/#edit=${CODE}`);
    },
  },
  {
    name: 'only the last four characters of the code are shown on the edit banner',
    run() {
      assert.equal(EditFragment.codeEnding(CODE), 'K7QX');
    },
  },
];
