# 05: Employee directory

**What to build:** The employee directory (names, positions, assigned units) lists, searches, adds, edits and bulk-replaces on the new database. A bulk replace that contains a bad row leaves the old directory untouched.

**Blocked by:** 01 (Local database foundation).

**Status:** done

**Worker:** `worker-sonnet` (personal data: review after).

- [ ] Directory list and lookup return the same entries, order and paging as before
- [ ] Adding and editing an entry validates input on the server and stores it
- [ ] Bulk replace deletes and re-inserts the directory in one transaction
- [ ] A bulk replace containing one invalid row fails as a whole and the previous directory remains
- [ ] Directory changes are admin-only and checked on the server
- [ ] `db:check` covers list, add, edit, a successful bulk replace and a failed bulk replace that keeps the old directory, through the HTTP routes
