'use strict';

// Salted scrypt hashes from Node's own crypto (ADR 0002: no native hashing package on Vercel).
// Stored text: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>. Keeping the parameters in the
// text lets them be raised later without breaking passwords hashed with the old ones.

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const SCHEME = 'scrypt';
const SEPARATOR = '$';
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const ENCODING = 'base64';
const HASH_PARTS = 6;
// scrypt needs 128 * N * r bytes; twice that keeps it clear of Node's 32 MB default cap.
const MEMORY_PER_COST_BLOCK = 256;
const BASE64 = /^[A-Za-z0-9+/]+=*$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

function scryptOptions(N, r, p) {
  return { N, r, p, maxmem: MEMORY_PER_COST_BLOCK * N * r };
}

function parseHash(stored) {
  if (typeof stored !== 'string') return null;
  const parts = stored.split(SEPARATOR);
  if (parts.length !== HASH_PARTS || parts[0] !== SCHEME) return null;
  const [, cost, blockSize, parallelism, salt, key] = parts;
  if (![cost, blockSize, parallelism].every((value) => POSITIVE_INTEGER.test(value))) return null;
  if (!BASE64.test(salt) || !BASE64.test(key)) return null;
  return {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelism),
    salt: Buffer.from(salt, ENCODING),
    key: Buffer.from(key, ENCODING),
  };
}

function isPasswordHash(stored) {
  return parseHash(stored) !== null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_BYTES, scryptOptions(COST, BLOCK_SIZE, PARALLELISM));
  return [
    SCHEME,
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString(ENCODING),
    key.toString(ENCODING),
  ].join(SEPARATOR);
}

async function verifyPasswordHash(password, stored) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const { N, r, p, salt, key } = parsed;
  const candidate = await scrypt(password, salt, key.length, scryptOptions(N, r, p));
  return crypto.timingSafeEqual(candidate, key);
}

// Hashing both sides first gives equal-length buffers, so the comparison takes the
// same time whatever the length or content of either value.
function plainTextMatches(candidate, expected) {
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(candidate), digest(expected));
}

module.exports = {
  hashPassword,
  verifyPasswordHash,
  isPasswordHash,
  plainTextMatches,
};
