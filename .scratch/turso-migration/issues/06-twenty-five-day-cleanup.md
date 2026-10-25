# 06: 25-day cleanup

**What to build:** The cleanup that removes Official Business forms older than 25 days, and its admin dry-run endpoint, select exactly the same records as before on the new database.

**Blocked by:** 03 (Submit and view Official Business forms).

**Status:** done

**Worker:** `worker-sonnet`.

- [ ] The cleanup selects forms by the same cut-off rule on the form creation date as before
- [ ] A real run deletes the selected forms and their employees in one transaction
- [ ] The admin test endpoint with dry run reports which records are older than the cut-off and deletes nothing
- [ ] The endpoint is admin-only and checked on the server
- [ ] The startup run and the daily timer still exist but can be switched off for tests
- [ ] `db:check` covers a dry run and a real run against forms seeded on both sides of the cut-off through the HTTP routes
- [ ] Making the cleanup actually run on Vercel is not part of this ticket (see ticket 09)
