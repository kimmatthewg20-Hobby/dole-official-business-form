# Moving the database from Supabase to Turso

Everything here is done by Kim, by hand. No script, check or agent touches Turso, Vercel or Supabase.
The decision is in [adr/0001](adr/0001-turso-libsql-replaces-supabase-postgres.md).

## TEST IT YOURSELF

Do this once on your laptop (local file database), then again on the staging Vercel preview (step 9 below), then a short pass on production (step 15).
Locally: `npm run db:migrate`, `npm run db:seed`, `npm start`, open http://localhost:3000. The local admin password is `local-test-admin`.
On staging and production, log in with the **current production admin password** instead.

Edit, delete and directory replace have no button in the pages; those three items use the browser console (F12, Console tab) on the open site, so the request goes to that same site. Replace `ID` with the form number shown in the tracker.

- [ ] **Submit.** Open `/`. Fill in the date(s), From/To, departure and return time, purpose, division, approved by and position. Add three employees. Click submit. You see a success message and can open the printable form.
- [ ] **Submit refuses bad input.** Try to submit with the purpose empty. You see an error and nothing is saved (the tracker does not show it).
- [ ] **Tracker.** Open `/tracker`. The form you just submitted is at the top with all three employee names. Type part of the purpose or an employee name in the search box: the form stays in the list; type nonsense: it disappears. With more than 15 forms, **Next** shows the next 15, newest first. On staging/production, the imported forms of the last 10 days are there.
- [ ] **Edit.** On `/tracker`, in the console run:
  `fetch('/api/update/ID', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({formData: {datesOfOB: ['2026-11-03'], location_to: 'Edited place', purpose: 'Edited purpose', division: 'TSSD'}, employees: [{name: 'Edit One', position: 'Test'}, {name: 'Edit Two', position: 'Test'}]})}).then(r => r.json()).then(console.log)`
  It prints `success: true`. Reload the tracker and click **View**: the new purpose and exactly the two new employees, none of the old three.
- [ ] **Delete.** Log in on `/admin` first, then in the console on that tab run:
  `fetch('/api/delete/ID', {method: 'DELETE'}).then(r => r.json()).then(console.log)`
  It prints `success: true`. The form is gone from the tracker, and `/print/ID` no longer shows it.
- [ ] **Print two per page.** Submit a form with three or four employees and click **View** in the tracker (opens `/print/<id>`). The browser's print preview shows one form per employee, two forms on each 8.5" x 13" page with the cutout line between them, and every name is right.
- [ ] **Admin login.** Open `/admin`, user `cnpoadmin`. A wrong password is refused. The right password opens the admin page. On staging and production: the password that works on Supabase today still works after the import.
- [ ] **Admin routes are protected.** In a private window (not logged in), open `/api/cleanup/test?dryRun=true`. You get an error, not a list.
- [ ] **Settings.** On `/admin`, change the division options and save. Reload `/`: the division list shows your new options. Change the admin password, log in again with the new one, then change it back.
- [ ] **Directory replace (local and staging only, never production).** Open `/employees.html`: add an entry, edit it, delete it; the list follows each step. Then, logged in on `/admin`, in the console run a replace with one bad row:
  `fetch('/api/employees/bulk-replace', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({employees: [{firstname: 'Good', last_name: 'Row', position: 'Test', assigned_unit: 'TSSD'}, {firstname: 'Bad'}]})}).then(r => r.json()).then(console.log)`
  It prints an error naming row 2, and `/employees.html` still shows the old directory unchanged.
- [ ] **Cleanup dry run.** On `/admin` under Data Cleanup, keep 25 days and click **Run Dry Test**. It lists only forms created more than 25 days ago and deletes nothing: the tracker shows the same forms afterwards. Do **not** click "Run Cleanup Now" on production.

## Cutover steps

Before you start: install the Turso CLI and log in (`turso auth login`). Keep a separate terminal for Turso work and close it when done, so the token never sits in a shell you use for development.

### Staging

