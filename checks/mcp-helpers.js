'use strict';

// HTTP helpers shared by the Assistant filing checks: raw JSON-RPC sent to the MCP endpoint
// the way an assistant's MCP client sends it. Not a check file itself: the runner only loads
// files ending in .check.js.

const assert = require('node:assert/strict');

const MCP_ROUTE = '/mcp';
const OK = 200;
const JSON_RPC_VERSION = '2.0';
const PROTOCOL_VERSION = '2025-03-26';
// A streamable HTTP client must say it accepts both answers.
const MCP_ACCEPT = 'application/json, text/event-stream';
const SESSION_HEADER = 'mcp-session-id';

let nextRequestId = 1;

function postMcp(baseUrl, method, params) {
  const message = { jsonrpc: JSON_RPC_VERSION, id: nextRequestId++, method, params };
  return fetch(`${baseUrl}${MCP_ROUTE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: MCP_ACCEPT },
    body: JSON.stringify(message),
  });
}

// The JSON-RPC result of one call, after checking it answered without an error.
async function mcpResult(baseUrl, method, params = {}) {
  const response = await postMcp(baseUrl, method, params);
  assert.equal(response.status, OK);
  const body = await response.json();
  assert.equal(body.error, undefined, JSON.stringify(body.error));
  return body.result;
}

function initialize(baseUrl) {
  return postMcp(baseUrl, 'initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'db-check', version: '1.0.0' },
  });
}

async function toolNames(baseUrl) {
  const { tools } = await mcpResult(baseUrl, 'tools/list');
  return tools.map((tool) => tool.name).sort();
}

// A tool answers in text; the list tools put their list in it as JSON.
async function callTool(baseUrl, name, args = {}) {
  const result = await mcpResult(baseUrl, 'tools/call', { name, arguments: args });
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  return JSON.parse(result.content[0].text);
}

// The plain words of a refused call, whether the tool or the input schema refused it.
async function toolRefusal(baseUrl, name, args) {
  const body = await (await postMcp(baseUrl, 'tools/call', { name, arguments: args })).json();
  if (body.error) return body.error.message;
  assert.equal(body.result.isError, true, JSON.stringify(body.result.content));
  return body.result.content[0].text;
}

module.exports = {
  MCP_ROUTE,
  SESSION_HEADER,
  postMcp,
  mcpResult,
  initialize,
  toolNames,
  callTool,
  toolRefusal,
};
