'use strict';

// A new form may only name a Division and an Approver the admin has listed. Only creating is
// checked: stored forms keep the text they were saved with (see the Division and Approver
// migrations), so editing them is not held to the lists.

const db = require('../db');

const UNLISTED_DIVISION = 'Please choose a Division from the list';
const UNLISTED_APPROVER = 'Please choose an Approved by from the list';

// Returns an error message, or null when both choices are on the lists.
async function validateListedChoices(body) {
  const division = await db.get('SELECT id FROM divisions WHERE name = ?', [body.division || '']);
  if (!division) return UNLISTED_DIVISION;
  const approver = await db.get('SELECT id FROM approvers WHERE name = ? AND position = ?', [
    body.approvedBy || '',
    body.approvedByPosition || '',
  ]);
  return approver ? null : UNLISTED_APPROVER;
}

module.exports = { validateListedChoices };