1. **Export from Supabase.** In the Supabase dashboard, Table Editor, export each of the four tables as CSV: `official_business`, `employees`, `employees_directory`, `settings`. Save them in a folder outside the repo (they hold staff names and the admin password). Write down each table's row count. This only reads Supabase.
2. **Create the staging database.** `turso db create ob-staging`, then `turso db show ob-staging --url` (the `libsql://...` URL) and `turso db tokens create ob-staging` (the token).
3. **Point your terminal at staging.** `export TURSO_DATABASE_URL=libsql://...` and `export TURSO_AUTH_TOKEN=...` (these win over any `.env`).
4. **Apply migrations.** `npm run db:migrate`. It lists `0001_initial_schema.sql` as applied. Run it again: nothing new is applied.
5. **Check foreign keys.** `turso db shell ob-staging "PRAGMA foreign_keys;"` must print `1`. If it prints `0`, stop: deleting a form would leave its employees behind.
6. **Import, before opening the app.** Opening the app first can create a settings row, and the import refuses a database that already has rows.
   `npm run db:import -- --official-business=PATH --employees=PATH --employees-directory=PATH --settings=PATH`
   It prints the target (Turso host only) and the row count per table. If one row is invalid, nothing is written and the error names it.
7. **Compare counts** with the numbers from step 1. They must match exactly.
8. **Preview deploy.** In Vercel, Project Settings, Environment Variables: add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the staging values, scoped to **Preview** only. Leave the old `DATABASE_URL` in place (the new code ignores it). Push the branch; Vercel builds a preview.
9. **Walk through** the whole TEST IT YOURSELF list on the preview URL, with the production admin password. Forms you create here go to staging only.

### Production

10. **Pick a quiet time** (no one submitting forms) and repeat step 1: a fresh export, so nothing submitted since the staging export is lost.
11. **Create the production database** (`turso db create ob-production`, URL and token as in step 2) and point your terminal at it (step 3).
12. **Migrate, check foreign keys, import, compare counts:** steps 4 to 7 against `ob-production`.
13. **Switch the variables.** In Vercel, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the production values, scoped to **Production**. Keep `DATABASE_URL` for now.
14. **Deploy.** Merge to `main` (or redeploy) so production builds with the new code and the new variables. A production deployment without `TURSO_DATABASE_URL` refuses to start on purpose, instead of saving forms to a file Vercel throws away.
15. **Short walkthrough** on production: submit, tracker, print, admin login, cleanup dry run. Delete the test form afterwards.
16. Close the Turso terminal. Supabase stays untouched until you decide to retire it.

### Rollback

The new code no longer reads `DATABASE_URL`, so switching variables back on the new deployment does **not** reconnect Supabase. Rolling back means running the old code again:

1. In Vercel, Deployments, find the last production deployment from before the move (it was built with `DATABASE_URL`) and use **Instant Rollback** (or **Promote to Production**). It still has its own old variables.
2. If you redeploy old code instead, make sure `DATABASE_URL` is still set in Vercel (that is why steps 8 and 13 keep it).
3. Forms submitted on Turso after the switch are not in Supabase. Before rolling back, list them in the Turso shell (`turso db shell ob-production "select * from official_business where date_created > '<switch date>'"`) and re-enter the ones staff still need.
4. Supabase free projects pause after about a week with no traffic. If the rollback deployment cannot reach the database, restore the paused project in the Supabase dashboard first.

## Known notes

- **The 25-day cleanup does not run reliably on Vercel.** It runs when a server instance starts and on a 24-hour timer, but serverless instances do not stay alive. Fixing it with Vercel Cron is ticket 09. Until then, run the dry test and "Run Cleanup Now" by hand from `/admin` when needed.
- **The admin password is still stored in plain text**, and the import copies it unchanged so the admin can keep logging in. Hashing it is ticket 10. Treat the export CSVs as secrets and delete them after the move.
- **Empty fields become NULL.** In the CSV, an unquoted empty field (or an unquoted `NULL`) imports as NULL, not as an empty string. The pages show both the same way.
- **Employees without a form block the import.** Every employee's `ob_id` must match an imported form, so a row with an empty `ob_id` makes the whole import refuse. Such rows never show anywhere; leave them out of the CSV (for example, export `employees` from the SQL editor with `select * from employees where ob_id is not null`) and note how many you left out.
- **`--force`** makes the import delete every row of the four tables first. Use it only to redo an import on a database nobody uses yet.
- **Ids are kept**, and new forms continue after the highest imported id.
