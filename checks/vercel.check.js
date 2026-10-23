'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SERVER_MODULE = path.join(__dirname, '..', 'server.js');
const EXAMPLE_TURSO_URL = 'libsql://example-database.turso.io';
const ON_VERCEL = '1';

// Loads the app the way Vercel does (required, not started), in a folder with no .env,
// with startup cleanup off so nothing ever connects to the example Turso URL.
function loadAppOnVercel(databaseEnv, cwd) {
  return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(SERVER_MODULE)})`], {
    cwd,
    env: { ...process.env, VERCEL: ON_VERCEL, SKIP_STARTUP_CLEANUP: 'true', ...databaseEnv },
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
];
