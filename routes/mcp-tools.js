'use strict';

// Every tool the Assistant filing endpoint offers, assembled in one place so tools/list shows
// exactly these (ADR 0004). A tool module exports { tools: [{ name, description,
// inputSchema?, handler(args, context) }] }; add a new module to TOOL_MODULES. No tool may
// edit, delete or list stored forms.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { version } = require('../package.json');
const listTools = require('./mcp-tools-lists');
const employeeTools = require('./mcp-tools-employee');
const submitTools = require('./mcp-tools-submit');

const SERVER_NAME = 'dole-official-business-form';
const TOOL_MODULES = [listTools, employeeTools, submitTools];

function allTools() {
  return TOOL_MODULES.flatMap((module) => module.tools);
}

// A fresh server per request: nothing is kept between calls, as Vercel needs. The context
// carries what a tool needs from the HTTP request ({ sourceAddress }), which the SDK hides.
// A tool without inputSchema gets no arguments from the SDK, so it is handed none.
function buildMcpServer(context) {
  const server = new McpServer({ name: SERVER_NAME, version });
  for (const { name, description, inputSchema, handler } of allTools()) {
    const callTool = inputSchema ? (args) => handler(args, context) : () => handler({}, context);
    server.registerTool(name, { description, inputSchema }, callTool);
  }
  return server;
}

module.exports = { buildMcpServer };
