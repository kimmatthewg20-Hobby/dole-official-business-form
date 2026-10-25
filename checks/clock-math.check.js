'use strict';

const assert = require('node:assert/strict');
const math = require('../public/js/clock-math');

module.exports = [
  {
    name: 'a point on the clock face becomes an angle clockwise from twelve',
    run() {
      assert.equal(math.pointToAngle(0, -1), 0);
      assert.equal(math.pointToAngle(1, 0), 90);
      assert.equal(math.pointToAngle(0, 1), 180);
      assert.equal(math.pointToAngle(-1, 0), 270);
    },
  },
  {
    name: 'angles pick the nearest hour and minute',
    run() {
      assert.equal(math.angleToHour(0), 12);
      assert.equal(math.angleToHour(89), 3);
      assert.equal(math.angleToHour(359), 12);
      assert.equal(math.angleToMinute(0), 0);
      assert.equal(math.angleToMinute(90), 15);
      assert.equal(math.angleToMinute(359), 0);
      assert.equal(math.hourToAngle(12), 0);
      assert.equal(math.hourToAngle(3), 90);
      assert.equal(math.minuteToAngle(30), 180);
    },
  },
  {
    name: '12-hour picks become HH:MM 24-hour',
    run() {
      assert.equal(math.toStoredTime(12, 0, false), '00:00');
      assert.equal(math.toStoredTime(12, 15, true), '12:15');
      assert.equal(math.toStoredTime(8, 5, false), '08:05');
      assert.equal(math.toStoredTime(11, 59, true), '23:59');
    },
  },
  {
    name: 'stored HH:MM reads back as 12-hour parts and wording',
    run() {
      assert.deepEqual(math.fromStoredTime('00:30'), { hour12: 12, minute: 30, isPm: false });
      assert.deepEqual(math.fromStoredTime('14:00'), { hour12: 2, minute: 0, isPm: true });
      assert.equal(math.fromStoredTime('24:00'), null);
      assert.equal(math.fromStoredTime(''), null);
      assert.equal(math.formatTwelveHour('14:05'), '2:05 PM');
      assert.equal(math.formatTwelveHour('00:00'), '12:00 AM');
      assert.equal(math.formatTwelveHour('nope'), '');
    },
  },
  {
    name: 'arrow steps wrap around the clock',
    run() {
      assert.equal(math.stepHour(12, 1), 1);
      assert.equal(math.stepHour(1, -1), 12);
      assert.equal(math.stepMinute(59, 1), 0);
      assert.equal(math.stepMinute(0, -1), 59);
      assert.equal(math.stepMinute(58, 5), 3);
    },
  },
];
