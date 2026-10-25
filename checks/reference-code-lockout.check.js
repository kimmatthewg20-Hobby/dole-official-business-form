'use strict';

// Lockout of Reference code lookups (GLOSSARY.md, ADR 0003), counted apart from admin logins.
// Each check uses its own documentation address (198.51.100.0/24), so none locks out another.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const {
  WRONG_LOGINS_ALLOWED,
  WRONG_CODES_ALLOWED,
  LOCKOUT_MS,
  ONE_SECOND_MS,
  OK,
  loginFrom,
  lookUpCodeFrom,
  failLogins,
  failCodeLookups,
  expectLockedOut,
  onVercel,
  backdateFailedAttempts,
} = require('./lockout-helpers');

const REFERENCE_CODE_ATTEMPT = 'reference-code';

// Every check needs a real code, so the eleventh attempt can be one that would have been right.
function withSubmittedCode(baseUrl, db, callback) {
  return withFormsRestored(db, async () => {
    const { forms } = await (await submit(baseUrl, VALID_SUBMISSION)).json();
    await onVercel(() => callback(forms[0].referenceCode));
  });
}

module.exports = [
  {
    name: 'ten wrong codes refuse the eleventh even when it is right, and other addresses still find it',
    async run({ baseUrl, db }) {
      await withSubmittedCode(baseUrl, db, async (code) => {
        const address = '198.51.100.20';
        await failCodeLookups(baseUrl, address, WRONG_CODES_ALLOWED);
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, code));
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, code));
        assert.equal((await lookUpCodeFrom(baseUrl, '198.51.100.21', code)).status, OK);
      });
    },
  },
  {
    name: 'the code lockout ends fifteen minutes after the tenth wrong code',
    async run({ baseUrl, db }) {
      await withSubmittedCode(baseUrl, db, async (code) => {
        const address = '198.51.100.22';
        await failCodeLookups(baseUrl, address, WRONG_CODES_ALLOWED);
        await backdateFailedAttempts(db, address, LOCKOUT_MS - ONE_SECOND_MS * 10);
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, code));
        await backdateFailedAttempts(db, address, ONE_SECOND_MS * 11);
        assert.equal((await lookUpCodeFrom(baseUrl, address, code)).status, OK);
      });
    },
  },
  {
    name: 'a right code before the limit does not wipe the wrong ones, so guessing gains nothing',
    async run({ baseUrl, db }) {
      await withSubmittedCode(baseUrl, db, async (code) => {
        const address = '198.51.100.23';
        await failCodeLookups(baseUrl, address, WRONG_CODES_ALLOWED - 1);
        assert.equal((await lookUpCodeFrom(baseUrl, address, code)).status, OK);
        await failCodeLookups(baseUrl, address, 1);
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, code));
      });
    },
  },
  {
    name: 'wrong codes do not lock out admin login, and a right login does not lift a code lockout',
    async run({ baseUrl, db }) {
      await withSubmittedCode(baseUrl, db, async (code) => {
        const address = '198.51.100.24';
        await failCodeLookups(baseUrl, address, WRONG_CODES_ALLOWED);
        assert.equal((await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD)).status, OK);
        await expectLockedOut(await lookUpCodeFrom(baseUrl, address, code));
      });
    },
  },
  {
    name: 'wrong logins do not count towards the code lockout, and a code lockout leaves logins locked',
    async run({ baseUrl, db }) {
      await withSubmittedCode(baseUrl, db, async (code) => {
        const address = '198.51.100.25';
        await failLogins(baseUrl, address, WRONG_LOGINS_ALLOWED);
        await expectLockedOut(await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD));
        await failCodeLookups(baseUrl, address, WRONG_CODES_ALLOWED - WRONG_LOGINS_ALLOWED);
        assert.equal((await lookUpCodeFrom(baseUrl, address, code)).status, OK);
        await expectLockedOut(await loginFrom(baseUrl, address, TEST_ADMIN_PASSWORD));
      });
    },
  },
  {
    name: 'old wrong codes are deleted when the table is read',
    async run({ baseUrl, db }) {
      const longAgo = Date.now() - 2 * LOCKOUT_MS - ONE_SECOND_MS;
      await db.run('INSERT INTO failed_logins (kind, source_address, failed_at) VALUES (?, ?, ?)', [
        REFERENCE_CODE_ATTEMPT,
        '198.51.100.26',
        longAgo,
      ]);
      await onVercel(() => lookUpCodeFrom(baseUrl, '198.51.100.27', 'DOLEWRONG'));
      const leftover = await db.get('SELECT COUNT(*) AS count FROM failed_logins WHERE failed_at = ?', [longAgo]);
      assert.equal(leftover.count, 0);
    },
  },
];
