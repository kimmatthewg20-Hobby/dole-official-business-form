const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateSubmission } = require('./form-validation');

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

async function replaceForm(id, form) {
  await db.transaction(async (client) => {
    await client.query(
      `UPDATE official_business SET office = ?, division = ?, date_of_ob = ?, dates_of_ob = ?,
        location_from = ?, location_to = ?, departure_time = ?, return_time = ?, purpose = ?,
        approved_by = ?, approved_by_position = ? WHERE id = ?`,
      [
        form.office, form.division, form.datesOfOB[0], JSON.stringify(form.datesOfOB),
        form.locationFrom, form.locationTo, form.departureTime, form.returnTime, form.purpose,
        form.approvedBy, form.approvedByPosition, id,
      ]
    );
    await client.query('DELETE FROM employees WHERE ob_id = ?', [id]);
    for (const emp of form.employees) {
      await client.query('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [
        id, emp.name, emp.position || '',
      ]);
    }
  });
}

router.put('/api/update/:id', async (req, res) => {
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
