'use strict';

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const {
  postJson,
  login,
  loginCookie,
  readSettings,
  withSettingsRestored,
  withFallbackPassword,
} = require('./admin-http');

const WRONG_PASSWORD = 'not-the-admin-password';
const CHANGED_PASSWORD = 'changed-admin-password';
const FIRST_RUN_FALLBACK_PASSWORD = 'first-run-fallback-password';
const FIRST_RUN_NEW_PASSWORD = 'first-run-new-password';
const SAVED_DIVISION_OPTIONS = 'TSSD, IMSD, MALSU, CHECK';
const UNAUTHORIZED = 401;

async function expectUnauthenticatedRejected(baseUrl) {
  const check = await fetch(`${baseUrl}/api/admin/check`);
  assert.equal(check.status, UNAUTHORIZED);

  const changePassword = await postJson(baseUrl, '/api/admin/change-password', {
    oldPassword: TEST_ADMIN_PASSWORD,
    newPassword: CHANGED_PASSWORD,
  });
  assert.equal(changePassword.status, UNAUTHORIZED);

  const saveSettings = await postJson(baseUrl, '/api/settings', {
    division_options: SAVED_DIVISION_OPTIONS,
  });
  assert.equal(saveSettings.status, UNAUTHORIZED);

  const cleanupTest = await fetch(`${baseUrl}/api/cleanup/test`);
  assert.equal(cleanupTest.status, UNAUTHORIZED);

  assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
  assert.equal((await readSettings(baseUrl)).division_options, 'TSSD, IMSD, MALSU');
}

module.exports = [
  {
    name: 'admin login fails with a wrong password and sets no admin cookie',
    async run({ baseUrl }) {
      const response = await login(baseUrl, WRONG_PASSWORD);
      assert.equal(response.status, UNAUTHORIZED);
      assert.deepEqual(await response.json(), {
        success: false,
        error: 'Incorrect username or password',
      });
      assert.equal(response.headers.getSetCookie().length, 0);
    },
  },
  {
    name: 'a logged-in admin passes the admin check',
    async run({ baseUrl }) {
      const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
      const response = await fetch(`${baseUrl}/api/admin/check`, { headers: { Cookie: cookie } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    },
  },
  {
    name: 'admin routes reject requests that are not logged in',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, () => expectUnauthenticatedRejected(baseUrl));
    },
  },
  {
    name: 'reading settings returns the newest saved settings row',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await db.run('INSERT INTO settings (division_options) VALUES (?)', ['OLDER']);
        await db.run('INSERT INTO settings (division_options) VALUES (?)', ['NEWEST']);
        assert.deepEqual(await readSettings(baseUrl), { division_options: 'NEWEST' });
      });
    },
  },
  {
    name: 'saving settings makes the saved settings the ones in use',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await postJson(
          baseUrl,
          '/api/settings',
          { division_options: `  ${SAVED_DIVISION_OPTIONS}  ` },
          cookie
        );
        assert.equal(response.status, 200);
        const saved = await response.json();
        assert.equal(saved.success, true);
        assert.equal(typeof saved.id, 'number');
        assert.deepEqual(await readSettings(baseUrl), { division_options: SAVED_DIVISION_OPTIONS });
      });
    },
  },
  {
    name: 'changing the admin password makes the new password the one that logs in',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const wrongOld = await postJson(
          baseUrl,
          '/api/admin/change-password',
          { oldPassword: WRONG_PASSWORD, newPassword: CHANGED_PASSWORD },
          cookie
        );
        assert.equal(wrongOld.status, UNAUTHORIZED);

        const response = await postJson(
          baseUrl,
          '/api/admin/change-password',
          { oldPassword: TEST_ADMIN_PASSWORD, newPassword: CHANGED_PASSWORD },
          cookie
        );
        assert.equal(response.status, 200);
        assert.equal((await response.json()).success, true);

        assert.equal((await login(baseUrl, CHANGED_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, UNAUTHORIZED);
      });
      assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
    },
  },
  {
    name: 'first run with no settings row creates one when settings are read',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await db.run('DELETE FROM settings', []);
        assert.deepEqual(await readSettings(baseUrl), { division_options: '' });
        const created = await db.all('SELECT division_options FROM settings', []);
        assert.deepEqual(created, [{ division_options: '' }]);
      });
    },
  },
  {
    name: 'first run with no settings row lets the admin set a password',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await withFallbackPassword(FIRST_RUN_FALLBACK_PASSWORD, async () => {
          await db.run('DELETE FROM settings', []);
          const cookie = await loginCookie(baseUrl, FIRST_RUN_FALLBACK_PASSWORD);
          const response = await postJson(
            baseUrl,
            '/api/admin/change-password',
            { oldPassword: FIRST_RUN_FALLBACK_PASSWORD, newPassword: FIRST_RUN_NEW_PASSWORD },
            cookie
          );
          assert.equal(response.status, 200);
          assert.equal((await login(baseUrl, FIRST_RUN_NEW_PASSWORD)).status, 200);
          assert.equal((await login(baseUrl, FIRST_RUN_FALLBACK_PASSWORD)).status, UNAUTHORIZED);
        });
      });
    },
  },
];
