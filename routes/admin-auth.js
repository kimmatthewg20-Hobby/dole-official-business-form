const express = require('express');
const db = require('../db');

const ADMIN_COOKIE_NAME = 'adminAuth';
const ADMIN_COOKIE_VALUE = '1';
const ADMIN_SESSION_MS = 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 4;
const DEFAULT_ADMIN_PASSWORD = '*1CNPOadmin*';
const ADMIN_PAGE = '/admin';

function isAdmin(req) {
  return Boolean(req.cookies && req.cookies[ADMIN_COOKIE_NAME]);
}

// For pages: a visitor who is not logged in is sent to the login page.
function adminOnly(req, res, next) {
  if (isAdmin(req)) return next();
  res.redirect(ADMIN_PAGE);
}

// For JSON APIs: callers need a status code, not a login page.
function adminApiOnly(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ success: false, error: 'Not authenticated' });
}

// The newest settings row wins; with none, or one without a password, the env value applies.
async function getAdminPassword() {
  try {
    const row = await db.get('SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1', []);
    if (row && row.admin_password) return row.admin_password;
  } catch (err) {
    console.error('Error getting admin password from database:', err);
  }
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

async function saveAdminPassword(newPassword) {
  const row = await db.get('SELECT id FROM settings ORDER BY id DESC LIMIT 1', []);
  if (row && row.id) {
    await db.run('UPDATE settings SET admin_password = ? WHERE id = ?', [newPassword, row.id]);
    return;
  }
  await db.run('INSERT INTO settings (admin_password) VALUES (?) RETURNING id', [newPassword]);
}

async function login(req, res) {
  try {
    const { password } = req.body || {};
    if (password === (await getAdminPassword())) {
      res.cookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
        httpOnly: true,
        maxAge: ADMIN_SESSION_MS,
      });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: 'Incorrect password' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

function check(req, res) {
  if (isAdmin(req)) return res.json({ ok: true });
  res.status(401).json({ ok: false });
}

async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Old password and new password are required' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    });
  }
  try {
    if (oldPassword !== (await getAdminPassword())) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    await saveAdminPassword(newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, error: 'Failed to update password: ' + err.message });
  }
}

const router = express.Router();
router.post('/api/admin/login', login);
router.get('/api/admin/check', check);
router.post('/api/admin/change-password', adminApiOnly, changePassword);

module.exports = { router, adminOnly, adminApiOnly };
