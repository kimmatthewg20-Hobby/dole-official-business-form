const express = require('express');
const { isAdminPassword, saveAdminPassword } = require('./admin-password');
const { refuseLockedOutLogin, recordFailedLogin, clearFailedLogins } = require('./login-lockout');
const {
  hasSessionSecret,
  startAdminSession,
  hasAdminSession,
  endAdminSession,
  endAllAdminSessions,
} = require('./admin-session');

const MIN_PASSWORD_LENGTH = 10;
const ADMIN_USERNAME = 'cnpoadmin';
const ADMIN_PAGE = '/admin';
const LOGIN_UNAVAILABLE = 503;
const LOGIN_UNAVAILABLE_MESSAGE = 'Admin login is not set up on this server. Contact the IT unit.';

// Checking a session reads the database, so a failure must answer instead of hanging.
function requireAdminSession(refuse) {
  return async (req, res, next) => {
    try {
      if (!(await hasAdminSession(req))) return refuse(res);
    } catch (err) {
      console.error('Error checking admin session:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
    next();
  };
}

// For pages: a visitor who is not logged in is sent to the login page.
const adminOnly = requireAdminSession((res) => res.redirect(ADMIN_PAGE));

// For JSON APIs: callers need a status code, not a login page.
const adminApiOnly = requireAdminSession((res) =>
  res.status(401).json({ success: false, error: 'Not authenticated' })
);

const adminCheckOnly = requireAdminSession((res) => res.status(401).json({ ok: false }));

async function login(req, res) {
  // Refused before the password is looked at, so a server set up wrongly is never
  // counted against the admin as a wrong login.
  if (!hasSessionSecret()) {
    console.error('Admin login refused: SESSION_SECRET is not set');
    return res
      .status(LOGIN_UNAVAILABLE)
      .json({ success: false, error: LOGIN_UNAVAILABLE_MESSAGE });
  }
  try {
    const { username, password } = req.body || {};
    if (username === ADMIN_USERNAME && (await isAdminPassword(password))) {
      await clearFailedLogins(req);
      await startAdminSession(res);
      return res.json({ success: true });
    }
    await recordFailedLogin(req);
    res.status(401).json({ success: false, error: 'Incorrect username or password' });
  } catch (err) {
    console.error('Error checking admin login:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

async function logout(req, res) {
  try {
    await endAdminSession(req, res);
    res.json({ success: true });
  } catch (err) {
    console.error('Error ending admin session:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
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
    // Every other session ends with the old password; the admin who changed it stays in.
    await endAllAdminSessions();
    await startAdminSession(res);
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
router.post('/api/admin/logout', logout);
router.get('/api/admin/check', adminCheckOnly, (req, res) => res.json({ ok: true }));
router.post('/api/admin/change-password', adminApiOnly, changePassword);

module.exports = { router, adminOnly, adminApiOnly };
