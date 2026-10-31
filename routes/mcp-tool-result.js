'use strict';

// How an Assistant filing tool answers. Plain text is what every MCP client shows the
// assistant, so a tool's data goes into it as JSON.

const TEXT_CONTENT = 'text';

function jsonToolResult(value) {
  return { content: [{ type: TEXT_CONTENT, text: JSON.stringify(value) }] };
}

module.exports = { jsonToolResult };
