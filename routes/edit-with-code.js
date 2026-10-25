'use strict';

// Staff edit one form by presenting its whole Reference code (ADR 0003). The code is checked on
// every save, because the page cannot be trusted, and travels in the body so it stays out of
// URLs, server logs and browser history. The Division and the code itself never change.

const express = require('express');
const db = require('../db');
const { normaliseReferenceCode } = require('./reference-code');
const { refuseLockedOutCodeAttempt, recordWrongCode } = require('./reference-code-lockout');
const { NOT_FOUND, NOT_FOUND_MESSAGE } = require('./reference-code-lookup');
const { validateSubmission } = require('./form-validation');
const { validateListedApprover } = require('./form-lists-validation');
const { writeFormContent } = require('./form-replace');
const { rememberEmployees } = require('./directory-memory');
const { publicFormWithEmployees } = require('./public-form');

const EDIT_WITH_CODE_ROUTE = '/api/edit-with-code';
const BAD_REQUEST = 400;
const DIVISION_LOCKED_MESSAGE = 'The Division of a submitted form cannot be changed.';

// A missing or empty code finds nothing, so it is answered and counted like a wrong one: the
// edit route gives a guesser no cheaper probe than the lookup does.
function formByCode(typed) {
  const code = typeof typed === 'string' ? normaliseReferenceCode(typed) : '';
  if (!code) return null;
  return db.get('SELECT id, office, division FROM official_business WHERE reference_code = ?', [code]);
}

function divisionChanged(body, stored) {
  return body.division !== undefined && body.division !== null && body.division !== stored.division;
}

// Only the editable fields come from the page; the office and Division are the stored ones.
function editedForm(body, stored) {
  return {
    employees: body.employees,
    datesOfOB: body.datesOfOB,
    office: stored.office,
    division: stored.division,
    locationFrom: body.locationFrom || '',
    locationTo: body.locationTo,
    departureTime: body.departureTime,
    returnTime: body.returnTime,
    purpose: body.purpose,
    approvedBy: body.approvedBy || '',
    approvedByPosition: body.approvedByPosition || '',
  };
}

async function invalidEdit(body, stored, form) {
  if (divisionChanged(body, stored)) return DIVISION_LOCKED_MESSAGE;
  return validateSubmission(form) || (await validateListedApprover(form));
}

// The edit and the directory memory of its employees are written together or not at all.
function saveEdit(stored, form) {
  const sorted = { ...form, datesOfOB: [...form.datesOfOB].sort() };
  return db.transaction(async (client) => {
    await writeFormContent(client, stored.id, sorted);
    await rememberEmployees(client, sorted.employees, stored.division, new Date().toISOString());
  });
}

async function editWithCode(req, res) {
  const body = req.body || {};
  try {
    const stored = await formByCode(body.code);
    if (!stored) {
      await recordWrongCode(req);
      return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    }
    const form = editedForm(body, stored);
    const invalid = await invalidEdit(body, stored, form);
    if (invalid) return res.status(BAD_REQUEST).json({ error: invalid });
    await saveEdit(stored, form);
    const row = await db.get('SELECT * FROM official_business WHERE id = ?', [stored.id]);
    res.json({ success: true, ...(await publicFormWithEmployees(row)) });
  } catch (err) {
    // The code is the secret, so neither the log nor the answer carries it.
    console.error('Error saving an edit with a Reference code:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

const router = express.Router();
router.put(EDIT_WITH_CODE_ROUTE, refuseLockedOutCodeAttempt, editWithCode);

module.exports = { router, EDIT_WITH_CODE_ROUTE };
