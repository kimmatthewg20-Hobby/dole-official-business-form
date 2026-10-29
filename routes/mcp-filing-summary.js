'use strict';

// The summary an Assistant filing hands back, written as Markdown in the layout staff read: a
// title, a small heading per field with its answer in bold below it. The assistant shows it as
// it is, so every reply looks the same.

const { formatDateWording } = require('../public/js/date-wording');
const DateMode = require('../public/js/date-mode');

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const NOON_HOUR = 12;
const HOURS_ON_CLOCK = 12;
const SEPARATED_NOTE = ' (Separated Dates: each day prints on its own form)';
const TITLE = '## **OFFICIAL BUSINESS FORM CREATED**';
const MARKDOWN_SPECIALS = /([\\`*_{}[\]<>#|])/g;
const LINE_BREAKS = /\s*[\r\n]+\s*/g;

// "17:30" is read as "5:30 PM"; text that is not a time is shown as it came.
function clockTime(text) {
  const match = TIME_PATTERN.exec(text);
  if (!match) return text;
  const hour = Number(match[1]);
  const period = hour >= NOON_HOUR ? 'PM' : 'AM';
  return `${hour % HOURS_ON_CLOCK || HOURS_ON_CLOCK}:${match[2]} ${period}`;
}

// Staff text is shown as typed: Markdown characters in it must not restyle the summary.
function plain(text) {
  return String(text).replace(LINE_BREAKS, ' ').replace(MARKDOWN_SPECIALS, '\\$1');
}

function field(label, answer) {
  return `### ${label}\n**${answer}**`;
}

function employeeList(employees) {
  const lines = employees.map(({ name, position }, index) => {
    return `${index + 1}. **${plain(position ? `${name}, ${position}` : name)}**`;
  });
  return `### Employee:\n${lines.join('\n')}`;
}

function filingSummary(body, datesOfOB, { printLink, referenceCode }) {
  const separated = body.dateMode === DateMode.MULTIPLE_SEPARATE_DAYS;
  const approver = [body.approvedBy, body.approvedByPosition].filter(Boolean).join(', ');
  return [
    TITLE,
    field('Date of Official Business:', `${formatDateWording(datesOfOB)}${separated ? SEPARATED_NOTE : ''}`),
    field('Destination From:', plain(body.locationFrom)),
    field('Destination To:', plain(body.locationTo)),
    field('Departure:', clockTime(body.departureTime)),
    field('Expected Return:', clockTime(body.returnTime)),
    field('Purpose:', plain(body.purpose)),
    field('Division:', plain(body.division)),
    employeeList(body.employees),
    field('To be approved by:', plain(approver)),
    // The link and the code are made by the server, so they need no escaping.
    field('Link:', `[${printLink}](${printLink})`),
    field('Code:', referenceCode),
  ].join('\n\n');
}

module.exports = { filingSummary };
