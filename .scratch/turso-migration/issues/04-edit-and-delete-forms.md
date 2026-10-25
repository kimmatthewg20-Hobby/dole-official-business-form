# 04: Edit and delete forms

**What to build:** Staff can edit a submitted form and its employees are replaced as one set. An admin can delete one form or all forms, and their employees go with them.

**Blocked by:** 03 (Submit and view Official Business forms).

**Status:** done

**Worker:** `worker-sonnet`.

- [ ] Editing a form updates its fields and replaces its employees together; a failure partway leaves the old form and employees unchanged
- [ ] Deleting one form removes its employees too
- [ ] Deleting all forms removes all employees too
- [ ] Delete routes are admin-only and checked on the server
- [ ] Deleting or editing a form that does not exist returns a clear error and changes nothing
- [ ] `db:check` covers edit with a different set of employees, a failed edit that leaves the previous state, single delete with cascade, delete-all with cascade, and rejection of a non-admin delete through the HTTP routes
