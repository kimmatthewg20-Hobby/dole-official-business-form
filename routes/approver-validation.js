'use strict';

const { cleanText, requestBody } = require('./list-route-helpers');

const MAX_NAME_LENGTH = 100;
// Positions such as "Assistant Regional Director for Operations" run longer than names.
const MAX_POSITION_LENGTH = 150;

const NAME_REQUIRED = 'Approver name is required';
const NAME_TOO_LONG = `Approver name must be at most ${MAX_NAME_LENGTH} characters`;
const POSITION_REQUIRED = 'Approver position is required';
const POSITION_TOO_LONG = `Approver position must be at most ${MAX_POSITION_LENGTH} characters`;

// Returns { value: { name, position } } cleaned for storing, or { error } naming the first problem.
function validateApprover(input) {
  const body = requestBody(input);
  const name = cleanText(body.name);
  if (!name) return { error: NAME_REQUIRED };
  if (name.length > MAX_NAME_LENGTH) return { error: NAME_TOO_LONG };
  const position = cleanText(body.position);
  if (!position) return { error: POSITION_REQUIRED };
  if (position.length > MAX_POSITION_LENGTH) return { error: POSITION_TOO_LONG };
  return { value: { name, position } };
}

module.exports = { validateApprover };
