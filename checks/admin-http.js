'use strict';

// HTTP helpers shared by the admin and settings checks. Not a check file itself:
// the runner only loads files ending in .check.js.

const assert = require('node:assert/strict');

const AUTH_COOKIE_NAME = 'adminAuth';

function postJson(baseUrl, route, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${baseUrl}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

function login(baseUrl, password) {
  return postJson(baseUrl, '/api/admin/login', { password });
}

async function loginCookie(baseUrl, password) {
  const response = await login(baseUrl, password);
  assert.equal(response.status, 200);
  const authCookie = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  assert.ok(authCookie, 'login sets the admin cookie');
  return authCookie.split(';')[0];
}

async function readSettings(baseUrl) {
  const response = await fetch(`${baseUrl}/api/settings`);
  assert.equal(response.status, 200);
  return response.json();
}

// Settings are shared by every check, so each one that changes them puts the
// seeded rows back afterwards, whatever happened.
async function withSettingsRestored(db, callback) {
  const savedRows = await db.all('SELECT * FROM settings ORDER BY id', []);
  try {
    await callback();
  } finally {
    await db.transaction(async (client) => {
      await client.query('DELETE FROM settings', []);
      for (const row of savedRows) {
        const columns = Object.keys(row);
        await client.query(
          `INSERT INTO settings (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column])
        );
      }
    });
  }
}

// With no settings row the app falls back to ADMIN_PASSWORD; a known value keeps
// the check independent of any developer's own environment.
async function withFallbackPassword(password, callback) {
  const hadValue = Object.prototype.hasOwnProperty.call(process.env, 'ADMIN_PASSWORD');
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = password;
  try {
    await callback();
  } finally {
    if (hadValue) process.env.ADMIN_PASSWORD = previous;
    else delete process.env.ADMIN_PASSWORD;
  }
}

module.exports = {
  postJson,
  login,
  loginCookie,
  readSettings,
  withSettingsRestored,
  withFallbackPassword,
};
