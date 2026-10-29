'use strict';

// The two Assistant filing tools that read the admin-kept pick-lists, so an assistant offers
// staff only a Division and an Approver that exist, in the admin's order.

const { readDivisionsInOrder } = require('./divisions');
const { readApproversInOrder } = require('./approvers');
const { jsonToolResult } = require('./mcp-tool-result');

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
    description:
      'Lists every Division (name and code) in the order the admin set. A form must be filed ' +
      'under one of these Divisions. When you must ask the staff member for the Division, ' +
      'offer these names in this order as numbered choices.',
    handler: listDivisions,
  },
  {
    name: LIST_APPROVERS,
    description:
      'Lists every Approver (name and position) in the order the admin set. A form must name ' +
      'one of these Approvers. When you must ask the staff member for the Approver, offer ' +
      'these in this order as numbered choices.',
    handler: listApprovers,
  },
];

module.exports = { tools };
