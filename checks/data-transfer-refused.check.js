'use strict';

// A bad import file is refused as a whole, before or while it is written, and changes nothing.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie, postJson } = require('./admin-http');
const {
  IMPORT_ROUTE,
  withTablesRestored,
  snapshot,
  importData,
} = require('./data-transfer-helpers');
const {
  FIRST_CODE,
  DIVISIONS,
  APPROVERS,
  DIRECTORY,
  form,
  newExport,
  expectNothingChanged,
} = require('./data-transfer-fixtures');

const OK = 200;

module.exports = [
  {
    name: 'a file with two forms sharing a Reference code is refused and changes nothing',
    run: (context) =>
      expectNothingChanged(
        context,
        newExport({
          official_business: [form(501, FIRST_CODE), form(502, FIRST_CODE)],
        }),
        /Reference code/,
      ),
  },
  {
    name: 'a file with a bad Division code is refused and changes nothing',
    run: (context) =>
      expectNothingChanged(
        context,
        newExport({ divisions: [{ name: 'Bad', code: 'C1' }] }),
        /Division 1/,
      ),
  },
  {
    name: 'a file with two Divisions sharing a code or name is refused and changes nothing',
    async run(context) {
      const sameCode = [DIVISIONS[0], { name: 'Other', code: 'cn' }];
      await expectNothingChanged(context, newExport({ divisions: sameCode }), /code/);
      const sameName = [DIVISIONS[0], { name: 'check division', code: 'XY' }];
      await expectNothingChanged(context, newExport({ divisions: sameName }), /name/);
    },
  },
  {
    name: 'a file with a bad or repeated Approver is refused and changes nothing',
    async run(context) {
      const tooLong = [{ name: 'A'.repeat(101), position: 'Director' }];
      await expectNothingChanged(context, newExport({ approvers: tooLong }), /Approver 1/);
      const repeated = [APPROVERS[0], { name: 'CHECK approver', position: 'check director' }];
      await expectNothingChanged(context, newExport({ approvers: repeated }), /Approver/);
    },
  },
  {
    name: 'a file with a bad directory entry or last-used date is refused and changes nothing',
    async run(context) {
      const noName = [{ ...DIRECTORY[0], full_name: ' ' }];
      await expectNothingChanged(context, newExport({ employees_directory: noName }), /Employee 1/);
      const badDate = [{ ...DIRECTORY[0], last_used_at: '2026-02-30' }];
      await expectNothingChanged(
        context,
        newExport({ employees_directory: badDate }),
        /Employee 1/,
      );
    },
  },
  {
    name: 'a file the database refuses part-way changes nothing',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, newExport());
        const before = await snapshot(db);
        const repeatedId = newExport({
          official_business: [form(501, null), form(501, null)],
        });
        const response = await postJson(baseUrl, IMPORT_ROUTE, repeatedId, cookie);
        assert.notEqual(response.status, OK);
        assert.deepEqual(await snapshot(db), before);
      });
    },
  },
];
