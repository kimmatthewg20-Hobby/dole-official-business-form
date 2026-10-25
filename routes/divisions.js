'use strict';

// The Division list (GLOSSARY.md). Listing is public because the form page picks from it;
// every change needs an admin session. Stored forms hold their division as text, so nothing
// here ever touches them.

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateDivision } = require('./division-validation');
const {
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  NO_ID,
  serverError,
  parseId,
  failedSave,
} = require('./list-route-helpers');

// A bound on the public list; adding is refused at the bound so the list never cuts one off.
const MAX_DIVISIONS = 200;
const TOO_MANY = `There can be at most ${MAX_DIVISIONS} Divisions`;
const CLASH_RACE = 'A Division with this name or code already exists';
const NOT_FOUND_MESSAGE = 'Division not found';

// Names are compared without regard to capitals, as the unique index on name does.
async function findClash({ name, code }, exceptId) {
  const clash = await db.get(
    'SELECT name, code FROM divisions WHERE (name = ? COLLATE NOCASE OR code = ?) AND id != ? LIMIT 1',
    [name, code, exceptId],
  );
  if (!clash) return null;
  if (clash.name.toLowerCase() === name.toLowerCase()) {
    return `A Division named ${clash.name} already exists`;
  }
  return `The code ${code} is already used by ${clash.name}`;
}

async function listDivisions(req, res) {
  try {
    const divisions = await db.all(
      'SELECT id, name, code FROM divisions ORDER BY name COLLATE NOCASE LIMIT ?',
      [MAX_DIVISIONS],
    );
    res.json({ divisions });
  } catch (err) {
    serverError(res, 'Error listing Divisions', err);
  }
}

async function addDivision(req, res) {
  try {
    const { value, error } = validateDivision(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    const { total } = await db.get('SELECT COUNT(*) AS total FROM divisions', []);
    if (total >= MAX_DIVISIONS) return res.status(BAD_REQUEST).json({ error: TOO_MANY });
    const clash = await findClash(value, NO_ID);
    if (clash) return res.status(CONFLICT).json({ error: clash });
    const result = await db.run('INSERT INTO divisions (name, code) VALUES (?, ?) RETURNING id', [
      value.name,
      value.code,
    ]);
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    failedSave(res, 'Error adding a Division', err, CLASH_RACE);
  }
}

async function editDivision(req, res) {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    const { value, error } = validateDivision(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    const clash = await findClash(value, id);
    if (clash) return res.status(CONFLICT).json({ error: clash });
    const result = await db.run('UPDATE divisions SET name = ?, code = ? WHERE id = ?', [
      value.name,
      value.code,
      id,
    ]);
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    res.json({ success: true });
  } catch (err) {
    failedSave(res, 'Error editing a Division', err, CLASH_RACE);
  }
}

async function removeDivision(req, res) {
  try {
    const id = parseId(req.params.id);
    const result =
      id === null ? { changes: 0 } : await db.run('DELETE FROM divisions WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    res.json({ success: true });
  } catch (err) {
    serverError(res, 'Error removing a Division', err);
  }
}

const router = express.Router();
router.get('/api/divisions', listDivisions);
router.post('/api/divisions', adminApiOnly, addDivision);
router.put('/api/divisions/:id', adminApiOnly, editDivision);
router.delete('/api/divisions/:id', adminApiOnly, removeDivision);

module.exports = { router, MAX_DIVISIONS };
