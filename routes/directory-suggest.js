'use strict';

// Suggestions for the employee name box on the form, which staff use without logging in.
// Only the name and position the form fills in are sent, a few at a time, never the rest
// of an entry.

const express = require('express');
const db = require('../db');
const { nameKey } = require('./directory-name');

const SUGGESTION_LIMIT = 8;
const MAX_QUERY_LENGTH = 100;
const BAD_REQUEST = 400;
// Sorts after every character, so [key, key + this) is every name_key starting with key
// and the name_key index can read just that range.
const HIGHEST_CHARACTER = String.fromCodePoint(0x10ffff);

// Name, position and assigned unit of the entries whose name starts with the typed text. The
// website route drops the unit; the Assistant filing tool shows it.
async function findEmployeesByName(typed) {
  const key = nameKey(typed);
  if (!key) return [];
  return db.all(
    `SELECT full_name AS name, position, assigned_unit AS unit FROM employees_directory
     WHERE name_key >= ? AND name_key < ? ORDER BY name_key LIMIT ?`,
    [key, key + HIGHEST_CHARACTER, SUGGESTION_LIMIT]
  );
}

async function suggestEmployees(req, res) {
  const typed = req.query.q === undefined ? '' : req.query.q;
  if (typeof typed !== 'string' || typed.length > MAX_QUERY_LENGTH) {
    return res.status(BAD_REQUEST).json({ error: 'Please type part of a name' });
  }
  try {
    const found = await findEmployeesByName(typed);
    const employees = found.map(({ name, position }) => ({ name, position }));
    res.json({ employees });
  } catch (err) {
    console.error('Error suggesting employees:', err.message);
    res.status(500).json({ error: 'Employees could not be suggested' });
  }
}

const router = express.Router();
router.get('/api/directory/suggest', suggestEmployees);

module.exports = { router, findEmployeesByName, SUGGESTION_LIMIT, MAX_QUERY_LENGTH };
