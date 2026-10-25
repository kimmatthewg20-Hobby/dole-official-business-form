'use strict';

// Checks the Division, Approver and Employee directory lists of an import file with the same
// rules the admin pages use, so an import can never store a row those pages would refuse.

const { validateDivision } = require('./division-validation');
const { validateApprover } = require('./approver-validation');
const { MAX_FIELD_LENGTH } = require('./directory-validation');
const { isRealDay } = require('./directory-cleanup');

const ISO_DATE_LENGTH = 10;
const ASCII_CAPITALS = /[A-Z]/g;
const DIRECTORY_TEXT_COLUMNS = [
  'employee_id',
  'firstname',
  'middle_name',
  'last_name',
  'full_name',
  'position',
  'assigned_unit',
];
const NAME_REQUIRED = 'A name is required';
const BAD_LAST_USED = 'the last-used date must be a day such as 2026-10-26';

// SQLite's NOCASE, which the unique indexes use, folds only A-Z; folding more would refuse
// names the database itself accepts.
function foldCapitals(text) {
  return text.replace(ASCII_CAPITALS, (letter) => letter.toLowerCase());
}

function rowId(row) {
  return row && row.id !== undefined ? row.id : null;
}

// Returns the message for the first two rows with the same key, or null.
function firstRepeat(keys, describe) {
  const seen = new Map();
  for (let index = 0; index < keys.length; index += 1) {
    if (seen.has(keys[index])) return describe(seen.get(keys[index]) + 1, index + 1);
    seen.set(keys[index], index);
  }
  return null;
}

function validateRows(rows, label, validate) {
  const values = [];
  for (let index = 0; index < rows.length; index += 1) {
    const result = validate(rows[index]);
    if (result.error) return { error: `${label} ${index + 1}: ${result.error}` };
    values.push({ id: rowId(rows[index]), ...result.value });
  }
  return { values };
}

function validateDivisions(rows) {
  const result = validateRows(rows, 'Division', validateDivision);
  if (result.error) return result;
  const repeat =
    firstRepeat(
      result.values.map((row) => row.code),
      (first, second) => `Divisions ${first} and ${second} in the file share a code`,
    ) ||
    firstRepeat(
      result.values.map((row) => foldCapitals(row.name)),
      (first, second) => `Divisions ${first} and ${second} in the file share a name`,
    );
  return repeat ? { error: repeat } : result;
}

function validateApprovers(rows) {
  const result = validateRows(rows, 'Approver', validateApprover);
  if (result.error) return result;
  const repeat = firstRepeat(
    result.values.map((row) =>
      JSON.stringify([foldCapitals(row.name), foldCapitals(row.position)]),
    ),
    (first, second) => `Approvers ${first} and ${second} in the file share a name and position`,
  );
  return repeat ? { error: repeat } : result;
}

function directoryText(value) {
  if (value === undefined || value === null) return { value: null };
  if (typeof value === 'number' && Number.isFinite(value)) return { value: String(value) };
  if (typeof value !== 'string') return { error: true };
  return { value };
}

// Entries added from a form have only a name, a position and a unit, so only the name is
// required here; it is what the name key and every pick-list show are made from.
function validateDirectoryEntry(row, importDay) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return { error: NAME_REQUIRED };
  const value = {};
  for (const column of DIRECTORY_TEXT_COLUMNS) {
    const text = directoryText(row[column]);
    if (text.error) return { error: `Invalid ${column}` };
    if (text.value && text.value.length > MAX_FIELD_LENGTH)
      return { error: `${column} is too long` };
    value[column] = text.value;
  }
  if (!value.full_name || !value.full_name.trim()) return { error: NAME_REQUIRED };
  const lastUsed = row.last_used_at;
  if (lastUsed === undefined || lastUsed === null) value.last_used_at = importDay;
  else if (isRealDay(lastUsed)) value.last_used_at = lastUsed;
  else return { error: BAD_LAST_USED };
  return { value };
}

// An entry without a last-used date counts from the import day, as the column default does.
function validateDirectory(rows, now) {
  const importDay = now.toISOString().slice(0, ISO_DATE_LENGTH);
  return validateRows(rows, 'Employee', (row) => validateDirectoryEntry(row, importDay));
}

module.exports = {
  validateDivisions,
  validateApprovers,
  validateDirectory,
  firstRepeat,
};
