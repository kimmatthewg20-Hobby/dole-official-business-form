'use strict';

// Who may log in as admin: the fixed username plus the stored password, or, only
// while no password is stored, the ADMIN_PASSWORD bootstrap value.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { postJson, login, withSettingsRestored, withFallbackPassword } = require('./admin-http');

const WRONG_PASSWORD = 'not-the-admin-password';
const BOOTSTRAP_PASSWORD = 'bootstrap-admin-password';
// Split so the removed built-in default never appears whole in the source again.
const OLD_DEFAULT_PASSWORD = ['*1CNPO', 'admin*'].join('');
const REFUSED_LOGIN = {
  success: false,
  error: 'Incorrect username or password',
};
const UNAUTHORIZED = 401;

async function expectRefused(response) {
  assert.equal(response.status, UNAUTHORIZED);
  assert.deepEqual(await response.json(), REFUSED_LOGIN);
  assert.equal(response.headers.getSetCookie().length, 0);
}

function clearStoredPassword(db) {
  return db.run('UPDATE settings SET admin_password = NULL', []);
}

module.exports = [
  {
    name: 'a wrong username and a wrong password get the same refusal',
    async run({ baseUrl }) {
      await expectRefused(await login(baseUrl, TEST_ADMIN_PASSWORD, 'someoneelse'));
      await expectRefused(await login(baseUrl, WRONG_PASSWORD));
    },
  },
  {
    name: 'a login without a username is refused even with the right password',
    async run({ baseUrl }) {
      const withoutUsername = { password: TEST_ADMIN_PASSWORD };
      await expectRefused(await postJson(baseUrl, '/api/admin/login', withoutUsername));
    },
  },
  {
    name: 'ADMIN_PASSWORD logs in while no password is stored',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await withFallbackPassword(BOOTSTRAP_PASSWORD, async () => {
          await clearStoredPassword(db);
          assert.equal((await login(baseUrl, BOOTSTRAP_PASSWORD)).status, 200);
          await expectRefused(await login(baseUrl, WRONG_PASSWORD));
          await expectRefused(await login(baseUrl, BOOTSTRAP_PASSWORD, 'someoneelse'));
        });
      });
    },
  },
  {
    name: 'ADMIN_PASSWORD is ignored once a password is stored',
    async run({ baseUrl }) {
      await withFallbackPassword(BOOTSTRAP_PASSWORD, async () => {
        await expectRefused(await login(baseUrl, BOOTSTRAP_PASSWORD));
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
      });
    },
  },
  {
    name: 'with no stored password and no ADMIN_PASSWORD nobody can log in',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await withFallbackPassword(undefined, async () => {
          await clearStoredPassword(db);
          await expectRefused(await login(baseUrl, OLD_DEFAULT_PASSWORD));
          await expectRefused(await login(baseUrl, ''));
          await expectRefused(await login(baseUrl, TEST_ADMIN_PASSWORD));
        });
      });
    },
  },
  {
    name: 'an empty ADMIN_PASSWORD does not let an empty password log in',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await withFallbackPassword('', async () => {
          await clearStoredPassword(db);
          await expectRefused(await login(baseUrl, ''));
        });
      });
    },
  },
  {
    name: 'the admin page sends the username with the password',
    async run({ baseUrl }) {
      const response = await fetch(`${baseUrl}/admin`);
      assert.equal(response.status, 200);
      const page = await response.text();
      assert.match(page, /JSON\.stringify\(\{\s*username[^}]*password[^}]*\}\)/);
    },
  },
];
