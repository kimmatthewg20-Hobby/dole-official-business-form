-- Admin sessions issued at login (ADR 0002, GLOSSARY.md). The signed cookie alone cannot be
-- taken back, so a session also needs its row here: logout deletes one row and a change of the
-- admin password deletes them all. id is the random session id carried in the cookie;
-- expires_at is milliseconds since 1970, like failed_logins.failed_at.

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

-- Every session check deletes the rows that have expired.
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);
