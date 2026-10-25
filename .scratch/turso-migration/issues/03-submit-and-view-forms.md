# 03: Submit and view Official Business forms

**What to build:** Staff submit an Official Business form with several employees, find it in the tracker, and open it to print two per page, all on the new database and looking exactly as before.

**Blocked by:** 01 (Local database foundation).

**Status:** done

**Worker:** `worker-sonnet`.

- [ ] Submitting a form with several employees stores the form and all its employees together, atomically, and returns the new id
- [ ] A submission with invalid input is rejected by the server and stores nothing
- [ ] The tracker list pages with the same page size, ordering and totals as before
- [ ] Every existing tracker filter and search returns the same results as before
- [ ] Queries that build placeholders dynamically (paging and filters) keep their values in the correct order
- [ ] The form detail and the data used for printing two per page return the same fields as before
- [ ] User text is still escaped wherever it is put into HTML
- [ ] `db:check` covers submit with several employees, read back, paging, ordering, filtering and the rejected submission through the HTTP routes
