-- The four tables as they were on Supabase Postgres, with the same columns and defaults.
-- Dates stay TEXT so exported values load without conversion.

CREATE TABLE official_business (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ob_id INTEGER REFERENCES official_business(id) ON DELETE CASCADE,
  name TEXT,
  position TEXT
);

CREATE TABLE employees_directory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT,
  firstname TEXT,
  middle_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  assigned_unit TEXT
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  office TEXT,
  office_head TEXT,
  office_head_position TEXT,
  location_from TEXT,
  division_options TEXT,
  assistant_regional_director TEXT DEFAULT 'ATTY. NEPOMUCENO A. LEAÑO II, CPA',
  admin_password TEXT
);

-- The tracker, admin list and cleanup filter and sort forms by creation date.
CREATE INDEX idx_official_business_date_created ON official_business (date_created);
-- Employees are always read, replaced and cascade-deleted by their form.
CREATE INDEX idx_employees_ob_id ON employees (ob_id);
-- The directory is listed by name and looked up by name and unit.
CREATE INDEX idx_employees_directory_full_name ON employees_directory (full_name);
CREATE INDEX idx_employees_directory_assigned_unit ON employees_directory (assigned_unit);
