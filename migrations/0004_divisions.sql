-- The Division list the admin keeps (GLOSSARY.md). The code goes into each new Reference code,
-- so it is 2-4 capital letters. Forms keep their division as plain text, without a link to this
-- table, so renaming or removing a Division never changes a stored form.
-- settings.division_options stays in place; the form page reads it until it uses this list.

CREATE TABLE divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL CHECK (length(code) BETWEEN 2 AND 4 AND code NOT GLOB '*[^A-Z]*')
);

-- The list is sorted by name; no two Divisions share a name, whatever the capitals.
CREATE UNIQUE INDEX idx_divisions_name ON divisions (name COLLATE NOCASE);
-- No two Divisions share a code, so a Reference code means one Division.
CREATE UNIQUE INDEX idx_divisions_code ON divisions (code);
