'use strict';

// The form a Reference code finds on the tracker is shown as one ordered card: a header, then
// Schedule, Itinerary, Purpose, Approval and Employees. Staff typed every value, so the card must
// never read one as markup, and it never shows the code (ADR 0003).

const assert = require('node:assert/strict');
const TrackerDetails = require('../public/js/tracker-details');
const DateMode = require('../public/js/date-mode');

const EN_DASH = '–';
const CODE = 'DOLECN1026K7QX';
const HOSTILE_NAME = '<img src=x onerror=alert(1)>';
const FOUND = {
  formData: {
    id: 7,
    datesOfOB: ['2026-10-26', '2026-10-27', '2026-10-28'],
    date_mode: DateMode.MULTIPLE_SEPARATE_DAYS,
    departure_time: '08:00',
    return_time: '17:30',
    location_from: 'Official Station',
    location_to: 'Daet Capitol',
    purpose: 'Coordination meeting',
    division: 'Technical Support Services Division',
    approved_by: 'Juan Dela Cruz',
    approved_by_position: 'Chief LEO',
    reference_code: CODE,
  },
  employees: [
    { name: 'ANA REYES', position: 'Labor Employment Officer II' },
    { name: HOSTILE_NAME, position: 'Clerk' },
  ],
};

function sectionTitles(card) {
  return card.sections.map((section) => section.title);
}

function field(card, sectionTitle, label) {
  const section = card.sections.find((each) => each.title === sectionTitle);
  return section.fields.find((each) => each.label === label).value;
}

module.exports = [
  {
    name: 'the card has a header and every section, in order',
    run() {
      const card = TrackerDetails.describeForm(FOUND);
      assert.equal(card.title, 'Form No. 7');
      assert.equal(card.dates, 'October 26-28, 2026');
      assert.equal(card.modeTag, 'Separated Dates');
      assert.deepEqual(sectionTitles(card), ['Schedule', 'Itinerary', 'Purpose', 'Approval', 'Employees']);
      assert.equal(field(card, 'Itinerary', 'To'), 'Daet Capitol');
      assert.equal(field(card, 'Approval', 'Position'), 'Chief LEO');
      const employees = card.sections[4].employees;
      assert.deepEqual(employees[0], { number: 1, name: 'ANA REYES', position: 'Labor Employment Officer II' });
      assert.equal(employees.length, 2);
    },
  },
  {
    name: 'times read in 12-hour form and an old form without a Date mode is tagged All Dates',
    run() {
      const card = TrackerDetails.describeForm({ ...FOUND, formData: { ...FOUND.formData, date_mode: null } });
      assert.equal(field(card, 'Schedule', 'Departure Time'), '8:00 AM');
      assert.equal(field(card, 'Schedule', 'Return Time'), '5:30 PM');
      assert.equal(card.modeTag, 'All Dates');
    },
  },
  {
    name: 'an empty value shows an en dash',
    run() {
      const empty = { formData: { id: 3, date_of_ob: '', location_from: '', purpose: '  ' }, employees: [] };
      const card = TrackerDetails.describeForm(empty);
      assert.equal(field(card, 'Itinerary', 'From'), EN_DASH);
      assert.equal(field(card, 'Purpose', 'Purpose'), EN_DASH);
      assert.equal(field(card, 'Schedule', 'Departure Time'), EN_DASH);
      assert.equal(card.dates, EN_DASH);
      assert.ok(TrackerDetails.cardHtml(empty).includes(EN_DASH));
    },
  },
  {
    name: 'the card markup escapes staff text and never carries the Reference code',
    run() {
      const html = TrackerDetails.cardHtml(FOUND);
      assert.ok(!html.includes('<img'), 'a typed name is not read as markup');
      assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
      assert.ok(!html.includes(CODE));
      assert.ok(!html.includes(CODE.slice(-4)));
      assert.ok(html.indexOf('Schedule') < html.indexOf('Itinerary'));
      assert.ok(html.indexOf('Approval') < html.indexOf('Employees'));
    },
  },
];
