'use strict';

// Asks each kind of admin route whether a cookie is accepted. Not a check file itself:
// the runner only loads files ending in .check.js.

const express = require('express');
const cookieParser = require('cookie-parser');
const { adminOnly } = require('../routes/admin-auth');
const { adminCheckStatus } = require('./admin-http');

const LOOPBACK_HOST = '127.0.0.1';
const ANY_FREE_PORT = 0;
const ADMIN_PAGE_ROUTE = '/admin-only-page';
// A dry run reads forms and deletes nothing, so any check may call it.
const ADMIN_API_ROUTE = '/api/cleanup/test?dryRun=true';
const ACCEPTED = 'accepted';
const REJECTED = 'rejected';
const OK = 200;
const UNAUTHORIZED = 401;
const FOUND = 302;
const LOGIN_PAGE = '/admin';

function verdict(accepted, rejected) {
  if (accepted) return ACCEPTED;
  if (rejected) return REJECTED;
  return 'unexpected answer';
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(ANY_FREE_PORT, LOOPBACK_HOST, () => resolve(server));
    server.on('error', reject);
  });
}

// No page uses adminOnly yet, so a small app of its own mounts it the way a page would.
async function adminPageVerdict(cookie) {
  const app = express();
  app.use(cookieParser());
  app.get(ADMIN_PAGE_ROUTE, adminOnly, (req, res) => res.send('admin page'));
  const server = await listen(app);
  try {
    const headers = cookie ? { Cookie: cookie } : {};
    const url = `http://${LOOPBACK_HOST}:${server.address().port}${ADMIN_PAGE_ROUTE}`;
    const response = await fetch(url, { headers, redirect: 'manual' });
    const toLogin = response.status === FOUND && response.headers.get('location') === LOGIN_PAGE;
    return verdict(response.status === OK, toLogin);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

async function adminApiVerdict(baseUrl, cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  const { status } = await fetch(`${baseUrl}${ADMIN_API_ROUTE}`, { headers });
  return verdict(status === OK, status === UNAUTHORIZED);
}

async function adminCheckVerdict(baseUrl, cookie) {
  const status = await adminCheckStatus(baseUrl, cookie);
  return verdict(status === OK, status === UNAUTHORIZED);
}

// One verdict per kind of admin route: /api/admin/check, adminApiOnly and adminOnly.
async function adminRouteVerdicts(baseUrl, cookie) {
  return {
    check: await adminCheckVerdict(baseUrl, cookie),
    api: await adminApiVerdict(baseUrl, cookie),
    page: await adminPageVerdict(cookie),
  };
}

const ALL_ACCEPTED = { check: ACCEPTED, api: ACCEPTED, page: ACCEPTED };
const ALL_REJECTED = { check: REJECTED, api: REJECTED, page: REJECTED };

module.exports = { adminRouteVerdicts, ALL_ACCEPTED, ALL_REJECTED };
