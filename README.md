# Official Business Form

An online application for managing Official Business Forms with database storage and printable HTML generation.

## Features

- Submit and manage official business forms
- Store employee and travel information
- Generate printable forms
- Admin panel for settings and data management
- Employee directory management
- Database storage with PostgreSQL (Supabase)
- User-friendly web interface

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
├── server.js              # Main Express server
├── db.js                  # Database connection and helpers
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment configuration
├── supabase_migration.sql # Database schema
├── public/               # Frontend files
│   ├── index.html        # Main form page
│   ├── admin.html        # Admin panel
│   ├── employees.html    # Employee management
│   ├── logo.png         # Application logo
│   ├── print.js         # Print template generator
│   └── release-form.js  # Release form generator
└── README.md            # This file
```

## Admin Access

- **URL**: `/admin`
- **Username**: `cnpoadmin`
- **Password**: Set via `ADMIN_PASSWORD` environment variable

## License

© 2024 DOLECNPO | IT Unit
