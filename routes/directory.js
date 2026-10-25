'use strict';

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateEntry, validateEntries } = require('./directory-validation');
const { INITIAL_EMPLOYEES } = require('./directory-initial-data');
const { nameKey } = require('./directory-name');

const INSERT_ENTRY_SQL =
  'INSERT INTO employees_directory (employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit, name_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
const NOT_FOUND = 404;
const BAD_REQUEST = 400;

function entryArgs(entry) {
  return [entry.employee_id, entry.firstname, entry.middle_name, entry.last_name,
    entry.full_name, entry.position, entry.assigned_unit, nameKey(entry.full_name)];
}

function parseId(raw) {
  return /^\d+$/.test(String(raw)) ? Number(raw) : null;
}

function serverError(res, label, err) {
  console.error(`${label}:`, err.message);
  res.status(500).json({ error: err.message });
}

// Deleting and inserting in one transaction means a failure keeps the old directory.
async function replaceDirectory(entries) {
  await db.transaction(async (client) => {
    await client.query('DELETE FROM employees_directory', []);
    for (const entry of entries) {
      await client.query(INSERT_ENTRY_SQL, entryArgs(entry));
    }
  });
}

async function listEntries(req, res) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    let query = 'SELECT * FROM employees_directory';
    let params = [];
    if (search) {
      query += ' WHERE full_name LIKE ? OR position LIKE ? OR assigned_unit LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    const employees = await db.all(`${query} ORDER BY full_name`, params);
    res.json({ employees });
  } catch (err) {
    serverError(res, 'Error getting employees', err);
  }
}

async function readEntry(req, res) {
  try {
    const id = parseId(req.params.id);
    const employee = id === null ? null : await db.get('SELECT * FROM employees_directory WHERE id = ?', [id]);
    if (!employee) return res.status(NOT_FOUND).json({ error: 'Employee not found' });
    res.json({ employee });
  } catch (err) {
    serverError(res, 'Error getting employee', err);
  }
}

async function addEntry(req, res) {
  try {
    const { value, error } = validateEntry(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    const result = await db.run(`${INSERT_ENTRY_SQL} RETURNING id`, entryArgs(value));
    res.json({ success: true, id: result.lastID, message: 'Employee added successfully' });
  } catch (err) {
    serverError(res, 'Error adding employee', err);
  }
}

async function updateEntry(req, res) {
  try {
    const id = parseId(req.params.id);
    const { value, error } = validateEntry(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    if (id === null) return res.status(NOT_FOUND).json({ error: 'Employee not found' });
    const result = await db.run(
      'UPDATE employees_directory SET employee_id = ?, firstname = ?, middle_name = ?, last_name = ?, full_name = ?, position = ?, assigned_unit = ?, name_key = ? WHERE id = ?',
      [...entryArgs(value), id]
    );
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: 'Employee not found' });
    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err) {
    serverError(res, 'Error updating employee', err);
  }
}

async function deleteEntry(req, res) {
  try {
    const id = parseId(req.params.id);
    const result = id === null ? { changes: 0 } : await db.run('DELETE FROM employees_directory WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    serverError(res, 'Error deleting employee', err);
  }
}

async function bulkReplace(req, res) {
  try {
    const { values, error } = validateEntries(req.body && req.body.employees);
    if (error) return res.status(BAD_REQUEST).json({ error });
    await replaceDirectory(values);
    res.json({ success: true, message: 'Employees replaced successfully', count: values.length });
  } catch (err) {
    serverError(res, 'Error replacing employees', err);
  }
}

async function initializeDirectory(req, res) {
  try {
    const { values, error } = validateEntries(INITIAL_EMPLOYEES);
    if (error) throw new Error(error);
    await replaceDirectory(values);
    res.json({ success: true, message: 'Employees initialized successfully', count: values.length });
  } catch (err) {
    serverError(res, 'Error initializing employees', err);
  }
}

const router = express.Router();
// The whole directory is personal data, read only on the admin's Employees tab; staff get the
// bounded name suggestions in directory-suggest.js.
router.get('/api/employees', adminApiOnly, listEntries);
router.post('/api/employees/initialize', adminApiOnly, initializeDirectory);
router.post('/api/employees/bulk-replace', adminApiOnly, bulkReplace);
router.get('/api/employees/:id', adminApiOnly, readEntry);
router.post('/api/employees', adminApiOnly, addEntry);
router.put('/api/employees/:id', adminApiOnly, updateEntry);
router.delete('/api/employees/:id', adminApiOnly, deleteEntry);

module.exports = { router };
