# Official Business Form Processing System
Based of the Travel Order Processing of Regional Office in short "kinopya ko ang design language hahahaha"

An online application for managing Official Business Forms with database storage and printable HTML generation.
Version alpha pero pwede na.

## Features

### Core Functionality
- **Submit and manage official business forms** - Create, edit, and track official business forms
- **Multiple date selection** - Select single or multiple dates for official business using calendar picker
- **Employee management** - Add, edit, and remove employees from forms
- **Form validation** - Comprehensive validation for all required fields:
  - Date of Official Business (required)
  - From/To locations (required)
  - Departure/Return times (required)
  - Purpose (required)
  - Division selection (required)
  - Approved by and position (required)
  - At least one employee (required)
  - Duplicate employee name prevention (case-insensitive)
- **Printable forms** - Generate professional printable forms with:
  - Optimized layout for printing (2 forms per page)
  - Cutout line guides for even-numbered forms
  - Proper spacing and page breaks
  - Department of Labor and Employment branding
- **Form tracking** - View and search through submitted forms:
  - Search functionality with case-insensitive partial matching
  - Search across Date, Purpose, Employee Names, and Destination
  - Pagination support
  - View individual forms

### Admin Features
- **Admin panel** (`/admin`) - Secure administrative interface:
  - Settings management (division options)
  - Password change functionality
  - The admin page logs out after 5 minutes of inactivity (the server login cookie lasts 24 hours)
- **Data cleanup management**:
  - Automatic cleanup of records older than 25 days (based on `date_created`)
  - Runs daily at about 2:00 AM Philippine time through Vercel Cron (`GET /api/cron/cleanup`)
  - Manual cleanup with dry run testing
  - Cascading deletion of associated employees
- **Employee directory management** - Manage employee database
- **Data export/import** - Backup and restore functionality

### Database Features
- **Turso (libSQL)** - Cloud database in staging and production; a local database file in development
- **Migration files** - The schema lives in `migrations/`, applied with `npm run db:migrate`
- **Efficient queries** - Batch employee queries to reduce database round trips
- **Automatic data retention** - Records older than 25 days are automatically deleted
- **Cascade deletion** - Associated employees are automatically deleted when forms are removed
- **Transaction support** - Multi-step writes succeed or fail as one unit

### User Interface
- **Modern, responsive design** - Works on desktop and mobile devices
- **Toast notifications** - User-friendly feedback for actions
- **Modal dialogs** - Clean interface for adding/editing employees
- **Search and filter** - Easy data retrieval in tracker
- **Print optimization** - Professional form layout for printing

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: Turso (libSQL, SQLite-compatible); `file:local.db` in development
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Hosting**: Vercel (serverless functions), Node.js 20 or newer
- **Dependencies**: 
  - `express` - Web framework
  - `@libsql/client` - Turso / libSQL client
  - `body-parser` - Request parsing
  - `cookie-parser` - Cookie handling
  - `dotenv` - Environment variable management
  - `flatpickr` - Date picker (via CDN)

## Deployment

This application is deployed on **Vercel** with **Turso** as the database. Moving from Supabase to Turso, and the manual test checklist, are in [`docs/turso-cutover.md`](docs/turso-cutover.md).

### Environment Variables

- `TURSO_DATABASE_URL` - Which database to use. Unset means the local file `file:local.db`. On Vercel it must be a Turso URL (`libsql://...`); the app refuses to start there with a local file, because Vercel's disk does not keep data.
- `TURSO_AUTH_TOKEN` - Turso database token. Needed only when `TURSO_DATABASE_URL` points at Turso.
- `ADMIN_PASSWORD` - First-run bootstrap admin password: accepted only while no password is stored in the settings table, ignored once one is saved. With neither, nobody can log in. There is no built-in default
- `CRON_SECRET` - Shared secret for the daily cleanup call. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`. Set it in Vercel for **Production** (a long random value, e.g. `openssl rand -hex 32`); without it the cleanup endpoint refuses every call and no automatic cleanup happens
- `PORT` - Server port (default: 3000)

`DATABASE_URL` (the old Supabase setting) is no longer read. `.env.example` lists the variables.

### Database Setup

1. Create a Turso database and a token for it
2. Point `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` at it and run `npm run db:migrate`
3. Set the same two variables in Vercel

## Local Development

```bash
# Install dependencies
npm install

# Create local.db from migrations/ and fill it with fake data (no account needed)
npm run db:migrate
npm run db:seed

# Start the server
npm start

