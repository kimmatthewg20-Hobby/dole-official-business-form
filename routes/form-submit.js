'use strict';

// The one path from a submitted body to a stored form. The website's submit and the Assistant
// filing tool both use it, so their validation, refusals and stored forms cannot drift.

const { validateSubmission, validateDateMode } = require('./form-validation');
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

async function createForm(body) {
  try {
    return { form: await insertSubmission(body, expandSubmission(body), new Date().toISOString()) };
  } catch (error) {
    if (isCodeUnavailable(error)) return refused(SERVICE_UNAVAILABLE, error.message);
    console.error('Database error during form submission:', error);
    return refused(SERVER_ERROR, DATABASE_ERROR_PREFIX + error.message);
  }
}

// Returns { form: { id, datesOfOB, referenceCode } } once stored, or
// { refusal: { status, message } } in the words the website shows.
async function submitForm(body) {
  const validationError = validateSubmission(body) || validateDateMode(body);
  if (validationError) return refused(BAD_REQUEST, validationError);
  return (await listRefusal(body)) || createForm(body);
}

module.exports = { submitForm };
