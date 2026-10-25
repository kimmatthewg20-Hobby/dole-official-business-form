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

async function suggestEmployees(req, res) {
  const typed = req.query.q === undefined ? '' : req.query.q;
  if (typeof typed !== 'string' || typed.length > MAX_QUERY_LENGTH) {
    return res.status(BAD_REQUEST).json({ error: 'Please type part of a name' });
  }
  const key = nameKey(typed);
  if (!key) return res.json({ employees: [] });
  try {
    const employees = await db.all(
      `SELECT full_name AS name, position FROM employees_directory
       WHERE name_key >= ? AND name_key < ? ORDER BY name_key LIMIT ?`,
      [key, key + HIGHEST_CHARACTER, SUGGESTION_LIMIT]
    );
    res.json({ employees });
  } catch (err) {
    console.error('Error suggesting employees:', err.message);
    res.status(500).json({ error: 'Employees could not be suggested' });
  }
}

const router = express.Router();
router.get('/api/directory/suggest', suggestEmployees);

module.exports = { router, SUGGESTION_LIMIT, MAX_QUERY_LENGTH };
