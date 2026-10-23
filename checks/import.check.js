'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  INVALID_EMPLOYEES_FIXTURE,
  fixtureArgs,
  freshDatabase,
  importInto,
  assertSucceeded,
  withReader,
  rowsOf,
  countsIn,
} = require('./import-helpers');

const FIXTURE_COUNTS = { official_business: 3, employees: 5, employees_directory: 2, settings: 1 };
const EMPTY_COUNTS = { official_business: 0, employees: 0, employees_directory: 0, settings: 0 };
const FIXTURE_ADMIN_PASSWORD = ' s3cret, "fake" pw ';
const FIXTURE_EMPLOYEE_LINKS = [
  { id: 1, ob_id: 3 },
  { id: 2, ob_id: 3 },
  { id: 5, ob_id: 7 },
  { id: 9, ob_id: 12 },
  { id: 10, ob_id: 12 },
];

async function assertFixtureImported(databaseUrl, result) {
  assertSucceeded(result);
  for (const [table, count] of Object.entries(FIXTURE_COUNTS)) {
    assert.match(result.stdout, new RegExp(`${table}: ${count}\\b`));
  }
  assert.ok(!result.stdout.includes('s3cret'), 'the admin password must never be printed');
  assert.ok(!result.stdout.includes('Ana Sample'), 'personal data must never be printed');
  assert.deepEqual(await countsIn(databaseUrl), FIXTURE_COUNTS);

  await withReader(databaseUrl, async (reader) => {
    const forms = await rowsOf(reader, 'SELECT * FROM official_business ORDER BY id');
    assert.deepEqual(forms.map((form) => form.id), [3, 7, 12]);
    assert.equal(forms[0].purpose, 'Inspect "Sample" establishment, then report');
    assert.equal(forms[0].location_to, 'Field Office, North');
    assert.equal(forms[0].dates_of_ob, null);
    assert.equal(forms[1].purpose, 'Line one\nLine two');
    assert.equal(forms[1].location_to, 'Parañaque Sample Hall');
    assert.equal(forms[1].approved_by, null);
    assert.equal(forms[2].dates_of_ob, '["2026-10-05","2026-10-06"]');
    assert.equal(forms[2].departure_time, null);

    const employees = await rowsOf(reader, 'SELECT * FROM employees ORDER BY id');
    assert.deepEqual(
      employees.map(({ id, ob_id }) => ({ id, ob_id })),
      FIXTURE_EMPLOYEE_LINKS
    );
    assert.equal(employees[1].name, 'Ben "Benny" Example');
    assert.equal(employees[1].position, 'Administrative Officer II, Acting');
    assert.equal(employees[2].name, 'José Peña Fakename');
    assert.equal(employees[3].position, null);

    const directory = await rowsOf(reader, 'SELECT * FROM employees_directory ORDER BY id');
    assert.deepEqual(directory.map((entry) => entry.id), [4, 8]);
    assert.equal(directory[0].employee_id, 'SAMPLE-101');
    assert.equal(directory[1].middle_name, null);

    const settings = await rowsOf(reader, 'SELECT * FROM settings');
    assert.deepEqual(settings.map((row) => row.id), [2]);
    assert.equal(settings[0].admin_password, FIXTURE_ADMIN_PASSWORD);
    assert.equal(settings[0].division_options, 'TSSD, IMSD, MALSU');
  });
}

module.exports = [
  {
    name: 'a CSV export is imported with its ids, links, values and the admin password unchanged',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-csv');
      await assertFixtureImported(databaseUrl, importInto(databaseUrl, fixtureArgs('csv')));
    },
  },
  {
    name: 'a JSON export is imported the same way',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-json');
      await assertFixtureImported(databaseUrl, importInto(databaseUrl, fixtureArgs('json')));
    },
  },
  {
    name: 'new rows after an import get ids after the highest imported id',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-counters');
      assertSucceeded(importInto(databaseUrl, fixtureArgs('csv')));
      await withReader(databaseUrl, async (reader) => {
        const form = await reader.execute("INSERT INTO official_business (purpose) VALUES ('New')");
        assert.equal(Number(form.lastInsertRowid), 13);
        const employee = await reader.execute('INSERT INTO employees (ob_id, name) VALUES (3, ?)', [
          'New Sample',
        ]);
        assert.equal(Number(employee.lastInsertRowid), 11);
        const entry = await reader.execute("INSERT INTO employees_directory (full_name) VALUES ('N')");
        assert.equal(Number(entry.lastInsertRowid), 9);
        const settings = await reader.execute("INSERT INTO settings (office) VALUES ('New')");
        assert.equal(Number(settings.lastInsertRowid), 3);
      });
    },
  },
  {
    name: 'an employee pointing at a missing form aborts the import and writes nothing',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-invalid');
      const result = importInto(databaseUrl, fixtureArgs('csv', { employees: INVALID_EMPLOYEES_FIXTURE }));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /employees.*row 2.*ob_id/);
      assert.ok(!result.stderr.includes('Orphan Sample'), 'personal data must never be printed');
      assert.deepEqual(await countsIn(databaseUrl), EMPTY_COUNTS);
    },
  },
  {
    name: 'a column outside the schema aborts the import',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-unknown-column');
      const settingsFile = path.join(tempDir, 'unknown-column-settings.json');
      fs.writeFileSync(settingsFile, JSON.stringify([{ id: 1, office: 'X', surprise: 'Y' }]));
      const result = importInto(databaseUrl, fixtureArgs('json', { settings: settingsFile }));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /settings.*surprise/);
      assert.deepEqual(await countsIn(databaseUrl), EMPTY_COUNTS);
    },
  },
  {
    name: 'a database that already has rows is refused unless --force is given',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-refuse');
      assertSucceeded(importInto(databaseUrl, fixtureArgs('csv')));

      const refused = importInto(databaseUrl, fixtureArgs('json'));
      assert.notEqual(refused.status, 0);
      assert.match(refused.stderr, /--force/);
      assert.deepEqual(await countsIn(databaseUrl), FIXTURE_COUNTS);

      const forced = importInto(databaseUrl, [...fixtureArgs('json'), '--force']);
      await assertFixtureImported(databaseUrl, forced);
    },
  },
  {
    name: 'a forced import with one invalid row keeps the existing rows',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-force-invalid');
      assertSucceeded(importInto(databaseUrl, fixtureArgs('csv')));
      const result = importInto(databaseUrl, [
        ...fixtureArgs('csv', { employees: INVALID_EMPLOYEES_FIXTURE }),
        '--force',
      ]);
      assert.notEqual(result.status, 0);
      assert.deepEqual(await countsIn(databaseUrl), FIXTURE_COUNTS);
    },
  },
  {
    name: 'a missing file argument is refused with usage help',
    async run({ tempDir }) {
      const databaseUrl = freshDatabase(tempDir, 'import-usage');
      const result = importInto(databaseUrl, fixtureArgs('csv').slice(1));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /--official-business/);
      assert.equal(importInto(databaseUrl, ['--help']).status, 0);
    },
  },
];
