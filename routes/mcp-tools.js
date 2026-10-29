'use strict';

// Every tool the Assistant filing endpoint offers, assembled in one place so tools/list shows
// exactly these (ADR 0004). A tool module exports { tools: [{ name, description,
// inputSchema?, handler }] }; add a new module to TOOL_MODULES. No tool may edit, delete or
// list stored forms.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { version } = require('../package.json');
const listTools = require('./mcp-tools-lists');

const SERVER_NAME = 'dole-official-business-form';
const TOOL_MODULES = [listTools];

function allTools() {
  return TOOL_MODULES.flatMap((module) => module.tools);
}

// A fresh server per request: nothing is kept between calls, as Vercel needs.
function buildMcpServer() {
  const server = new McpServer({ name: SERVER_NAME, version });
  for (const { name, description, inputSchema, handler } of allTools()) {
    server.registerTool(name, { description, inputSchema }, handler);
  }
  return server;
}

module.exports = { buildMcpServer };
