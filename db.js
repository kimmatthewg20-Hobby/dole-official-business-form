const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool to Supabase PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = (text, params) => {
  return pool.query(text, params);
};

// Helper function to get a single row
const get = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
};

// Helper function to get all rows
const all = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper function to run a query (for INSERT/UPDATE/DELETE)
const run = async (text, params) => {
  const result = await pool.query(text, params);
  return {
    lastID: result.rows[0]?.id || null,
    changes: result.rowCount || 0
  };
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    // Create official_business table
    await query(`
      CREATE TABLE IF NOT EXISTS official_business (
        id SERIAL PRIMARY KEY,
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
        approved_by_position TEXT,
        timestamp TEXT
      )
    `);

    // Create employees table
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        ob_id INTEGER REFERENCES official_business(id) ON DELETE CASCADE,
        name TEXT,
        position TEXT
      )
    `);

    // Create employees_directory table
    await query(`
      CREATE TABLE IF NOT EXISTS employees_directory (
        id SERIAL PRIMARY KEY,
        employee_id TEXT,
        firstname TEXT,
        middle_name TEXT,
        last_name TEXT,
        full_name TEXT,
        position TEXT,
        assigned_unit TEXT
      )
    `);

    // Create settings table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        office TEXT,
        office_head TEXT,
        office_head_position TEXT,
        location_from TEXT,
        division_options TEXT,
        assistant_regional_director TEXT DEFAULT 'ATTY. NEPOMUCENO A. LEAÑO II, CPA',
        admin_password TEXT
      )
    `);

    // Check if admin_password column exists in settings, if not add it
    const settingsColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' AND column_name = 'admin_password'
    `);
    
    if (settingsColumns.rows.length === 0) {
      await query(`
        ALTER TABLE settings ADD COLUMN admin_password TEXT
      `);
      console.log('Added admin_password column to settings table');
    }

    // Check if assistant_regional_director column exists
    const assistantColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' AND column_name = 'assistant_regional_director'
    `);
    
    if (assistantColumn.rows.length === 0) {
      await query(`
        ALTER TABLE settings ADD COLUMN assistant_regional_director TEXT DEFAULT 'ATTY. NEPOMUCENO A. LEAÑO II, CPA'
      `);
      console.log('Added assistant_regional_director column to settings table');
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

// Initialize tables on module load
initializeTables().catch(err => {
  console.error('Failed to initialize database:', err);
});

module.exports = {
  query,
  get,
  all,
  run,
  pool,
  transaction,
  initializeTables
};
