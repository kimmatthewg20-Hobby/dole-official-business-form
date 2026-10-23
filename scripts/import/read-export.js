'use strict';

// Reads one exported table into plain row objects; the file extension picks the format.

const fs = require('node:fs');
const path = require('node:path');
const { parseCsvRows } = require('./csv');

const CSV_EXTENSION = '.csv';
const JSON_EXTENSION = '.json';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonRows(text, filePath) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // The parser's own message quotes the file's text, which may hold personal data.
    throw new Error(`${filePath} is not valid JSON`);
  }
  if (!Array.isArray(parsed) || !parsed.every(isPlainObject)) {
    throw new Error(`${filePath} must hold a JSON array of row objects`);
  }
  return parsed;
}

function readTableExport(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== CSV_EXTENSION && extension !== JSON_EXTENSION) {
    throw new Error(`${filePath} must end in ${CSV_EXTENSION} or ${JSON_EXTENSION}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  if (extension === JSON_EXTENSION) return parseJsonRows(text, filePath);
  try {
    return parseCsvRows(text);
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`);
  }
}

module.exports = { readTableExport };
