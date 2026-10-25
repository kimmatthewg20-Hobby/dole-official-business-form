# 11: Signed admin session and logout

**What to build:** The forgeable `adminAuth=1` cookie is replaced by an HMAC-signed session that the server issues at login and verifies on every admin request. It expires after one hour, can be ended by a real logout, and ends for everyone when the admin password changes. Decisions: ADR 0002, `GLOSSARY.md`.

**Blocked by:** 10 (Hash and upgrade the admin password).

**Status:** done

**Worker:** `worker-opus` (auth, secrets).

## Acceptance criteria

- [ ] Login sets a signed session cookie: `httpOnly`, `SameSite=Strict`, `Secure` on Vercel, expiry one hour (named constant)
- [ ] `SESSION_SECRET` is read at request time; if it is missing or empty, login is refused and no session is issued (never a fallback secret)
- [ ] Every admin route (`adminApiOnly`, `adminOnly`, and `/api/admin/check`) accepts only a valid, unexpired, correctly signed session; a forged `adminAuth=1`, a tampered signature and an expired token are all rejected
- [ ] Signatures are compared in constant time and the secret is never logged
- [ ] `POST /api/admin/logout` clears the cookie and the old token no longer works afterwards; the admin page has a Logout button that calls it, and the 5-minute idle timer calls it too
- [ ] The session carries a fingerprint of the stored password hash; after the admin password is changed, every session issued before the change is rejected, and the admin who made the change is given a fresh session
- [ ] `.env.example`, README and `docs/turso-cutover.md` name `SESSION_SECRET`
- [ ] `db:check` covers each rejection above and a normal login, logout and password-change flow through the HTTP routes
- [ ] The checks set `SESSION_SECRET` themselves; nothing touches Vercel (Kim sets the variable)
