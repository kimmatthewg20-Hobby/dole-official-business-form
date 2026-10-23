# Official Business Form (DOLE)
Online Official Business form: staff submit OB forms, track them, and print them (2 per page). Users: DOLE regional office staff and one admin. Holds employee names, positions and an admin password: treat as personal data.

## Stack (do not change without asking)
Node.js 20+ · Express 4 · plain JavaScript (no TypeScript) · libSQL via `@libsql/client`: Turso in staging/production, local file `file:local.db` in development (ADR 0001) · static HTML/JS in `public/` · Vercel (`@vercel/node`, `vercel.json`)
Env: `TURSO_DATABASE_URL` (unset = `file:local.db`; required on Vercel) · `TURSO_AUTH_TOKEN` (only for a Turso URL). `DATABASE_URL` is not read.

## Commands
setup: `npm run db:migrate` then `npm run db:seed` (fake data, local file only) · dev: `npm start` (`.env` optional, never read it)
test: `npm run db:check` (throwaway database, all route and import checks) · import: `npm run db:import -- --help` (Kim, at cutover)
lint: (none yet) · typecheck: (none yet) · build: `npm run build` (echo only)
format: Prettier runs on staged files via pre-commit (Husky + lint-staged)

## Structure
server.js     app setup, JSON export/import, daily cleanup timer (large; split when touching)
db.js         libSQL client and helpers: query, get, all, run, transaction, batch
routes/       one module per area: forms, tracker, print, settings, admin-auth, directory, cleanup
migrations/   numbered .sql files; `db:migrate` applies new ones, Kim applies them to Turso
scripts/      migrate, seed, import-data (Supabase CSV/JSON export into libSQL)
checks/       `db:check` runner and *.check.js files (HTTP seam, throwaway database)
local.db      development database (gitignored)
docs/         adr/, turso-cutover.md (TEST IT YOURSELF and cutover steps)
public/       pages: index (form), tracker, admin, employees; print.js, release-form.js, js/sidebar.js

## Rules
- Reuse before create: search for an existing helper first.
- Files under 200 lines, functions small. server.js is already over: new code goes in new modules, not server.js.
- Names say what things are. No magic numbers or strings: use constants.
- Validate every input on the server. Authorize admin routes on the server, never only in the UI.
- Parameterized SQL only (`?` placeholders); never build queries from user input.
- Escape user text before putting it into HTML (forms are printed and shown to others).
- Paginate lists. Index columns you filter or sort by.
- Migrations are files only. Kim applies them. Never touch production or the live database. Never push.
- Comments explain why, never what. No dead or commented-out code.
- Specs and tickets live in `.scratch/` (gitignored): open them by path; file search may skip them.

## Router (every prompt)
The session runs on Sonnet, medium effort. For each prompt pick ONE route, say it in one line (`Route: worker-opus - touches auth`), then act.

| Prompt | Route |
|---|---|
| Question, explanation, or a small clear change (1-2 files, normal logic) | Do it yourself |
| Chore with no logic (copy, docs, config, renames, formatting, styling tweaks) | `worker-haiku` |
| Risky or hard: auth, admin password, permissions, personal data, payments, migrations, secrets; 6+ files; cross-module design | `worker-opus` |
| Bug with an unknown cause | Follow `.claude/skills/diagnosing-bugs/SKILL.md` (it switches to Opus itself) |
| New feature or anything not yet specified | Do not build. Tell Kim: `/grill-with-docs` -> `/to-spec` -> `/to-tickets` -> `/ship` |
| Build tickets | Tell Kim: `/ship .scratch/<feature>/` |

Workers get a self-contained brief (the job, acceptance criteria, likely files) and the matching `model`. After a worker: check its result, run the tests it touched, follow `.claude/skills/code-review/SKILL.md` for non-trivial code, then commit with explicit paths.

## Domain words
GLOSSARY.md is the source. Use its exact words in code, tests and UI. Decisions: docs/adr/.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## How we work
1. Sessions start on Sonnet medium. One feature per session.
2. New feature: /grill-with-docs (runs on Opus) -> /to-spec -> /to-tickets. Too big: /wayfinder first.
3. /clear, then /ship .scratch/<feature>/ - each ticket goes to the right worker, gets reviewed and committed.
4. Anything else: just ask; the Router picks who does it.
5. Bug: /diagnosing-bugs.
6. Kim tests with the TEST IT YOURSELF checklist, pushes, opens the PR; CI must pass; Vercel deploys.
7. Weekly: /improve-codebase-architecture.
