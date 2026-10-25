'use strict';

// HTTP helpers shared by the Approver checks. Not a check file itself: the runner only
// loads files ending in .check.js.

const assert = require('node:assert/strict');
const { sendJson } = require('./admin-http');
const { OK } = require('./division-helpers');

const APPROVERS_ROUTE = '/api/approvers';

// Approvers are shared by every check, so each one starts with none and removes its own.
async function withNoApprovers(db, callback) {
  await db.run('DELETE FROM approvers', []);
  try {
    await callback();
  } finally {
    await db.run('DELETE FROM approvers', []);
  }
}

async function listApprovers(baseUrl) {
  const response = await fetch(`${baseUrl}${APPROVERS_ROUTE}`);
  assert.equal(response.status, OK);
  return (await response.json()).approvers.map(({ name, position }) => ({
    name,
    position,
  }));
}

function addApprover(baseUrl, approver, cookie) {
  return sendJson(baseUrl, 'POST', APPROVERS_ROUTE, approver, cookie);
}

async function addedApproverId(baseUrl, approver, cookie) {
  const response = await addApprover(baseUrl, approver, cookie);
  assert.equal(response.status, OK);
  return (await response.json()).id;
}

function editApprover(baseUrl, id, approver, cookie) {
  return sendJson(baseUrl, 'PUT', `${APPROVERS_ROUTE}/${id}`, approver, cookie);
}

function removeApprover(baseUrl, id, cookie) {
  return sendJson(baseUrl, 'DELETE', `${APPROVERS_ROUTE}/${id}`, undefined, cookie);
}

module.exports = {
  withNoApprovers,
  listApprovers,
  addApprover,
  addedApproverId,
  editApprover,
  removeApprover,
};
