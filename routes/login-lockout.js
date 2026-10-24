'use strict';

// Lockout (GLOSSARY.md, ADR 0002): after five wrong admin logins within fifteen minutes,
// every login from the same source address is refused for fifteen minutes. Counted per
// address, so a stranger cannot lock the admin out, and in the database, so the count
// holds across Vercel instances.

const net = require('node:net');
const db = require('../db');

const WRONG_LOGINS_BEFORE_LOCKOUT = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
// A lockout started by wrong logins spread over one window lasts one more window,
// so older rows can no longer affect any decision.
const FAILED_LOGIN_RETENTION_MS = 2 * LOCKOUT_WINDOW_MS;
const MS_PER_SECOND = 1000;
const REAL_IP_HEADER = 'x-real-ip';
const TOO_MANY_REQUESTS = 429;
const LOCKED_OUT_MESSAGE = 'Too many wrong logins from this address. Try again later.';

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

function deleteExpiredFailedLogins(now) {
  return db.run('DELETE FROM failed_logins WHERE failed_at <= ?', [
    now - FAILED_LOGIN_RETENTION_MS,
  ]);
}

// Refused logins are not recorded, so the newest row is the wrong login that started the
// lockout, and the lockout ends one window after it.
async function lockoutEndsAt(address, now) {
  const rows = await db.all(
    'SELECT failed_at FROM failed_logins WHERE source_address = ? ORDER BY failed_at DESC LIMIT ?',
    [address, WRONG_LOGINS_BEFORE_LOCKOUT]
  );
  if (rows.length < WRONG_LOGINS_BEFORE_LOCKOUT) return null;
  const newest = Number(rows[0].failed_at);
  const oldest = Number(rows[rows.length - 1].failed_at);
  const endsAt = newest + LOCKOUT_WINDOW_MS;
  if (newest - oldest > LOCKOUT_WINDOW_MS || endsAt <= now) return null;
  return endsAt;
}

async function refuseLockedOutLogin(req, res, next) {
  try {
    const now = Date.now();
    await deleteExpiredFailedLogins(now);
    const endsAt = await lockoutEndsAt(sourceAddress(req), now);
    if (endsAt === null) return next();
    res.set('Retry-After', String(Math.ceil((endsAt - now) / MS_PER_SECOND)));
    res.status(TOO_MANY_REQUESTS).json({ success: false, error: LOCKED_OUT_MESSAGE });
  } catch (err) {
    console.error('Error checking login lockout:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

function recordFailedLogin(req) {
  return db.run('INSERT INTO failed_logins (source_address, failed_at) VALUES (?, ?)', [
    sourceAddress(req),
    Date.now(),
  ]);
}

function clearFailedLogins(req) {
  return db.run('DELETE FROM failed_logins WHERE source_address = ?', [sourceAddress(req)]);
}

module.exports = { refuseLockedOutLogin, recordFailedLogin, clearFailedLogins };
