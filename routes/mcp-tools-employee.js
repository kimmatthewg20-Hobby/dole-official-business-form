'use strict';

// The Assistant filing tool that looks an Employee up in the Employee directory. It gives back
// only name, position and assigned unit, a few matches at a time, never the rest of an entry.

const { z } = require('zod');
const { findEmployeesByName, MAX_QUERY_LENGTH } = require('./directory-suggest');
const { jsonToolResult } = require('./mcp-tool-result');

const FIND_EMPLOYEE = 'find_employee';

const inputSchema = {
  name: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
};

async function findEmployee({ name }) {
  return jsonToolResult({ employees: await findEmployeesByName(name) });
}

const tools = [
  {
    name: FIND_EMPLOYEE,
    description:
      'Finds Employees in the Employee directory whose name starts with the given part of a ' +
      'name, ignoring capitals. Returns at most a few matches, each with name, position and ' +
      'assigned unit.',
    inputSchema,
    handler: findEmployee,
  },
];

module.exports = { tools };
