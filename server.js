const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { router: adminAuthRouter } = require('./routes/admin-auth');
const { router: settingsRouter } = require('./routes/settings');
const { router: formsRouter } = require('./routes/forms');
const { router: entriesRouter } = require('./routes/entries');
const { router: entriesPaginatedRouter } = require('./routes/entries-paginated');
const { router: trackerRouter } = require('./routes/tracker');
const { router: printRouter } = require('./routes/print');
const { router: formsEditRouter } = require('./routes/forms-edit');
const { router: directoryRouter } = require('./routes/directory');
const { router: directorySuggestRouter } = require('./routes/directory-suggest');
const { router: cleanupRouter } = require('./routes/cleanup');
const { router: cronCleanupRouter } = require('./routes/cron-cleanup');
const { router: directoryHistoryRouter } = require('./routes/directory-history');
const { router: dataTransferRouter } = require('./routes/data-transfer');
const { router: divisionsRouter } = require('./routes/divisions');
const { router: approversRouter } = require('./routes/approvers');


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
app.use(directorySuggestRouter);
app.use(directoryHistoryRouter);
app.use(cleanupRouter);
app.use(cronCleanupRouter);
app.use(dataTransferRouter);
app.use(divisionsRouter);
app.use(approversRouter);

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

// Start the server (only in local development)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export app for Vercel serverless functions
module.exports = app; 