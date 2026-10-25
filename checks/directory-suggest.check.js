'use strict';

// The form suggests remembered employees as a name is typed, and the admin can complete
// entries that were added without an ID, first name or last name.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { postJson, loginCookie } = require('./admin-http');
const { sendJson, listDirectory, withDirectoryRestored, addEntry } = require('./directory-helpers');
const { VALID_SUBMISSION, withFormsRestored, submit } = require('./form-helpers');
const { SUGGESTION_LIMIT, MAX_QUERY_LENGTH } = require('../routes/directory-suggest');

const OK = 200;
const BAD_REQUEST = 400;
const UNIT = { position: 'Clerk', assigned_unit: 'IMSD' };

async function suggest(baseUrl, query) {
  const response = await fetch(`${baseUrl}/api/directory/suggest?${query}`);
  return { status: response.status, body: response.status === OK ? await response.json() : null };
}

function bulkEntries(count) {
  return Array.from({ length: count }, (_, index) => ({ firstname: 'Bulk', last_name: `Person ${index}`, ...UNIT }));
}

module.exports = [
  {
    name: 'suggestions match the start of a name in any capitals and spacing and give only name and position',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await addEntry(baseUrl, cookie, { employee_id: 'X-1', firstname: 'Ana', last_name: 'Reyes', ...UNIT });
        const { status, body } = await suggest(baseUrl, 'q=ANA%20%20%20re');
        assert.equal(status, OK);
        assert.deepEqual(body, { employees: [{ name: 'Ana Reyes', position: 'Clerk' }] });
        assert.deepEqual((await suggest(baseUrl, 'q=nobody-has-this-name')).body, { employees: [] });
      });
    },
  },
  {
    name: 'suggestions are bounded and the typed text is checked',
    async run({ baseUrl, db }) {
      await withDirectoryRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const entries = bulkEntries(SUGGESTION_LIMIT + 3);
        assert.equal((await postJson(baseUrl, '/api/employees/bulk-replace', { employees: entries }, cookie)).status, OK);
        assert.equal((await suggest(baseUrl, 'q=bulk')).body.employees.length, SUGGESTION_LIMIT);
        assert.deepEqual((await suggest(baseUrl, 'q=%20%20')).body, { employees: [] });
        assert.deepEqual((await suggest(baseUrl, '')).body, { employees: [] });
        assert.equal((await suggest(baseUrl, `q=${'a'.repeat(MAX_QUERY_LENGTH + 1)}`)).status, BAD_REQUEST);
        assert.equal((await suggest(baseUrl, 'q=a&q=b')).status, BAD_REQUEST);
      });
    },
  },
  {
    name: 'an entry without ID, first name or last name is valid and the admin can complete it later',
    async run({ baseUrl, db }) {
      await withFormsRestored(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        const soloId = await addEntry(baseUrl, cookie, { full_name: ' Solo   Name ', ...UNIT });
        assert.equal((await listDirectory(baseUrl, 'Solo Name'))[0].id, soloId);
        const nameless = await postJson(baseUrl, '/api/employees', { ...UNIT }, cookie);
        assert.equal(nameless.status, BAD_REQUEST);

        await submit(baseUrl, { ...VALID_SUBMISSION, employees: [{ name: 'Una Auto', position: 'Aide' }] });
        const [auto] = await listDirectory(baseUrl, 'Una Auto');
        const completed = { employee_id: 'AUTO-1', firstname: 'Una', middle_name: '', last_name: 'Auto', ...UNIT };
        assert.equal((await sendJson(baseUrl, 'PUT', `/api/employees/${auto.id}`, completed, cookie)).status, OK);
        await submit(baseUrl, { ...VALID_SUBMISSION, employees: [{ name: 'UNA AUTO', position: 'Aide' }] });
        const after = await listDirectory(baseUrl, 'Una Auto');
        assert.deepEqual(after.map((entry) => [entry.id, entry.employee_id, entry.firstname]), [[auto.id, 'AUTO-1', 'Una']]);
      });
    },
  },
];
