const express = require('express');
const { isAdminPassword, saveAdminPassword } = require('./admin-password');
const { refuseLockedOutLogin, recordFailedLogin, clearFailedLogins } = require('./login-lockout');

const ADMIN_COOKIE_NAME = 'adminAuth';
const ADMIN_COOKIE_VALUE = '1';
const ADMIN_SESSION_MS = 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 10;
const ADMIN_USERNAME = 'cnpoadmin';
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

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (username === ADMIN_USERNAME && (await isAdminPassword(password))) {
      await clearFailedLogins(req);
      res.cookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
        httpOnly: true,
        maxAge: ADMIN_SESSION_MS,
      });
      return res.json({ success: true });
    }
    await recordFailedLogin(req);
    res.status(401).json({ success: false, error: 'Incorrect username or password' });
  } catch (err) {
    console.error('Error checking admin login:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

function check(req, res) {
  if (isAdmin(req)) return res.json({ ok: true });
  res.status(401).json({ ok: false });
}

async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body || {};
  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string' || !oldPassword) {
    return res.status(400).json({
      success: false,
      error: 'Old password and new password are required',
    });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    });
  }
  try {
    if (!(await isAdminPassword(oldPassword))) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    await saveAdminPassword(newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update password: ' + err.message,
    });
  }
}

const router = express.Router();
router.post('/api/admin/login', refuseLockedOutLogin, login);
router.get('/api/admin/check', check);
router.post('/api/admin/change-password', adminApiOnly, changePassword);

module.exports = { router, adminOnly, adminApiOnly };
