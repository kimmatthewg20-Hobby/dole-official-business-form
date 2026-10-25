# 02: Settings and admin login

**What to build:** An admin logs in with the password stored in settings and can read and change settings, including the admin password, on the new database. Admin-only routes still reject anyone who is not logged in.

**Blocked by:** 01 (Local database foundation).

**Status:** done

**Worker:** `worker-opus` (admin password, permissions).

- [ ] Every settings and admin-auth query uses `?` placeholders and the new database module
- [ ] Admin login succeeds with the seeded password and fails with a wrong one
- [ ] Reading settings returns the newest saved settings row, as today
- [ ] Saving settings and changing the admin password work, and the newest row is the one in use afterwards
- [ ] The first-run path that creates a settings row when none exists still works
- [ ] Admin-only routes reject requests that are not logged in, checked on the server
- [ ] `db:check` covers login, settings read, settings update and the rejection of unauthenticated admin requests through the HTTP routes
- [ ] The admin password is stored and compared exactly as today (hashing is a separate ticket)
