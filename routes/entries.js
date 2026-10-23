const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all entries for database view
router.get('/api/entries', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    
    // Build query with search conditions if search is provided
    let baseCountQuery = `SELECT COUNT(*) as total FROM official_business`;
    let baseDataQuery = `SELECT o.id, o.date_created, o.office, o.division, 
            o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
            o.departure_time, o.return_time, o.purpose
     FROM official_business o`;
    
    const queryParams = [];
    
    // Add search condition if provided
    if (searchQuery) {
      baseCountQuery = `SELECT COUNT(DISTINCT o.id) as total 
                      FROM official_business o 
                      LEFT JOIN employees e ON o.id = e.ob_id
                      WHERE (e.name LIKE ? OR o.office LIKE ?)`;
      
      baseDataQuery = `SELECT DISTINCT o.id, o.date_created, o.office, o.division, 
                     o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
                     o.departure_time, o.return_time, o.purpose
                FROM official_business o 
                LEFT JOIN employees e ON o.id = e.ob_id
                WHERE (e.name LIKE ? OR o.office LIKE ?)`;
      
      const searchParam = `%${searchQuery}%`;
      queryParams.push(searchParam, searchParam);
    }
    
    // First, get the total count of entries
    const countResult = await db.get(baseCountQuery, queryParams);
    const totalEntries = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalEntries / limit);
    
    // Then get the paginated entries
    const finalQuery = baseDataQuery + 
                     (searchQuery ? '' : ' WHERE 1=1') + 
                     ` ORDER BY o.date_created DESC LIMIT ? OFFSET ?`;
    
    const formEntries = await db.all(
      finalQuery,
      [...queryParams, limit, offset]
    );
    
    // Create a map to store employee data for each form
    const entriesMap = new Map();
    formEntries.forEach(entry => {
      // Parse dates_of_ob if exists
      let datesOfOB = null;
      if (entry.dates_of_ob) {
        try {
          datesOfOB = JSON.parse(entry.dates_of_ob);
        } catch (e) {
          // If parsing fails, create a single-item array
          datesOfOB = entry.date_of_ob ? [entry.date_of_ob] : [];
        }
      }
      
      entriesMap.set(entry.id, {
        id: entry.id,
        formData: {
          name: '',
          office: entry.office || '',
          dateOfOB: entry.date_of_ob,
          datesOfOB: datesOfOB,
          dates_of_ob: entry.date_of_ob,
          division: entry.division || '',
          locationTo: entry.location_to || '',
          purpose: entry.purpose || ''
        },
        employees: []
      });
    });
    
    // Get all employees for these forms
    const formIds = Array.from(entriesMap.keys());
    if (formIds.length === 0) {
      return res.json({
        entries: [],
        pagination: {
          total: totalEntries,
          currentPage: page,
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
          
          // If this is the first employee and name is not set yet, use this employee's name
          if (!entry.formData.name && emp.name) {
            entry.formData.name = emp.name;
          }
        }
      });
    }
    
    // Convert map to array and send response
    const entries = Array.from(entriesMap.values());
    res.json({
      entries: entries,
      pagination: {
        total: totalEntries,
        currentPage: page,
        totalPages: totalPages
      }
    });
  } catch (err) {
    console.error('Error in /api/entries:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = { router };
