'use strict';

// Lockout (GLOSSARY.md, ADR 0002): after too many wrong attempts of one kind within fifteen
// minutes, every attempt of that kind from the same source address is refused for fifteen
// minutes. Counted per address, so a stranger cannot lock anyone else out; per kind, so wrong
// Reference codes never lock out the admin login or the other way round; and in the database,
// so the count holds across Vercel instances.

const net = require('node:net');
const db = require('../db');

const ATTEMPT_KINDS = Object.freeze({
  ADMIN_LOGIN: 'admin-login',
  REFERENCE_CODE: 'reference-code',
  ASSISTANT_FILING: 'assistant-filing',
});
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
// A lockout started by wrong attempts spread over one window lasts one more window, so older
// rows can no longer affect any decision. Every kind shares the window, so one age fits all.
const FAILED_ATTEMPT_RETENTION_MS = 2 * LOCKOUT_WINDOW_MS;
const MS_PER_SECOND = 1000;
const REAL_IP_HEADER = 'x-real-ip';
const TOO_MANY_REQUESTS = 429;

// Vercel overwrites X-Real-IP with the caller's address, so there it cannot be forged.
// Anywhere else the caller writes it, and trusting it would let anyone dodge the lockout
// or lock out someone else's address, so the socket address is used instead. A missing
// or malformed header also falls back to the socket address: one shared constant would
// let any visitor lock out everyone.
function sourceAddress(req) {
  const header = req.headers[REAL_IP_HEADER];
  if (process.env.VERCEL && typeof header === 'string' && net.isIP(header.trim())) {
    return header.trim();
  }
  return req.socket.remoteAddress;
}

function deleteExpiredFailedAttempts(now) {
  return db.run('DELETE FROM failed_logins WHERE failed_at <= ?', [
    now - FAILED_ATTEMPT_RETENTION_MS,
  ]);
}

// Refused attempts are not recorded, so the newest row is the wrong attempt that started the
// lockout, and the lockout ends one window after it.
async function lockoutEndsAt(kind, wrongAttemptsBeforeLockout, address, now) {
  const rows = await db.all(
    `SELECT failed_at FROM failed_logins WHERE kind = ? AND source_address = ?
     ORDER BY failed_at DESC LIMIT ?`,
    [kind, address, wrongAttemptsBeforeLockout]
  );
  if (rows.length < wrongAttemptsBeforeLockout) return null;
  const newest = Number(rows[0].failed_at);
  const oldest = Number(rows[rows.length - 1].failed_at);
  const endsAt = newest + LOCKOUT_WINDOW_MS;
  if (newest - oldest > LOCKOUT_WINDOW_MS || endsAt <= now) return null;
  return endsAt;
}

function createLockout({ kind, wrongAttemptsBeforeLockout, lockedOutMessage }) {
  async function refuseLockedOut(req, res, next) {
    try {
      const now = Date.now();
      await deleteExpiredFailedAttempts(now);
      const endsAt = await lockoutEndsAt(kind, wrongAttemptsBeforeLockout, sourceAddress(req), now);
      if (endsAt === null) return next();
      res.set('Retry-After', String(Math.ceil((endsAt - now) / MS_PER_SECOND)));
      res.status(TOO_MANY_REQUESTS).json({ success: false, error: lockedOutMessage });
    } catch (err) {
      console.error(`Error checking ${kind} lockout:`, err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  function recordFailedAttempt(req) {
    return db.run('INSERT INTO failed_logins (kind, source_address, failed_at) VALUES (?, ?, ?)', [
      kind,
      sourceAddress(req),
      Date.now(),
    ]);
  }

  function clearFailedAttempts(req) {
    return db.run('DELETE FROM failed_logins WHERE kind = ? AND source_address = ?', [
      kind,
      sourceAddress(req),
    ]);
  }

  return { refuseLockedOut, recordFailedAttempt, clearFailedAttempts };
}

// An attempt limit, unlike a Lockout, counts every attempt, right or wrong, and the window
// slides: an address may make attemptsPerWindow attempts in any one window. Refused attempts
// are not recorded, so asking again while refused never pushes the wait further out.
function createAttemptLimit({ kind, attemptsPerWindow }) {
  // Counting and recording are one statement, so calls running at once (a JSON-RPC batch,
  // other Vercel instances) cannot all read a count under the limit and all go through.
  async function recordWithinLimit(address, now) {
    const { changes } = await db.run(
      `INSERT INTO failed_logins (kind, source_address, failed_at)
       SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM failed_logins
         WHERE kind = ? AND source_address = ? AND failed_at > ?) < ?`,
      [kind, address, now, kind, address, now - LOCKOUT_WINDOW_MS, attemptsPerWindow]
    );
    return changes > 0;
  }

  // The next attempt is allowed once the oldest of the counted attempts leaves the window.
  async function msUntilNextAttempt(address, now) {
    const oldestCounted = await db.get(
      `SELECT failed_at FROM failed_logins WHERE kind = ? AND source_address = ? AND failed_at > ?
       ORDER BY failed_at DESC LIMIT 1 OFFSET ?`,
      [kind, address, now - LOCKOUT_WINDOW_MS, attemptsPerWindow - 1]
    );
    return oldestCounted ? Number(oldestCounted.failed_at) + LOCKOUT_WINDOW_MS - now : 0;
  }

  // Records the attempt and answers null, or answers how long until one is allowed.
  async function takeAttempt(address) {
    const now = Date.now();
    await deleteExpiredFailedAttempts(now);
    if (await recordWithinLimit(address, now)) return null;
    return msUntilNextAttempt(address, now);
  }

  return { takeAttempt };
}

module.exports = { ATTEMPT_KINDS, createLockout, createAttemptLimit, sourceAddress };
