const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Import the print template generator
const { generatePrintableHTML } = require('./public/print');

const app = express();
const port = process.env.PORT || 3000;

// Database path - ensure the directory exists
const dbPath = process.env.DATABASE_PATH || './database.db';
const dbDir = path.dirname(dbPath);

// Make sure the database directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Warning for Render deployment
if (process.env.RENDER) {
  console.log('WARNING: Running on Render free tier. Database will be reset on service rebuild.');
  console.log('Consider implementing data export/import functionality or using a managed database.');
}

// Create database and tables if they don't exist
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to the SQLite database at ${dbPath}`);
    
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS official_business (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      travel_id TEXT UNIQUE,
      date_created TEXT,
      office TEXT,
      division TEXT,
      date_of_ob TEXT,
      dates_of_ob TEXT,
      location_from TEXT,
      location_to TEXT,
      departure_time TEXT,
      return_time TEXT,
      purpose TEXT,
      approved_by TEXT,
      approved_by_position TEXT
    )`);
    
    // Check if dates_of_ob column exists, if not add it
    db.all(`PRAGMA table_info(official_business)`, (err, rows) => {
      if (err) {
        console.error('Error checking table schema:', err.message);
      } else {
        // Check if columns exist in the result
        const hasDateColumn = rows.some(row => row.name === 'dates_of_ob');
        const hasApprovedByColumn = rows.some(row => row.name === 'approved_by');
        const hasApprovedByPositionColumn = rows.some(row => row.name === 'approved_by_position');
        
        // Add dates_of_ob column if it doesn't exist
        if (!hasDateColumn) {
          console.log('Adding dates_of_ob column to official_business table...');
          db.run(`ALTER TABLE official_business ADD COLUMN dates_of_ob TEXT`, (err) => {
            if (err) {
              console.error('Error adding dates_of_ob column:', err.message);
            } else {
              console.log('Added dates_of_ob column successfully');
            }
          });
        }
        
        // Add approved_by column if it doesn't exist
        if (!hasApprovedByColumn) {
          console.log('Adding approved_by column to official_business table...');
          db.run(`ALTER TABLE official_business ADD COLUMN approved_by TEXT`, (err) => {
            if (err) {
              console.error('Error adding approved_by column:', err.message);
            } else {
              console.log('Added approved_by column successfully');
            }
          });
        }
        
        // Add approved_by_position column if it doesn't exist
        if (!hasApprovedByPositionColumn) {
          console.log('Adding approved_by_position column to official_business table...');
          db.run(`ALTER TABLE official_business ADD COLUMN approved_by_position TEXT`, (err) => {
            if (err) {
              console.error('Error adding approved_by_position column:', err.message);
            } else {
              console.log('Added approved_by_position column successfully');
            }
          });
        }
      }
    });
    
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ob_id INTEGER,
      name TEXT,
      position TEXT,
      FOREIGN KEY (ob_id) REFERENCES official_business(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office TEXT DEFAULT 'CNPO',
      office_head TEXT DEFAULT 'CHERRY B. MOSATALLA',
      office_head_position TEXT DEFAULT 'Provincial Head',
      location_from TEXT DEFAULT 'Official Station',
      division_options TEXT DEFAULT 'EMPLOYMENT,LR/LS,ASSU,DILP,TUPAD'
    )`, function(err) {
      if (err) {
        console.error('Error creating settings table:', err.message);
      } else if (this.changes === 0) {
        // Insert default settings if none exist
        db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
          if (err) {
            console.error('Error checking settings count:', err.message);
          } else if (row.count === 0) {
            db.run(`INSERT INTO settings (office, office_head, office_head_position, location_from, division_options) 
                   VALUES ('CNPO', 'CHERRY B. MOSATALLA', 'Provincial Head', 'Official Station', 'EMPLOYMENT,LR/LS,ASSU,DILP,TUPAD')`);
          }
        });
      }
    });
  }
});

// Get default settings
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// Update settings
app.post('/api/settings', (req, res) => {
  const { office, office_head, office_head_position, location_from, division_options } = req.body;
  
  db.run(
    `INSERT INTO settings (office, office_head, office_head_position, location_from, division_options) 
     VALUES (?, ?, ?, ?, ?)`,
    [office, office_head, office_head_position, location_from, division_options],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Submit form
app.post('/api/submit', (req, res) => {
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
  
  // Generate Travel ID (CNPO-<Name Initials>-MM-000#)
  const firstEmployee = employees[0];
  const nameInitials = firstEmployee.name.split(' ')
    .map(part => part.charAt(0))
    .join('');
  
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // Find the next sequence number for this month
  db.get(
    `SELECT COUNT(*) as count FROM official_business 
     WHERE travel_id LIKE ?`,
    [`%${currentMonth}-%`],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Generate a more unique ID by adding a timestamp suffix
      const timestamp = Date.now().toString().slice(-4);
      const sequenceNum = (row.count + 1).toString().padStart(4, '0');
      const travelId = `CNPO-${nameInitials}-${currentMonth}-${sequenceNum}-${timestamp}`;
      
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
      
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          `INSERT INTO official_business (
            travel_id, date_created, office, division, date_of_ob, dates_of_ob,
            location_from, location_to, departure_time, return_time, purpose,
            approved_by, approved_by_position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            travelId, dateCreated, office, division, dateOfOB, datesOfOBJson,
            locationFrom, locationTo, departureTime, returnTime, purpose,
            approvedBy, approvedByPosition
          ],
          function(err) {
            if (err) {
              console.error('Database error during form submission:', err.message);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            const obId = this.lastID;
            let completed = 0;
            let errors = [];
            
            // Insert employees
            employees.forEach(emp => {
              db.run(
                'INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)',
                [obId, emp.name, emp.position],
                (err) => {
                  if (err) {
                    errors.push(err.message);
                  }
                  
                  completed++;
                  if (completed === employees.length) {
                    if (errors.length > 0) {
                      console.error('Database errors during employee insert:', errors);
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Database error while adding employees: ' + errors.join(', ') });
                    } else {
                      db.run('COMMIT');
                      console.log('Form submitted successfully with travel ID:', travelId);
                      res.json({ success: true, travelId });
                    }
                  }
                }
              );
            });
          }
        );
      });
    }
  );
});

