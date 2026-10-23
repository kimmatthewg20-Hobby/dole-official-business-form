const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');
const { router: adminAuthRouter, adminOnly } = require('./routes/admin-auth');
const { router: settingsRouter } = require('./routes/settings');
const { router: formsRouter } = require('./routes/forms');
const { router: entriesRouter } = require('./routes/entries');
const { router: entriesPaginatedRouter } = require('./routes/entries-paginated');
const { router: trackerRouter } = require('./routes/tracker');
const { router: printRouter } = require('./routes/print');


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logo.png'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(adminAuthRouter);
app.use(settingsRouter);
app.use(entriesRouter);
app.use(entriesPaginatedRouter);
app.use(formsRouter);
app.use(trackerRouter);
app.use(printRouter);

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

// Serve static files (must be after API routes but before catch-all routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve tracker page
app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
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

// Cleanup function to delete records older than 25 days based on date_created
async function cleanupOldRecords(daysOld = 25, dryRun = false) {
  try {
    // Calculate date X days ago (default 25)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffDateISO = cutoffDate.toISOString();

    console.log(`Starting cleanup of records older than ${daysOld} days based on date_created (before ${cutoffDateISO})...`);
    if (dryRun) {
      console.log('DRY RUN MODE: No records will be deleted');
    }

    // Get all records to check their date_created
    const allRecords = await db.all('SELECT id, date_created FROM official_business WHERE date_created IS NOT NULL AND date_created != \'\'', []);

    const recordsToDelete = [];
    const recordDetails = [];
    
    for (const record of allRecords) {
      let recordDate = null;
      
      // Use date_created as the primary reference date
      if (record.date_created) {
        try {
          recordDate = new Date(record.date_created);
        } catch (e) {
          // If parsing fails, skip this record (can't determine age)
          console.warn(`Could not parse date_created for record ${record.id}: ${record.date_created}`);
          continue;
        }
      } else {
        // No date_created, skip this record
        continue;
      }

      // Check if record is older than specified days based on date_created
      if (recordDate && !isNaN(recordDate.getTime()) && recordDate < cutoffDate) {
        recordsToDelete.push(record.id);
        recordDetails.push({
          id: record.id,
          date_created: record.date_created,
          age_days: Math.floor((new Date() - recordDate) / (1000 * 60 * 60 * 24))
        });
      }
    }

    if (recordsToDelete.length === 0) {
      console.log('No old records to delete.');
      return { deleted: 0, records: [] };
    }

    console.log(`Found ${recordsToDelete.length} record(s) to delete:`, recordDetails);

    if (dryRun) {
      console.log('DRY RUN: Would delete the above records');
      return { deleted: 0, wouldDelete: recordsToDelete.length, records: recordDetails };
    }

    // Delete old records (employees will be deleted automatically due to CASCADE)
    // Use transaction for safety
    const result = await db.transaction(async (client) => {
      let deletedCount = 0;
      for (const id of recordsToDelete) {
        const deleteResult = await client.query('DELETE FROM official_business WHERE id = $1', [id]);
        deletedCount += deleteResult.rowCount || 0;
      }
      return { changes: deletedCount };
    });

    console.log(`Cleanup completed: Deleted ${result.changes} official business record(s) and their associated employees.`);
    return { deleted: result.changes, ids: recordsToDelete, records: recordDetails };
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// Test endpoint to manually trigger cleanup (for testing) - Admin only
app.get('/api/cleanup/test', adminOnly, async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 25;
    const dryRun = req.query.dryRun === 'true';
    
    const result = await cleanupOldRecords(daysOld, dryRun);
    res.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Cleanup completed',
      result
    });
  } catch (error) {
    console.error('Cleanup test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule cleanup to run daily at 2 AM
function scheduleDailyCleanup() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0); // 2 AM

  const msUntilCleanup = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    // Run cleanup
    cleanupOldRecords().catch(err => {
      console.error('Scheduled cleanup failed:', err);
    });

    // Schedule next cleanup (24 hours later)
    setInterval(() => {
      cleanupOldRecords().catch(err => {
        console.error('Scheduled cleanup failed:', err);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilCleanup);

  console.log(`Next cleanup scheduled for: ${tomorrow.toISOString()}`);
}

// Checks load the app against a throwaway database and must not delete or schedule anything.
const SKIP_STARTUP_CLEANUP = process.env.SKIP_STARTUP_CLEANUP === 'true';

if (!SKIP_STARTUP_CLEANUP) {
  cleanupOldRecords().catch(err => {
    console.error('Initial cleanup failed:', err);
  });
  scheduleDailyCleanup();
}

// Start the server (only in local development)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export app for Vercel serverless functions
module.exports = app; 