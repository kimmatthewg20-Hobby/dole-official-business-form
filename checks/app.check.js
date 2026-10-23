'use strict';

const assert = require('node:assert/strict');

const SERVER_MODULE = require.resolve('../server');
const DAYS_PAST_CLEANUP_CUTOFF = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STARTUP_SETTLE_MS = 200;
const TIMER_RESOURCE = 'Timeout';

function countTimers() {
  return process.getActiveResourcesInfo().filter((name) => name === TIMER_RESOURCE).length;
}

module.exports = [
  {
    name: 'the app answers over HTTP',
    async run({ baseUrl }) {
      const response = await fetch(`${baseUrl}/healthz`);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'OK');
    },
  },
  {
    name: 'loading the app for tests runs no startup cleanup and starts no daily timer',
    async run({ db }) {
      const oldDate = new Date(Date.now() - DAYS_PAST_CLEANUP_CUTOFF * MS_PER_DAY).toISOString();
      const oldForm = await db.run(
        'INSERT INTO official_business (date_created, purpose) VALUES (?, ?) RETURNING id',
        [oldDate, 'Older than the cleanup cut-off']
      );
      const timersBefore = countTimers();

      delete require.cache[SERVER_MODULE];
      require(SERVER_MODULE);
      await new Promise((resolve) => setTimeout(resolve, STARTUP_SETTLE_MS));

      assert.equal(countTimers(), timersBefore);
      const stillThere = await db.get('SELECT id FROM official_business WHERE id = ?', [
        oldForm.lastID,
      ]);
      assert.deepEqual(stillThere, { id: oldForm.lastID });
    },
  },
];
