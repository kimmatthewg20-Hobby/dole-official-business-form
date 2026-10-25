'use strict';

// Lockout of the admin login (GLOSSARY.md, ADR 0002): five wrong logins within fifteen minutes
// refuse every login from the same source address for fifteen minutes.

const { ATTEMPT_KINDS, createLockout } = require('./attempt-lockout');

const WRONG_LOGINS_BEFORE_LOCKOUT = 5;
const LOCKED_OUT_MESSAGE = 'Too many wrong logins from this address. Try again later.';

const loginLockout = createLockout({
  kind: ATTEMPT_KINDS.ADMIN_LOGIN,
  wrongAttemptsBeforeLockout: WRONG_LOGINS_BEFORE_LOCKOUT,
  lockedOutMessage: LOCKED_OUT_MESSAGE,
});

module.exports = {
  refuseLockedOutLogin: loginLockout.refuseLockedOut,
  recordFailedLogin: loginLockout.recordFailedAttempt,
  clearFailedLogins: loginLockout.clearFailedAttempts,
};