// Retrieve form data by travel ID
app.get('/api/retrieve/:travelId', (req, res) => {
  const { travelId } = req.params;
  
  db.get(
    `SELECT * FROM official_business WHERE travel_id = ?`,
    [travelId],
    (err, formData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
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
      db.all(
        'SELECT name, position FROM employees WHERE ob_id = ?',
        [formData.id],
        (err, employees) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ formData, employees });
        }
      );
    }
  );
});

// Get all entries for database view
app.get('/api/entries', (req, res) => {
  db.all(
    `SELECT o.id, o.travel_id, o.date_created, o.office, o.division, 
            o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
            o.departure_time, o.return_time, o.purpose 
     FROM official_business o 
     ORDER BY o.date_created DESC`,
    [],
    (err, formEntries) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
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
            datesOfOB = [entry.date_of_ob];
          }
        }
        
        entriesMap.set(entry.id, {
          travelId: entry.travel_id,
          formData: {
            dateOfOB: entry.date_of_ob,
            datesOfOB: datesOfOB,
            division: entry.division,
            locationTo: entry.location_to,
            purpose: entry.purpose
          },
          employees: []
        });
      });
      
      // Get all employees for these forms
      const formIds = Array.from(entriesMap.keys());
      if (formIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = formIds.map(() => '?').join(',');
      db.all(
        `SELECT ob_id, name, position 
         FROM employees 
         WHERE ob_id IN (${placeholders})`,
        formIds,
        (err, employees) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Add employees to their respective forms
          employees.forEach(emp => {
            const entry = entriesMap.get(emp.ob_id);
            if (entry) {
              entry.employees.push({
                name: emp.name,
                position: emp.position
              });
            }
          });
          
          // Convert map to array and send response
          const result = Array.from(entriesMap.values());
          res.json(result);
        }
      );
    }
  );
});

