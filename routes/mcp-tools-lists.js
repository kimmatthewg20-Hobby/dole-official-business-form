'use strict';

// The two Assistant filing tools that read the admin-kept pick-lists, so an assistant offers
// staff only a Division and an Approver that exist, in the admin's order.

const { readDivisionsInOrder } = require('./divisions');
const { readApproversInOrder } = require('./approvers');
const { jsonToolResult } = require('./mcp-tool-result');
const { LIST_DIVISIONS_DESCRIPTION, LIST_APPROVERS_DESCRIPTION } = require('./mcp-guidance');

const LIST_DIVISIONS = 'list_divisions';
const LIST_APPROVERS = 'list_approvers';

async function listDivisions() {
  const divisions = await readDivisionsInOrder();
  return jsonToolResult({ divisions: divisions.map(({ name, code }) => ({ name, code })) });
}

async function listApprovers() {
  const approvers = await readApproversInOrder();
  return jsonToolResult({
    approvers: approvers.map(({ name, position }) => ({ name, position })),
  });
}

const tools = [
  {
    name: LIST_DIVISIONS,
    description: LIST_DIVISIONS_DESCRIPTION,
    handler: listDivisions,
  },
  {
    name: LIST_APPROVERS,
    description: LIST_APPROVERS_DESCRIPTION,
    handler: listApprovers,
  },
];

module.exports = { tools };
