'use strict';

// Assistant filing: the tool descriptions carry the guidance an assistant follows, read through
// tools/list. Each rule is asserted by a distinctive phrase, not by the full text.

const assert = require('node:assert/strict');
const { mcpResult } = require('./mcp-helpers');

const MAX_DESCRIPTION_LENGTH = 1200;

const RULES = {
  submit_official_business: [
    'one question at a time',
    'numbered or multiple-choice',
    'never guess',
    'no extra confirmation',
    'reply with the returned summary',
    'print link and the Reference code',
    'Every employee named in the request stays on the form',
    'ask for the full name',
    '"Official Station"',
    'Date mode All Dates',
    'Separated Dates',
    'match exactly, ignoring capitals',
    'Provincial Head',
    'Regional Director',
    'named Approver wins',
    'no match or several means ask',
    'one or two short sentence purpose',
    'dates, place and time may come from it',
  ],
  find_employee: [
    'Use it for each employee named',
    'is several people',
    'try a shorter part',
    'ask which one',
    'full name, position and assigned unit',
    'never assume a unit',
    'ask for the full name',
  ],
  list_divisions: ['match one Division exactly, ignoring capitals', 'otherwise ask'],
  list_approvers: [
    'Provincial Head (ignoring capitals)',
    'Regional Director',
    'Approver the staff member names wins',
    'no match or several, ask',
  ],
};

async function descriptions(baseUrl) {
  const { tools } = await mcpResult(baseUrl, 'tools/list');
  return Object.fromEntries(tools.map((tool) => [tool.name, tool.description]));
}

module.exports = [
  {
    name: 'each tool description carries the assistant guidance rules for that tool',
    async run({ baseUrl }) {
      const found = await descriptions(baseUrl);
      for (const [tool, phrases] of Object.entries(RULES)) {
        for (const phrase of phrases) {
          assert.ok(found[tool].includes(phrase), `${tool} lacks: ${phrase}`);
        }
      }
    },
  },
  {
    name: 'tool descriptions stay short',
    async run({ baseUrl }) {
      for (const [tool, text] of Object.entries(await descriptions(baseUrl))) {
        assert.ok(text.length <= MAX_DESCRIPTION_LENGTH, `${tool} is ${text.length} characters`);
      }
    },
  },
];
