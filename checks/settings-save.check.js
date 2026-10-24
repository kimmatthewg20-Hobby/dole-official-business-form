'use strict';

// Saving the division options must not wipe the rest of the settings in use:
// the admin password and the office details printed on every form.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const {
  postJson,
  login,
  sessionCookie,
  loginCookie,
  readSettings,
  withSettingsRestored,
} = require('./admin-http');

const SAVED_DIVISION_OPTIONS = 'TSSD, IMSD, MALSU, SAVE-CHECK';
const CHANGED_PASSWORD = 'changed-before-save-password';
const UNAUTHORIZED = 401;

function newestSettingsRow(db) {
  return db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', []);
}

async function saveDivisionOptions(baseUrl, cookie) {
  const response = await postJson(
    baseUrl,
    '/api/settings',
    { division_options: SAVED_DIVISION_OPTIONS },
    cookie,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
}

module.exports = [
  {
    name: 'saving settings keeps the seeded admin password working',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await saveDivisionOptions(baseUrl, await loginCookie(baseUrl, TEST_ADMIN_PASSWORD));
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
      });
    },
  },
  {
    name: 'saving settings returns the new division options when settings are read',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await saveDivisionOptions(baseUrl, await loginCookie(baseUrl, TEST_ADMIN_PASSWORD));
        assert.deepEqual(await readSettings(baseUrl), {
          division_options: SAVED_DIVISION_OPTIONS,
        });
      });
    },
  },
  {
    name: 'saving settings leaves the office details unchanged',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const before = await newestSettingsRow(db);
        await saveDivisionOptions(baseUrl, await loginCookie(baseUrl, TEST_ADMIN_PASSWORD));
        const after = await newestSettingsRow(db);
        assert.deepEqual(after, {
          ...before,
          division_options: SAVED_DIVISION_OPTIONS,
        });
        assert.equal(after.office, 'Sample Regional Office');
        assert.equal(after.office_head, 'Rosa Sample');
        assert.equal(after.assistant_regional_director, 'Carlos Placeholder');
      });
    },
  },
  {
    name: 'saving settings after a password change keeps the new password working',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const changed = await postJson(
          baseUrl,
          '/api/admin/change-password',
          { oldPassword: TEST_ADMIN_PASSWORD, newPassword: CHANGED_PASSWORD },
          cookie,
        );
        assert.equal(changed.status, 200);
        // As a browser would, the save uses the fresh session the change handed out.
        await saveDivisionOptions(baseUrl, sessionCookie(changed));
        assert.equal((await login(baseUrl, CHANGED_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, UNAUTHORIZED);
      });
      assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
    },
  },
];