# Run every check against a throwaway database
npm run db:check
```

No `.env` is needed: with `TURSO_DATABASE_URL` unset the app uses `local.db` (gitignored). The seed refuses to run against a Turso URL and holds only invented names; it sets the local admin password `local-test-admin`.

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies new files in `migrations/`, in numeric order, to the configured database |
| `npm run db:seed` | Replaces the local directory and settings with fake data |
| `npm run db:check` | Migrates and seeds a throwaway database, then runs every route and import check |
| `npm run db:import -- --help` | One-off load of a Supabase export (CSV or JSON) into the configured database |

The server will run on port 3000 by default (http://localhost:3000).

## Project Structure

```
├── server.js              # Express app setup, data export/import
├── db.js                  # libSQL client and query helpers
├── routes/                # API and page routes, one module per area
├── migrations/            # Numbered schema files (npm run db:migrate)
├── scripts/               # migrate, seed and import-data
├── checks/                # npm run db:check
├── docs/                  # Decisions (adr/) and the Turso cutover guide
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment configuration
├── public/               # Frontend files
│   ├── index.html        # Main form page
│   ├── admin.html        # Admin panel
│   ├── employees.html   # Employee management
│   ├── tracker.html      # Form tracker with search
│   ├── logo.png         # Application logo
│   ├── print.js         # Print template generator
│   ├── release-form.js   # Release form generator
│   └── js/
│       └── sidebar.js   # Sidebar navigation
└── README.md            # This file
```

## API Endpoints

### Public Endpoints
- `GET /` - Main form page
- `GET /tracker` - Form tracker page
- `GET /print/:id` - View/print form by ID
- `POST /api/submit` - Submit new form
- `GET /api/retrieve/:id` - Retrieve form data
- `GET /api/tracker` - Get tracker data (paginated, 15 per page)
- `GET /api/tracker/all` - Get all tracker data for search (single query, efficient)
- `GET /api/settings` - Get system settings

### Admin Endpoints (Protected)
- `GET /admin` - Admin panel
- `POST /api/admin/login` - Admin login
- `POST /api/admin/change-password` - Change admin password
- `POST /api/settings` - Update settings
- `GET /api/cleanup/test` - Test/run data cleanup (with query params: `days`, `dryRun`)

### Scheduled Endpoint
- `GET /api/cron/cleanup` - Runs the 25-day cleanup and returns `{ success, deleted }`. Called by Vercel Cron; it needs `Authorization: Bearer <CRON_SECRET>` and refuses every call (401) when `CRON_SECRET` is not set

## Admin Access

- **URL**: `/admin`
- **Username**: `cnpoadmin`
- **Password**: stored as a salted `scrypt` hash; at least 10 characters when set or changed. On a fresh database, log in with `ADMIN_PASSWORD` once and change it. An old plain-text password is upgraded to a hash at its next correct login. Locally, `npm run db:seed` sets the test password `local-test-admin`

### Admin Panel Features
1. **Settings Management**
   - Configure division options
   - Update admin password
   - The admin page logs out after 5 minutes of inactivity

2. **Data Cleanup**
   - View automatic cleanup schedule
   - Run dry run tests (see what would be deleted)
   - Manually trigger cleanup
   - Customize retention period for testing

## Data Retention Policy

- **Automatic Cleanup**: Records older than 25 days (based on `date_created`) are automatically deleted
- **Schedule**: Vercel Cron calls `GET /api/cron/cleanup` daily at 18:00 UTC (02:00 Philippine time), set in `vercel.json`. Vercel may run it up to about an hour late. The server itself runs no cleanup at startup and keeps no timer. Locally nothing runs on a schedule; use the admin panel
- **Cascade Deletion**: Associated employee records are automatically deleted when forms are removed
- **Manual Control**: Admins can test and trigger cleanup manually via admin panel

## Form Features

### Input Validation
- All required fields must be filled before submission
- Duplicate employee names are prevented (case-insensitive)
- Date selection supports multiple dates
- Time inputs for departure and return

### Print Features
- Optimized for 8.5" x 13" paper (2 forms per page)
- Cutout line guides for even-numbered forms
- Proper spacing and page breaks
- Department of Labor and Employment branding
- Professional form layout

### Tracker Features
- Search with partial matching across multiple fields
- Case-insensitive search
- Fixed table height (900px) with scrollability for viewing multiple rows
- Efficient single-query data loading
- Pagination (15 entries per page)
- View individual forms
- Shows last 10 days of records by default

## License

© 2024 DOLECNPO Kimmsg :3 | IT Unit

