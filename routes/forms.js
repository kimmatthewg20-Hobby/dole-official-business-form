const express = require('express');
const db = require('../db');
const { submitForm } = require('./form-submit');
const { publicFormWithEmployees } = require('./public-form');
const { adminApiOnly } = require('./admin-auth');

const router = express.Router();

// Submit: one submission stores one form, whichever Date mode is chosen.
router.post('/api/submit', async (req, res) => {
  const { form, refusal } = await submitForm(req.body || {});
  if (refusal) return res.status(refusal.status).json({ error: refusal.message });
  res.json({ success: true, id: form.id, forms: [form] });
});

// Form ids are sequential, so reading a whole form by id is for the admin; staff open their
// form with its Reference code (routes/reference-code-lookup.js).
router.get('/api/retrieve/:id', adminApiOnly, async (req, res) => {
  try {
    const row = await db.get(`SELECT * FROM official_business WHERE id = ?`, [req.params.id]);
    const form = await publicFormWithEmployees(row);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Form ids are sequential and the entry names its employees, so only the admin's Employees tab
// reads it.
router.get('/api/entries/:id', adminApiOnly, async (req, res) => {
  try {
    const id = req.params.id;
    
    const formData = await db.get(
      `SELECT o.id, o.date_created, o.office, o.division, 
             o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
             o.departure_time, o.return_time, o.purpose, o.approved_by, o.approved_by_position
       FROM official_business o 
       WHERE o.id = ?`,
      [id]
    );
    
    if (!formData) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Parse the dates_of_ob JSON field if it exists
    if (formData.dates_of_ob) {
      try {
        formData.datesOfOB = JSON.parse(formData.dates_of_ob);
      } catch (e) {
        // If parsing fails, create a single-item array with the date_of_ob value
        formData.datesOfOB = [formData.date_of_ob];
      }
    }
    
    const entry = {
      id: formData.id,
      date: formData.date_created,
      created_at: formData.date_created,
      formData: {
        office: formData.office,
        division: formData.division,
        date_of_ob: formData.date_of_ob,
        dates_of_ob: formData.date_of_ob,
        datesOfOB: formData.datesOfOB,
        from: formData.location_from,
        to: formData.location_to,
        location_from: formData.location_from,
        location_to: formData.location_to,
        departure_time: formData.departure_time,
        return_time: formData.return_time,
        time: `${formData.departure_time} - ${formData.return_time}`,
        purpose: formData.purpose,
        approved_by: formData.approved_by,
        approved_by_position: formData.approved_by_position
      }
    };
    
    // Get associated employees
    const employees = await db.all(
      'SELECT name, position FROM employees WHERE ob_id = ?',
      [formData.id]
    );
    
    // Store employees in both places for better compatibility
    entry.employees = employees.map(emp => ({
      name: emp.name,
      full_name: emp.name,
      position: emp.position
    }));
    
    entry.formData.employees = employees;
    
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
