# 08: Integrate, remove Postgres and document

**What to build:** The whole app works end to end on the new database, no trace of Postgres remains, and Kim has the checklist and cutover steps to test and switch production safely.

**Blocked by:** 02, 03, 04, 05, 06, 07.

**Status:** done

**Worker:** `worker-opus` (cutover, secrets, cross-module).

- [ ] The full `db:check` passes from a clean clone: migrate, seed, then every route check from tickets 02 to 06 and the import fixture check from ticket 07
- [ ] The `pg` dependency and every Supabase-specific setting are removed from the code and `package.json`
- [ ] The old Supabase migration file is removed, replaced by the migration from ticket 01
- [ ] The project instructions show the new stack and the commands `db:migrate`, `db:seed` and `db:check`
- [ ] The README names Turso, the two environment variables and the local-file default
- [ ] A TEST IT YOURSELF checklist covers submit, tracker, edit, delete, print two per page, admin login, settings, directory replace and cleanup dry run
- [ ] Written cutover steps for Kim: create the staging Turso database, apply migrations, import, test through a Vercel preview, then repeat for production and switch the environment variables; rollback is switching them back to Supabase
- [ ] Nothing in the work touches Turso, Vercel or Supabase; those steps are Kim's
