const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');

const NO_DIVISION_OPTIONS = '';

// Public: the form page reads the division options too.
async function readSettings(req, res) {
  try {
    const settings = await db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', []);
    if (!settings) {
      await db.run('INSERT INTO settings (division_options) VALUES (?) RETURNING id', [
        NO_DIVISION_OPTIONS,
      ]);
      return res.json({ division_options: NO_DIVISION_OPTIONS });
    }
    res.json({ division_options: settings.division_options || NO_DIVISION_OPTIONS });
  } catch (err) {
    console.error('Error retrieving settings:', err);
    res.status(500).json({ error: err.message });
  }
}

// Saving adds a new row rather than editing one, because the newest row is the one in use.
async function saveSettings(req, res) {
  try {
    const { division_options } = req.body || {};
    const value = division_options == null ? NO_DIVISION_OPTIONS : String(division_options).trim();
    const result = await db.run(
      'INSERT INTO settings (division_options) VALUES (?) RETURNING id',
      [value]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
}

const router = express.Router();
router.get('/api/settings', readSettings);
router.post('/api/settings', adminApiOnly, saveSettings);

module.exports = { router };
