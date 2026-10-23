---
name: ship
description: Build one ticket or a whole feature's tickets, each with the right model - scores the ticket, sends it to a Haiku, Sonnet or Opus worker, reviews it, fixes, commits. Use when Kim runs /ship with a ticket file or a .scratch feature folder.
disable-model-invocation: true
model: sonnet
effort: medium
---

# Ship

Input: a ticket (`.scratch/<feature>/issues/NN-<slug>.md`) or a feature folder (`.scratch/<feature>/`): then every ticket not `Status: done`, in number order, skipping any whose "Blocked by" tickets are not done.

For each ticket:

1. **Read** the ticket and `.scratch/<feature>/spec.md`. List the files it will likely touch (quick look only).
2. **Route** (first match wins) and say one line, e.g. `03 Export CSV → worker-sonnet (normal feature, 3 files)`:
   - `worker-opus`: touches auth, permissions/RLS, personal data, payments, migrations or secrets; or 6+ files; or the approach is unclear.
   - `worker-haiku`: no logic at all (copy, docs, config, renames, styling tweaks).
   - `worker-sonnet`: everything else.
3. **Build:** dispatch that worker (pass the matching `model`) with this brief:
   ```
   JOB: build ticket <path>   Title: <title>
   What to build: <from the ticket>
   Acceptance criteria: <verbatim>
   Spec: .scratch/<feature>/spec.md   Likely files: <list>
   Retry only - fix ONLY these findings: <list>
   ```
4. **Review:** follow `.claude/skills/code-review/SKILL.md` on the uncommitted changes (fixed point: HEAD) against the ticket. Opus-routed tickets: also check that every protected action has a test proving it is denied.
5. **Fix:** BLOCKER or MAJOR findings go back to a worker, findings only. After 2 failed rounds move one tier up (haiku → sonnet → opus). After 3 rounds: set the ticket `Status: blocked` with the reason, restore its files (`git checkout -- <files>`), continue with tickets that don't depend on it.
6. **Commit:** `git add` the ticket's files explicitly, `git commit -m "<NN>: <title>"`. Pre-commit runs the checks; a failure is a fix round. Then set the ticket `Status: done` (the ticket file is gitignored; no commit needed).

**End:** one line per ticket (worker, rounds, committed or blocked), then **TEST IT YOURSELF**: one checkbox per acceptance criterion in plain words (what to open, click and see). Cut off by a usage limit: run `/ship` on the folder again; done tickets are skipped.
