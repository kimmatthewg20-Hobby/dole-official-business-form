'use strict';

// Admin session (GLOSSARY.md, ADR 0002). The cookie holds
// <session id>.<expiry ms>.<password fingerprint>.<signature>, signed with SESSION_SECRET.
// The signature stops forgery. The admin_sessions row lets logout and a password change end a
// session before its hour is up. The fingerprint of the stored password hash ends every older
// session whenever the stored password changes, by whatever route.

const crypto = require('node:crypto');
const db = require('../db');
const { readStoredPassword } = require('./admin-password');

const SESSION_COOKIE_NAME = 'adminSession';
const ADMIN_SESSION_MS = 60 * 60 * 1000;
const SESSION_ID_BYTES = 32;
const TOKEN_SEPARATOR = '.';
const TOKEN_PARTS = 4;
const SIGNING_ALGORITHM = 'sha256';
const TOKEN_ENCODING = 'base64url';
// Keeps a fingerprint from ever being valid as the signature of some other text.
const FINGERPRINT_PREFIX = 'admin-password:';
const DIGITS_ONLY = /^\d+$/;
const MISSING_SECRET_ERROR = 'SESSION_SECRET is not set';

// Read on every request so a secret set or rotated in Vercel applies at once.
// There is deliberately no fallback: an empty or missing secret means no sessions at all.
function readSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret || null;
}

function hasSessionSecret() {
  return readSessionSecret() !== null;
}

function sign(secret, text) {
  return crypto.createHmac(SIGNING_ALGORITHM, secret).update(text).digest(TOKEN_ENCODING);
}

// Keyed with the secret, so the cookie reveals nothing about the stored hash.
async function passwordFingerprint(secret) {
  const stored = await readStoredPassword();
  return sign(secret, FINGERPRINT_PREFIX + (stored || ''));
}

// Constant time, so a forger cannot learn a correct signature one character at a time.
function sameText(candidate, expected) {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict', secure: Boolean(process.env.VERCEL), path: '/' };
}

async function startAdminSession(res) {
  const secret = readSessionSecret();
  if (!secret) throw new Error(MISSING_SECRET_ERROR);
  const id = crypto.randomBytes(SESSION_ID_BYTES).toString(TOKEN_ENCODING);
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  await db.run('INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)', [id, expiresAt]);
  const payload = [id, expiresAt, await passwordFingerprint(secret)].join(TOKEN_SEPARATOR);
  const token = [payload, sign(secret, payload)].join(TOKEN_SEPARATOR);
  res.cookie(SESSION_COOKIE_NAME, token, { ...cookieOptions(), maxAge: ADMIN_SESSION_MS });
}

// The parts of a correctly signed token, or null. Expiry and the row are checked by the caller.
function readSignedToken(req, secret) {
  const token = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (typeof token !== 'string') return null;
  const parts = token.split(TOKEN_SEPARATOR);
  if (parts.length !== TOKEN_PARTS) return null;
  const [id, expiresAt, fingerprint, signature] = parts;
  const payload = [id, expiresAt, fingerprint].join(TOKEN_SEPARATOR);
  if (!sameText(signature, sign(secret, payload))) return null;
  if (!DIGITS_ONLY.test(expiresAt)) return null;
  return { id, expiresAt: Number(expiresAt), fingerprint };
}

async function hasAdminSession(req) {
  const secret = readSessionSecret();
  if (!secret) return false;
  const now = Date.now();
  await db.run('DELETE FROM admin_sessions WHERE expires_at <= ?', [now]);
  const token = readSignedToken(req, secret);
  if (!token || token.expiresAt <= now) return false;
  if (!sameText(token.fingerprint, await passwordFingerprint(secret))) return false;
  const row = await db.get('SELECT id FROM admin_sessions WHERE id = ? AND expires_at > ?', [
    token.id,
    now,
  ]);
  return Boolean(row);
}

// Only a correctly signed token can name a row to delete; the cookie is cleared regardless.
async function endAdminSession(req, res) {
  const secret = readSessionSecret();
  const token = secret ? readSignedToken(req, secret) : null;
  if (token) await db.run('DELETE FROM admin_sessions WHERE id = ?', [token.id]);
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}

function endAllAdminSessions() {
  return db.run('DELETE FROM admin_sessions', []);
}

module.exports = {
  hasSessionSecret,
  startAdminSession,
  hasAdminSession,
  endAdminSession,
  endAllAdminSessions,
};
