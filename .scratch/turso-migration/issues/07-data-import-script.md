# 07: Data import script

**What to build:** Kim exports the four tables from the Supabase dashboard and runs one script that loads them into the configured database, keeping ids and links, all or nothing, with row counts to compare.

**Blocked by:** 01 (Local database foundation).

**Status:** done

**Worker:** `worker-opus` (personal data, admin password, production data move).

- [ ] The script reads the four exported tables from files given on the command line and does not connect to Postgres
- [ ] It inserts rows with their original ids in dependency order (forms before employees) in a single transaction
- [ ] Id counters continue after the highest imported id, so new rows do not collide
- [ ] The admin password in settings is copied exactly as stored
- [ ] One invalid input row aborts the whole import and nothing is written
- [ ] It prints row counts per table so they can be compared with the export
- [ ] It refuses to run if the target database already has rows, unless told explicitly to proceed
- [ ] A fixture-export check asserts the row counts, preserved ids, employee-to-form links and the all-or-nothing behaviour against a throwaway database
- [ ] No real staff data is added to the repo; the fixture is fake
