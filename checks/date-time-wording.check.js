'use strict';

const assert = require('node:assert/strict');
const { formatDateWording } = require('../public/js/date-wording');
const { parseTimeInput } = require('../public/js/time-input');

const DATE_CASES = [
  [['2026-10-24'], 'October 24, 2026'],
  [['2026-10-24', '2026-10-26', '2026-10-27', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-14'],
    'October 24, 26-27, November 1-3 and 14, 2026'],
  [['2026-12-30', '2026-12-31', '2027-01-02'], 'December 30-31, 2026 and January 2, 2027'],
  [['2026-12-30', '2027-01-02', '2027-01-05'], 'December 30, 2026, January 2 and 5, 2027'],
  [['2026-10-24', '2026-10-25'], 'October 24-25, 2026'],
  [[], ''],
];
const TIME_CASES = [
  ['8:30 AM', '08:30'], ['8:30 pm', '20:30'], ['8:30pm', '20:30'], ['12:00 AM', '00:00'],
  ['12:15 pm', '12:15'], ['14:00', '14:00'], ['0:05', '00:05'], [' 9:00 Am ', '09:00'],
];
const BAD_TIMES = ['', '25:00', '13:00 PM', '0:30 AM', '8:60', '8', 'noon', '8:30 xm', '8:3'];

module.exports = [
  {
    name: 'dates read as grouped wording',
    run() {
      for (const [dates, wording] of DATE_CASES) assert.equal(formatDateWording(dates), wording);
    },
  },
  {
    name: 'unsorted and duplicate dates read like sorted, unique ones',
    run() {
      const messy = ['2026-11-14', '2026-10-27', '2026-10-24', '2026-10-27', '2026-10-26'];
      assert.equal(formatDateWording(messy), 'October 24, 26-27 and November 14, 2026');
    },
  },
  {
    name: 'typed times become HH:MM 24-hour',
    run() {
      for (const [typed, stored] of TIME_CASES) assert.equal(parseTimeInput(typed), stored);
    },
  },
  {
    name: 'other typed times are rejected',
    run() {
      for (const typed of BAD_TIMES) assert.equal(parseTimeInput(typed), null, typed);
    },
  },
];
