'use strict';

// A backup keeps the order the admin set for the Divisions and Approvers, and an export from
// before that order existed imports in the order it lists them.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { OK } = require('./division-helpers');
const { withTablesRestored, exportData, importData } = require('./data-transfer-helpers');
const { newExport } = require('./data-transfer-fixtures');
const { LISTS, listedIds, listedNames, reorder } = require('./list-order-helpers');

const [DIVISION_LIST, APPROVER_LIST] = LISTS;
const DIVISIONS = [
  { id: 11, name: 'Zeta Unit', code: 'ZU' },
  { id: 12, name: 'Alpha Unit', code: 'AU' },
  { id: 13, name: 'Middle Unit', code: 'MU' },
];
const APPROVERS = [
  { id: 21, name: 'Zeta Santos', position: 'Chief' },
  { id: 22, name: 'Ana Reyes', position: 'Director' },
];
const GARBAGE_ORDERS = ['first', 1, 1];

module.exports = [
  {
    name: "an export lists Divisions and Approvers in the admin's order and importing it keeps that order",
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(
          baseUrl,
          cookie,
          newExport({ divisions: DIVISIONS, approvers: APPROVERS }),
        );
        assert.equal(
          (await reorder(baseUrl, DIVISION_LIST, { ids: [13, 11, 12] }, cookie)).status,
          OK,
        );
        assert.equal((await reorder(baseUrl, APPROVER_LIST, { ids: [22, 21] }, cookie)).status, OK);

        const exported = await exportData(baseUrl, cookie);
        assert.deepEqual(
          exported.divisions.map(({ id, sort_order }) => ({ id, sort_order })),
          [
            { id: 13, sort_order: 1 },
            { id: 11, sort_order: 2 },
            { id: 12, sort_order: 3 },
          ],
        );
        assert.deepEqual(
          exported.approvers.map(({ id, sort_order }) => ({ id, sort_order })),
          [
            { id: 22, sort_order: 1 },
            { id: 21, sort_order: 2 },
          ],
        );

        await importData(
          baseUrl,
          cookie,
          newExport({ divisions: DIVISIONS, approvers: APPROVERS }),
        );
        await importData(baseUrl, cookie, exported);
        assert.deepEqual(await listedIds(baseUrl, DIVISION_LIST), [13, 11, 12]);
        assert.deepEqual(await listedIds(baseUrl, APPROVER_LIST), [22, 21]);
      });
    },
  },
  {
    name: 'an export without an order imports the Divisions and Approvers in the order the file lists them',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(
          baseUrl,
          cookie,
          newExport({ divisions: DIVISIONS, approvers: APPROVERS }),
        );
        assert.deepEqual(await listedNames(baseUrl, DIVISION_LIST), [
          'Zeta Unit',
          'Alpha Unit',
          'Middle Unit',
        ]);
        assert.deepEqual(await listedNames(baseUrl, APPROVER_LIST), ['Zeta Santos', 'Ana Reyes']);
      });
    },
  },
  {
    name: 'repeated or broken order values in a file are set aside for the order the file lists them in',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const divisions = DIVISIONS.map((row, index) => ({
          ...row,
          sort_order: GARBAGE_ORDERS[index],
        }));
        const approvers = APPROVERS.map((row) => ({ ...row, sort_order: -1 }));
        await importData(baseUrl, cookie, newExport({ divisions, approvers }));
        const exported = await exportData(baseUrl, cookie);
        assert.deepEqual(
          exported.divisions.map(({ id, sort_order }) => [id, sort_order]),
          [
            [11, 1],
            [12, 2],
            [13, 3],
          ],
        );
        assert.deepEqual(
          exported.approvers.map(({ id, sort_order }) => [id, sort_order]),
          [
            [21, 1],
            [22, 2],
          ],
        );
      });
    },
  },
];
