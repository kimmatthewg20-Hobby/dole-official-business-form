'use strict';

// Reads an import file into rows ready to write, or names the first problem. Everything is
// checked before anything is written, so a bad file changes nothing.

const { normaliseReferenceCode } = require('./reference-code');
const DateMode = require('../public/js/date-mode');
const {
  validateDivisions,
  validateApprovers,
  validateDirectory,
  firstRepeat,
} = require('./data-transfer-lists');

const INVALID_FORMAT = 'Invalid import data format';
const BAD_REFERENCE_CODE = 'the Reference code must be text';
const BAD_DATE_MODE = 'the Date mode must be empty or one of: ' + DateMode.DATE_MODES.join(', ');
const OPTIONAL_LISTS = {
  divisions: validateDivisions,
  approvers: validateApprovers,
  employees_directory: validateDirectory,
};

function isMissing(value) {
  return value === undefined || value === null;
}

// An unknown mode is refused rather than dropped: dropping it would quietly change how the
// form prints. Older files carry no mode, and such forms print as All Dates.
function validDateMode(raw) {
  if (isMissing(raw)) return { value: null };
  return DateMode.isDateMode(raw) ? { value: raw } : { error: BAD_DATE_MODE };
}

function validReferenceCode(raw) {
  if (isMissing(raw)) return { value: null };
  const code = typeof raw === 'string' ? normaliseReferenceCode(raw) : '';
  return code ? { value: code } : { error: BAD_REFERENCE_CODE };
}

// Codes are the edit secret (ADR 0003), so messages name the forms by position, never by code.
function validateForms(forms) {
  const values = [];
  for (let index = 0; index < forms.length; index += 1) {
    const entry = forms[index] || {};
    const code = validReferenceCode(entry.reference_code);
    const dateMode = validDateMode(entry.date_mode);
    const error = code.error || dateMode.error;
    if (error) return { error: `Form ${index + 1}: ${error}` };
    values.push({ ...forms[index], reference_code: code.value, date_mode: dateMode.value });
  }
  const repeat = firstRepeat(
    values.map((form) => form.reference_code).filter((code) => code !== null),
    () => 'Two forms in the file share a Reference code; codes must be unique',
  );
  return repeat ? { error: repeat } : { values };
}

// An older export has no such list, and a new one from an office that kept none has an empty
// one. Either way the list here is left as it is (null): wiping the Divisions or Approvers
// would stop staff submitting forms, and an older export never carried the directory at all.
function validateOptionalList(file, key, now) {
  const rows = file[key];
  if (rows === undefined || rows === null) return { value: null };
  if (!Array.isArray(rows)) return { error: INVALID_FORMAT };
  if (rows.length === 0) return { value: null };
  const result = OPTIONAL_LISTS[key](rows, now);
  return result.error ? result : { value: result.values };
}

function validateImportFile(file, now) {
  if (!file || !Array.isArray(file.official_business) || !Array.isArray(file.employees)) {
    return { error: INVALID_FORMAT };
  }
  const forms = validateForms(file.official_business);
  if (forms.error) return forms;
  const value = {
    official_business: forms.values,
    employees: file.employees,
    settings: Array.isArray(file.settings) ? file.settings : [],
  };
  for (const key of Object.keys(OPTIONAL_LISTS)) {
    const list = validateOptionalList(file, key, now);
    if (list.error) return list;
    value[key] = list.value;
  }
  return { value };
}

module.exports = { validateImportFile, OPTIONAL_LISTS };
