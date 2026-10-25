# 09: Make the 25-day cleanup run on Vercel

**What to build:** The cleanup of Official Business forms older than 25 days runs on a schedule in production using Vercel Cron. Today it relies on a startup run and a timer inside the server process, which a serverless platform does not keep alive reliably. Kim chose Vercel Cron on 2026-10-24.

**Blocked by:** None (ticket 08 is done and deployed).

**Status:** done

**Worker:** `worker-opus` (secret, deletes personal data, deployment config).

## Decisions (Kim, 2026-10-24)

- Trigger: Vercel Cron, once a day at night.
- Authorization: a `CRON_SECRET` environment variable. Vercel sends it as `Authorization: Bearer <CRON_SECRET>` on scheduled calls. The endpoint rejects any call without the exact secret. No admin session is involved.
- The in-process startup run and daily timer are removed (they never work on serverless).
- The manual admin dry-run / run buttons and `GET /api/cleanup/test` stay as a backup.
- The cleanup rule itself (25 days, `cleanupOldRecords`) is unchanged.

## Acceptance criteria

- [ ] A cron endpoint (for example `GET /api/cron/cleanup`) runs the existing 25-day cleanup and returns how many forms were deleted
- [ ] The endpoint rejects a request with no or a wrong secret (401) and deletes nothing; the secret is compared in constant time
- [ ] If `CRON_SECRET` is not set, the endpoint refuses every call instead of allowing them
- [ ] `vercel.json` has a daily schedule for the endpoint, and works with the current `builds`/`routes` format (verify against Vercel's current docs before building; if not compatible, say so and propose the smallest change)
- [ ] The startup cleanup and the daily timer are removed from `server.js`, and the `SKIP_STARTUP_CLEANUP` flag and its docs are removed or updated
- [ ] The manual admin cleanup route still works and is still admin-only
- [ ] `db:check` covers: correct secret deletes only forms older than the cut-off; wrong secret, no secret and unset `CRON_SECRET` are rejected and delete nothing
- [ ] Docs: `.env.example`, README and `docs/turso-cutover.md` name `CRON_SECRET`; a short note tells Kim to set it in Vercel (Production) and how to confirm the first run in the Vercel Cron logs
- [ ] Nothing in the work touches Vercel or Turso; setting the variable and checking the run are Kim's steps

## Notes

- Vercel's free plan allows daily schedules and may run them up to about an hour late; that is fine for a 25-day rule.
- Do not reuse `adminApiOnly`; the cron call has no cookie.
