'use strict';

// Assistant filing: a unit given for a new employee becomes that directory entry's assigned
// unit; an existing entry is never changed; the website's own submit ignores any unit.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows, submit } = require('./form-helpers');
const { listDirectory } = require('./directory-helpers');
const { callTool, toolRefusal } = require('./mcp-helpers');

const OK = 200;
const SUBMIT = 'submit_official_business';
const TOO_LONG_UNIT = 'U'.repeat(301);
const FILING = {
  dates: VALID_SUBMISSION.datesOfOB,
  destination: VALID_SUBMISSION.locationTo,
  departureTime: VALID_SUBMISSION.departureTime,
  returnTime: VALID_SUBMISSION.returnTime,
  purpose: VALID_SUBMISSION.purpose,
  division: VALID_SUBMISSION.division,
  approver: VALID_SUBMISSION.approvedBy,
};

async function entryFor(baseUrl, search) {
  const [entry, ...others] = await listDirectory(baseUrl, search);
  assert.equal(others.length, 0);
  return entry;
}

module.exports = [
  {
    name: 'a new employee filed with a unit is added with that unit, and without one with the Division',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const employees = [
          { name: 'Unita Withunit', position: 'Analyst', unit: '  Records Section ' },
          { name: 'Nora Nounit', position: 'Clerk' },
          { name: 'Blanca Blankunit', position: 'Clerk', unit: '   ' },
        ];
        await callTool(baseUrl, SUBMIT, { ...FILING, employees });
        assert.equal((await entryFor(baseUrl, 'Withunit')).assigned_unit, 'Records Section');
        assert.equal((await entryFor(baseUrl, 'Nounit')).assigned_unit, VALID_SUBMISSION.division);
        assert.equal((await entryFor(baseUrl, 'Blankunit')).assigned_unit, VALID_SUBMISSION.division);
      });
    },
  },
  {
    name: 'an existing employee keeps name, position and unit when filed again with a different unit',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await callTool(baseUrl, SUBMIT, { ...FILING, employees: [{ name: 'Eddie Existing', position: 'Aide', unit: 'First Unit' }] });
        const before = await entryFor(baseUrl, 'Existing');
        const again = [{ name: 'EDDIE  existing', position: 'Chief', unit: 'Second Unit' }];
        await callTool(baseUrl, SUBMIT, { ...FILING, employees: again });
        const after = await entryFor(baseUrl, 'Existing');
        for (const field of ['full_name', 'position', 'assigned_unit']) assert.equal(after[field], before[field]);
        assert.equal(after.assigned_unit, 'First Unit');
      });
    },
  },
  {
    name: 'a unit that is too long is refused in plain words and stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const before = await countRows(db, 'official_business');
        const employees = [{ name: 'Longo Unit', position: 'Clerk', unit: TOO_LONG_UNIT }];
        assert.equal(await toolRefusal(baseUrl, SUBMIT, { ...FILING, employees }), 'Assigned unit is too long');
        assert.equal(await countRows(db, 'official_business'), before);
        assert.equal((await listDirectory(baseUrl, 'Longo')).length, 0);
      });
    },
  },
  {
    name: 'a unit sent to the website submit is ignored and the Division is stored',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const employees = [{ name: 'Webby Sender', position: 'Clerk', unit: 'Sneaky Unit' }];
        const response = await submit(baseUrl, { ...VALID_SUBMISSION, employees });
        assert.equal(response.status, OK);
        assert.equal((await entryFor(baseUrl, 'Sender')).assigned_unit, VALID_SUBMISSION.division);
      });
    },
  },
];