// Get paginated entries for database view
app.get('/api/entries/paginated', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // First, get the total count of entries
  db.get(
    `SELECT COUNT(*) as total FROM official_business`,
    [],
    (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const totalEntries = countResult.total;
      const totalPages = Math.ceil(totalEntries / limit);
      
      // Then get the paginated entries
      db.all(
        `SELECT o.id, o.travel_id, o.date_created, o.office, o.division, 
                o.date_of_ob, o.dates_of_ob, o.location_from, o.location_to, 
                o.departure_time, o.return_time, o.purpose 
         FROM official_business o 
         ORDER BY o.date_created DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, formEntries) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
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
                datesOfOB = [entry.date_of_ob];
              }
            }
            
            entriesMap.set(entry.id, {
              travelId: entry.travel_id,
              formData: {
                dateOfOB: entry.date_of_ob,
                datesOfOB: datesOfOB,
                division: entry.division,
                locationTo: entry.location_to,
                purpose: entry.purpose
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
                page: page,
                limit: limit,
                totalPages: totalPages
              }
            });
          }
          
          const placeholders = formIds.map(() => '?').join(',');
          db.all(
            `SELECT ob_id, name, position 
             FROM employees 
             WHERE ob_id IN (${placeholders})`,
            formIds,
            (err, employees) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              // Add employees to their respective forms
              employees.forEach(emp => {
                const entry = entriesMap.get(emp.ob_id);
                if (entry) {
                  entry.employees.push({
                    name: emp.name,
                    position: emp.position
                  });
                }
              });
              
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
            }
          );
        }
      );
    }
  );
});

// Delete an entry by travel ID
app.delete('/api/delete/:travelId', (req, res) => {
  const { travelId } = req.params;
  
  // Find the entry first to get its ID
  db.get(
    `SELECT id FROM official_business WHERE travel_id = ?`,
    [travelId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      
      const obId = row.id;
      
      // Begin transaction to delete the entry and its associated employees
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete associated employees first
        db.run(
          'DELETE FROM employees WHERE ob_id = ?',
          [obId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Then delete the main entry
            db.run(
              'DELETE FROM official_business WHERE id = ?',
              [obId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                db.run('COMMIT');
                res.json({ success: true, message: 'Entry deleted successfully' });
              }
            );
          }
        );
      });
    }
  );
});

// Delete all data
app.delete('/api/delete-all', (req, res) => {
  // Begin transaction to delete all entries
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Delete all employees
    db.run('DELETE FROM employees', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      
      // Delete all official business entries
      db.run('DELETE FROM official_business', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        // Reset the auto-increment counters
        db.run('DELETE FROM sqlite_sequence WHERE name="employees" OR name="official_business"', (err) => {
          if (err) {
            console.error('Error resetting auto-increment counters:', err);
            // Continue with commit even if this fails
          }
          
          db.run('COMMIT');
          res.json({ success: true, message: 'All data deleted successfully' });
        });
      });
    });
  });
});

// Update an entry by travel ID
app.put('/api/update/:travelId', (req, res) => {
  const { travelId } = req.params;
  const { formData, employees } = req.body;
  
  if (!employees || employees.length === 0) {
    return res.status(400).json({ error: 'No employees provided' });
  }
  
  // Find the entry first to get its ID
  db.get(
    `SELECT id FROM official_business WHERE travel_id = ?`,
    [travelId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
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
      
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Update form data
        db.run(
          `UPDATE official_business SET 
            division = ?, 
            date_of_ob = ?,
            dates_of_ob = ?,
            location_to = ?, 
            purpose = ?,
            approved_by = ?,
            approved_by_position = ?
          WHERE id = ?`,
          [
            formData.division,
            dateOfOB,
            datesOfOBJson,
            formData.location_to,
            formData.purpose,
            formData.approved_by,
            formData.approved_by_position,
            obId
          ],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Delete existing employees
            db.run(
              'DELETE FROM employees WHERE ob_id = ?',
              [obId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                // Insert new employees
                let completed = 0;
                
                employees.forEach(emp => {
                  db.run(
                    'INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)',
                    [obId, emp.name, emp.position],
                    (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                      }
                      
                      completed++;
                      if (completed === employees.length) {
                        db.run('COMMIT');
                        res.json({ success: true, travelId });
                      }
                    }
                  );
                });
              }
            );
          }
        );
      });
    }
  );
});

// Print route - generates and serves the printable HTML
app.get('/print/:travelId', (req, res) => {
  const { travelId } = req.params;
  
  console.log(`Generating print form for travel ID: ${travelId}`);
  
  // Get the form data
  db.get(
    `SELECT * FROM official_business WHERE travel_id = ?`,
    [travelId],
    (err, formData) => {
      if (err) {
        console.error('Error retrieving form data:', err);
        return res.status(500).send('Error retrieving form data');
      }
      
      if (!formData) {
        console.error('Form not found for travel ID:', travelId);
        return res.status(404).send('Form not found');
      }
      
      // Ensure formData has all required properties
      formData = formData || {};
      
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
      db.all(
        'SELECT name, position FROM employees WHERE ob_id = ?',
        [formData.id],
        (err, employees) => {
          if (err) {
            console.error('Error retrieving employee data:', err);
            return res.status(500).send('Error retrieving employee data');
          }
          
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
          db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', (err, settings) => {
            if (err) {
              console.error('Error retrieving settings:', err);
              return res.status(500).send('Error retrieving settings');
            }
            
            // Ensure settings exists
            settings = settings || {};
            
            try {
              // Generate the printable HTML
              const htmlContent = generatePrintableHTML({
                formData,
                employees,
                settings
              });
              
              // Send the HTML response
              res.send(htmlContent);
            } catch (error) {
              console.error('Error generating HTML:', error);
              res.status(500).send('Error generating form: ' + error.message);
            }
          });
        }
      );
    }
  );
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Export all data as JSON
app.get('/api/export-data', (req, res) => {
  console.log('Exporting all data as JSON...');
  
  // Get all official business entries
  db.all('SELECT * FROM official_business', [], (err, formEntries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get all employees
    db.all('SELECT * FROM employees', [], (err, employees) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get settings
      db.all('SELECT * FROM settings', [], (err, settings) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
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
      });
    });
  });
});

// Import data from JSON
app.post('/api/import-data', (req, res) => {
  const importData = req.body;
  
  if (!importData || !importData.official_business || !importData.employees) {
    return res.status(400).json({ error: 'Invalid import data format' });
  }
  
  console.log(`Importing data: ${importData.official_business.length} forms, ${importData.employees.length} employees`);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing data
      db.run('DELETE FROM employees');
      db.run('DELETE FROM official_business');
      db.run('DELETE FROM settings');
      
      // Reset the auto-increment counters
      db.run('DELETE FROM sqlite_sequence WHERE name="employees" OR name="official_business" OR name="settings"');
      
      // Insert official_business entries
      const obStmt = db.prepare(`
        INSERT INTO official_business (
          id, travel_id, date_created, office, division, date_of_ob, dates_of_ob,
          location_from, location_to, departure_time, return_time, purpose,
          approved_by, approved_by_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      importData.official_business.forEach(entry => {
        obStmt.run(
          entry.id,
          entry.travel_id,
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
        );
      });
      
      obStmt.finalize();
      
      // Insert employees
      const empStmt = db.prepare(`
        INSERT INTO employees (id, ob_id, name, position)
        VALUES (?, ?, ?, ?)
      `);
      
      importData.employees.forEach(emp => {
        empStmt.run(
          emp.id,
          emp.ob_id,
          emp.name,
          emp.position
        );
      });
      
      empStmt.finalize();
      
      // Insert settings
      if (importData.settings && importData.settings.length > 0) {
        const settingsStmt = db.prepare(`
          INSERT INTO settings (id, office, office_head, office_head_position, location_from, division_options)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        importData.settings.forEach(setting => {
          settingsStmt.run(
            setting.id,
            setting.office,
            setting.office_head,
            setting.office_head_position,
            setting.location_from,
            setting.division_options
          );
        });
        
        settingsStmt.finalize();
      }
      
      db.run('COMMIT', err => {
        if (err) {
          console.error('Error during import commit:', err);
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
          success: true, 
          message: 'Data imported successfully',
          forms: importData.official_business.length,
          employees: importData.employees.length,
          settings: importData.settings ? importData.settings.length : 0
        });
      });
    } catch (error) {
      db.run('ROLLBACK');
      console.error('Error during import:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 