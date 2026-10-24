const crypto = require('node:crypto');
const express = require('express');
const { cleanupOldRecords } = require('./cleanup');

const CRON_CLEANUP_ROUTE = '/api/cron/cleanup';
const BEARER_PREFIX = 'Bearer ';
const DIGEST_ALGORITHM = 'sha256';

function digest(text) {
  return crypto.createHash(DIGEST_ALGORITHM).update(text, 'utf8').digest();
}

// Hashing both sides gives equal-length buffers, so timingSafeEqual never leaks the secret's length.
// Read per request: an unset or empty CRON_SECRET must refuse every call, never allow them.
function hasCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  const header = req.get('authorization');
  if (!expected || typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) return false;
  return crypto.timingSafeEqual(digest(header.slice(BEARER_PREFIX.length)), digest(expected));
}

const router = express.Router();

// Vercel Cron sends a GET with `Authorization: Bearer <CRON_SECRET>`; there is no admin cookie.
router.get(CRON_CLEANUP_ROUTE, async (req, res) => {
  if (!hasCronSecret(req)) {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }
  try {
    const { deleted } = await cleanupOldRecords();
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Scheduled cleanup failed:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

module.exports = { router, CRON_CLEANUP_ROUTE };
