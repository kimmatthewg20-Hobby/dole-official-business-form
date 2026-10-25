'use strict';

// Writes a validated import file on the import's transaction client, so a failure anywhere
// leaves the database as it was. Table and column names come only from the constants here.

const { nameKey } = require('./directory-name');

const FORM_COLUMNS = [
  'id',
  'date_created',
  'office',
  'division',
  'date_of_ob',
  'dates_of_ob',
  'location_from',
  'location_to',
  'departure_time',
  'return_time',
  'purpose',
  'approved_by',
  'approved_by_position',
  'reference_code',
  'date_mode',
];
const LIST_COLUMNS = {
  divisions: ['id', 'name', 'code', 'sort_order'],
  approvers: ['id', 'name', 'position', 'sort_order'],
  employees_directory: [
    'id',
    'employee_id',
    'firstname',
    'middle_name',
    'last_name',
    'full_name',
    'position',
    'assigned_unit',
    'name_key',
    'last_used_at',
  ],
};
// Lists the admin puts in order are exported in it, so the file's own order is that order.
const LIST_EXPORT_ORDER = {
  divisions: 'sort_order, id',
  approvers: 'sort_order, id',
  employees_directory: 'id',
};
const FORMS_TABLE = 'official_business';
const DIRECTORY_TABLE = 'employees_directory';

function insertSql(table, columns) {
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
}

async function insertForms(client, forms) {
  const sql = insertSql(FORMS_TABLE, FORM_COLUMNS);
  for (const entry of forms) {
    await client.query(
      sql,
      FORM_COLUMNS.map((column) => entry[column]),
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

// The file's name key is never trusted: a wrong one would hide an employee from forms.
function withNameKey(table, row) {
  return table === DIRECTORY_TABLE ? { ...row, name_key: nameKey(row.full_name) } : row;
}

// A null list was absent or empty in the file, so the stored one is kept (see data-transfer-validation.js).
async function replaceList(client, table, rows) {
  if (rows === null) return;
  const columns = LIST_COLUMNS[table];
  await client.query(`DELETE FROM ${table}`, []);
  for (const row of rows) {
    const stored = withNameKey(table, row);
    await client.query(
      insertSql(table, columns),
      columns.map((column) => stored[column]),
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

// Forms, employees and settings are replaced whole, as the import always did.
async function writeImport(client, file) {
  const adminPassword = await newestAdminPassword(client);
  await client.query('DELETE FROM employees');
  await client.query('DELETE FROM official_business');
  await client.query('DELETE FROM settings');
  await insertForms(client, file.official_business);
  await insertEmployees(client, file.employees);
  await insertSettings(client, file.settings);
  for (const table of Object.keys(LIST_COLUMNS)) await replaceList(client, table, file[table]);
  await restoreAdminPassword(client, adminPassword);
}

module.exports = { writeImport, LIST_COLUMNS, LIST_EXPORT_ORDER };
