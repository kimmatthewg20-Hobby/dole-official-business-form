'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');

const SEED_SCRIPT = path.join(__dirname, '..', 'scripts', 'seed.js');
const EXAMPLE_TURSO_URL = 'libsql://example-database.turso.io';

module.exports = [
  {
    name: 'the seeded test admin password logs in',
    async run({ baseUrl }) {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'cnpoadmin', password: TEST_ADMIN_PASSWORD }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true });
    },
  },
  {
    name: 'the seed provides directory entries',
    async run({ baseUrl }) {
      const response = await fetch(`${baseUrl}/api/employees`);
      assert.equal(response.status, 200);
      const { employees } = await response.json();
      assert.ok(employees.length > 0);
    },
  },
  {
    name: 'the seed refuses to run against a Turso URL',
    async run() {
      const result = spawnSync(process.execPath, [SEED_SCRIPT], {
        env: { ...process.env, TURSO_DATABASE_URL: EXAMPLE_TURSO_URL, TURSO_AUTH_TOKEN: 'unused' },
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /refus/i);
    },
  },
];
