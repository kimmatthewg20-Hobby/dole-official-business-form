'use strict';

// Lockout (GLOSSARY.md). Each check uses its own documentation address (203.0.113.0/24),
// so no check can lock out another or the loopback address the other checks log in from.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const {
  WRONG_LOGINS_ALLOWED,
  LOCKOUT_MS,
  ONE_SECOND_MS,
  ADMIN_USERNAME,
  WRONG_USERNAME,
  WRONG_PASSWORD,
  OK,
  loginFrom,
  failLogins,
  expectLockedOut,
  onVercel,
  backdateFailedAttempts: backdateFailedLogins,
} = require('./lockout-helpers');

// The runner's server listens on loopback, so a request without a usable header lands here.
const SOCKET_ADDRESS = '127.0.0.1';

// The socket address is shared with every other check, so it is left with no failures.
async function withSocketAddressCleared(baseUrl, db, callback) {
  assert.equal((await loginFrom(baseUrl, undefined, TEST_ADMIN_PASSWORD)).status, OK);
  try {
    await callback();
  } finally {
    await db.run('DELETE FROM failed_logins WHERE source_address = ?', [SOCKET_ADDRESS]);
  }
}

module.exports = [
  {
    name: 'five wrong logins refuse the sixth and later ones even with the right password',
    async run({ baseUrl }) {
      await onVercel(async () => {
        const address = '203.0.113.1';
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED);
        await expectLockedOut(await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD));
        await expectLockedOut(await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD));
      });
    },
  },
  {
    name: 'a locked-out address does not lock out a different address',
    async run({ baseUrl }) {
      await onVercel(async () => {
        await failLogins(baseUrl, '203.0.113.2', WRONG_LOGINS_ALLOWED);
        await expectLockedOut(await loginFrom(baseUrl, '203.0.113.2', TEST_ADMIN_PASSWORD));
        assert.equal((await loginFrom(baseUrl, '203.0.113.3', TEST_ADMIN_PASSWORD)).status, OK);
      });
    },
  },
  {
    name: 'a correct login before the limit clears the wrong logins of that address',
    async run({ baseUrl }) {
      await onVercel(async () => {
        const address = '203.0.113.4';
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED - 1);
        assert.equal((await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD)).status, OK);
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED - 1);
        assert.equal((await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD)).status, OK);
      });
    },
  },
  {
    name: 'the lockout ends fifteen minutes after the fifth wrong login',
    async run({ baseUrl, db }) {
      await onVercel(async () => {
        const address = '203.0.113.5';
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED);
        await backdateFailedLogins(db, address, LOCKOUT_MS - ONE_SECOND_MS * 10);
        await expectLockedOut(await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD));
        await backdateFailedLogins(db, address, ONE_SECOND_MS * 11);
        assert.equal((await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD)).status, OK);
      });
    },
  },
  {
    name: 'wrong logins spread wider than fifteen minutes do not lock out',
    async run({ baseUrl, db }) {
      await onVercel(async () => {
        const address = '203.0.113.6';
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED - 1);
        await backdateFailedLogins(db, address, LOCKOUT_MS + ONE_SECOND_MS);
        await failLogins(baseUrl, address, 1);
        assert.equal((await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD)).status, OK);
      });
    },
  },
  {
    name: 'old wrong logins are deleted when the table is read',
    async run({ baseUrl, db }) {
      const longAgo = Date.now() - 2 * LOCKOUT_MS - ONE_SECOND_MS;
      await db.run('INSERT INTO failed_logins (source_address, failed_at) VALUES (?, ?)', [
        '203.0.113.7',
        longAgo,
      ]);
      await onVercel(async () => {
        await loginFrom(baseUrl, '203.0.113.8', TEST_ADMIN_PASSWORD);
      });
      const leftover = await db.get(
        'SELECT COUNT(*) AS count FROM failed_logins WHERE failed_at = ?',
        [longAgo]
      );
      assert.equal(leftover.count, 0);
    },
  },
  {
    name: 'a missing or malformed X-Real-IP falls back to the socket address, not a shared bucket',
    async run({ baseUrl, db }) {
      await onVercel(async () => {
        await withSocketAddressCleared(baseUrl, db, async () => {
          for (const header of ['not-an-address', '203.0.113.9, 10.0.0.1', '']) {
            await failLogins(baseUrl, header, 1);
          }
          await failLogins(baseUrl, undefined, WRONG_LOGINS_ALLOWED - 3);
          await expectLockedOut(await loginFrom(baseUrl, undefined, TEST_ADMIN_PASSWORD));
          assert.equal((await loginFrom(baseUrl, '203.0.113.10', TEST_ADMIN_PASSWORD)).status, OK);
        });
      });
    },
  },
  {
    name: 'off Vercel X-Real-IP is ignored, so a forged header cannot dodge the lockout',
    async run({ baseUrl, db }) {
      await withSocketAddressCleared(baseUrl, db, async () => {
        for (let attempt = 0; attempt < WRONG_LOGINS_ALLOWED; attempt += 1) {
          await failLogins(baseUrl, `203.0.113.${20 + attempt}`, 1);
        }
        await expectLockedOut(await loginFrom(baseUrl, '203.0.113.30', TEST_ADMIN_PASSWORD));
      });
    },
  },
  {
    name: 'the failed-login log stores no typed usernames or passwords',
    async run({ baseUrl, db }) {
      await onVercel(() => failLogins(baseUrl, '203.0.113.40', 2));
      const rows = await db.all('SELECT * FROM failed_logins', []);
      assert.ok(rows.length > 0);
      const logged = JSON.stringify(rows);
      for (const typed of [WRONG_USERNAME, WRONG_PASSWORD, ADMIN_USERNAME, TEST_ADMIN_PASSWORD]) {
        assert.ok(!logged.includes(typed), `failed_logins must not contain ${typed}`);
      }
    },
  },
];
