const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');
const { router: adminAuthRouter, adminApiOnly } = require('./routes/admin-auth');
const { router: settingsRouter } = require('./routes/settings');
const { router: formsRouter } = require('./routes/forms');
const { router: entriesRouter } = require('./routes/entries');
const { router: entriesPaginatedRouter } = require('./routes/entries-paginated');
const { router: trackerRouter } = require('./routes/tracker');
const { router: printRouter } = require('./routes/print');
const { router: formsEditRouter } = require('./routes/forms-edit');
const { router: directoryRouter } = require('./routes/directory');
const { router: cleanupRouter, cleanupOldRecords } = require('./routes/cleanup');
const { router: directoryHistoryRouter } = require('./routes/directory-history');


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
app.use(formsEditRouter);
app.use(directoryRouter);
app.use(directoryHistoryRouter);
app.use(cleanupRouter);

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
app.get('/api/export-data', adminApiOnly, async (req, res) => {
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
app.post('/api/import-data', adminApiOnly, async (req, res) => {
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          VALUES (?, ?, ?, ?)`,
          [emp.id, emp.ob_id, emp.name, emp.position]
        );
      }
      
      // Insert settings
      if (importData.settings && importData.settings.length > 0) {
        for (const setting of importData.settings) {
          await client.query(
            `INSERT INTO settings (id, office, office_head, office_head_position, location_from, division_options)
            VALUES (?, ?, ?, ?, ?, ?)`,
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