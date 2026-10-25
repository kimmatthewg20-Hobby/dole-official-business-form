'use strict';

// The Division list (GLOSSARY.md): the admin adds Divisions and anyone may list them.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { MAX_DIVISIONS } = require('../routes/divisions');
const {
  OK,
  BAD_REQUEST,
  CONFLICT,
  CODE_MESSAGE,
  withNoDivisions,
  expectRejected,
  listDivisions,
  addDivision,
  addedId,
} = require('./division-helpers');

const LETTER_A = 65;
const LETTERS = 26;
const BAD_CODES = ['T', 'TSSDX', 'T5S', 'TS-D', '', 42, null];

// A distinct two-letter code for each index below 26 * 26, such as AA, AB, ...
function letterCode(index) {
  const letter = (offset) => String.fromCharCode(LETTER_A + offset);
  return letter(Math.floor(index / LETTERS)) + letter(index % LETTERS);
}

module.exports = [
  {
    name: 'an admin adds a Division and the public list shows it with its code in capitals',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const response = await addDivision(
          baseUrl,
          { name: ' Technical Support ', code: 'tss' },
          cookie,
        );
        assert.equal(response.status, OK);
        assert.equal(typeof (await response.json()).id, 'number');
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Technical Support', code: 'TSS' },
        ]);
      });
    },
  },
  {
    name: 'a code that is not 2 to 4 letters is rejected with a clear message and nothing is added',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        for (const code of BAD_CODES) {
          await expectRejected(
            await addDivision(baseUrl, { name: 'Bad Code', code }, cookie),
            BAD_REQUEST,
            CODE_MESSAGE,
          );
        }
        await expectRejected(
          await addDivision(baseUrl, { name: '   ', code: 'TSS' }, cookie),
          BAD_REQUEST,
          'Division name is required',
        );
        assert.deepEqual(await listDivisions(baseUrl), []);
      });
    },
  },
  {
    name: 'a second Division with the same name or code is rejected with a clear message',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        assert.equal(
          (await addDivision(baseUrl, { name: 'Technical Support', code: 'TSS' }, cookie)).status,
          OK,
        );
        await expectRejected(
          await addDivision(baseUrl, { name: 'technical  SUPPORT', code: 'TECH' }, cookie),
          CONFLICT,
          'A Division named Technical Support already exists',
        );
        await expectRejected(
          await addDivision(baseUrl, { name: 'Training Services', code: 'tss' }, cookie),
          CONFLICT,
          'The code TSS is already used by Technical Support',
        );
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Technical Support', code: 'TSS' },
        ]);
      });
    },
  },
  {
    name: 'the public list is sorted by name',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addedId(baseUrl, { name: 'zeta Unit', code: 'ZU' }, cookie);
        await addedId(baseUrl, { name: 'Alpha Unit', code: 'AU' }, cookie);
        assert.deepEqual(await listDivisions(baseUrl), [
          { name: 'Alpha Unit', code: 'AU' },
          { name: 'zeta Unit', code: 'ZU' },
        ]);
      });
    },
  },
  {
    name: 'the list is bounded: at the limit adding is refused and the list shows every Division',
    async run({ baseUrl, db }) {
      await withNoDivisions(db, async () => {
        await db.transaction(async (client) => {
          for (let index = 0; index < MAX_DIVISIONS; index += 1) {
            await client.query('INSERT INTO divisions (name, code) VALUES (?, ?)', [
              `Division ${index}`,
              letterCode(index),
            ]);
          }
        });
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await expectRejected(
          await addDivision(baseUrl, { name: 'One Too Many', code: 'OTM' }, cookie),
          BAD_REQUEST,
          `There can be at most ${MAX_DIVISIONS} Divisions`,
        );
        assert.equal((await listDivisions(baseUrl)).length, MAX_DIVISIONS);
      });
    },
  },
];
