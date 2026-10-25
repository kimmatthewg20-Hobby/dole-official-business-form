'use strict';

// HTTP helpers shared by the Division checks. Not a check file itself: the runner only
// loads files ending in .check.js.

const assert = require('node:assert/strict');
const { sendJson } = require('./admin-http');
const { getJson } = require('./form-helpers');

const DIVISIONS_ROUTE = '/api/divisions';
const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const CONFLICT = 409;
const CODE_MESSAGE = 'Division code must be 2 to 4 letters (A-Z)';

// Divisions are shared by every check, so each one starts with none and removes its own.
async function withNoDivisions(db, callback) {
  await db.run('DELETE FROM divisions', []);
  try {
    await callback();
  } finally {
    await db.run('DELETE FROM divisions', []);
  }
}

async function expectRejected(response, status, error) {
  assert.equal(response.status, status);
  assert.equal((await response.json()).error, error);
}

async function listDivisions(baseUrl) {
  const response = await fetch(`${baseUrl}${DIVISIONS_ROUTE}`);
  assert.equal(response.status, OK);
  return (await response.json()).divisions.map(({ name, code }) => ({
    name,
    code,
  }));
}

function addDivision(baseUrl, division, cookie) {
  return sendJson(baseUrl, 'POST', DIVISIONS_ROUTE, division, cookie);
}

async function addedId(baseUrl, division, cookie) {
  const response = await addDivision(baseUrl, division, cookie);
  assert.equal(response.status, OK);
  return (await response.json()).id;
}

function editDivision(baseUrl, id, division, cookie) {
  return sendJson(baseUrl, 'PUT', `${DIVISIONS_ROUTE}/${id}`, division, cookie);
}

function removeDivision(baseUrl, id, cookie) {
  return sendJson(baseUrl, 'DELETE', `${DIVISIONS_ROUTE}/${id}`, undefined, cookie);
}

async function storedForm(baseUrl, id) {
  const { formData, employees } = await getJson(baseUrl, `/api/retrieve/${id}`);
  return { formData, employees };
}

module.exports = {
  OK,
  BAD_REQUEST,
  NOT_FOUND,
  UNAUTHORIZED,
  CONFLICT,
  CODE_MESSAGE,
  withNoDivisions,
  expectRejected,
  listDivisions,
  addDivision,
  addedId,
  editDivision,
  removeDivision,
  storedForm,
};
