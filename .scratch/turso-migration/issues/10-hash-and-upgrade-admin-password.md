# 10: Hash the admin password and upgrade the stored one

**What to build:** The admin password is stored as a salted `scrypt` hash. A plain-text value already in the database is accepted once and re-saved as a hash at the next correct login. The built-in default password is removed. Decisions: ADR 0002, `GLOSSARY.md`.

**Blocked by:** None (tickets 01-09 are done).

**Status:** done

**Worker:** `worker-opus` (admin password, auth).

## Acceptance criteria

- [ ] New and changed passwords are stored as `scrypt` hashes (Node `crypto`, random salt per password, parameters kept in the stored text) and compared in constant time; no new password-hashing dependency
- [ ] Login succeeds for a stored hash with the right password and fails with a wrong one
- [ ] A stored value that is not in hash format is treated as an old plain-text password: the right password logs in and the row is immediately re-saved as a hash; afterwards the plain value is never accepted
- [ ] The hard-coded default `*1CNPOadmin*` is gone from the source
- [ ] `ADMIN_PASSWORD` works only while no password is stored (first-run bootstrap) and is ignored once one is saved; with neither, nobody can log in
- [ ] The server requires the username `cnpoadmin` (a named constant) as well as the password; a wrong username and a wrong password give the same "Incorrect username or password" response
- [ ] The admin page sends the username to the server
- [ ] New passwords must be at least 10 characters (server-enforced, message in the response); an existing shorter password still logs in until changed
- [ ] Saving settings still keeps the stored password (see the earlier fix)
- [ ] The seed stores a hashed test password (login with `local-test-admin` still works)
- [ ] `db:check` covers every point above through the HTTP routes, including the plain-text upgrade and bootstrap cases
- [ ] The admin password never appears in logs or responses
