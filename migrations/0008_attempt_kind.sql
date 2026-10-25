-- Wrong Reference codes share the failed-attempt log with wrong admin logins (ADR 0003), but
-- the two are counted apart so neither can lock out the other. Rows from before this were all
-- admin logins, so that is the default.

ALTER TABLE failed_logins ADD COLUMN kind TEXT NOT NULL DEFAULT 'admin-login';

-- Every login and every code lookup reads the latest wrong attempts of one kind from one
-- address, newest first. This replaces the address-only index, which no query uses any more.
CREATE INDEX idx_failed_logins_kind_source_address ON failed_logins (kind, source_address, failed_at);
DROP INDEX idx_failed_logins_source_address;
