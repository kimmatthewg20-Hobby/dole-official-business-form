'use strict';

// The per-source limit on Assistant filing (ADR 0004): one source address may file at most
// thirty forms within any fifteen minutes, so nobody can flood the forms through the open
// endpoint. It counts every filing, so it is not the Lockout. Counted in the database
// because Vercel runs many short-lived instances (ADR 0002).

const { ATTEMPT_KINDS, createAttemptLimit } = require('./attempt-lockout');

const FILINGS_PER_WINDOW = 30;
const MS_PER_MINUTE = 60 * 1000;
const MIN_WAIT_MINUTES = 1;

const filingLimit = createAttemptLimit({
  kind: ATTEMPT_KINDS.ASSISTANT_FILING,
  attemptsPerWindow: FILINGS_PER_WINDOW,
});

function tooManyFilingsMessage(waitMs) {
  const minutes = Math.max(MIN_WAIT_MINUTES, Math.ceil(waitMs / MS_PER_MINUTE));
  const unit = minutes === MIN_WAIT_MINUTES ? 'minute' : 'minutes';
  return `Too many forms filed from this address. Try again in ${minutes} ${unit}.`;
}

// Counts this filing and answers null, or answers the plain refusal when the address is over.
async function filingLimitRefusal(address) {
  const waitMs = await filingLimit.takeAttempt(address);
  return waitMs === null ? null : tooManyFilingsMessage(waitMs);
}

module.exports = { filingLimitRefusal };
