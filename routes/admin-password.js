'use strict';

// Checks and saves the admin password. The newest settings row holds it; rows saved
// before hashing hold plain text, which is upgraded to a hash at its first correct login.

const db = require('../db');
const {
  hashPassword,
  verifyPasswordHash,
  isPasswordHash,
  plainTextMatches,
} = require('./password-hash');

async function readStoredPassword() {
  const row = await db.get('SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1', []);
  return row && row.admin_password ? row.admin_password : null;
}

async function saveAdminPassword(newPassword) {
  const hash = await hashPassword(newPassword);
  const row = await db.get('SELECT id FROM settings ORDER BY id DESC LIMIT 1', []);
  if (row && row.id) {
    await db.run('UPDATE settings SET admin_password = ? WHERE id = ?', [hash, row.id]);
    return;
  }
  await db.run('INSERT INTO settings (admin_password) VALUES (?) RETURNING id', [hash]);
}

// Only while nothing is stored, so a leaked or forgotten env value stops working
// as soon as the admin sets a password. An empty value never counts.
function matchesBootstrapPassword(candidate) {
  const bootstrap = process.env.ADMIN_PASSWORD;
  return Boolean(bootstrap) && plainTextMatches(candidate, bootstrap);
}

async function isAdminPassword(candidate) {
  if (typeof candidate !== 'string') return false;
  const stored = await readStoredPassword();
  if (!stored) return matchesBootstrapPassword(candidate);
  if (isPasswordHash(stored)) return verifyPasswordHash(candidate, stored);
  if (!plainTextMatches(candidate, stored)) return false;
  await saveAdminPassword(candidate);
  return true;
}

module.exports = { isAdminPassword, saveAdminPassword };
