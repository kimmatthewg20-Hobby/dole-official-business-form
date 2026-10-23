const express = require('express');
const db = require('../db');
const { validateSubmission } = require('./form-validation');

const router = express.Router();

// Submit form: the form and all its employees are stored together or not at all.
router.post('/api/submit', async (req, res) => {
  const body = req.body || {};
  const validationError = validateSubmission(body);
  if (validationError) return res.status(400).json({ error: validationError });

  const now = new Date().toISOString();
  try {
    const obId = await db.transaction(async (client) => {
      const obResult = await client.query(
        `INSERT INTO official_business (
          date_created, office, division, date_of_ob, dates_of_ob,
          location_from, location_to, departure_time, return_time, purpose,
          approved_by, approved_by_position, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          now, body.office || '', body.division || '', body.datesOfOB[0], JSON.stringify(body.datesOfOB),
          body.locationFrom || '', body.locationTo, body.departureTime, body.returnTime, body.purpose,
          body.approvedBy || '', body.approvedByPosition || '', now
        ]
      );
      const newId = obResult.rows[0].id;
      for (const emp of body.employees) {
        await client.query('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [
          newId, emp.name, emp.position || ''
        ]);
      }
      return newId;
    });
    res.json({ success: true, id: obId });
  } catch (error) {
    console.error('Database error during form submission:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Retrieve form data by ID
router.get('/api/retrieve/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const formData = await db.get(
      `SELECT * FROM official_business WHERE id = ?`,
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
    
    // Get associated employees
    const employees = await db.all(
      'SELECT name, position FROM employees WHERE ob_id = ?',
      [formData.id]
    );
    
    res.json({ formData, employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific entry by ID
router.get('/api/entries/:id', async (req, res) => {
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
