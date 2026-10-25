'use strict';

// The Approver list (GLOSSARY.md): the admin adds Approvers and anyone may list them.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { MAX_APPROVERS } = require('../routes/approvers');
const { OK, BAD_REQUEST, CONFLICT, expectRejected } = require('./division-helpers');
const {
  withNoApprovers,
  listApprovers,
  addApprover,
  addedApproverId,
} = require('./approver-helpers');

const DIRECTOR = {
  name: 'Juan Dela Cruz',
  position: 'Assistant Regional Director',
};
const NAME_REQUIRED = 'Approver name is required';
const POSITION_REQUIRED = 'Approver position is required';
const NOT_TEXT = [undefined, null, 42, ['Juan'], { first: 'Juan' }];

module.exports = [
  {
    name: 'an admin adds an Approver and the public list shows its name and position, tidied',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await addApprover(
          baseUrl,
          {
            name: '  Juan   Dela Cruz ',
            position: ' Assistant  Regional Director ',
          },
          cookie,
        );
        assert.equal(response.status, OK);
        assert.equal(typeof (await response.json()).id, 'number');
        assert.deepEqual(await listApprovers(baseUrl), [DIRECTOR]);
      });
    },
  },
  {
    name: 'a missing, blank, non-text or too long name or position is rejected with a clear message',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        for (const name of [...NOT_TEXT, '   ']) {
          await expectRejected(
            await addApprover(baseUrl, { name, position: DIRECTOR.position }, cookie),
            BAD_REQUEST,
            NAME_REQUIRED,
          );
        }
        for (const position of [...NOT_TEXT, '   ']) {
          await expectRejected(
            await addApprover(baseUrl, { name: DIRECTOR.name, position }, cookie),
            BAD_REQUEST,
            POSITION_REQUIRED,
          );
        }
        await expectRejected(
          await addApprover(baseUrl, { name: 'J'.repeat(101), position: 'Director' }, cookie),
          BAD_REQUEST,
          'Approver name must be at most 100 characters',
        );
        await expectRejected(
          await addApprover(baseUrl, { name: 'Juan', position: 'D'.repeat(151) }, cookie),
          BAD_REQUEST,
          'Approver position must be at most 150 characters',
        );
        await expectRejected(
          await addApprover(baseUrl, [DIRECTOR], cookie),
          BAD_REQUEST,
          NAME_REQUIRED,
        );
        assert.deepEqual(await listApprovers(baseUrl), []);
      });
    },
  },
  {
    name: 'the longest allowed name and position are accepted',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const longest = { name: 'J'.repeat(100), position: 'D'.repeat(150) };
        await addedApproverId(baseUrl, longest, cookie);
        assert.deepEqual(await listApprovers(baseUrl), [longest]);
      });
    },
  },
  {
    name: 'the same person may hold two positions, but the same name and position twice is rejected',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addedApproverId(baseUrl, DIRECTOR, cookie);
        await addedApproverId(
          baseUrl,
          { name: DIRECTOR.name, position: 'OIC Regional Director' },
          cookie,
        );
        await expectRejected(
          await addApprover(
            baseUrl,
            { name: 'juan dela CRUZ', position: 'assistant regional director' },
            cookie,
          ),
          CONFLICT,
          'Juan Dela Cruz is already an Approver as Assistant Regional Director',
        );
        assert.equal((await listApprovers(baseUrl)).length, 2);
      });
    },
  },
  {
    name: 'the public Approver list keeps the admin\'s order, so a new one is listed last',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addedApproverId(baseUrl, { name: 'zeta Santos', position: 'Chief' }, cookie);
        await addedApproverId(baseUrl, { name: 'Ana Reyes', position: 'Director' }, cookie);
        assert.deepEqual(await listApprovers(baseUrl), [
          { name: 'zeta Santos', position: 'Chief' },
          { name: 'Ana Reyes', position: 'Director' },
        ]);
      });
    },
  },
  {
    name: 'the Approver list is bounded: at the limit adding is refused and the list shows all',
    async run({ baseUrl, db }) {
      await withNoApprovers(db, async () => {
        await db.transaction(async (client) => {
          for (let index = 0; index < MAX_APPROVERS; index += 1) {
            await client.query('INSERT INTO approvers (name, position) VALUES (?, ?)', [
              `Approver ${index}`,
              'Director',
            ]);
          }
        });
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await expectRejected(
          await addApprover(baseUrl, { name: 'One Too Many', position: 'Chief' }, cookie),
          BAD_REQUEST,
          `There can be at most ${MAX_APPROVERS} Approvers`,
        );
        assert.equal((await listApprovers(baseUrl)).length, MAX_APPROVERS);
      });
    },
  },
];
