# 13: Export and import leave the admin password alone

**What to build:** `GET /api/export-data` no longer returns the stored admin password, and `POST /api/import-data` never overwrites the current one. The one-off `db:import` script is unchanged. Decisions: ADR 0002.

**Blocked by:** 10 (Hash and upgrade the admin password).

**Status:** done

**Worker:** `worker-sonnet`.

## Acceptance criteria

- [ ] The exported settings contain no `admin_password` value or field
- [ ] Importing a file that includes an `admin_password` (an old export) does not change the stored password; the current admin can still log in with the same password afterwards
- [ ] Other settings columns still export and import as before
- [ ] Both routes remain admin-only and are checked on the server
- [ ] `scripts/import-data.js` still copies `admin_password` exactly as stored
- [ ] `db:check` covers all four points through the HTTP routes
