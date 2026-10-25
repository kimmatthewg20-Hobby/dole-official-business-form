'use strict';

const express = require('express');
const db = require('../db');

// Entries added from a form have only a full name, so first/last variations are used only when
// both parts exist; otherwise the text "null null" would be searched. Forms keep the name as typed,
// so the match ignores capitals.
function nameVariations(employee) {
  const names = [employee.full_name];
  if (employee.firstname && employee.last_name) {
    names.push(`${employee.firstname} ${employee.last_name}`, `${employee.last_name}, ${employee.firstname}`);
  }
  return names.filter(Boolean).map((name) => name.trim().toLowerCase());
}

// Get employee travel history
async function readHistory(req, res) {
  try {
    const { id } = req.params;
    
    // First get the employee details
    const employee = await db.get('SELECT * FROM employees_directory WHERE id = ?', [id]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const names = nameVariations(employee);
    
    console.log(`Searching history for employee ${id} (${employee.full_name})`);
    
    // Now search for this employee in the travel records by exact name patterns
    const historyEntries = await db.all(
      `SELECT 
         ob.id, 
         ob.date_of_ob, 
         ob.dates_of_ob, 
         ob.date_created,
         ob.office,
         ob.division,
         ob.location_from, 
         ob.location_to, 
         ob.purpose,
         ob.departure_time,
         ob.return_time
       FROM official_business ob 
       JOIN employees e ON ob.id = e.ob_id 
       WHERE lower(e.name) IN (${names.map(() => '?').join(', ')})
       ORDER BY ob.date_created DESC`,
      names
    );
    
    // If no history entries found, return empty array
    if (!historyEntries || historyEntries.length === 0) {
      console.log(`No history found for employee ${id} (${employee.full_name}).`);
      return res.json({ 
        employee,
        history: []
      });
    }
    
    console.log(`Found ${historyEntries.length} history entries for employee ${id} (${employee.full_name})`);
    
    // Format the data to match what the history modal expects
    const formattedHistory = formatHistoryEntries(historyEntries);
    
    res.json({ 
      employee,
      history: formattedHistory || []
    });
  } catch (err) {
    console.error('Error getting employee history:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Helper function to format history entries
function formatHistoryEntries(entries) {
  return entries.map(entry => {
    // Parse dates_of_ob if it exists
    let datesOfOB = null;
    if (entry.dates_of_ob) {
      try {
        datesOfOB = JSON.parse(entry.dates_of_ob);
      } catch (e) {
        // If parsing fails, create a single-item array
        datesOfOB = entry.date_of_ob ? [entry.date_of_ob] : [];
      }
    }
    
    return {
      id: entry.id,
      date: entry.date_created,
      created_at: entry.date_created,
      formData: {
        datesOfOB: datesOfOB,
        dates_of_ob: entry.date_of_ob,
        office: entry.office || '',
        division: entry.division || '',
        location_from: entry.location_from || '',
        location_to: entry.location_to || '',
        from: entry.location_from || '',
        to: entry.location_to || '',
        purpose: entry.purpose || '',
        departure_time: entry.departure_time || '',
        return_time: entry.return_time || ''
      }
    };
  });
}

const router = express.Router();
router.get('/api/employees/:id/history', readHistory);

module.exports = { router };
