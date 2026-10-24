'use strict';

// HTTP helpers shared by the admin and settings checks. Not a check file itself:
// the runner only loads files ending in .check.js.

const assert = require('node:assert/strict');

const SESSION_COOKIE_NAME = 'adminSession';
const ADMIN_USERNAME = 'cnpoadmin';
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];

function postJson(baseUrl, route, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${baseUrl}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

function login(baseUrl, password, username = ADMIN_USERNAME) {
  return postJson(baseUrl, '/api/admin/login', { username, password });
}

// The full Set-Cookie line of the admin session, or undefined when none was set.
function sessionSetCookie(response) {
  return response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
}

// The name=value part a browser would send back.
function sessionCookie(response) {
  const setCookie = sessionSetCookie(response);
  assert.ok(setCookie, 'the response sets the admin session cookie');
  return setCookie.split(';')[0];
}

async function loginCookie(baseUrl, password) {
  const response = await login(baseUrl, password);
  assert.equal(response.status, 200);
  return sessionCookie(response);
}

async function adminCheckStatus(baseUrl, cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  return (await fetch(`${baseUrl}/api/admin/check`, { headers })).status;
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

// The server runs in this process, so a variable set here is what it reads; undefined
// removes the variable for the duration of the callback.
async function withEnv(name, value, callback) {
  const hadValue = Object.prototype.hasOwnProperty.call(process.env, name);
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    await callback();
  } finally {
    if (hadValue) process.env[name] = previous;
    else delete process.env[name];
  }
}

// With no stored password the app accepts ADMIN_PASSWORD; a known value (or none,
// when password is undefined) keeps the check independent of any developer's environment.
function withFallbackPassword(password, callback) {
  return withEnv('ADMIN_PASSWORD', password, callback);
}

// The server runs in this process, so its console output can be collected here.
async function captureConsole(callback) {
  const originals = CONSOLE_METHODS.map((method) => console[method]);
  const lines = [];
  for (const method of CONSOLE_METHODS) {
    console[method] = (...args) =>
      lines.push(args.map((arg) => String(arg && arg.stack ? arg.stack : arg)).join(' '));
  }
  try {
    await callback();
  } finally {
    CONSOLE_METHODS.forEach((method, index) => {
      console[method] = originals[index];
    });
  }
  return lines.join('\n');
}

module.exports = {
  postJson,
  login,
  sessionSetCookie,
  sessionCookie,
  loginCookie,
  adminCheckStatus,
  readSettings,
  withSettingsRestored,
  withEnv,
  withFallbackPassword,
  captureConsole,
};
