'use strict';

// Runs every checks/*.check.js module, in file-name order, against a throwaway
// local database that is created from the migrations and the seed, and deleted
// afterwards. Each check module exports an array of { name, run(context) }.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHECKS_DIR = __dirname;
const CHECK_FILE_SUFFIX = '.check.js';
const TEMP_DIR_PREFIX = 'ob-db-check-';
const CHECK_DATABASE_FILE = 'check.db';
const LOOPBACK_HOST = '127.0.0.1';
const ANY_FREE_PORT = 0;
const SESSION_SECRET_BYTES = 32;

function useThrowawayDatabase(tempDir) {
  // Set before db.js loads so dotenv cannot point the check at a shared database.
  process.env.TURSO_DATABASE_URL = `file:${path.join(tempDir, CHECK_DATABASE_FILE)}`;
  process.env.TURSO_AUTH_TOKEN = '';
}

// Admin login is refused without SESSION_SECRET. A fresh random value per run keeps any
// developer's own secret out of the checks and keeps a secret out of the source.
function useCheckSessionSecret() {
  process.env.SESSION_SECRET = crypto.randomBytes(SESSION_SECRET_BYTES).toString('hex');
}

function listCheckFiles() {
  return fs
    .readdirSync(CHECKS_DIR)
    .filter((name) => name.endsWith(CHECK_FILE_SUFFIX))
    .sort()
    .map((name) => path.join(CHECKS_DIR, name));
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(ANY_FREE_PORT, LOOPBACK_HOST, () => resolve(server));
    server.on('error', reject);
  });
}

async function runChecks(context) {
  let failures = 0;
  for (const file of listCheckFiles()) {
    const area = path.basename(file, CHECK_FILE_SUFFIX);
    for (const check of require(file)) {
      try {
        await check.run(context);
        console.log(`ok      ${area}: ${check.name}`);
      } catch (err) {
        failures += 1;
        console.log(`FAILED  ${area}: ${check.name}\n        ${err.stack || err}`);
      }
    }
  }
  return failures;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), TEMP_DIR_PREFIX));
  useThrowawayDatabase(tempDir);
  useCheckSessionSecret();
  let db = null;
  let server = null;
  let failures = 0;
  try {
    db = require('../db');
    await require('../scripts/migrate').applyMigrations();
    await require('../scripts/seed').seedDatabase();
    server = await listen(require('../server'));
    const baseUrl = `http://${LOOPBACK_HOST}:${server.address().port}`;
    failures = await runChecks({ baseUrl, db, tempDir });
  } catch (err) {
    failures += 1;
    console.log(`FAILED  setup\n        ${err.stack || err}`);
  } finally {
    if (server) {
      server.closeAllConnections();
      server.close();
    }
    if (db) db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (fs.existsSync(tempDir)) {
    failures += 1;
    console.log(`FAILED  cleanup: ${tempDir} was left behind`);
  }
  console.log(failures === 0 ? '\ndb:check passed' : `\ndb:check failed: ${failures} problem(s)`);
  // Exit explicitly so a stray handle can never hang the check; leaked timers are a check of their own.
  process.exit(failures === 0 ? 0 : 1);
}

main();
