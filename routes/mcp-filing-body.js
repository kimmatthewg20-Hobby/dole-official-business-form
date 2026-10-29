'use strict';

// Turns an Assistant filing into the body the website's form posts to /api/submit, with the
// same fixed office, From default, Date mode values and HH:MM times, so the stored form is the
// one the website would store for the same answers.

const db = require('../db');
const DateMode = require('../public/js/date-mode');
const { parseTimeInput } = require('../public/js/time-input');

// The form page sends this office on every submission and starts From with this text
// (public/index.html).
const WEBSITE_OFFICE = 'Department of Labor and Employment';
const DEFAULT_FROM = 'Official Station';
const NO_TIME = '';
// Two rows are enough to tell one Approver from several with the same name.
const APPROVER_MATCH_LIMIT = 2;

// The names staff see on the form and the Glossary names, each for its stored Date mode.
const DATE_MODE_CHOICES = {
  'All Dates': DateMode.MORE_THAN_ONE_DAY,
  'More Than One Day': DateMode.MORE_THAN_ONE_DAY,
  'Separated Dates': DateMode.MULTIPLE_SEPARATE_DAYS,
  'Multiple Separate Days': DateMode.MULTIPLE_SEPARATE_DAYS,
};
const DATE_MODE_LABELS = {
  [DateMode.MORE_THAN_ONE_DAY]: 'All Dates',
  [DateMode.MULTIPLE_SEPARATE_DAYS]: 'Separated Dates',
};

function severalApprovers(name) {
  return (
    `More than one listed Approver is named ${name}. Call again with approverPosition set to ` +
    'the position of the one meant, as list_approvers shows it.'
  );
}

// The form fills the position from the picked Approver, so the name alone finds it. An unlisted
// name gets no position and the website's own list check refuses it.
async function approverPosition(filing) {
  if (filing.approverPosition !== undefined) return { position: filing.approverPosition };
  const rows = await db.all('SELECT position FROM approvers WHERE name = ? LIMIT ?', [
    filing.approver,
    APPROVER_MATCH_LIMIT,
  ]);
  if (rows.length > 1) return { error: severalApprovers(filing.approver) };
  return { position: rows.length === 1 ? rows[0].position : '' };
}

// A time the form would not accept is sent empty, so the website's own message refuses it.
function websiteTime(text) {
  return parseTimeInput(text) || NO_TIME;
}

function websiteBody(filing, position) {
  return {
    employees: filing.employees.map(({ name, position: employeePosition }) => ({ name, position: employeePosition })),
    office: WEBSITE_OFFICE,
    division: filing.division,
    dateMode: DATE_MODE_CHOICES[filing.dateMode] || DateMode.DEFAULT_DATE_MODE,
    datesOfOB: filing.dates,
    locationFrom: filing.from || DEFAULT_FROM,
    locationTo: filing.destination,
    departureTime: websiteTime(filing.departureTime),
    returnTime: websiteTime(filing.returnTime),
    purpose: filing.purpose,
    approvedBy: filing.approver,
    approvedByPosition: position,
  };
}

// Returns { body } ready for submitForm, or { error } when the Approver is ambiguous.
async function filingToWebsiteBody(filing) {
  const { position, error } = await approverPosition(filing);
  if (error) return { error };
  return { body: websiteBody(filing, position), units: filing.employees.map((employee) => employee.unit || '') };
}

module.exports = {
  WEBSITE_OFFICE,
  DEFAULT_FROM,
  DATE_MODE_CHOICES,
  DATE_MODE_LABELS,
  filingToWebsiteBody,
};
