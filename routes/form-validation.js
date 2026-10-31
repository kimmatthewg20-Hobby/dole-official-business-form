const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{1,2}:\d{2}$/;
const MAX_EMPLOYEES = 100;
const MAX_NAME_LENGTH = 200;
const MAX_POSITION_LENGTH = 200;
const MAX_SHORT_TEXT_LENGTH = 300;
const MAX_PURPOSE_LENGTH = 500;
const MAX_DATES = 62;
const DateMode = require('../public/js/date-mode');

function isRealIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isText(value, maxLength) {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

function isOptionalText(value, maxLength) {
  return value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);
}

function validateEmployees(employees) {
  if (!Array.isArray(employees) || employees.length === 0) return 'No employees provided';
  if (employees.length > MAX_EMPLOYEES) return 'Too many employees';
  const valid = employees.every(
    (emp) =>
      emp &&
      isText(emp.name, MAX_NAME_LENGTH) &&
      isOptionalText(emp.position, MAX_POSITION_LENGTH)
  );
  return valid ? null : 'Each employee needs a name';
}

function validateDates(dates) {
  const valid =
    Array.isArray(dates) && dates.length > 0 && dates.length <= MAX_DATES && dates.every(isRealIsoDate);
  return valid ? null : 'Please select at least one valid date';
}

// Returns an error message, or null when the submission may be stored.
function validateSubmission(body) {
  const employeesError = validateEmployees(body.employees);
  if (employeesError) return employeesError;
  const datesError = validateDates(body.datesOfOB);
  if (datesError) return datesError;
  if (!isText(body.locationTo, MAX_SHORT_TEXT_LENGTH)) return 'Destination is required';
  if (!isText(body.purpose, MAX_PURPOSE_LENGTH)) return 'Purpose is required';
  if (!TIME_PATTERN.test(body.departureTime || '')) return 'Departure time is required';
  if (!TIME_PATTERN.test(body.returnTime || '')) return 'Return time is required';
  const optionalFields = [body.office, body.division, body.locationFrom, body.approvedBy, body.approvedByPosition];
  if (!optionalFields.every((value) => isOptionalText(value, MAX_SHORT_TEXT_LENGTH))) {
    return 'A text field is too long';
  }
  return null;
}

// Only new submissions have a Date mode; editing one stored form does not. Run after
// validateSubmission, which guarantees the employee and date lists are real lists.
function validateDateMode(body) {
  if (!DateMode.isDateMode(body.dateMode)) return 'Please choose a valid date mode';
  const formCount = DateMode.countForms(body.dateMode, body.datesOfOB.length, body.employees.length);
  return formCount > DateMode.MAX_FORMS_PER_SUBMISSION ? DateMode.formLimitMessage(formCount) : null;
}

// Units come only from the Assistant filing, one per employee (or none).
function validateUnits(units) {
  return units.every((unit) => isOptionalText(unit, MAX_SHORT_TEXT_LENGTH)) ? null : 'Assigned unit is too long';
}

module.exports = { validateSubmission, validateDateMode, validateUnits };
