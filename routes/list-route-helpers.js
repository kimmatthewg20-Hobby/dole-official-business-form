'use strict';

// Pieces shared by the admin-kept pick-lists (Divisions, Approvers): id parsing, the
// unique-index race and the generic server error.

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;
const UNIQUE_CONSTRAINT = /UNIQUE constraint failed/;
const DIGITS_ONLY = /^\d+$/;
const REPEATED_SPACES = /\s+/g;
// No row has id 0, so a clash check for a new row excludes nothing.
const NO_ID = 0;

function serverError(res, label, err) {
  console.error(`${label}:`, err.message);
  res.status(SERVER_ERROR).json({ error: 'Something went wrong. Please try again.' });
}

function parseId(raw) {
  return DIGITS_ONLY.test(String(raw)) ? Number(raw) : null;
}

// Two saves at once can both pass the clash check; the unique index then refuses the second.
function failedSave(res, label, err, clashMessage) {
  if (UNIQUE_CONSTRAINT.test(err.message)) {
    return res.status(CONFLICT).json({ error: clashMessage });
  }
  serverError(res, label, err);
}

// Text from a request body, with runs of spaces made one; anything not text becomes ''.
function cleanText(value) {
  return typeof value === 'string' ? value.replace(REPEATED_SPACES, ' ').trim() : '';
}

function requestBody(input) {
  return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

module.exports = {
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  NO_ID,
  serverError,
  parseId,
  failedSave,
  cleanText,
  requestBody,
};
