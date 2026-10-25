'use strict';

// Lockout of Reference code attempts (GLOSSARY.md, ADR 0003): ten wrong codes within fifteen
// minutes refuse every code attempt from the same source address for fifteen minutes. A right
// code does not clear the count, or a guesser holding one real code could reset it at will.

const { ATTEMPT_KINDS, createLockout } = require('./attempt-lockout');

const WRONG_CODES_BEFORE_LOCKOUT = 10;
const LOCKED_OUT_MESSAGE = 'Too many wrong Reference codes from this address. Try again later.';

const codeLockout = createLockout({
  kind: ATTEMPT_KINDS.REFERENCE_CODE,
  wrongAttemptsBeforeLockout: WRONG_CODES_BEFORE_LOCKOUT,
  lockedOutMessage: LOCKED_OUT_MESSAGE,
});

module.exports = {
  refuseLockedOutCodeAttempt: codeLockout.refuseLockedOut,
  recordWrongCode: codeLockout.recordFailedAttempt,
};
