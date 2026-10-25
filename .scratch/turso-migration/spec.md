Status: ready-for-agent

# Move the database to Turso, with a local database for development

## Problem Statement

The app stores Official Business forms, employees, the employee directory and settings (including the admin password) in Supabase Postgres. Kim wants to move to Turso. Today there is no way to run the app without a live remote Postgres connection, so development touches a hosted database that holds real staff names and positions. The schema is also changed by code that runs on every boot, which hides changes from Kim, who is meant to apply schema changes herself.

## Solution

The app talks to a libSQL database through one client. In development that is a local file created on the developer's machine, filled with fake data. In staging and production it is a Turso database. An environment variable picks which one; with nothing set, the local file is used, so a fresh clone runs with no setup. The schema lives in numbered migration files that Kim applies to Turso herself. Existing production data is moved once, from files exported out of Supabase, into Turso. Postgres is removed from the code entirely; Supabase stays untouched as a fallback until Kim retires it.

## User Stories

1. As a developer, I want the app to start against a local database file with no setup, so that I can work offline and without any account.
2. As a developer, I want the database target chosen only by environment variables, so that the same code runs locally, in staging and in production.
3. As a developer, I want `TURSO_DATABASE_URL` to default to a local file when it is unset, so that a fresh clone just works.
4. As a developer, I want `TURSO_AUTH_TOKEN` to be required only when the URL points at Turso, so that local development never needs a token.
5. As a developer, I want an example environment file listing both variables, so that I know what to configure without reading the code.
6. As a developer, I want a leftover Postgres connection variable to be ignored, so that the app can never silently connect to the old database.
7. As a developer, I want one command to apply all migration files to my local database, so that I can create or reset it in seconds.
8. As a developer, I want migrations to run in numbered order and never re-run an applied one, so that applying them is safe to repeat.
9. As a developer, I want one command to fill the local database with fake employees, directory entries, settings and a test admin password, so that I can use every page without real data.
10. As a developer, I want the seed to contain no real staff names, so that personal data never lands on my laptop.
11. As Kim, I want the schema defined in migration files, so that I review and apply every schema change myself.
12. As Kim, I want the app to stop altering tables when it boots, so that nothing changes my Turso database behind my back.
13. As Kim, I want the first migration to define all four tables with the same columns as today, so that existing data fits without transformation.
14. As Kim, I want indexes on the columns the app filters and sorts by, so that the tracker and admin lists stay fast as records grow.
15. As Kim, I want deleting an Official Business form to delete its employees too, so that no orphaned rows remain.
16. As Kim, I want all current Official Business forms, employees, directory entries and settings moved to Turso, so that staff lose nothing they still need to print or track.
17. As Kim, I want to export the four tables from the Supabase dashboard and load them with one script, so that the move does not need a live Postgres connection.
18. As Kim, I want the import to keep the original ids, so that employees stay attached to the right forms.
19. As Kim, I want the whole import to succeed or fail as one unit, so that a half-imported database never exists.
20. As Kim, I want the import to print row counts per table, so that I can compare them with the export before switching.
21. As Kim, I want the admin password copied unchanged, so that the admin keeps logging in with the same password after the move.
22. As Kim, I want a staging Turso database tested through a Vercel preview deploy first, so that production is switched only after a full walkthrough.
23. As Kim, I want Supabase left untouched until I retire it, so that rollback is just switching the environment variables back.
24. As Kim, I want the project docs to name Turso and the new commands, so that the next session starts from the right facts.
25. As Kim, I want a recorded decision explaining the move and the rejected alternatives, so that nobody re-proposes Postgres or an adapter later.
26. As a staff member, I want to submit an Official Business form with several employees, so that all of them appear on the printed form.
27. As a staff member, I want the tracker to list forms page by page in the same order as before, so that I find mine as I did.
28. As a staff member, I want filtering and searching in the tracker to return the same results as before, so that nothing seems missing after the move.
29. As a staff member, I want to edit a submitted form and have its employees replaced together, so that I never see a form with a mix of old and new employees.
30. As a staff member, I want to print two forms per page exactly as before, so that the move changes nothing I can see.
31. As an admin, I want to log in with my existing password, so that the move needs no action from me.
32. As an admin, I want to change settings and the admin password, so that the newest saved settings are the ones in use.
33. As an admin, I want to replace the employee directory in bulk, and a failure partway to leave the old directory intact, so that a bad upload never wipes the list.
34. As an admin, I want to delete one form or all forms, and see their employees go with them, so that cleanup is complete.
35. As an admin, I want the cleanup test endpoint to report which records are older than the cut-off without deleting them, so that I can check it safely.
36. As an admin, I want the 25-day cleanup to keep selecting the same records as before, so that records are neither kept too long nor deleted too early.
37. As a developer, I want a single check command that tests the migration through the app's HTTP routes against a throwaway database, so that I trust the move without clicking through every page.
38. As a developer, I want that check to leave no files behind and never touch a shared database, so that it is safe to run anywhere.
39. As a developer, I want the app to start without the scheduled cleanup firing during tests, so that checks are deterministic.

