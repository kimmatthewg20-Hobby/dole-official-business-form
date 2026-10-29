'use strict';

// The Assistant filing endpoint (GLOSSARY.md, ADR 0004): open like the form itself, and
// stateless, because Vercel runs many short-lived instances that cannot share a session.
// Each POST builds its own server and transport and is complete on its own.

const express = require('express');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { buildMcpServer } = require('./mcp-tools');

const MCP_ROUTE = '/mcp';
const JSON_RPC_VERSION = '2.0';
const METHOD_NOT_ALLOWED = 405;
const SERVER_ERROR = 500;
// JSON-RPC error codes as the MCP SDK uses them.
const SERVER_ERROR_CODE = -32000;
const INTERNAL_ERROR_CODE = -32603;
const NO_SESSIONS = 'Method not allowed: this endpoint keeps no sessions. Send each request by POST.';
const INTERNAL_ERROR = 'Internal server error';

function jsonRpcError(code, message) {
  return { jsonrpc: JSON_RPC_VERSION, error: { code, message }, id: null };
}

async function handleMcpRequest(req, res) {
  const server = buildMcpServer();
  // No session id generator and plain JSON answers: nothing outlives this request.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('Error handling an MCP request:', err);
    if (!res.headersSent) {
      res.status(SERVER_ERROR).json(jsonRpcError(INTERNAL_ERROR_CODE, INTERNAL_ERROR));
    }
  }
}

function refuseWithoutSession(req, res) {
  res.status(METHOD_NOT_ALLOWED).json(jsonRpcError(SERVER_ERROR_CODE, NO_SESSIONS));
}

const router = express.Router();
router.post(MCP_ROUTE, handleMcpRequest);
router.get(MCP_ROUTE, refuseWithoutSession);
router.delete(MCP_ROUTE, refuseWithoutSession);

module.exports = { router, MCP_ROUTE };
