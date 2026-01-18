const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');

// Import the print template generator
const { generatePrintableHTML } = require('./public/print');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Admin-only middleware: protect admin routes
function adminOnly(req, res, next) {
  if (req.cookies && req.cookies.adminAuth) return next();
  res.redirect('/admin');
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Helper function to get admin password (checks database first, then env)
async function getAdminPassword() {
  try {
    const row = await db.get('SELECT admin_password FROM settings ORDER BY id DESC LIMIT 1', []);
    if (row && row.admin_password) {
      return row.admin_password;
    }
  } catch (err) {
    console.error('Error getting admin password from database:', err);
  }
  // Fall back to environment variable
  return process.env.ADMIN_PASSWORD || '*1CNPOadmin*';
}

// Admin login API - checks database first, then ADMIN_PASSWORD env (default: *1CNPOadmin*)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body || {};
    const expected = await getAdminPassword();
    
    if (password === expected) {
      res.cookie('adminAuth', '1', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: 'Incorrect password' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/admin/check', (req, res) => {
  if (req.cookies && req.cookies.adminAuth) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

// Change admin password API
app.post('/api/admin/change-password', async (req, res) => {
  console.log('Change password route hit'); // Debug log
  // Check if user is authenticated
  if (!req.cookies || !req.cookies.adminAuth) {
    console.log('Not authenticated - missing cookie');
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const { oldPassword, newPassword } = req.body || {};
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Old password and new password are required' });
  }
  
  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long' });
  }
  
  try {
    // Verify old password
    const currentPassword = await getAdminPassword();
    
    if (oldPassword !== currentPassword) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    
    // Get existing settings row
    const row = await db.get('SELECT id FROM settings ORDER BY id DESC LIMIT 1', []);
    
    if (row && row.id) {
      // Update existing settings row
      await db.run('UPDATE settings SET admin_password = $1 WHERE id = $2', [newPassword, row.id]);
      console.log('Password updated successfully for settings id:', row.id);
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      // No settings row exists, create one with just the password
      const result = await db.run('INSERT INTO settings (admin_password) VALUES ($1) RETURNING id', [newPassword]);
      console.log('Password saved successfully in new settings row, id:', result.lastID);
      res.json({ success: true, message: 'Password changed successfully' });
    }
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, error: 'Failed to update password: ' + err.message });
  }
});

// Database tables are initialized in db.js
// Tables are created automatically when the server starts

