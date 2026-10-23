# Official Business Form (DOLE)
Online Official Business form: staff submit OB forms, track them, and print them (2 per page). Users: DOLE regional office staff and one admin. Holds employee names, positions and an admin password: treat as personal data.

## Stack (do not change without asking)
Node.js · Express 4 · plain JavaScript (no TypeScript) · PostgreSQL on Supabase via `pg` · static HTML/JS in `public/` · Vercel (`@vercel/node`, `vercel.json`)

## Commands
dev: `npm start` (needs `.env`, never read it) · test: (none yet) · lint: (none yet) · typecheck: (none yet) · build: `npm run build` (echo only)
format: Prettier runs on staged files via pre-commit (Husky + lint-staged)

## Structure
server.js              all routes, sessions, cleanup job (large; split when touching)
db.js                  pg pool and query helpers
supabase_migration.sql schema (Kim applies it in the Supabase SQL editor)
public/                pages: index (form), tracker, admin, employees; print.js, release-form.js, js/sidebar.js

## Rules
- Reuse before create: search for an existing helper first.
- Files under 200 lines, functions small. server.js is already over: new code goes in new modules, not server.js.
- Names say what things are. No magic numbers or strings: use constants.
- Validate every input on the server. Authorize admin routes on the server, never only in the UI.
- Parameterized SQL only (`$1, $2`); never build queries from user input.
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
