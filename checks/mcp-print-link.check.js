'use strict';

// Assistant filing: the print link is a whole address, so it opens from the staff member's
// chat. Behind Vercel the forwarded host and scheme name the site; a host that is not a plain
// host name is never put into the link.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored } = require('./form-helpers');

const SUBMIT = 'submit_official_business';
const MCP_ROUTE = '/mcp';
const FORWARDED_SITE = 'dole-official-business-form.vercel.app';
const FILING = {
  employees: VALID_SUBMISSION.employees,
  dates: VALID_SUBMISSION.datesOfOB,
  destination: VALID_SUBMISSION.locationTo,
  departureTime: VALID_SUBMISSION.departureTime,
  returnTime: VALID_SUBMISSION.returnTime,
  purpose: VALID_SUBMISSION.purpose,
  division: VALID_SUBMISSION.division,
  approver: VALID_SUBMISSION.approvedBy,
};

async function filedWithHeaders(baseUrl, headers) {
  const response = await fetch(`${baseUrl}${MCP_ROUTE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: SUBMIT, arguments: FILING },
    }),
  });
  const { result } = await response.json();
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  return JSON.parse(result.content[0].text);
}

module.exports = [
  {
    name: 'the print link uses the forwarded host and scheme when a proxy sets them',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const filed = await filedWithHeaders(baseUrl, {
          'X-Forwarded-Host': FORWARDED_SITE,
          'X-Forwarded-Proto': 'https',
        });
        assert.equal(filed.printLink, `https://${FORWARDED_SITE}/print/${filed.id}`);
      });
    },
  },
  {
    name: 'a forwarded host that is not a plain host name never ends up in the print link',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const filed = await filedWithHeaders(baseUrl, { 'X-Forwarded-Host': 'evil.example/phish?x=' });
        assert.ok(!filed.printLink.includes('evil.example'), filed.printLink);
        assert.ok(filed.printLink.endsWith(`/print/${filed.id}`), filed.printLink);
      });
    },
  },
];
