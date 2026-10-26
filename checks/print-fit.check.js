'use strict';

const assert = require('node:assert/strict');
const { fitFactor } = require('../public/js/print-fit');

const AVAILABLE = 500;
const MIN_FIT = 0.78;

module.exports = [
  {
    name: 'print fit: forms that already fit their half keep the paper\'s own scale',
    run() {
      assert.equal(fitFactor([480, 500, 120], AVAILABLE, MIN_FIT), 1);
      assert.equal(fitFactor([], AVAILABLE, MIN_FIT), 1);
    },
  },
  {
    name: 'print fit: the tallest form sets how far the sheet shrinks, so the two forms stay alike',
    run() {
      assert.equal(fitFactor([400, 550], AVAILABLE, MIN_FIT), AVAILABLE / 550);
      assert.equal(fitFactor([550, 400], AVAILABLE, MIN_FIT), AVAILABLE / 550);
    },
  },
  {
    name: 'print fit: a sheet never shrinks past the readable minimum, and a missing page height changes nothing',
    run() {
      assert.equal(fitFactor([1000], AVAILABLE, MIN_FIT), MIN_FIT);
      assert.equal(fitFactor([1000], 0, MIN_FIT), 1);
    },
  },
];
