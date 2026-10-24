-- Wrong admin logins, counted per source address for the lockout (ADR 0002). Kept in the
-- database because Vercel runs many short-lived instances. Only the address and the time
-- are stored, never what was typed. failed_at is milliseconds since 1970 so the window
-- arithmetic is plain integer comparison.

CREATE TABLE failed_logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_address TEXT NOT NULL,
  failed_at INTEGER NOT NULL
);

-- Every login reads the latest wrong logins of one address, newest first.
CREATE INDEX idx_failed_logins_source_address ON failed_logins (source_address, failed_at);
-- Every login also deletes the rows too old to matter.
CREATE INDEX idx_failed_logins_failed_at ON failed_logins (failed_at);
