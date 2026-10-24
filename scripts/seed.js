'use strict';

// Fills the local database with fake directory entries and settings. Every name here
// is invented: real staff names must never land in a development database.

const db = require('../db');
const { hashPassword } = require('../routes/password-hash');

const TEST_ADMIN_PASSWORD = 'local-test-admin';

const FAKE_SETTINGS = {
  office: 'Sample Regional Office',
  office_head: 'Rosa Sample',
  office_head_position: 'Regional Director',
  location_from: 'Sample Regional Office',
  division_options: 'TSSD, IMSD, MALSU',
  assistant_regional_director: 'Carlos Placeholder',
};

const FAKE_DIRECTORY = [
  ['SAMPLE-001', 'Ana', 'Bautista', 'Sample', 'Labor and Employment Officer III', 'TSSD'],
  ['SAMPLE-002', 'Ben', 'Cruz', 'Example', 'Administrative Officer II', 'IMSD'],
  ['SAMPLE-003', 'Carla', '', 'Testcase', 'Labor and Employment Officer I', 'MALSU'],
  ['SAMPLE-004', 'Dino', 'Reyes', 'Placeholder', 'Administrative Aide IV', 'IMSD'],
  ['SAMPLE-005', 'Ella', 'Santos', 'Fakename', 'Senior Labor and Employment Officer', 'TSSD'],
];

function fullName(firstname, middleName, lastName) {
  const middleInitial = middleName ? `${middleName[0]}.` : '';
  return [firstname, middleInitial, lastName].filter(Boolean).join(' ');
}

async function seedDatabase() {
  if (db.isTursoUrl(db.databaseUrl)) {
    throw new Error('Refusing to seed: TURSO_DATABASE_URL points at Turso, not a local file');
  }
  const adminPasswordHash = await hashPassword(TEST_ADMIN_PASSWORD);
  // Replacing rather than adding keeps a repeated seed from piling up duplicates.
  await db.transaction(async (client) => {
    await client.query('DELETE FROM employees_directory', []);
    await client.query('DELETE FROM settings', []);
    for (const [employeeId, firstname, middleName, lastName, position, unit] of FAKE_DIRECTORY) {
      await client.query(
        `INSERT INTO employees_directory
           (employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, firstname, middleName, lastName, fullName(firstname, middleName, lastName),
          position, unit]
      );
    }
    await client.query(
      `INSERT INTO settings
         (office, office_head, office_head_position, location_from, division_options,
          assistant_regional_director, admin_password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [FAKE_SETTINGS.office, FAKE_SETTINGS.office_head, FAKE_SETTINGS.office_head_position,
        FAKE_SETTINGS.location_from, FAKE_SETTINGS.division_options,
        FAKE_SETTINGS.assistant_regional_director, adminPasswordHash]
    );
  });
  return { directoryEntries: FAKE_DIRECTORY.length };
}

async function main() {
  try {
    const { directoryEntries } = await seedDatabase();
    console.log(`Seeded ${directoryEntries} fake directory entries and settings.`);
    console.log(`Test admin password: ${TEST_ADMIN_PASSWORD}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (require.main === module) main();

module.exports = { seedDatabase, TEST_ADMIN_PASSWORD };
