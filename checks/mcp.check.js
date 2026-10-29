'use strict';

// Assistant filing (GLOSSARY.md, ADR 0004): a staff member's AI assistant connects to the open,
// stateless MCP endpoint and reads the Divisions and Approvers in the admin's order.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { OK } = require('./division-helpers');
const { LISTS, addAll, reorder } = require('./list-order-helpers');
const {
  MCP_ROUTE,
  SESSION_HEADER,
  initialize,
  toolNames,
  callTool,
} = require('./mcp-helpers');

const METHOD_NOT_ALLOWED = 405;
const TOOLS_SO_FAR = ['find_employee', 'list_approvers', 'list_divisions', 'submit_official_business'];
// Filing is all an assistant may do: no tool may change, remove or list stored forms.
const FORBIDDEN_TOOL = /edit|update|delete|remove|cancel|form/i;
const [DIVISIONS, APPROVERS] = LISTS;

// Adds the list's sample items, puts the last one first, and returns the items in that order.
async function reorderedItems(baseUrl, list) {
  const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
  const [first, second, third] = await addAll(baseUrl, list, cookie);
  assert.equal((await reorder(baseUrl, list, { ids: [third, first, second] }, cookie)).status, OK);
  const [itemA, itemB, itemC] = list.items;
  return [itemC, itemA, itemB];
}

module.exports = [
  {
    name: 'an assistant initializes over HTTP and no session id is handed out',
    async run({ baseUrl }) {
      const response = await initialize(baseUrl);
      assert.equal(response.status, OK);
      assert.equal(response.headers.get(SESSION_HEADER), null);
      const { result } = await response.json();
      assert.ok(result.capabilities.tools, 'the endpoint offers tools');
      assert.equal(typeof result.serverInfo.name, 'string');
    },
  },
  {
    name: 'tools/list answers twice without any session and shows exactly the filing tools so far',
    async run({ baseUrl }) {
      assert.deepEqual(await toolNames(baseUrl), TOOLS_SO_FAR);
      const again = await toolNames(baseUrl);
      assert.deepEqual(again, TOOLS_SO_FAR);
      assert.deepEqual(
        again.filter((name) => FORBIDDEN_TOOL.test(name)),
        [],
      );
    },
  },
  {
    name: 'list_divisions gives each Division name and code in the admin order',
    async run({ baseUrl, db }) {
      await DIVISIONS.withNone(db, async () => {
        const expected = await reorderedItems(baseUrl, DIVISIONS);
        assert.deepEqual(await callTool(baseUrl, 'list_divisions'), { divisions: expected });
      });
    },
  },
  {
    name: 'list_approvers gives each Approver name and position in the admin order',
    async run({ baseUrl, db }) {
      await APPROVERS.withNone(db, async () => {
        const expected = await reorderedItems(baseUrl, APPROVERS);
        assert.deepEqual(await callTool(baseUrl, 'list_approvers'), { approvers: expected });
      });
    },
  },
  {
    name: 'GET and DELETE on the endpoint are refused with a JSON-RPC error, as no session exists',
    async run({ baseUrl }) {
      for (const method of ['GET', 'DELETE']) {
        const response = await fetch(`${baseUrl}${MCP_ROUTE}`, { method });
        assert.equal(response.status, METHOD_NOT_ALLOWED);
        const body = await response.json();
        assert.equal(body.jsonrpc, '2.0');
        assert.equal(typeof body.error.message, 'string');
      }
    },
  },
];
