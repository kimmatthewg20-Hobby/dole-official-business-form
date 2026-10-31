'use strict';

// Assistant filing: find_employee looks in the Employee directory by the start of a name and
// shows only name, position and assigned unit.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { postJson, loginCookie } = require('./admin-http');
const { withDirectoryRestored, addEntry } = require('./directory-helpers');
const { postMcp, callTool } = require('./mcp-helpers');
const { SUGGESTION_LIMIT, MAX_QUERY_LENGTH } = require('../routes/directory-suggest');

const OK = 200;
const FIND_EMPLOYEE = 'find_employee';
const UNIT = { position: 'Clerk', assigned_unit: 'IMSD' };

function bulkEntries(count) {
  return Array.from({ length: count }, (_, i) => ({ firstname: 'Bulk', last_name: `Person ${i}`, ...UNIT }));
}

// A refused query comes back as a JSON-RPC error or a tool error, never as matches.
async function isRefused(baseUrl, name) {
  const body = await (await postMcp(baseUrl, 'tools/call', { name: FIND_EMPLOYEE, arguments: name })).json();
  return body.error !== undefined || body.result.isError === true;
}

module.exports = [
  {
    name: 'find_employee matches a name prefix ignoring capitals and gives only name, position and unit',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addEntry(baseUrl, cookie, { employee_id: 'SECRET-1', firstname: 'Ana', last_name: 'Reyes', ...UNIT });
        const found = await callTool(baseUrl, FIND_EMPLOYEE, { name: 'ANA re' });
        assert.deepEqual(found, { employees: [{ name: 'Ana Reyes', position: 'Clerk', unit: 'IMSD' }] });
        assert.deepEqual(await callTool(baseUrl, FIND_EMPLOYEE, { name: 'nobody-has-this-name' }), { employees: [] });
      });
    },
  },
  {
    name: 'find_employee returns at most the website suggestion limit',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const entries = bulkEntries(SUGGESTION_LIMIT + 3);
        assert.equal((await postJson(baseUrl, '/api/employees/bulk-replace', { employees: entries }, cookie)).status, OK);
        const { employees } = await callTool(baseUrl, FIND_EMPLOYEE, { name: 'bulk' });
        assert.equal(employees.length, SUGGESTION_LIMIT);
      });
    },
  },
  {
    name: 'find_employee refuses an empty, blank, missing or over-long query',
    async run({ baseUrl }) {
      for (const args of [{ name: '' }, { name: '   ' }, {}, { name: 'a'.repeat(MAX_QUERY_LENGTH + 1) }]) {
        assert.equal(await isRefused(baseUrl, args), true, JSON.stringify(args).slice(0, 40));
      }
    },
  },
];
