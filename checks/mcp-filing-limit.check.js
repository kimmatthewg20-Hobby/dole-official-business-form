'use strict';

// Assistant filing (ADR 0004): one source address may file at most thirty forms within any
// fifteen minutes, so nobody can flood the forms. Every filing counts, not only wrong ones,
// so this is not the Lockout. Each check uses its own documentation address (203.0.113.0/24).

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored } = require('./form-helpers');
const { MCP_ROUTE } = require('./mcp-helpers');
const { onVercel, backdateFailedAttempts, OK } = require('./lockout-helpers');

// From the spec, not from the code, so a changed limit makes these checks fail.
const FILINGS_ALLOWED = 30;
const WINDOW_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_SECOND_MS = 1000;
const JSON_RPC_VERSION = '2.0';
const MCP_ACCEPT = 'application/json, text/event-stream';
const REAL_IP_HEADER = 'X-Real-IP';
const SUBMIT = 'submit_official_business';
const REFUSAL = /^Too many forms filed from this address\. Try again in (\d+) minutes?\.$/;
const FILING = {
  employees: VALID_SUBMISSION.employees.slice(0, 1),
  dates: VALID_SUBMISSION.datesOfOB.slice(0, 1),
  destination: VALID_SUBMISSION.locationTo,
  departureTime: VALID_SUBMISSION.departureTime,
  returnTime: VALID_SUBMISSION.returnTime,
  purpose: VALID_SUBMISSION.purpose,
  division: VALID_SUBMISSION.division,
  approver: VALID_SUBMISSION.approvedBy,
};

let nextRequestId = 1;

function toolCall(name, args) {
  return { jsonrpc: JSON_RPC_VERSION, id: nextRequestId++, method: 'tools/call', params: { name, arguments: args } };
}

// One POST from the address; a list of calls goes as one JSON-RPC batch.
async function postFrom(baseUrl, address, message) {
  const response = await fetch(`${baseUrl}${MCP_ROUTE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: MCP_ACCEPT, [REAL_IP_HEADER]: address },
    body: JSON.stringify(message),
  });
  assert.equal(response.status, OK);
  return response.json();
}

async function callFrom(baseUrl, address, name, args = {}) {
  const { result, error } = await postFrom(baseUrl, address, toolCall(name, args));
  assert.equal(error, undefined, JSON.stringify(error));
  return result;
}

async function fileFrom(baseUrl, address, count) {
  for (let filing = 0; filing < count; filing += 1) {
    const result = await callFrom(baseUrl, address, SUBMIT, FILING);
    assert.notEqual(result.isError, true, `filing ${filing + 1}: ${JSON.stringify(result.content)}`);
  }
}

// The plain refusal, and the minutes it says to wait.
async function expectRefused(baseUrl, address) {
  const result = await callFrom(baseUrl, address, SUBMIT, FILING);
  assert.equal(result.isError, true, JSON.stringify(result.content));
  const [, minutes] = result.content[0].text.match(REFUSAL) || assert.fail(result.content[0].text);
  return Number(minutes);
}

function withVercelForms(db, callback) {
  return withFormsRestored(db, () => onVercel(callback));
}

module.exports = [
  {
    name: 'thirty filings from one address succeed, the next is refused in plain words, list tools still work',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const address = '203.0.113.10';
        await fileFrom(baseUrl, address, FILINGS_ALLOWED);
        assert.equal(await expectRefused(baseUrl, address), WINDOW_MS / ONE_MINUTE_MS);
        for (const [name, args] of [['list_divisions'], ['list_approvers'], ['find_employee', { name: 'Ana' }]]) {
          assert.notEqual((await callFrom(baseUrl, address, name, args)).isError, true, name);
        }
      });
    },
  },
  {
    name: 'another address still files while one address is refused',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        await fileFrom(baseUrl, '203.0.113.11', FILINGS_ALLOWED);
        await expectRefused(baseUrl, '203.0.113.11');
        await fileFrom(baseUrl, '203.0.113.12', 1);
      });
    },
  },
  {
    name: 'filing works again once the thirty filings are fifteen minutes old',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const address = '203.0.113.13';
        await fileFrom(baseUrl, address, FILINGS_ALLOWED);
        await backdateFailedAttempts(db, address, WINDOW_MS - ONE_SECOND_MS * 10);
        assert.equal(await expectRefused(baseUrl, address), 1);
        await backdateFailedAttempts(db, address, ONE_SECOND_MS * 11);
        await fileFrom(baseUrl, address, FILINGS_ALLOWED);
        await expectRefused(baseUrl, address);
      });
    },
  },
  {
    name: 'the window slides: as old filings pass fifteen minutes, that many more may file, and refusals do not count',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const address = '203.0.113.14';
        const older = 20;
        await fileFrom(baseUrl, address, older);
        await backdateFailedAttempts(db, address, ONE_MINUTE_MS * 10);
        await fileFrom(baseUrl, address, FILINGS_ALLOWED - older);
        assert.equal(await expectRefused(baseUrl, address), 5);
        for (let refused = 0; refused < 5; refused += 1) await expectRefused(baseUrl, address);
        await backdateFailedAttempts(db, address, ONE_MINUTE_MS * 5 + ONE_SECOND_MS);
        await fileFrom(baseUrl, address, older);
        await expectRefused(baseUrl, address);
      });
    },
  },
  {
    name: 'a batch of many filings in one POST files only up to the limit',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const address = '203.0.113.15';
        const calls = Array.from({ length: FILINGS_ALLOWED + 10 }, () => toolCall(SUBMIT, FILING));
        const answers = await postFrom(baseUrl, address, calls);
        assert.equal(answers.length, calls.length);
        // Only the limit is checked here: thirty calls running at once can clash on the local
        // database file, but each of them still took its place in the count.
        const refused = answers.filter((answer) => answer.result && REFUSAL.test(answer.result.content[0].text));
        assert.equal(refused.length, calls.length - FILINGS_ALLOWED);
        await expectRefused(baseUrl, address);
      });
    },
  },
  {
    name: 'the website form is not held back by Assistant filings from the same address',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const address = '203.0.113.16';
        await fileFrom(baseUrl, address, FILINGS_ALLOWED);
        await expectRefused(baseUrl, address);
        const response = await fetch(`${baseUrl}/api/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [REAL_IP_HEADER]: address },
          body: JSON.stringify(VALID_SUBMISSION),
        });
        assert.equal(response.status, OK);
      });
    },
  },
  {
    name: 'old filing rows are deleted when filing reads the table',
    async run({ baseUrl, db }) {
      await withVercelForms(db, async () => {
        const longAgo = Date.now() - 2 * WINDOW_MS - ONE_SECOND_MS;
        await db.run('INSERT INTO failed_logins (kind, source_address, failed_at) VALUES (?, ?, ?)', [
          'assistant-filing',
          '203.0.113.17',
          longAgo,
        ]);
        await fileFrom(baseUrl, '203.0.113.18', 1);
        const leftover = await db.get('SELECT COUNT(*) AS count FROM failed_logins WHERE failed_at = ?', [longAgo]);
        assert.equal(leftover.count, 0);
      });
    },
  },
];
