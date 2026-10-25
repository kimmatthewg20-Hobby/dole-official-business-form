'use strict';

// Helpers shared by the Lockout checks of admin login and Reference code lookup. Not a check
// file itself: the runner only loads files ending in .check.js.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');

// From the spec, not from the code, so a changed limit makes these checks fail.
const WRONG_LOGINS_ALLOWED = 5;
const WRONG_CODES_ALLOWED = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const ONE_SECOND_MS = 1000;
const ADMIN_USERNAME = 'cnpoadmin';
const WRONG_USERNAME = 'typed-username-to-forget';
const WRONG_PASSWORD = 'typed-password-to-forget';
const REAL_IP_HEADER = 'X-Real-IP';
const ON_VERCEL = '1';
const LOCKED_OUT = 429;
const UNAUTHORIZED = 401;
const OK = 200;
const NOT_FOUND = 404;
const CODE_LOOKUP_ROUTE = '/api/lookup/code';
const EDIT_WITH_CODE_ROUTE = '/api/edit-with-code';

function sendFrom(baseUrl, method, route, address, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (address !== undefined) headers[REAL_IP_HEADER] = address;
  return fetch(`${baseUrl}${route}`, { method, headers, body: JSON.stringify(body) });
}

function postFrom(baseUrl, route, address, body) {
  return sendFrom(baseUrl, 'POST', route, address, body);
}

function loginFrom(baseUrl, address, password, username = ADMIN_USERNAME) {
  return postFrom(baseUrl, '/api/admin/login', address, { username, password });
}

function lookUpCodeFrom(baseUrl, address, code) {
  return postFrom(baseUrl, CODE_LOOKUP_ROUTE, address, { code });
}

function editWithCodeFrom(baseUrl, address, body) {
  return sendFrom(baseUrl, 'PUT', EDIT_WITH_CODE_ROUTE, address, body);
}

async function failLogins(baseUrl, address, count) {
  for (let attempt = 0; attempt < count; attempt += 1) {
    // Alternate the mistake: a wrong username counts even with the right password.
    const [username, password] =
      attempt % 2 === 0 ? [ADMIN_USERNAME, WRONG_PASSWORD] : [WRONG_USERNAME, TEST_ADMIN_PASSWORD];
    const response = await loginFrom(baseUrl, address, password, username);
    assert.equal(response.status, UNAUTHORIZED);
  }
}

// Each wrong code differs, as a guesser's would.
async function failCodeLookups(baseUrl, address, count) {
  for (let attempt = 0; attempt < count; attempt += 1) {
    const response = await lookUpCodeFrom(baseUrl, address, `DOLEWRONG${attempt}`);
    assert.equal(response.status, NOT_FOUND);
  }
}

async function expectLockedOut(response) {
  assert.equal(response.status, LOCKED_OUT);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.error, /try again later/i);
  assert.equal(response.headers.getSetCookie().length, 0);
  const retryAfterSeconds = Number(response.headers.get('Retry-After'));
  assert.ok(retryAfterSeconds > 0 && retryAfterSeconds <= LOCKOUT_MS / ONE_SECOND_MS);
}

// Vercel overwrites X-Real-IP with the caller's address; anywhere else a caller could forge it.
async function onVercel(callback) {
  const previous = process.env.VERCEL;
  process.env.VERCEL = ON_VERCEL;
  try {
    await callback();
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
}

// Stands in for waiting: moves one address's wrong attempts back in time.
function backdateFailedAttempts(db, address, ms) {
  return db.run('UPDATE failed_logins SET failed_at = failed_at - ? WHERE source_address = ?', [
    ms,
    address,
  ]);
}

module.exports = {
  WRONG_LOGINS_ALLOWED,
  WRONG_CODES_ALLOWED,
  LOCKOUT_MS,
  ONE_SECOND_MS,
  ADMIN_USERNAME,
  WRONG_USERNAME,
  WRONG_PASSWORD,
  LOCKED_OUT,
  UNAUTHORIZED,
  OK,
  NOT_FOUND,
  loginFrom,
  lookUpCodeFrom,
  editWithCodeFrom,
  failLogins,
  failCodeLookups,
  expectLockedOut,
  onVercel,
  backdateFailedAttempts,
};
