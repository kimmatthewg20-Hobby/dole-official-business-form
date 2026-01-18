-- Supabase Database Migration Script
-- Run this in Supabase SQL Editor after creating your project

-- Create official_business table
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
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  ob_id INTEGER REFERENCES official_business(id) ON DELETE CASCADE,
  name TEXT,
  position TEXT
);

-- Create employees_directory table
CREATE TABLE IF NOT EXISTS employees_directory (
  id SERIAL PRIMARY KEY,
  employee_id TEXT,
  firstname TEXT,
  middle_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  assigned_unit TEXT
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  office TEXT,
  office_head TEXT,
  office_head_position TEXT,
  location_from TEXT,
  division_options TEXT,
  assistant_regional_director TEXT DEFAULT 'ATTY. NEPOMUCENO A. LEAÑO II, CPA',
  admin_password TEXT
);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('official_business', 'employees', 'employees_directory', 'settings');
