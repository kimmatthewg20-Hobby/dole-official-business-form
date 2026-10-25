'use strict';

// The export and import carry each form's Date mode. An older file without it imports with
// none (the form prints as All Dates), and a file naming an unknown mode is refused whole.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const { withTablesRestored, exportData, importData } = require('./data-transfer-helpers');
const { FIRST_CODE, SECOND_CODE, form, newExport, oldExport, expectNothingChanged } = require('./data-transfer-fixtures');
const DateMode = require('../public/js/date-mode');

function withModes(firstMode, secondMode) {
  return newExport({
    official_business: [
      { ...form(501, FIRST_CODE), date_mode: firstMode },
      { ...form(502, SECOND_CODE), date_mode: secondMode },
    ],
  });
}

async function storedModes(db) {
  return (await db.all('SELECT date_mode FROM official_business ORDER BY id', [])).map((row) => row.date_mode);
}

module.exports = [
  {
    name: 'the Date mode of each form survives an export and an import',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, withModes(DateMode.MULTIPLE_SEPARATE_DAYS, null));
        const exported = await exportData(baseUrl, cookie);
        assert.deepEqual(exported.official_business.map((row) => row.date_mode), [DateMode.MULTIPLE_SEPARATE_DAYS, null]);
        await db.run('UPDATE official_business SET date_mode = ?', [DateMode.MORE_THAN_ONE_DAY]);
        await importData(baseUrl, cookie, exported);
        assert.deepEqual(await storedModes(db), [DateMode.MULTIPLE_SEPARATE_DAYS, null]);
      });
    },
  },
  {
    name: 'an older export without Date modes imports its forms with none',
    async run({ baseUrl, db }) {
      await withTablesRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await importData(baseUrl, cookie, oldExport());
        assert.deepEqual(await storedModes(db), [null]);
      });
    },
  },
  {
    name: 'a file with an unknown Date mode is refused and changes nothing',
    async run(context) {
      for (const badMode of ['sometimes', 5, '']) {
        await expectNothingChanged(context, withModes(DateMode.MORE_THAN_ONE_DAY, badMode), /Form 2: .*Date mode/);
      }
    },
  },
];
