'use strict';

// Admin session (GLOSSARY.md, ADR 0002): a signed cookie issued at login that every admin
// route verifies, refused outright when SESSION_SECRET is not set.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { login, sessionSetCookie, loginCookie, withEnv } = require('./admin-http');
const { adminRouteVerdicts, ALL_ACCEPTED, ALL_REJECTED } = require('./admin-routes');

// From the spec, not from the code, so a changed lifetime makes these checks fail.
const SESSION_MS = 60 * 60 * 1000;
const SESSION_SECONDS = 60 * 60;
const ONE_MINUTE_MS = 60 * 1000;
const WRONG_LOGINS_BEFORE_LOCKOUT = 5;
const LOGIN_UNAVAILABLE = 503;
const OK = 200;
const ON_VERCEL = '1';
const OTHER_SECRET = 'a-different-session-secret';
const FORGED_COOKIES = ['adminAuth=1', 'adminSession=1', 'adminSession='];

// The server runs in this process, so moving Date.now here moves the server's clock too.
async function withClockMovedForward(ms, callback) {
  const realNow = Date.now;
  Date.now = () => realNow() + ms;
  try {
    await callback();
  } finally {
    Date.now = realNow;
  }
}

function replaceCharacterAt(text, index) {
  const replacement = text[index] === 'A' ? 'B' : 'A';
  return text.slice(0, index) + replacement + text.slice(index + 1);
}

async function expectLoginUnavailable(response) {
  assert.equal(response.status, LOGIN_UNAVAILABLE);
  assert.equal((await response.json()).success, false);
  assert.equal(response.headers.getSetCookie().length, 0);
}

module.exports = [
  {
    name: 'login sets an httpOnly, SameSite=Strict session cookie that lasts one hour',
    async run({ baseUrl }) {
      const setCookie = sessionSetCookie(await login(baseUrl, TEST_ADMIN_PASSWORD));
      assert.ok(setCookie, 'login sets the admin session cookie');
      assert.match(setCookie, /;\s*HttpOnly/i);
      assert.match(setCookie, /;\s*SameSite=Strict/i);
      assert.match(setCookie, new RegExp(`;\\s*Max-Age=${SESSION_SECONDS}(;|$)`));
      assert.doesNotMatch(setCookie, /;\s*Secure/i);
    },
  },
  {
    name: 'on Vercel the session cookie is Secure',
    async run({ baseUrl }) {
      await withEnv('VERCEL', ON_VERCEL, async () => {
        const setCookie = sessionSetCookie(await login(baseUrl, TEST_ADMIN_PASSWORD));
        assert.match(setCookie, /;\s*Secure/i);
      });
    },
  },
  {
    name: 'a logged-in admin passes every kind of admin route',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_ACCEPTED);
    },
  },
  {
    name: 'without SESSION_SECRET login is refused and is not counted as a wrong login',
    async run({ baseUrl }) {
      for (const missingSecret of [undefined, '']) {
        await withEnv('SESSION_SECRET', missingSecret, async () => {
          for (let attempt = 0; attempt <= WRONG_LOGINS_BEFORE_LOCKOUT; attempt += 1) {
            await expectLoginUnavailable(await login(baseUrl, TEST_ADMIN_PASSWORD));
          }
        });
      }
      assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, OK);
    },
  },
  {
    name: 'a forged cookie is rejected by every kind of admin route',
    async run({ baseUrl }) {
      for (const forged of FORGED_COOKIES) {
        assert.deepEqual(await adminRouteVerdicts(baseUrl, forged), ALL_REJECTED, forged);
      }
      assert.deepEqual(await adminRouteVerdicts(baseUrl, undefined), ALL_REJECTED);
    },
  },
  {
    name: 'a session cookie with any character changed is rejected',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      const valueStart = cookie.indexOf('=') + 1;
      const positions = [valueStart, Math.floor((valueStart + cookie.length) / 2), cookie.length - 1];
      for (const position of positions) {
        const tampered = replaceCharacterAt(cookie, position);
        assert.deepEqual(await adminRouteVerdicts(baseUrl, tampered), ALL_REJECTED, tampered);
      }
      assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_ACCEPTED);
    },
  },
  {
    name: 'a session signed with another secret, or with no secret set, is rejected',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      for (const secret of [OTHER_SECRET, undefined, '']) {
        await withEnv('SESSION_SECRET', secret, async () => {
          assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_REJECTED);
        });
      }
    },
  },
  {
    name: 'a session is accepted until one hour after login and rejected from then on',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      await withClockMovedForward(SESSION_MS - ONE_MINUTE_MS, async () => {
        assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_ACCEPTED);
      });
      await withClockMovedForward(SESSION_MS + ONE_MINUTE_MS, async () => {
        assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_REJECTED);
      });
      assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_REJECTED);
    },
  },
];
