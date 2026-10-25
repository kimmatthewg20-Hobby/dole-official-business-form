'use strict';

// The admin's JSON export and import of forms, employees, settings, Divisions, Approvers and
// the Employee directory. The admin password never travels in either direction (ADR 0002):
// an export file is a backup anyone may end up holding, and an old export must not reset the
// login. The export holds Reference codes, the forms' edit secrets (ADR 0003), so both routes
// are admin-only.

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateImportFile } = require('./data-transfer-validation');
const { writeImport, LIST_COLUMNS } = require('./data-transfer-writes');

const router = express.Router();

// 1.1 added Divisions, Approvers and the Employee directory; 1.0 files still import.
const EXPORT_FORMAT_VERSION = '1.1';
const EXPORT_FILE_NAME = 'ob-data-export.json';
const BAD_REQUEST = 400;
const EXPORTED_SETTINGS_COLUMNS = [
  'id',
  'office',
  'office_head',
  'office_head_position',
  'location_from',
  'division_options',
  'assistant_regional_director',
];

async function exportLists() {
  const lists = {};
  for (const [table, columns] of Object.entries(LIST_COLUMNS)) {
    lists[table] = await db.all(`SELECT ${columns.join(', ')} FROM ${table} ORDER BY id`, []);
  }
  return lists;
}

async function exportData(req, res) {
  try {
    const exportData = {
      official_business: await db.all('SELECT * FROM official_business', []),
      employees: await db.all('SELECT * FROM employees', []),
      settings: await db.all(`SELECT ${EXPORTED_SETTINGS_COLUMNS.join(', ')} FROM settings`, []),
      ...(await exportLists()),
      exported_at: new Date().toISOString(),
      version: EXPORT_FORMAT_VERSION,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${EXPORT_FILE_NAME}`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// A list left as it was is reported as null, so the admin can tell it from an empty one.
function importSummary(file) {
  const summary = {
    success: true,
    message: 'Data imported successfully',
    forms: file.official_business.length,
    employees: file.employees.length,
    settings: file.settings.length,
  };
  for (const table of Object.keys(LIST_COLUMNS))
    summary[table] = file[table] ? file[table].length : null;
  return summary;
}

async function importData(req, res) {
  try {
    const checked = validateImportFile(req.body, new Date());
    if (checked.error) return res.status(BAD_REQUEST).json({ error: checked.error });
    const file = checked.value;
    console.log(
      `Importing data: ${file.official_business.length} forms, ${file.employees.length} employees`,
    );
    await db.transaction((client) => writeImport(client, file));
    res.json(importSummary(file));
  } catch (error) {
    console.error('Error during import:', error);
    res.status(500).json({ error: error.message });
  }
}

router.get('/api/export-data', adminApiOnly, exportData);
router.post('/api/import-data', adminApiOnly, importData);

module.exports = { router };