// Get default settings (only division_options)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', []);
    
    if (!settings) {
      const result = await db.run(`INSERT INTO settings (division_options) VALUES ($1) RETURNING id`, ['']);
      res.json({ division_options: '' });
    } else {
      res.json({ division_options: settings.division_options || '' });
    }
  } catch (err) {
    console.error('Error retrieving settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update settings (only division_options)
app.post('/api/settings', async (req, res) => {
  try {
    const { division_options } = req.body;
    const val = (division_options == null || division_options === undefined) ? '' : String(division_options).trim();
    
    const result = await db.run(`INSERT INTO settings (division_options) VALUES ($1) RETURNING id`, [val]);
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit form
app.post('/api/submit', async (req, res) => {
  console.log('Form submission received:', JSON.stringify(req.body, null, 2));
  
  const {
    employees,
    office,
    division,
    datesOfOB,
    dateStr,
    locationFrom,
    locationTo,
    departureTime,
    returnTime,
    purpose,
    approvedBy,
    approvedByPosition
  } = req.body;

  if (!employees || employees.length === 0) {
    console.log('Validation error: No employees provided');
    return res.status(400).json({ error: 'No employees provided' });
  }

  const dateCreated = new Date().toISOString();
  
  // Use the first date from datesOfOB for the single date field if available
  // or keep the dateOfOB for backwards compatibility
  const dateOfOB = datesOfOB && datesOfOB.length > 0 ? datesOfOB[0] : req.body.dateOfOB || '';
  console.log('Using date_of_ob:', dateOfOB);
  console.log('Using dates_of_ob:', datesOfOB);
  
  // Check if we have valid date(s)
  if (!dateOfOB && (!datesOfOB || datesOfOB.length === 0)) {
    console.log('Validation error: No date(s) provided');
    return res.status(400).json({ error: 'Please select at least one date' });
  }
  
  // Convert dates array to JSON string for storage
      let datesOfOBJson = null;
      try {
        if (datesOfOB && Array.isArray(datesOfOB) && datesOfOB.length > 0) {
          // Make sure each date is well-formed
          const sanitizedDates = datesOfOB.map(date => {
            // Ensure date is properly formatted
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return date;
            } else {
              try {
                // Try to parse and reformat the date
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                  return parsedDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
                }
              } catch (e) {}
              
              // Default to today's date if the date is invalid
              const today = new Date();
              return today.toISOString().split('T')[0];
            }
          });
          
          datesOfOBJson = JSON.stringify(sanitizedDates);
          console.log('Sanitized and serialized dates_of_ob:', datesOfOBJson);
        } else {
          console.log('No dates to serialize');
        }
      } catch (error) {
        console.error('Error serializing dates:', error);
        return res.status(500).json({ error: 'Error processing dates: ' + error.message });
      }
      
      try {
        // Use transaction
        await db.transaction(async (client) => {
        // Insert official business entry
        const obResult = await client.query(
          `INSERT INTO official_business (
            date_created, office, division, date_of_ob, dates_of_ob,
            location_from, location_to, departure_time, return_time, purpose,
            approved_by, approved_by_position, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
          [
            dateCreated, office || '', division || '', dateOfOB, datesOfOBJson,
            locationFrom || '', locationTo, departureTime, returnTime, purpose,
            approvedBy || '', approvedByPosition || '', new Date().toISOString()
          ]
        );
        
        const obId = obResult.rows[0].id;
        
        // Insert employees
        for (const emp of employees) {
          await client.query(
            'INSERT INTO employees (ob_id, name, position) VALUES ($1, $2, $3)',
            [obId, emp.name, emp.position]
          );
        }
        
        console.log('Form submitted successfully with id:', obId);
        res.json({ success: true, id: obId });
      });
      } catch (error) {
        console.error('Database error during form submission:', error);
        res.status(500).json({ error: 'Database error: ' + error.message });
      }
});

// Retrieve form data by ID
app.get('/api/retrieve/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const formData = await db.get(
      `SELECT * FROM official_business WHERE id = $1`,
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
      'SELECT name, position FROM employees WHERE ob_id = $1',
      [formData.id]
    );
    
    res.json({ formData, employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all entries for database view
app.get('/api/entries', async (req, res) => {
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
    let paramIndex = 1;
    
    // Add search condition if provided
    if (searchQuery) {
      baseCountQuery = `SELECT COUNT(DISTINCT o.id) as total 
                      FROM official_business o 
                      LEFT JOIN employees e ON o.id = e.ob_id
                      WHERE (e.name LIKE $${paramIndex} OR o.office LIKE $${paramIndex + 1})`;
      
      baseDataQuery = `SELECT DISTINCT o.id, o.date_created, o.office, o.division, 
                     o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
                     o.departure_time, o.return_time, o.purpose
                FROM official_business o 
                LEFT JOIN employees e ON o.id = e.ob_id
                WHERE (e.name LIKE $${paramIndex} OR o.office LIKE $${paramIndex + 1})`;
      
      const searchParam = `%${searchQuery}%`;
      queryParams.push(searchParam, searchParam);
      paramIndex += 2;
    }
    
    // First, get the total count of entries
    const countResult = await db.get(baseCountQuery, queryParams);
    const totalEntries = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalEntries / limit);
    
    // Then get the paginated entries
    const finalQuery = baseDataQuery + 
                     (searchQuery ? '' : ' WHERE 1=1') + 
                     ` ORDER BY o.date_created DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
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
    
    const placeholders = formIds.map((_, i) => `$${i + 1}`).join(',');
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

// Get paginated entries for database view
app.get('/api/entries/paginated', async (req, res) => {
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
       LIMIT $1 OFFSET $2`,
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
    
    const placeholders = formIds.map((_, i) => `$${i + 1}`).join(',');
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

// Delete an entry by id
app.delete('/api/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.get(`SELECT id FROM official_business WHERE id = $1`, [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const obId = row.id;
    
    // Use transaction to delete the entry and its associated employees
    await db.transaction(async (client) => {
      // Delete associated employees first (CASCADE should handle this, but being explicit)
      await client.query('DELETE FROM employees WHERE ob_id = $1', [obId]);
      
      // Then delete the main entry
      await client.query('DELETE FROM official_business WHERE id = $1', [obId]);
    });
    
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all data
app.delete('/api/delete-all', async (req, res) => {
  try {
    // Use transaction to delete all entries
    await db.transaction(async (client) => {
      // Delete all employees
      await client.query('DELETE FROM employees');
      
      // Delete all official business entries
      await client.query('DELETE FROM official_business');
      
      // Note: PostgreSQL uses SEQUENCE for auto-increment, but we don't need to reset it
      // The sequence will continue from where it left off, which is fine
    });
    
    res.json({ success: true, message: 'All data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an entry by ID
app.put('/api/update/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { formData, employees } = req.body;
    
    if (!employees || employees.length === 0) {
      return res.status(400).json({ error: 'No employees provided' });
    }
    
    const row = await db.get(`SELECT id FROM official_business WHERE id = $1`, [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const obId = row.id;
    
    // Process the dates data
    let dateOfOB = formData.date_of_ob;
    let datesOfOBJson = null;
    
    if (formData.datesOfOB && Array.isArray(formData.datesOfOB)) {
      datesOfOBJson = JSON.stringify(formData.datesOfOB);
      // Use the first date for the single date field if available
      dateOfOB = formData.datesOfOB.length > 0 ? formData.datesOfOB[0] : dateOfOB;
    }
    
    // Use transaction
    await db.transaction(async (client) => {
      // Update form data
      await client.query(
        `UPDATE official_business SET 
          office = $1,
          division = $2, 
          date_of_ob = $3,
          dates_of_ob = $4,
          location_from = $5,
          location_to = $6, 
          purpose = $7,
          approved_by = $8,
          approved_by_position = $9
        WHERE id = $10`,
        [
          formData.office || formData.division,
          formData.division,
          dateOfOB,
          datesOfOBJson,
          formData.location_from || '',
          formData.location_to,
          formData.purpose,
          formData.approved_by || '',
          formData.approved_by_position || '',
          obId
        ]
      );
      
      // Delete existing employees
      await client.query('DELETE FROM employees WHERE ob_id = $1', [obId]);
      
      // Insert new employees
      for (const emp of employees) {
        await client.query(
          'INSERT INTO employees (ob_id, name, position) VALUES ($1, $2, $3)',
          [obId, emp.name, emp.position]
        );
      }
    });
    
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Print route - generates and serves the printable HTML
app.get('/print/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    console.log(`Generating print form for id: ${id}`);
    
    const formData = await db.get(`SELECT * FROM official_business WHERE id = $1`, [id]);
    
    if (!formData) {
      console.error('Form not found for id:', id);
      return res.status(404).send('Form not found');
    }
    
    // Parse the dates_of_ob field if it exists
    if (formData.dates_of_ob) {
      try {
        formData.datesOfOB = JSON.parse(formData.dates_of_ob);
        console.log('Parsed dates for print:', formData.datesOfOB);
        
        // Validate the parsed dates
        if (!Array.isArray(formData.datesOfOB)) {
          console.error('Parsed dates are not an array, fixing:', formData.datesOfOB);
          formData.datesOfOB = [formData.date_of_ob];
        }
      } catch (e) {
        console.error('Error parsing dates in print route:', e);
        // If parsing fails, create a single-item array with the date_of_ob value
        formData.datesOfOB = [formData.date_of_ob];
      }
    } else if (formData.date_of_ob) {
      // If no dates_of_ob exists but there's a single date, use that
      formData.datesOfOB = [formData.date_of_ob];
      console.log('Using single date for print:', formData.datesOfOB);
    } else {
      // If no dates at all, use today's date
      const today = new Date().toISOString().split('T')[0];
      formData.datesOfOB = [today];
      formData.date_of_ob = today;
      console.log('No dates found, using today:', today);
    }
    
    // Get associated employees
    let employees = await db.all('SELECT name, position FROM employees WHERE ob_id = $1', [formData.id]);
    
    // Ensure employees is always an array
    employees = employees || [];
    
    // If no employees found, create a dummy entry
    if (employees.length === 0) {
      console.warn('No employees found for form, adding placeholder');
      employees.push({
        name: 'Employee Name Not Found',
        position: 'Position Not Found'
      });
    }
    
    // Get settings
    const settings = await db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', []) || {};
    
    // Look up employee information from directory
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        // PostgreSQL uses || for string concatenation
        const employee_info = await db.get(
          `SELECT * FROM employees_directory WHERE full_name LIKE $1 OR firstname || ' ' || last_name LIKE $2`,
          [`%${emp.name}%`, `%${emp.name}%`]
        );
        
        if (employee_info) {
          employees[i].directory_info = employee_info;
        }
      } catch (err) {
        console.error(`Error looking up employee ${emp.name} in directory:`, err);
      }
    }
    
    // Generate the printable HTML
    const htmlContent = generatePrintableHTML({
      formData,
      employees,
      settings
    });
    
    // Send the HTML response
    res.send(htmlContent);
  } catch (error) {
    console.error('Error in print route:', error);
    res.status(500).send('Error generating form: ' + error.message);
  }
});

// Serve static files (must be after API routes but before catch-all routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Export all data as JSON
app.get('/api/export-data', async (req, res) => {
  try {
    console.log('Exporting all data as JSON...');
    
    // Get all official business entries
    const formEntries = await db.all('SELECT * FROM official_business', []);
    
    // Get all employees
    const employees = await db.all('SELECT * FROM employees', []);
    
    // Get settings
    const settings = await db.all('SELECT * FROM settings', []);
    
    // Prepare the export data
    const exportData = {
      official_business: formEntries,
      employees: employees,
      settings: settings,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=ob-data-export.json');
    
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import data from JSON
app.post('/api/import-data', async (req, res) => {
  try {
    const importData = req.body;
    
    if (!importData || !importData.official_business || !importData.employees) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }
    
    console.log(`Importing data: ${importData.official_business.length} forms, ${importData.employees.length} employees`);
    
    await db.transaction(async (client) => {
      // Clear existing data
      await client.query('DELETE FROM employees');
      await client.query('DELETE FROM official_business');
      await client.query('DELETE FROM settings');
      
      // Insert official_business entries
      for (const entry of importData.official_business) {
        await client.query(
          `INSERT INTO official_business (
            id, date_created, office, division, date_of_ob, dates_of_ob,
            location_from, location_to, departure_time, return_time, purpose,
            approved_by, approved_by_position
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            entry.id,
            entry.date_created,
            entry.office,
            entry.division,
            entry.date_of_ob,
            entry.dates_of_ob,
            entry.location_from,
            entry.location_to,
            entry.departure_time,
            entry.return_time,
            entry.purpose,
            entry.approved_by,
            entry.approved_by_position
          ]
        );
      }
      
      // Insert employees
      for (const emp of importData.employees) {
        await client.query(
          `INSERT INTO employees (id, ob_id, name, position)
          VALUES ($1, $2, $3, $4)`,
          [emp.id, emp.ob_id, emp.name, emp.position]
        );
      }
      
      // Insert settings
      if (importData.settings && importData.settings.length > 0) {
        for (const setting of importData.settings) {
          await client.query(
            `INSERT INTO settings (id, office, office_head, office_head_position, location_from, division_options)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              setting.id,
              setting.office,
              setting.office_head,
              setting.office_head_position,
              setting.location_from,
              setting.division_options
            ]
          );
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Data imported successfully',
      forms: importData.official_business.length,
      employees: importData.employees.length,
      settings: importData.settings ? importData.settings.length : 0
    });
  } catch (error) {
    console.error('Error during import:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific entry by ID
app.get('/api/entries/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const formData = await db.get(
      `SELECT o.id, o.date_created, o.office, o.division, 
             o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
             o.departure_time, o.return_time, o.purpose, o.approved_by, o.approved_by_position
       FROM official_business o 
       WHERE o.id = $1`,
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
      'SELECT name, position FROM employees WHERE ob_id = $1',
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

// Get all employees in directory
app.get('/api/employees', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    
    let query = 'SELECT * FROM employees_directory';
    let params = [];
    
    if (searchQuery) {
      query += ' WHERE full_name LIKE $1 OR position LIKE $2 OR assigned_unit LIKE $3';
      params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    }
    
    query += ' ORDER BY full_name';
    
    const employees = await db.all(query, params);
    res.json({ employees });
  } catch (err) {
    console.error('Error getting employees:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await db.get('SELECT * FROM employees_directory WHERE id = $1', [id]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ employee });
  } catch (err) {
    console.error('Error getting employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add employee to directory
app.post('/api/employees', async (req, res) => {
  try {
    const { employee_id, firstname, middle_name, last_name, position, assigned_unit } = req.body;
    
    if (!firstname || !last_name || !position || !assigned_unit) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    
    // Create full_name with middle initial
    const middleInitial = middle_name ? middle_name.charAt(0) + '.' : '';
    const full_name = `${firstname} ${middleInitial} ${last_name}`.replace(/\s+/g, ' ').trim();
    
    const result = await db.run(
      'INSERT INTO employees_directory (employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit]
    );
    
    res.json({ 
      success: true, 
      id: result.lastID,
      message: 'Employee added successfully' 
    });
  } catch (err) {
    console.error('Error adding employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update employee in directory
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, firstname, middle_name, last_name, position, assigned_unit } = req.body;
    
    if (!firstname || !last_name || !position || !assigned_unit) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    
    // Create full_name with middle initial
    const middleInitial = middle_name ? middle_name.charAt(0) + '.' : '';
    const full_name = `${firstname} ${middleInitial} ${last_name}`.replace(/\s+/g, ' ').trim();
    
    const result = await db.run(
      'UPDATE employees_directory SET employee_id = $1, firstname = $2, middle_name = $3, last_name = $4, full_name = $5, position = $6, assigned_unit = $7 WHERE id = $8',
      [employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Employee updated successfully' 
    });
  } catch (err) {
    console.error('Error updating employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete employee from directory
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.run('DELETE FROM employees_directory WHERE id = $1', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Employee deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get employee travel history
app.get('/api/employees/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the employee details
    const employee = await db.get('SELECT * FROM employees_directory WHERE id = $1', [id]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Create different name variations for better matching
    const fullName = employee.full_name;
    const firstLastName = `${employee.firstname} ${employee.last_name}`;
    const lastFirstName = `${employee.last_name}, ${employee.firstname}`;
    
    console.log(`Searching history for employee ${id} (${fullName})`);
    
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
       WHERE 
         e.name = $1 OR 
         e.name = $2 OR 
         e.name = $3
       ORDER BY ob.date_created DESC`,
      [fullName, firstLastName, lastFirstName]
    );
    
    // If no history entries found, return empty array
    if (!historyEntries || historyEntries.length === 0) {
      console.log(`No history found for employee ${id} (${fullName}).`);
      return res.json({ 
        employee,
        history: []
      });
    }
    
    console.log(`Found ${historyEntries.length} history entries for employee ${id} (${fullName})`);
    
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
});

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

// Insert initial employees data
app.post('/api/employees/initialize', async (req, res) => {
  try {
    // Initial employees data from the provided table
    const initialEmployees = [
      { employee_id: '4780', firstname: 'CHERRY', middle_name: 'BAJAMUNDI', last_name: 'MOSATALLA', position: 'CHIEF', assigned_unit: 'PROVINCIAL HEAD' },
      { employee_id: '4728', firstname: 'RENALYN', middle_name: 'ENRIQUEZ', last_name: 'ALANO', position: 'SENIOR LABOR AND EMPLOYMENT OFFICER', assigned_unit: 'LR/LS' },
      { employee_id: '4745', firstname: 'LORA JOY', middle_name: 'LUNA', last_name: 'BOONGALING', position: 'LABOR AND EMPLOYMENT OFFICER III', assigned_unit: 'EMPLOYMENT' },
      { employee_id: '4766', firstname: 'RICKY', middle_name: 'AZUELA', last_name: 'HERNANDEZ', position: 'LABOR AND EMPLOYMENT OFFICER III', assigned_unit: 'LIVELIHOOD' },
      { employee_id: '15974', firstname: 'CARL CEDRIC', middle_name: 'PAJARIN', last_name: 'ALBUÑAN', position: 'LABOR AND EMPLOYMENT OFFICER II', assigned_unit: 'TUPAD' },
      { employee_id: '14280', firstname: 'ROBERT', middle_name: 'MATALOTE', last_name: 'MAGANA', position: 'ASSISTANT LABOR INSPECTOR', assigned_unit: 'LR/LS' },
      { employee_id: '1302001', firstname: 'MARIA THERESA', middle_name: 'SALEN', last_name: 'RITO', position: 'COMMUNITY FACILITATOR', assigned_unit: 'LIVELIHOOD (CLPEP)' },
      { employee_id: '1301003', firstname: 'LEONNY', middle_name: 'GUINTO', last_name: 'ROMERO', position: 'LIVELIHOOD DEVELOPMENT SPECIALIST', assigned_unit: 'LIVELIHOOD (DILP)' },
      { employee_id: '1305001', firstname: 'JEORSHWIN IVANE', middle_name: 'SALAYON', last_name: 'JO', position: 'JOB ORDER', assigned_unit: 'LIVELIHOOD (DILP)' },
      { employee_id: '1305002', firstname: 'EDMUNDO', middle_name: 'RADA', last_name: 'NIEVA', position: 'JOB ORDER-DRIVER', assigned_unit: 'ASSU' },
      { employee_id: '1303001', firstname: 'AMANDA', middle_name: 'SORIA', last_name: 'ALBAÑO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303002', firstname: 'DANICA', middle_name: 'ROMERO', last_name: 'BAÑAGA', position: 'PROGRAM COORDINATOR', assigned_unit: 'LR/LS' },
      { employee_id: '1303012', firstname: 'RICO', middle_name: 'QUIZON', last_name: 'BERJA', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303005', firstname: 'KIM MATTHEW', middle_name: 'SOLANA', last_name: 'GUTIERREZ', position: 'PROGRAM COORDINATOR', assigned_unit: 'LIVELIHOOD (CLPEP)' },
      { employee_id: '1303004', firstname: 'DARLENE', middle_name: 'BALON', last_name: 'IBIAS', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303006', firstname: 'ROWENA', middle_name: 'RIGODON', last_name: 'LABRADOR', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303014', firstname: 'SHYBERLYN', middle_name: 'MONTUYA', last_name: 'LARGO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303007', firstname: 'RHODORA', middle_name: 'FERMO', last_name: 'LEVANTINO', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303009', firstname: 'EMMA', middle_name: 'RAMOREZ', last_name: 'RIVERA', position: 'PROGRAM COORDINATOR', assigned_unit: 'TUPAD' },
      { employee_id: '1303010', firstname: 'REBECCA', middle_name: 'PALACIO', last_name: 'VILLAGEN', position: 'PROGRAM COORDINATOR', assigned_unit: 'EMPLOYMENT' },
      { employee_id: '1503001', firstname: 'ARVIN', middle_name: 'NERI', last_name: 'MABEZA', position: 'PG-JOB ORDER', assigned_unit: 'LR/LS' },
      { employee_id: '1503002', firstname: 'HANNAH CARLOTA', middle_name: 'OJEDA', last_name: 'SEVA', position: 'PG-JOB ORDER', assigned_unit: 'EMPLOYMENT' },
      { employee_id: '1503003', firstname: 'JEFFREY', middle_name: 'FRANCISCO', last_name: 'VALLES', position: 'PG-JOB ORDER', assigned_unit: 'LIVELIHOOD (DILP)' },
      { employee_id: '1503004', firstname: 'JOE MARIE', middle_name: '', last_name: 'SALAMANCA', position: 'PG-JOB ORDER', assigned_unit: 'ASSU' },
    ];
    
    await db.transaction(async (client) => {
      // Clear existing employees directory data first
      await client.query('DELETE FROM employees_directory');
      
      // Insert each employee
      for (const emp of initialEmployees) {
        // Create full_name with middle initial
        const middleInitial = emp.middle_name ? emp.middle_name.charAt(0) + '.' : '';
        const full_name = `${emp.firstname} ${middleInitial} ${emp.last_name}`.replace(/\s+/g, ' ').trim();
        
        await client.query(
          'INSERT INTO employees_directory (employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [emp.employee_id, emp.firstname, emp.middle_name, emp.last_name, full_name, emp.position, emp.assigned_unit]
        );
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Employees initialized successfully',
      count: initialEmployees.length
    });
  } catch (err) {
    console.error('Error initializing employees:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start the server (only in local development)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export app for Vercel serverless functions
module.exports = app; 