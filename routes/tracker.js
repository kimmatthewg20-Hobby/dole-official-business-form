const express = require('express');
const db = require('../db');
const { formatTrackerEntry } = require('./tracker-format');

const router = express.Router();

router.get('/api/tracker', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15; // Always 15 per page
    const offset = (page - 1) * limit;
    
    // Calculate date 10 days ago (ISO format for comparison)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0); // Start of day
    const tenDaysAgoISO = tenDaysAgo.toISOString();
    
    // Get total count (only entries from last 10 days)
    // Both date_created and timestamp are stored as ISO strings, so string comparison works
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM official_business 
       WHERE (COALESCE(date_created, '') >= ? OR COALESCE(timestamp, '') >= ?)`,
      [tenDaysAgoISO, tenDaysAgoISO]
    );
    const totalEntries = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalEntries / limit);
    
    // Get paginated entries with employees (only from last 10 days)
    const formEntries = await db.all(
      `SELECT o.id, o.date_created, o.date_of_ob, o.dates_of_ob, 
              o.location_from, o.location_to, o.departure_time, 
              o.return_time, o.purpose, o.timestamp
       FROM official_business o 
       WHERE (COALESCE(o.date_created, '') >= ? OR COALESCE(o.timestamp, '') >= ?)
       ORDER BY o.date_created DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      [tenDaysAgoISO, tenDaysAgoISO, limit, offset]
    );
    
    // Get all employees for these forms in one query
    const formIds = formEntries.map(e => e.id);
    let allEmployees = [];
    if (formIds.length > 0) {
      const placeholders = formIds.map(() => '?').join(', ');
      allEmployees = await db.all(
        `SELECT ob_id, name FROM employees WHERE ob_id IN (${placeholders}) ORDER BY ob_id, name`,
        formIds
      );
    }
    
    // Group employees by ob_id
    const employeesByFormId = {};
    allEmployees.forEach(emp => {
      if (!employeesByFormId[emp.ob_id]) {
        employeesByFormId[emp.ob_id] = [];
      }
      employeesByFormId[emp.ob_id].push(emp);
    });
    
    // Format entries with employees
    const entriesWithEmployees = await Promise.all(
      formEntries.map(async (entry) => {
        const employees = employeesByFormId[entry.id] || [];
        return await formatTrackerEntry(entry, employees);
      })
    );
    
    res.json({
      entries: entriesWithEmployees,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalEntries: totalEntries,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching tracker data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all tracker data for search (single query, more efficient)
router.get('/api/tracker/all', async (req, res) => {
  try {
    // Calculate date 10 days ago (ISO format for comparison)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0);
    const tenDaysAgoISO = tenDaysAgo.toISOString();
    
    // Get all entries from last 10 days in one query
    const formEntries = await db.all(
      `SELECT o.id, o.date_created, o.date_of_ob, o.dates_of_ob, 
              o.location_from, o.location_to, o.departure_time, 
              o.return_time, o.purpose, o.timestamp
       FROM official_business o 
       WHERE (COALESCE(o.date_created, '') >= ? OR COALESCE(o.timestamp, '') >= ?)
       ORDER BY o.date_created DESC, o.id DESC`,
      [tenDaysAgoISO, tenDaysAgoISO]
    );
    
    if (formEntries.length === 0) {
      return res.json({ entries: [] });
    }
    
    // Get all employees for all forms in one query
    const formIds = formEntries.map(e => e.id);
    const placeholders = formIds.map(() => '?').join(', ');
    const allEmployees = await db.all(
      `SELECT ob_id, name FROM employees WHERE ob_id IN (${placeholders}) ORDER BY ob_id, name`,
      formIds
    );
    
    // Group employees by ob_id
    const employeesByFormId = {};
    allEmployees.forEach(emp => {
      if (!employeesByFormId[emp.ob_id]) {
        employeesByFormId[emp.ob_id] = [];
      }
      employeesByFormId[emp.ob_id].push(emp);
    });
    
    // Format entries with employees
    const entriesWithEmployees = await Promise.all(
      formEntries.map(async (entry) => {
        const employees = employeesByFormId[entry.id] || [];
        return await formatTrackerEntry(entry, employees);
      })
    );
    
    res.json({ entries: entriesWithEmployees });
  } catch (err) {
    console.error('Error fetching all tracker data:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
