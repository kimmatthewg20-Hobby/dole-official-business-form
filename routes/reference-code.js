'use strict';

// The Reference code (GLOSSARY.md) is the edit secret of one form (ADR 0003): only the four
// random characters make it hard to guess, so they come from a cryptographic source and the
// code is kept out of every public response and the print.

const crypto = require('node:crypto');

const REFERENCE_CODE_PREFIX = 'DOLE';
// Staff read and type codes by hand, so characters that look alike are left out:
// no 0 or O, no 1, I or L. 31 characters give about 920,000 codes per Division per month.
const REFERENCE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RANDOM_PART_LENGTH = 4;
// The office works in Philippine time (UTC+8, no daylight saving), not server time.
const PHILIPPINE_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const YEAR_DIGITS = 100;
// A taken code is rare, so a few redraws are plenty; past that something else is wrong.
const MAX_CODE_ATTEMPTS = 10;
const REFERENCE_CODE_COLUMN = 'reference_code';
const CODE_UNAVAILABLE_NAME = 'ReferenceCodeUnavailable';
const CODE_UNAVAILABLE_MESSAGE = 'Could not make a unique Reference code. Please submit the form again.';

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function philippineMonthYear(now) {
  const philippineTime = new Date(now.getTime() + PHILIPPINE_UTC_OFFSET_MS);
  return twoDigits(philippineTime.getUTCMonth() + 1) + twoDigits(philippineTime.getUTCFullYear() % YEAR_DIGITS);
}

// crypto.randomInt draws evenly from the range, so no character is likelier than another.
function randomPart(randomIndex) {
  let part = '';
  for (let position = 0; position < RANDOM_PART_LENGTH; position += 1) {
    part += REFERENCE_CODE_ALPHABET[randomIndex(REFERENCE_CODE_ALPHABET.length)];
  }
  return part;
}

function makeReferenceCode(divisionCode, now, randomIndex = crypto.randomInt) {
  return REFERENCE_CODE_PREFIX + divisionCode + philippineMonthYear(now) + randomPart(randomIndex);
}

function codeUnavailableError() {
  const error = new Error(CODE_UNAVAILABLE_MESSAGE);
  error.name = CODE_UNAVAILABLE_NAME;
  return error;
}

function isCodeUnavailable(error) {
  return Boolean(error) && error.name === CODE_UNAVAILABLE_NAME;
}

// Runs inside the submit transaction, so codes given to earlier forms of the same submission
// count as taken; the unique index still refuses a code if two writers ever raced.
async function assignReferenceCode(client, { divisionCode, now, randomIndex = crypto.randomInt }) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = makeReferenceCode(divisionCode, now, randomIndex);
    const taken = await client.query(`SELECT 1 FROM official_business WHERE ${REFERENCE_CODE_COLUMN} = ?`, [code]);
    if (taken.rows.length === 0) return code;
  }
  throw codeUnavailableError();
}

// Staff paste codes from chats and notes, so case and stray spaces anywhere are ignored.
function normaliseReferenceCode(typed) {
  return typed.replace(/\s+/g, '').toUpperCase();
}

// Public responses and the print start from whole stored rows; this keeps the secret out.
function withoutReferenceCode(row) {
  if (!row) return row;
  const { [REFERENCE_CODE_COLUMN]: omitted, ...rest } = row;
  return rest;
}

module.exports = {
  REFERENCE_CODE_ALPHABET,
  MAX_CODE_ATTEMPTS,
  CODE_UNAVAILABLE_MESSAGE,
  makeReferenceCode,
  assignReferenceCode,
  isCodeUnavailable,
  normaliseReferenceCode,
  withoutReferenceCode,
};
