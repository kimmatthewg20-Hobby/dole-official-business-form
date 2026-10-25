# 01: Local database foundation

**What to build:** A developer can clone the repo, run one command to create a local database from the migration files, run another to fill it with fake data, and start the app against it with no account and no setup. The database module talks to libSQL only and is chosen by environment variables. This is the base every other ticket builds on, and it introduces the `db:check` runner.

**Blocked by:** None (can start immediately).

**Status:** done

**Worker:** `worker-opus` (secrets, personal data, schema). Work on the shared integration branch for the whole migration; the app is only fully working again after ticket 08.

- [ ] The database module reads `TURSO_DATABASE_URL` (default: a local database file) and `TURSO_AUTH_TOKEN` (needed only for a Turso URL); the old `DATABASE_URL` is ignored
- [ ] An example environment file lists both variables
- [ ] The helpers keep their names and return values: get one row, get all rows, run a write returning `lastID` and `changes`, and a transaction helper whose callback receives an object with `query(sql, args)` returning `{ rows, rowCount }`
- [ ] The connection pool, startup table creation and `information_schema` checks are gone; if the module would pass 200 lines it is split
- [ ] The first migration defines the four tables with the same columns and defaults as today, auto-incrementing integer ids, text dates, and employees referencing their form with cascade delete
- [ ] The first migration adds indexes on the columns the app filters and sorts by
- [ ] `db:migrate` applies migration files in numeric order, records what has run, and is safe to repeat
- [ ] `db:seed` inserts fake directory entries, settings and a known test admin password; it contains no real staff names and refuses to run against a Turso URL
- [ ] Foreign-key enforcement is confirmed on for every connection, and `db:check` proves a form delete removes its employees
- [ ] `db:check` proves a transaction that fails partway rolls back and leaves the previous state
- [ ] The app can be loaded for tests without the startup cleanup running and without its daily timer starting
- [ ] The supported Node version is raised to 20
- [ ] `db:check` runs against a throwaway database and leaves no files behind
