'use strict';

// Assistant filing: submit_official_business refuses what the website's submit refuses, in the
// website's own words, and stores nothing when it does.

const assert = require('node:assert/strict');
const { VALID_SUBMISSION, withFormsRestored, countRows } = require('./form-helpers');
const { storedForm } = require('./division-helpers');
const { callTool, toolRefusal } = require('./mcp-helpers');

const SUBMIT = 'submit_official_business';
const DAYS_IN_MARCH = 31;
const FILING = {
  employees: VALID_SUBMISSION.employees.slice(0, 2),
  dates: VALID_SUBMISSION.datesOfOB,
  destination: VALID_SUBMISSION.locationTo,
  departureTime: VALID_SUBMISSION.departureTime,
  returnTime: VALID_SUBMISSION.returnTime,
  purpose: VALID_SUBMISSION.purpose,
  division: VALID_SUBMISSION.division,
  approver: VALID_SUBMISSION.approvedBy,
};
const EVERY_DAY_OF_MARCH = Array.from(
  { length: DAYS_IN_MARCH },
  (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`,
);

const REFUSALS = [
  [{ division: 'Not A Division' }, 'Please choose a Division from the list'],
  [{ approver: 'Not An Approver' }, 'Please choose an Approved by from the list'],
  [{ destination: '' }, 'Destination is required'],
  [{ purpose: '   ' }, 'Purpose is required'],
  [{ departureTime: '' }, 'Departure time is required'],
  [{ returnTime: 'soon' }, 'Return time is required'],
  [{ returnTime: '25:00' }, 'Return time is required'],
  [{ dates: [] }, 'Please select at least one valid date'],
  [{ dates: ['2026-02-30'] }, 'Please select at least one valid date'],
  [
    { dates: EVERY_DAY_OF_MARCH, dateMode: 'Multiple Separate Days' },
    'This would print 62 forms, but one submission can print at most 60. Remove some dates or employees.',
  ],
];

module.exports = [
  {
    name: 'submit_official_business refuses in the website words and stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        for (const [change, message] of REFUSALS) {
          assert.equal(await toolRefusal(baseUrl, SUBMIT, { ...FILING, ...change }), message, message);
        }
        assert.equal(await countRows(db, 'official_business'), 0);
        assert.equal(await countRows(db, 'employees'), 0);
      });
    },
  },
  {
    name: 'submit_official_business refuses a filing without a destination field and stores nothing',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const { destination, ...withoutDestination } = FILING;
        assert.equal(typeof destination, 'string');
        assert.equal(typeof (await toolRefusal(baseUrl, SUBMIT, withoutDestination)), 'string');
        assert.equal(await countRows(db, 'official_business'), 0);
      });
    },
  },
  {
    name: 'two listed Approvers with one name are told apart by the position',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        await db.run('INSERT INTO approvers (name, position) VALUES (?, ?)', ['Head Person', 'Regional Director']);
        const refusal = await toolRefusal(baseUrl, SUBMIT, FILING);
        assert.ok(refusal.includes('Head Person') && refusal.includes('approverPosition'), refusal);
        assert.equal(await countRows(db, 'official_business'), 0);
        const filed = await callTool(baseUrl, SUBMIT, { ...FILING, approverPosition: 'Regional Director' });
        assert.equal((await storedForm(baseUrl, filed.id)).formData.approved_by_position, 'Regional Director');
      });
    },
  },
];
