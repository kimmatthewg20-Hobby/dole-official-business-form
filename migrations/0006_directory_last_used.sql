-- The Employee directory becomes the form's memory (GLOSSARY.md). Names on submitted forms
-- join it, matched by name_key: the full name trimmed, with runs of spaces made one and
-- letters made small (routes/directory-name.js makes it for every new or changed entry).
-- last_used_at is the day an employee was last named on a form; the six-month cleanup reads it.
--
-- SQLite cannot give an added column a default of today, so the table is rebuilt: an entry
-- the admin adds or imports without a date then counts from the day it was added. Every id,
-- entry and index is kept, and nothing else references this table. ID, first name and last
-- name stay optional, so an entry added from a form can be completed by the admin later.

CREATE TABLE employees_directory_rebuilt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT,
  firstname TEXT,
  middle_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  assigned_unit TEXT,
  name_key TEXT,
  last_used_at TEXT NOT NULL DEFAULT (date('now'))
);

-- SQLite's lower() only knows A-Z, so the capitals found in staff names are made small by
-- hand to agree with the JavaScript key. Existing employees start their six months today.
INSERT INTO employees_directory_rebuilt
  (id, employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit, name_key, last_used_at)
SELECT id, employee_id, firstname, middle_name, last_name, full_name, position, assigned_unit,
  replace(replace(replace(replace(replace(replace(replace(lower(
    trim(replace(replace(replace(replace(replace(replace(replace(full_name,
      char(9), ' '), char(10), ' '), char(13), ' '),
      '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))
  ), 'Ñ', 'ñ'), 'Á', 'á'), 'É', 'é'), 'Í', 'í'), 'Ó', 'ó'), 'Ú', 'ú'), 'Ü', 'ü'),
  date('now')
FROM employees_directory;

-- Copying ids moves the new counter only to the highest id kept; carrying the old counter
-- over keeps the id of a deleted entry from ever being given out again.
UPDATE sqlite_sequence
SET seq = max(seq, (SELECT seq FROM sqlite_sequence WHERE name = 'employees_directory'))
WHERE name = 'employees_directory_rebuilt'
  AND EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'employees_directory');
INSERT INTO sqlite_sequence (name, seq)
SELECT 'employees_directory_rebuilt', seq FROM sqlite_sequence
WHERE name = 'employees_directory'
  AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'employees_directory_rebuilt');

DROP TABLE employees_directory;
ALTER TABLE employees_directory_rebuilt RENAME TO employees_directory;

-- The directory is listed by name and looked up by name and unit.
CREATE INDEX idx_employees_directory_full_name ON employees_directory (full_name);
CREATE INDEX idx_employees_directory_assigned_unit ON employees_directory (assigned_unit);
-- Submitting a form finds each employee by name_key, and suggestions read a range of it.
CREATE INDEX idx_employees_directory_name_key ON employees_directory (name_key);
-- The cleanup removes employees whose last-used date is older than six months.
CREATE INDEX idx_employees_directory_last_used_at ON employees_directory (last_used_at);
