# 12: Lock out repeated wrong logins

**What to build:** After five wrong admin logins within fifteen minutes from the same source address, login from that address is refused for fifteen minutes. Failed attempts are stored in the database so the rule holds across Vercel instances. Decisions: ADR 0002, `GLOSSARY.md` (Lockout).

**Blocked by:** 10 (Hash and upgrade the admin password).

**Status:** done

**Worker:** `worker-opus` (auth, migration).

## Acceptance criteria

- [ ] Migration `0002_login_attempts.sql` adds a table of failed attempts (source address and time) with an index on the address; Kim applies it, the app never creates it on boot
- [ ] Five wrong attempts (wrong username or wrong password) within the window from one address make the sixth and later attempts fail with a clear "try again later" response (HTTP 429) even if the password is right, until the lockout ends
- [ ] A different address is not affected, so a stranger cannot lock the admin out
- [ ] A correct login before the limit clears that address's failed attempts
- [ ] Old attempt rows are deleted when the table is read, so it stays small
- [ ] The source address comes from the platform's forwarded header, handled safely when it is missing or malformed (the fallback must not give every visitor one shared bucket)
- [ ] The limits (5 attempts, 15 minutes) are named constants
- [ ] `db:check` covers the lockout, release after the window (using an injectable clock or backdated rows), isolation between addresses and the reset on success; checks apply the migration like the existing ones
- [ ] The attempt log stores no passwords or usernames typed
