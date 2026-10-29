'use strict';

// The summary an Assistant filing hands back, already laid out the way staff read an Official
// Business form, so the assistant can show it as it is and every reply looks the same.

const { formatDateWording } = require('../public/js/date-wording');
const DateMode = require('../public/js/date-mode');

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const NOON_HOUR = 12;
const HOURS_ON_CLOCK = 12;
const SEPARATED_NOTE = ' (Separated Dates: each day prints on its own form)';

// "17:30" is read as "5:30 PM"; text that is not a time is shown as it came.
function clockTime(text) {
  const match = TIME_PATTERN.exec(text);
  if (!match) return text;
  const hour = Number(match[1]);
  const period = hour >= NOON_HOUR ? 'PM' : 'AM';
  return `${hour % HOURS_ON_CLOCK || HOURS_ON_CLOCK}:${match[2]} ${period}`;
}

function employeeLines(employees) {
  return employees.map(({ name, position }, index) => {
    return `${index + 1}. ${position ? `${name}, ${position}` : name}`;
  });
}

function filingSummary(body, datesOfOB) {
  const separated = body.dateMode === DateMode.MULTIPLE_SEPARATE_DAYS;
  const approver = [body.approvedBy, body.approvedByPosition].filter(Boolean).join(', ');
  return [
    `Date of Official Business: ${formatDateWording(datesOfOB)}${separated ? SEPARATED_NOTE : ''}`,
    `Destination From: ${body.locationFrom}`,
    `Destination To: ${body.locationTo}`,
    `Departure: ${clockTime(body.departureTime)}`,
    `Expected Return: ${clockTime(body.returnTime)}`,
    `Purpose: ${body.purpose}`,
    `Division: ${body.division}`,
    'Employees:',
    ...employeeLines(body.employees),
    `To be approved by: ${approver}`,
  ].join('\n');
}

module.exports = { filingSummary };
