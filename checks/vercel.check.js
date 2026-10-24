'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CRON_CLEANUP_ROUTE } = require('../routes/cron-cleanup');

const SERVER_MODULE = path.join(__dirname, '..', 'server.js');
const EXAMPLE_TURSO_URL = 'libsql://example-database.turso.io';
const ON_VERCEL = '1';
const VERCEL_CONFIG = path.join(__dirname, '..', 'vercel.json');
const SERVER_DEST = '/server.js';
// 18:00 UTC is 02:00 Philippine time, when nobody is filing forms.
const DAILY_CLEANUP_SCHEDULE = '0 18 * * *';

// Loads the app the way Vercel does (required, not started), in a folder with no .env.
// Loading runs no cleanup, so nothing ever connects to the example Turso URL.
function loadAppOnVercel(databaseEnv, cwd) {
  return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(SERVER_MODULE)})`], {
    cwd,
    env: { ...process.env, VERCEL: ON_VERCEL, ...databaseEnv },
    encoding: 'utf8',
  });
}

module.exports = [
  {
    name: 'on Vercel the app refuses to start without a Turso database URL',
    async run({ tempDir }) {
      const result = loadAppOnVercel({ TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' }, tempDir);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /TURSO_DATABASE_URL/);
    },
  },
  {
    name: 'on Vercel the app loads when a Turso database URL is set',
    async run({ tempDir }) {
      const result = loadAppOnVercel({ TURSO_DATABASE_URL: EXAMPLE_TURSO_URL, TURSO_AUTH_TOKEN: 'unused' }, tempDir);
      assert.equal(result.status, 0, result.stderr);
    },
  },
  {
    name: 'vercel.json schedules the cleanup daily and routes the cron path to the app',
    async run() {
      const config = JSON.parse(fs.readFileSync(VERCEL_CONFIG, 'utf8'));
      assert.deepEqual(config.crons, [{ path: CRON_CLEANUP_ROUTE, schedule: DAILY_CLEANUP_SCHEDULE }]);
      const servingRoute = config.routes.find(
        (route) => route.dest && new RegExp(`^${route.src}$`).test(CRON_CLEANUP_ROUTE)
      );
      assert.equal(servingRoute && servingRoute.dest, SERVER_DEST);
    },
  },
];
