'use strict';

const MAX_NAME_LENGTH = 100;
const CODE_PATTERN = /^[A-Za-z]{2,4}$/;
const REPEATED_SPACES = /\s+/g;

const NAME_REQUIRED = 'Division name is required';
const NAME_TOO_LONG = `Division name must be at most ${MAX_NAME_LENGTH} characters`;
const CODE_INVALID = 'Division code must be 2 to 4 letters (A-Z)';

// Returns { value: { name, code } } cleaned for storing, or { error } naming the first problem.
function validateDivision(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const name = typeof body.name === 'string' ? body.name.replace(REPEATED_SPACES, ' ').trim() : '';
  if (!name) return { error: NAME_REQUIRED };
  if (name.length > MAX_NAME_LENGTH) return { error: NAME_TOO_LONG };
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!CODE_PATTERN.test(code)) return { error: CODE_INVALID };
  return { value: { name, code: code.toUpperCase() } };
}

module.exports = { validateDivision };
