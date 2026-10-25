'use strict';

// Export files shared by the export and import checks, in the new and the older shape. Not a
// check file itself: the runner only loads files ending in .check.js.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie } = require('./admin-http');
const {
  withTablesRestored,
  snapshot,
  importData,
  rejectedImport,
} = require('./data-transfer-helpers');

const FIRST_CODE = 'DOLECN1026K7QX';
const SECOND_CODE = 'DOLEIM1026P3RT';
const OLD_LAST_USED = '2026-03-15';
const DIVISIONS = [
  { id: 71, name: 'Check Division', code: 'CN' },
  { id: 72, name: 'Inspection Division', code: 'IMSD' },
];
const APPROVERS = [{ id: 81, name: 'Check Approver', position: 'Check Director' }];
const DIRECTORY = [
  {
    id: 91,
    employee_id: 'E-1',
    firstname: 'Ana',
    middle_name: 'Bell',
    last_name: 'Sample',
    full_name: 'Ana B. Sample',
    position: 'Inspector',
    assigned_unit: 'Check Division',
    name_key: 'ana b. sample',
    last_used_at: OLD_LAST_USED,
  },
];

function form(id, referenceCode) {
  return {
    id,
    date_created: '2026-10-01T08:00:00.000Z',
    office: 'Check Regional Office',
    division: 'Check Division',
    date_of_ob: '2026-10-02',
    dates_of_ob: '2026-10-02',
    location_from: 'Check City',
    location_to: 'Sample Town',
    departure_time: '08:00',
    return_time: '17:00',
    purpose: 'Inspect a sample establishment',
    approved_by: 'Check Approver',
    approved_by_position: 'Check Director',
    timestamp: null,
    reference_code: referenceCode,
  };
}

function newExport(overrides = {}) {
  return {
    official_business: [form(501, FIRST_CODE), form(502, SECOND_CODE)],
    employees: [{ id: 601, ob_id: 501, name: 'Ana B. Sample', position: 'Inspector' }],
    settings: [],
    divisions: DIVISIONS,
    approvers: APPROVERS,
    employees_directory: DIRECTORY,
    ...overrides,
  };
}

function oldExport() {
  const { reference_code: omitted, ...withoutCode } = form(501, null);
  return {
    official_business: [withoutCode],
    employees: [{ id: 601, ob_id: 501, name: 'Ana B. Sample', position: 'Inspector' }],
    settings: [],
    exported_at: '2026-05-01T00:00:00.000Z',
    version: '1.0',
  };
}

// Imports a bad file and confirms the database is exactly as it was before.
async function expectNothingChanged({ baseUrl, db }, body, expectedError) {
  await withTablesRestored(db, async () => {
    const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
    await importData(baseUrl, cookie, newExport());
    const before = await snapshot(db);
    assert.match(await rejectedImport(baseUrl, cookie, body), expectedError);
    assert.deepEqual(await snapshot(db), before);
  });
}

module.exports = {
  FIRST_CODE,
  SECOND_CODE,
  DIVISIONS,
  APPROVERS,
  DIRECTORY,
  form,
  newExport,
  oldExport,
  expectNothingChanged,
};
