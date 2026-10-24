'use strict';

// How the admin password is stored: as a salted scrypt hash, with an old plain-text
// value upgraded at its first correct login, and never echoed in logs or responses.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const {
  postJson,
  login,
  sessionCookie,
  loginCookie,
  withSettingsRestored,
  captureConsole,
} = require('./admin-http');

// The scheme name, then three numeric parameters, then salt and hash in base64.
const SCRYPT_HASH_FORMAT = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/;
const OLD_PLAIN_PASSWORD = 'old-plain-text-password';
const SHORT_OLD_PASSWORD = 'short';
const CHANGED_PASSWORD = 'changed-admin-password';
const TOO_SHORT_NEW_PASSWORD = 'nine-char';
const WRONG_PASSWORD = 'not-the-admin-password';
const UNAUTHORIZED = 401;
const BAD_REQUEST = 400;

async function storedPassword(db) {
  const row = await db.get('SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1', []);
  return row.admin_password;
}

function storePassword(db, value) {
  return db.run(
    'UPDATE settings SET admin_password = ? WHERE id = (SELECT MAX(id) FROM settings)',
    [value],
  );
}

function changePassword(baseUrl, cookie, oldPassword, newPassword) {
  return postJson(baseUrl, '/api/admin/change-password', { oldPassword, newPassword }, cookie);
}

module.exports = [
  {
    name: 'the seed stores the test admin password as a scrypt hash',
    async run({ db }) {
      const stored = await storedPassword(db);
      assert.match(stored, SCRYPT_HASH_FORMAT);
      assert.ok(!stored.includes(TEST_ADMIN_PASSWORD));
    },
  },
  {
    name: 'a changed password is stored as a scrypt hash with its own random salt',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const first = await changePassword(baseUrl, cookie, TEST_ADMIN_PASSWORD, CHANGED_PASSWORD);
        assert.equal(first.status, 200);
        const firstHash = await storedPassword(db);
        const second = await changePassword(
          baseUrl,
          sessionCookie(first),
          CHANGED_PASSWORD,
          CHANGED_PASSWORD,
        );
        assert.equal(second.status, 200);
        const secondHash = await storedPassword(db);
        assert.match(firstHash, SCRYPT_HASH_FORMAT);
        assert.match(secondHash, SCRYPT_HASH_FORMAT);
        assert.notEqual(firstHash, secondHash);
        assert.equal((await login(baseUrl, CHANGED_PASSWORD)).status, 200);
      });
    },
  },
  {
    name: 'an old plain-text password logs in once and is re-saved as a hash',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await storePassword(db, OLD_PLAIN_PASSWORD);
        assert.equal((await login(baseUrl, WRONG_PASSWORD)).status, UNAUTHORIZED);
        assert.equal(await storedPassword(db), OLD_PLAIN_PASSWORD);

        assert.equal((await login(baseUrl, OLD_PLAIN_PASSWORD)).status, 200);
        const upgraded = await storedPassword(db);
        assert.match(upgraded, SCRYPT_HASH_FORMAT);
        assert.equal((await login(baseUrl, OLD_PLAIN_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, upgraded)).status, UNAUTHORIZED);
      });
    },
  },
  {
    name: 'an existing password shorter than the minimum still logs in until changed',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await storePassword(db, SHORT_OLD_PASSWORD);
        assert.equal((await login(baseUrl, SHORT_OLD_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, SHORT_OLD_PASSWORD)).status, 200);
      });
    },
  },
  {
    name: 'a new password shorter than 10 characters is refused with a message',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await changePassword(
          baseUrl,
          cookie,
          TEST_ADMIN_PASSWORD,
          TOO_SHORT_NEW_PASSWORD,
        );
        assert.equal(response.status, BAD_REQUEST);
        assert.deepEqual(await response.json(), {
          success: false,
          error: 'New password must be at least 10 characters long',
        });
        assert.equal((await login(baseUrl, TEST_ADMIN_PASSWORD)).status, 200);
        assert.equal((await login(baseUrl, TOO_SHORT_NEW_PASSWORD)).status, UNAUTHORIZED);
      });
    },
  },
  {
    name: 'the admin password never appears in logs or responses',
    async run({ baseUrl, db }) {
      await withSettingsRestored(db, async () => {
        await storePassword(db, OLD_PLAIN_PASSWORD);
        const bodies = [];
        const logs = await captureConsole(async () => {
          const wrong = await login(baseUrl, WRONG_PASSWORD);
          bodies.push(await wrong.text());
          const right = await login(baseUrl, OLD_PLAIN_PASSWORD);
          bodies.push(await right.text());
          const cookie = sessionCookie(right);
          const changed = await changePassword(
            baseUrl,
            cookie,
            OLD_PLAIN_PASSWORD,
            CHANGED_PASSWORD,
          );
          bodies.push(await changed.text());
          const settings = await fetch(`${baseUrl}/api/settings`);
          bodies.push(await settings.text());
        });
        const stored = await storedPassword(db);
        const output = `${logs}\n${bodies.join('\n')}`;
        for (const secret of [OLD_PLAIN_PASSWORD, CHANGED_PASSWORD, WRONG_PASSWORD, stored]) {
          assert.ok(!output.includes(secret), 'a password or its hash was logged or returned');
        }
      });
    },
  },
];
