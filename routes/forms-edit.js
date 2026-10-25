const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateSubmission } = require('./form-validation');
const { writeFormContent } = require('./form-replace');

const router = express.Router();

// The edit screen sends snake_case form fields; validation expects the submit shape.
// Times fall back to the stored ones because older edit screens do not send them.
function toSubmission(body, stored) {
  const formData = body.formData || {};
  const dates = Array.isArray(formData.datesOfOB) ? formData.datesOfOB : [formData.date_of_ob];
  return {
    employees: body.employees,
    datesOfOB: dates,
    office: formData.office || formData.division || '',
    division: formData.division || '',
    locationFrom: formData.location_from || '',
    locationTo: formData.location_to,
    departureTime: formData.departure_time || stored.departure_time,
    returnTime: formData.return_time || stored.return_time,
    purpose: formData.purpose,
    approvedBy: formData.approved_by || '',
    approvedByPosition: formData.approved_by_position || '',
  };
}

function replaceForm(id, form) {
  return db.transaction((client) => writeFormContent(client, id, form));
}

// Only the admin edits a form by its id, without a code; staff edit with the Reference code
// (routes/edit-with-code.js), because form ids are sequential and easy to guess.
router.put('/api/update/:id', adminApiOnly, async (req, res) => {
  try {
    const stored = await db.get('SELECT id, departure_time, return_time FROM official_business WHERE id = ?', [
      req.params.id,
    ]);
    if (!stored) return res.status(404).json({ error: 'Entry not found' });
    const form = toSubmission(req.body || {}, stored);
    const validationError = validateSubmission(form);
    if (validationError) return res.status(400).json({ error: validationError });
    await replaceForm(stored.id, form);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/delete/:id', adminApiOnly, async (req, res) => {
  try {
    const stored = await db.get('SELECT id FROM official_business WHERE id = ?', [req.params.id]);
    if (!stored) return res.status(404).json({ error: 'Entry not found' });
    await db.run('DELETE FROM official_business WHERE id = ?', [stored.id]);
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/delete-all', adminApiOnly, async (req, res) => {
  try {
    await db.transaction(async (client) => {
      await client.query('DELETE FROM employees', []);
      await client.query('DELETE FROM official_business', []);
    });
    res.json({ success: true, message: 'All data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
