'use strict';

// Checks every exported row before anything is written. Columns outside the schema are
// rejected rather than dropped, so no exported data is lost without Kim noticing.
// Error messages name the table, row and column but never a value: values are personal data.

const { TABLE_COLUMNS, TABLES_IN_INSERT_ORDER } = require('./tables');

const ID_COLUMN = 'id';
const FORM_LINK_COLUMN = 'ob_id';
const LINKED_TABLE = 'employees';
const FORM_TABLE = 'official_business';
const DIGITS_ONLY = /^\d+$/;

function rowError(table, rowNumber, problem) {
  return new Error(`${table} row ${rowNumber}: ${problem}`);
}

function toPositiveInteger(value) {
  const number = typeof value === 'string' && DIGITS_ONLY.test(value) ? Number(value) : value;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function toText(value) {
  if (value === null || typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function normalizeRow(table, row, rowNumber) {
  const columns = TABLE_COLUMNS[table];
  const unknown = Object.keys(row).find((column) => !columns.includes(column));
  if (unknown !== undefined) throw rowError(table, rowNumber, `unknown column "${unknown}"`);

  const normalized = {};
  for (const column of columns) {
    if (!(column in row)) continue;
    const isInteger = column === ID_COLUMN || (table === LINKED_TABLE && column === FORM_LINK_COLUMN);
    const value = isInteger ? toPositiveInteger(row[column]) : toText(row[column]);
    if (value === undefined || (isInteger && value === null)) {
      const expected = isInteger ? 'a positive whole number' : 'text or empty';
      throw rowError(table, rowNumber, `${column} must be ${expected}`);
    }
    normalized[column] = value;
  }
  if (!(ID_COLUMN in normalized)) throw rowError(table, rowNumber, 'id is missing');
  return normalized;
}

function normalizeTable(table, rows) {
  const seenIds = new Set();
  return rows.map((row, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeRow(table, row, rowNumber);
    if (seenIds.has(normalized.id)) throw rowError(table, rowNumber, 'id repeats an earlier row');
    seenIds.add(normalized.id);
    return normalized;
  });
}

function checkFormLinks(employees, forms) {
  const formIds = new Set(forms.map((form) => form.id));
  employees.forEach((employee, index) => {
    if (!formIds.has(employee.ob_id)) {
      throw rowError(LINKED_TABLE, index + 1, `ob_id does not match any imported ${FORM_TABLE} id`);
    }
  });
}

// Takes { tableName: rows } for all four tables and returns the same shape, normalized.
function validateExport(rowsByTable) {
  const validated = {};
  for (const table of TABLES_IN_INSERT_ORDER) {
    validated[table] = normalizeTable(table, rowsByTable[table]);
  }
  checkFormLinks(validated[LINKED_TABLE], validated[FORM_TABLE]);
  return validated;
}

module.exports = { validateExport };
