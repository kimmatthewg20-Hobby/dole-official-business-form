const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');

const router = express.Router();

// Lists every form with its employees; no staff page uses it, so it is for the admin only.
router.get('/api/entries/paginated', adminApiOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // First, get the total count of entries
    const countResult = await db.get(`SELECT COUNT(*) as total FROM official_business`, []);
    const totalEntries = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalEntries / limit);
    
    // Then get the paginated entries
    const formEntries = await db.all(
      `SELECT o.id, o.date_created, o.office, o.division, 
              o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
              o.departure_time, o.return_time, o.purpose 
       FROM official_business o 
       ORDER BY o.date_created DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    console.log('Database entries found:', formEntries ? formEntries.length : 0);
    if (formEntries && formEntries.length > 0) {
      console.log('First entry:', JSON.stringify(formEntries[0], null, 2));
    } else {
      console.log('No entries found in the database');
    }
    
    // Create a map to store employee data for each form
    const entriesMap = new Map();
    if (formEntries && formEntries.length > 0) {
      formEntries.forEach(entry => {
        // Parse dates_of_ob if exists
        let datesOfOB = null;
        if (entry.dates_of_ob) {
          try {
            datesOfOB = JSON.parse(entry.dates_of_ob);
          } catch (e) {
            console.warn('Error parsing dates_of_ob:', e.message);
            // If parsing fails, create a single-item array
            datesOfOB = entry.date_of_ob ? [entry.date_of_ob] : [];
          }
        }
        
        entriesMap.set(entry.id, {
          id: entry.id,
          formData: {
            dateOfOB: entry.date_of_ob,
            datesOfOB: datesOfOB,
            division: entry.division || '',
            locationTo: entry.location_to || '',
            purpose: entry.purpose || ''
          },
          employees: []
        });
      });
    }
    
    // Get all employees for these forms
    const formIds = Array.from(entriesMap.keys());
    if (formIds.length === 0) {
      return res.json({
        entries: [],
        pagination: {
          total: totalEntries,
          page: page,
          limit: limit,
          totalPages: totalPages
        }
      });
    }
    
    const placeholders = formIds.map(() => '?').join(',');
    const employees = await db.all(
      `SELECT ob_id, name, position 
       FROM employees 
       WHERE ob_id IN (${placeholders})`,
      formIds
    );
    
    // Add employees to their respective forms
    if (employees && employees.length > 0) {
      employees.forEach(emp => {
        const entry = entriesMap.get(emp.ob_id);
        if (entry) {
          entry.employees.push({
            name: emp.name || '',
            position: emp.position || ''
          });
        }
      });
    }
    
    // Convert map to array and send response with pagination info
    const entries = Array.from(entriesMap.values());
    res.json({
      entries: entries,
      pagination: {
        total: totalEntries,
        page: page,
        limit: limit,
        totalPages: totalPages
      }
    });
  } catch (error) {
    console.error('Unexpected error in paginated entries endpoint:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});


module.exports = { router };
