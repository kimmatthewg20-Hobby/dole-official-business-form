'use strict';

// How an admin session ends before its hour is up: logout, and a change of the admin
// password. Also that the session secret is never logged or returned.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { hashPassword } = require('../routes/password-hash');
const {
  postJson,
  login,
  sessionSetCookie,
  sessionCookie,
  loginCookie,
  adminCheckStatus,
  withSettingsRestored,
  withEnv,
  captureConsole,
} = require('./admin-http');
const { adminRouteVerdicts, ALL_ACCEPTED, ALL_REJECTED } = require('./admin-routes');

const LOGOUT_ROUTE = '/api/admin/logout';
const CHANGED_PASSWORD = 'changed-admin-password';
const PASSWORD_SET_ELSEWHERE = 'password-set-elsewhere';
const OK = 200;
const UNIX_EPOCH_EXPIRES = /;\s*Expires=Thu, 01 Jan 1970/i;

function logout(baseUrl, cookie) {
  return postJson(baseUrl, LOGOUT_ROUTE, {}, cookie);
}

function changePassword(baseUrl, cookie, oldPassword, newPassword) {
  return postJson(baseUrl, '/api/admin/change-password', { oldPassword, newPassword }, cookie);
}

module.exports = [
  {
    name: 'logout clears the cookie and the old session no longer works',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      const other = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      const response = await logout(baseUrl, cookie);
      assert.equal(response.status, OK);
      assert.deepEqual(await response.json(), { success: true });
      assert.match(sessionSetCookie(response), UNIX_EPOCH_EXPIRES);
      assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_REJECTED);
      assert.deepEqual(await adminRouteVerdicts(baseUrl, other), ALL_ACCEPTED);
    },
  },
  {
    name: 'logout without a session still clears the cookie',
    async run({ baseUrl }) {
      for (const cookie of [undefined, 'adminSession=1']) {
        const response = await logout(baseUrl, cookie);
        assert.equal(response.status, OK);
        assert.match(sessionSetCookie(response), UNIX_EPOCH_EXPIRES);
      }
    },
  },
  {
    name: 'changing the password ends every earlier session and gives the changer a fresh one',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const changer = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const elsewhere = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await changePassword(
          baseUrl,
          changer,
          TEST_ADMIN_PASSWORD,
          CHANGED_PASSWORD,
        );
        assert.equal(response.status, OK);
        const fresh = sessionCookie(response);
        assert.deepEqual(await adminRouteVerdicts(baseUrl, changer), ALL_REJECTED);
        assert.deepEqual(await adminRouteVerdicts(baseUrl, elsewhere), ALL_REJECTED);
        assert.deepEqual(await adminRouteVerdicts(baseUrl, fresh), ALL_ACCEPTED);
      });
    },
  },
  {
    name: 'a session ends when the stored password changes by any other way',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await db.run(
          'UPDATE settings SET admin_password = ? WHERE id = (SELECT MAX(id) FROM settings)',
          [await hashPassword(PASSWORD_SET_ELSEWHERE)],
        );
        assert.deepEqual(await adminRouteVerdicts(baseUrl, cookie), ALL_REJECTED);
      });
    },
  },
  {
    name: 'the session secret never appears in logs or responses',
    async run({ baseUrl }) {
      const secret = process.env.SESSION_SECRET;
      const seen = [];
      const logs = await captureConsole(async () => {
        const right = await login(baseUrl, TEST_ADMIN_PASSWORD);
        seen.push(await right.text(), ...right.headers.getSetCookie());
        const cookie = sessionCookie(right);
        await adminCheckStatus(baseUrl, `${cookie}x`);
        const out = await logout(baseUrl, cookie);
        seen.push(await out.text(), ...out.headers.getSetCookie());
        await withEnv('SESSION_SECRET', '', async () => {
          seen.push(await (await login(baseUrl, TEST_ADMIN_PASSWORD)).text());
        });
      });
      const output = `${logs}\n${seen.join('\n')}`;
      assert.ok(!output.includes(secret), 'the session secret was logged or returned');
    },
  },
  {
    name: 'the admin page has a Logout button and its idle timer logs out',
    async run({ baseUrl }) {
      const page = await (await fetch(`${baseUrl}/admin`)).text();
      assert.match(page, /<button[^>]*id="logoutBtn"/);
      assert.match(page, new RegExp(`fetch\\('${LOGOUT_ROUTE}'`));
      assert.match(page, /setTimeout\(\s*\(\)\s*=>\s*logout\(/);
    },
  },
];
