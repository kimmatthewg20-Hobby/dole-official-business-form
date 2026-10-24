---
status: accepted
---

# Admin login: scrypt hash, signed session, database lockout

The admin password is stored as a salted `scrypt` hash using Node's built-in `crypto`, with no password-hashing package. The login is a server-signed session (`SESSION_SECRET`) that expires after one hour, and failed logins are counted per source address in a database table, because Vercel runs many short-lived instances and an in-memory counter would not hold.

## Considered Options

- **`bcrypt` or `argon2` package.** Rejected: both ship native binaries that complicate the Vercel build, and `scrypt` is sufficient for one admin account.
- **A JWT or session library.** Rejected: one fixed admin and one cookie need only an HMAC-signed value; a library adds surface for no gain.
- **In-memory attempt counter.** Rejected: it resets whenever Vercel starts a new instance, so it would stop nothing.
- **One global lockout.** Rejected: a stranger could lock the real admin out; the lockout is per source address.

## Consequences

- Changing `SESSION_SECRET` logs the admin out everywhere; it must be set in every environment or login is refused.
- Changing the admin password ends all other sessions, because each session carries a fingerprint of the stored hash.
- The login-attempt table needs migration `0002`, applied by Kim.
- Each session also has a row in `admin_sessions` (migration `0003`, applied by Kim), because a signed cookie alone cannot be taken back: logout deletes its row, and a password change deletes them all.
- `ADMIN_PASSWORD` is only a first-run bootstrap; the default password in source is gone.
