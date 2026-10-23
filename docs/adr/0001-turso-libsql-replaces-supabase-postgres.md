---
status: accepted
---

# Turso (libSQL) replaces Supabase Postgres

The app moves from Supabase Postgres (`pg`) to Turso, using `@libsql/client`. During development the same client opens a local `file:local.db`; `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` choose Turso in staging and production. There is no Postgres fallback in the code, so every query path stays single.

## Considered Options

- **Keep Supabase.** Rejected: Kim chose Turso.
- **Support both databases behind an adapter.** Rejected: it doubles every query path (placeholders, `RETURNING`, transactions, schema) for no real benefit.
- **Local dev against `turso dev` or a separate dev Turso database.** Rejected: a local file needs no server or account and works offline.

## Consequences

- SQL placeholders are `?`, not `$1`; ids are `INTEGER PRIMARY KEY AUTOINCREMENT`.
- Schema lives in `migrations/*.sql`, applied by Kim; the app no longer alters tables on startup.
- SQLite differs from Postgres on foreign keys and transactions, so `npm run db:check` verifies cascade delete and rollback.
- Production data moves once, via exported files and `scripts/import-data.js`; Supabase stays untouched as the fallback until Kim retires it.
