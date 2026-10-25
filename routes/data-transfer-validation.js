'use strict';

// Reads an import file into rows ready to write, or names the first problem. Everything is
// checked before anything is written, so a bad file changes nothing.

const { normaliseReferenceCode } = require('./reference-code');
const {
  validateDivisions,
  validateApprovers,
  validateDirectory,
  firstRepeat,
} = require('./data-transfer-lists');

const INVALID_FORMAT = 'Invalid import data format';
const BAD_REFERENCE_CODE = 'the Reference code must be text';
const OPTIONAL_LISTS = {
  divisions: validateDivisions,
  approvers: validateApprovers,
  employees_directory: validateDirectory,
};

// Codes are the edit secret (ADR 0003), so messages name the forms by position, never by code.
function validateForms(forms) {
  const values = [];
  for (let index = 0; index < forms.length; index += 1) {
    const raw = forms[index] && forms[index].reference_code;
    if (raw === undefined || raw === null) {
      values.push({ ...forms[index], reference_code: null });
      continue;
    }
    const code = typeof raw === 'string' ? normaliseReferenceCode(raw) : '';
    if (!code) return { error: `Form ${index + 1}: ${BAD_REFERENCE_CODE}` };
    values.push({ ...forms[index], reference_code: code });
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
