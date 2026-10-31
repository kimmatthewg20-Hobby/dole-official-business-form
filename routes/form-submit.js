'use strict';

// The one path from a submitted body to a stored form. The website's submit and the Assistant
// filing tool both use it, so their validation, refusals and stored forms cannot drift.

const { validateSubmission, validateDateMode, validateUnits } = require('./form-validation');
const { validateListedChoices } = require('./form-lists-validation');
const { expandSubmission, insertSubmission } = require('./form-creation');
const { isCodeUnavailable } = require('./reference-code');

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;
const SERVICE_UNAVAILABLE = 503;
const DATABASE_ERROR_PREFIX = 'Database error: ';

function refused(status, message) {
  return { refusal: { status, message } };
}

async function listRefusal(body) {
  try {
    const listError = await validateListedChoices(body);
    return listError ? refused(BAD_REQUEST, listError) : null;
  } catch (error) {
    console.error('Database error while checking the lists:', error);
    return refused(SERVER_ERROR, DATABASE_ERROR_PREFIX + error.message);
  }
}

async function createForm(body, units) {
  try {
    return { form: await insertSubmission(body, expandSubmission(body), new Date().toISOString(), { units }) };
  } catch (error) {
    if (isCodeUnavailable(error)) return refused(SERVICE_UNAVAILABLE, error.message);
    console.error('Database error during form submission:', error);
    return refused(SERVER_ERROR, DATABASE_ERROR_PREFIX + error.message);
  }
}

// Returns { form: { id, datesOfOB, referenceCode } } once stored, or
// { refusal: { status, message } } in the words the website shows.
// `units` is a separate argument, never read from the body: only the Assistant filing sets it,
// so a unit sent to the website's submit is ignored.
async function submitForm(body, units = []) {
  const validationError = validateSubmission(body) || validateDateMode(body) || validateUnits(units);
  if (validationError) return refused(BAD_REQUEST, validationError);
  return (await listRefusal(body)) || createForm(body, units);
}

module.exports = { submitForm };
