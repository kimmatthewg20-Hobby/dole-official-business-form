-- Each new form gets a Reference code when it is submitted (GLOSSARY.md, ADR 0003). Forms
-- made before this keep none, so the column stays empty for them; SQLite lets any number
-- of rows leave a uniquely indexed column empty.

ALTER TABLE official_business ADD COLUMN reference_code TEXT;

-- No two forms share a code, and a code lookup finds its form through this index.
CREATE UNIQUE INDEX idx_official_business_reference_code ON official_business (reference_code);
