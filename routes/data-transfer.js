'use strict';

// The admin's JSON export and import of forms, employees and settings. The admin
// password never travels in either direction (ADR 0002): an export file is a
// backup anyone may end up holding, and an old export must not reset the login.

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');

const router = express.Router();

const EXPORT_FORMAT_VERSION = '1.0';
const EXPORT_FILE_NAME = 'ob-data-export.json';
const EXPORTED_SETTINGS_COLUMNS = [
  'id',
  'office',
  'office_head',
  'office_head_position',
  'location_from',
  'division_options',
  'assistant_regional_director',
];

async function exportData(req, res) {
  try {
    const exportData = {
      official_business: await db.all('SELECT * FROM official_business', []),
      employees: await db.all('SELECT * FROM employees', []),
      settings: await db.all(`SELECT ${EXPORTED_SETTINGS_COLUMNS.join(', ')} FROM settings`, []),
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

async function insertForms(client, forms) {
  for (const entry of forms) {
    await client.query(
      `INSERT INTO official_business (
        id, date_created, office, division, date_of_ob, dates_of_ob,
        location_from, location_to, departure_time, return_time, purpose,
        approved_by, approved_by_position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.date_created,
        entry.office,
        entry.division,
        entry.date_of_ob,
        entry.dates_of_ob,
        entry.location_from,
        entry.location_to,
        entry.departure_time,
        entry.return_time,
        entry.purpose,
        entry.approved_by,
        entry.approved_by_position,
      ],
    );
  }
}

async function insertEmployees(client, employees) {
  for (const emp of employees) {
    await client.query('INSERT INTO employees (id, ob_id, name, position) VALUES (?, ?, ?, ?)', [
      emp.id,
      emp.ob_id,
      emp.name,
      emp.position,
    ]);
  }
}

async function insertSettings(client, settings) {
  for (const setting of settings) {
    await client.query(
      `INSERT INTO settings (id, office, office_head, office_head_position, location_from, division_options)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        setting.id,
        setting.office,
        setting.office_head,
        setting.office_head_position,
        setting.location_from,
        setting.division_options,
      ],
    );
  }
}

// The newest settings row holds the admin password, so it is put back there.
async function newestAdminPassword(client) {
  const result = await client.query(
    'SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1',
    [],
  );
  const row = result.rows[0];
  return row && row.admin_password ? row.admin_password : null;
}

async function restoreAdminPassword(client, adminPassword) {
  if (!adminPassword) return;
  const result = await client.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1', []);
  const newest = result.rows[0];
  if (newest) {
    await client.query('UPDATE settings SET admin_password = ? WHERE id = ?', [
      adminPassword,
      newest.id,
    ]);
    return;
  }
  await client.query('INSERT INTO settings (admin_password) VALUES (?)', [adminPassword]);
}

async function importData(req, res) {
  try {
    const importData = req.body;
    if (!importData || !importData.official_business || !importData.employees) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }
    const settings = Array.isArray(importData.settings) ? importData.settings : [];
    console.log(
      `Importing data: ${importData.official_business.length} forms, ${importData.employees.length} employees`,
    );

    await db.transaction(async (client) => {
      const adminPassword = await newestAdminPassword(client);
      await client.query('DELETE FROM employees');
      await client.query('DELETE FROM official_business');
      await client.query('DELETE FROM settings');
      await insertForms(client, importData.official_business);
      await insertEmployees(client, importData.employees);
      await insertSettings(client, settings);
      await restoreAdminPassword(client, adminPassword);
    });

    res.json({
      success: true,
      message: 'Data imported successfully',
      forms: importData.official_business.length,
      employees: importData.employees.length,
      settings: settings.length,
    });
  } catch (error) {
    console.error('Error during import:', error);
    res.status(500).json({ error: error.message });
  }
}

router.get('/api/export-data', adminApiOnly, exportData);
router.post('/api/import-data', adminApiOnly, importData);

module.exports = { router };
