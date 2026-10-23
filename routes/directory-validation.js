'use strict';

const MAX_FIELD_LENGTH = 200;
const MAX_BULK_ENTRIES = 1000;
const REQUIRED_FIELDS = ['firstname', 'last_name', 'position', 'assigned_unit'];
const OPTIONAL_FIELDS = ['employee_id', 'middle_name'];
const EMPTY_TEXT = '';

function toText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : null;
}

// The middle initial keeps the printed name short.
function buildFullName(firstname, middleName, lastName) {
  const middleInitial = middleName ? `${middleName.charAt(0)}.` : EMPTY_TEXT;
  return `${firstname} ${middleInitial} ${lastName}`.replace(/\s+/g, ' ').trim();
}

// Returns { value } with cleaned fields, or { error } naming the first problem.
function validateEntry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Required fields are missing' };
  }
  const value = {};
  for (const field of REQUIRED_FIELDS) {
    const text = toText(input[field]);
    if (!text) return { error: 'Required fields are missing' };
    value[field] = text;
  }
  for (const field of OPTIONAL_FIELDS) {
    const raw = input[field];
    const text = raw === undefined || raw === null ? EMPTY_TEXT : toText(raw);
    if (text === null) return { error: `Invalid ${field}` };
    value[field] = text;
  }
  const tooLong = Object.keys(value).find((field) => value[field].length > MAX_FIELD_LENGTH);
  if (tooLong) return { error: `${tooLong} is too long` };
  value.full_name = buildFullName(value.firstname, value.middle_name, value.last_name);
  return { value };
}

// Every row is checked before anything is written, so one bad row rejects the whole upload.
function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { error: 'No employees provided' };
  }
  if (entries.length > MAX_BULK_ENTRIES) return { error: 'Too many employees' };
  const values = [];
  for (let index = 0; index < entries.length; index += 1) {
    const result = validateEntry(entries[index]);
    if (result.error) return { error: `Row ${index + 1}: ${result.error}` };
    values.push(result.value);
  }
  return { values };
}

module.exports = { validateEntry, validateEntries, buildFullName };