## Implementation Decisions

- **Driver and target.** The app uses the libSQL client only. The `pg` driver and every Supabase-specific setting (including the SSL special case) are removed. There is no adapter that can switch back to Postgres. This is recorded in ADR 0001.
- **Configuration.** `TURSO_DATABASE_URL` (default: a local database file) and `TURSO_AUTH_TOKEN` (needed only for a Turso URL). The old `DATABASE_URL` is no longer read. An example environment file documents both.
- **Database module interface.** The existing helpers keep their names and return values: get one row, get all rows, run a write returning `lastID` and `changes`, and a transaction helper. The transaction callback receives an object whose `query(sql, args)` returns `{ rows, rowCount }`, so route code changes only in its placeholders. The connection pool, startup table creation and the `information_schema` checks are removed. If the module would exceed 200 lines it is split.
- **Placeholders.** Every query is rewritten from numbered `$n` placeholders to `?`. No hidden translation layer. Queries that build their placeholders dynamically (the paginated and filtered lists) need care so values stay in order.
- **Schema.** A first migration defines the four tables with the same columns and defaults as today. Integer ids use auto-incrementing primary keys. Dates stay as text, as today, so no type conversion is needed. The employees table references its form with cascade delete. Indexes cover the columns the app filters and sorts by (form creation date, employees by form, directory name and unit lookups).
- **Foreign keys.** SQLite-family databases can leave foreign-key enforcement off by default, but cascade delete depends on it. Enforcement must be confirmed on for every connection, local and Turso, and the check must prove it.
- **Migration runner.** A small command applies migration files in numeric order to the configured database and records which have run, so repeats are safe. Kim applies the same files to Turso herself; the app never applies them on boot.
- **Seed.** A command inserts fake directory entries, settings and a known test admin password into the local database only. It refuses to run against a Turso URL.
- **Data import.** A one-off script reads the four exported tables from files, inserts them with their original ids in a single transaction in dependency order (forms before employees), resets id counters past the highest imported id, and prints per-table row counts. It does not connect to Postgres. The admin password is copied as stored.
- **Transactions.** Multi-statement writes (create form with employees, edit form, delete, bulk directory replace, settings reset) must stay atomic with rollback on failure, as today.
- **Startup side effects.** The cleanup that runs when the server module loads, and its daily timer, must be skippable so tests can load the app without triggering them. The cleanup itself is unchanged and is not fixed for serverless in this spec.
- **Runtime.** The supported Node version is raised to one the libSQL client supports (Node 20).
- **Docs.** The project instructions are updated for the new stack and commands. The old Supabase migration file is replaced by the new migration. ADR 0001 is already written.
- **Cutover.** Staging first: a Vercel preview deploy points at a staging Turso database and is tested end to end. Only then is production imported and its environment variables switched. Kim creates the Turso databases, applies migrations, runs the import and changes Vercel variables; automated work never touches Turso, Vercel or Supabase.

## Testing Decisions

- **What makes a good test here:** it exercises external behaviour only, by calling the app's HTTP routes and reading responses, never the database module's internals or the generated SQL.
- **One seam:** the HTTP API. The exported Express app is started against a throwaway local database built from the migration files and the seed. The check is one command and cleans up after itself.
- **Behaviours the check must cover:**
  - Create a form with several employees; read it back from the tracker list and its detail.
  - Paging and the existing filters return the same ordering and counts as before.
  - Edit a form; its employees are replaced as a set.
  - Delete one form, and all forms; employees go with them (proves foreign keys are enforced).
  - A multi-step write that fails partway leaves the previous state untouched (for example, a bulk directory replace containing one invalid row keeps the old directory).
  - Admin login works with the seeded password; settings read returns the newest saved settings.
  - The cleanup dry run reports exactly the records older than the cut-off and deletes nothing.
  - Admin routes reject unauthenticated requests.
- **Second, smaller check:** the import script runs against a small fixture export into a throwaway database, then asserts row counts, preserved ids, employee-to-form links, and that nothing is written when one input row is invalid.
- **Prior art:** none; the repo has no tests. This spec introduces the first check and its runner. Manual verification follows with the TEST IT YOURSELF checklist.

## Out of Scope

- Fixing the 25-day cleanup so it actually runs on Vercel serverless (separate ticket: Vercel Cron against an admin-protected endpoint).
- Hashing the admin password (separate ticket; this migration copies it unchanged).
- Retiring or deleting the Supabase project.
- Any change to the pages, forms, printing or visible behaviour.
- Splitting up the large server module beyond what the database change forces.
- Creating the Turso databases, applying migrations to Turso, running the production import, and changing Vercel variables (Kim does these).

## Further Notes

- The ADR is `docs/adr/0001-turso-libsql-replaces-supabase-postgres.md`. The project's Stack line in `CLAUDE.md` says not to change the stack without asking; Kim has asked and approved.
- This work touches personal data, secrets and many modules, so the build tickets should go to the Opus worker.
- Unknown to verify during the build: whether the libSQL client enables foreign keys by default on both file and Turso connections, and how it reports `rowCount` for writes.
