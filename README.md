# Official Business Form Processing System
Ampagal na maray HAHAHAH

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
  - Session timeout (5 minutes)
- **Data cleanup management**:
  - Automatic cleanup of records older than 25 days (based on `date_created`)
  - Runs daily at 2:00 AM
  - Runs on server startup
  - Manual cleanup with dry run testing
  - Cascading deletion of associated employees
- **Employee directory management** - Manage employee database
- **Data export/import** - Backup and restore functionality

### Database Features
- **PostgreSQL (Supabase)** - Reliable cloud database storage
- **Connection pooling** - Optimized pool configuration (max 10 connections) to prevent connection exhaustion
- **Efficient queries** - Batch employee queries to reduce database connections
- **Automatic data retention** - Records older than 25 days are automatically deleted
- **Cascade deletion** - Associated employees are automatically deleted when forms are removed
- **Transaction support** - Safe database operations

### User Interface
- **Modern, responsive design** - Works on desktop and mobile devices
- **Toast notifications** - User-friendly feedback for actions
- **Modal dialogs** - Clean interface for adding/editing employees
- **Search and filter** - Easy data retrieval in tracker
- **Print optimization** - Professional form layout for printing

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (hosted on Supabase)
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Hosting**: Vercel (serverless functions)
- **Dependencies**: 
  - `express` - Web framework
  - `pg` - PostgreSQL client
  - `body-parser` - Request parsing
  - `cookie-parser` - Cookie handling
  - `dotenv` - Environment variable management
  - `flatpickr` - Date picker (via CDN)

## Deployment

This application is deployed on **Vercel** with **Supabase** as the database.

### Environment Variables

The following environment variables are required:

- `DATABASE_URL` - Supabase PostgreSQL connection string (Session Pooler)
- `ADMIN_PASSWORD` - Admin panel password
- `PORT` - Server port (default: 3000)

### Database Setup

1. Create a Supabase project
2. Run the SQL migration script (`supabase_migration.sql`) in the Supabase SQL Editor
3. Get your connection string from Supabase project settings
4. Use the **Session Pooler** connection string (port 6543) for better compatibility

## Local Development

```bash
# Install dependencies
npm install

# Create a .env file with your environment variables
# DATABASE_URL=your_supabase_connection_string
# ADMIN_PASSWORD=your_admin_password
# PORT=3000

# Start the server
npm start
```

The server will run on port 3000 by default (http://localhost:3000).

## Project Structure

```
├── server.js              # Main Express server with API endpoints
├── db.js                  # Database connection and helpers
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment configuration
├── supabase_migration.sql # Database schema
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

## Admin Access

- **URL**: `/admin`
- **Username**: `cnpoadmin`
- **Password**: Set via `ADMIN_PASSWORD` environment variable

### Admin Panel Features
1. **Settings Management**
   - Configure division options
   - Update admin password
   - Session timeout: 5 minutes of inactivity

2. **Data Cleanup**
   - View automatic cleanup schedule
   - Run dry run tests (see what would be deleted)
   - Manually trigger cleanup
   - Customize retention period for testing

## Data Retention Policy

- **Automatic Cleanup**: Records older than 25 days (based on `date_created`) are automatically deleted
- **Schedule**: Runs daily at 2:00 AM and on server startup
- **Cascade Deletion**: Associated employee records are automatically deleted when forms are removed
- **Manual Control**: Admins can test and trigger cleanup manually via admin panel

## Form Features

### Input Validation
- All required fields must be filled before submission
- Duplicate employee names are prevented (case-insensitive)
- Date selection supports multiple dates
- Time inputs for departure and return

### Print Features
- Optimized for 8.5" x 13.5" paper (2 forms per page)
- Cutout line guides for even-numbered forms
- Proper spacing and page breaks
- Department of Labor and Employment branding
- Professional form layout

### Tracker Features
- Search with partial matching across multiple fields
- Case-insensitive search
- Fixed table height (900px) with scrollability for viewing multiple rows
- Efficient single-query data loading to prevent connection pool exhaustion
- Pagination (15 entries per page)
- View individual forms
- Shows last 10 days of records by default

## License

© 2024 DOLECNPO Kimmsg :3 | IT Unit
