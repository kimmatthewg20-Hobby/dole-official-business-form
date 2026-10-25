-- One submission is one stored form; its Date mode only decides how it prints (GLOSSARY.md),
-- so the mode is kept with the form. Forms made before this keep none, which prints as
-- All Dates, the only way they were printed.

ALTER TABLE official_business ADD COLUMN date_mode TEXT;
