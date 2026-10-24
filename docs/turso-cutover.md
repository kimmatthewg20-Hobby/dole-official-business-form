# Moving the database from Supabase to Turso (clean start)

Everything here is done by Kim, by hand. No script, check or agent touches Turso, Vercel or Supabase.
The decision is in [adr/0001](adr/0001-turso-libsql-replaces-supabase-postgres.md).

## TEST IT YOURSELF

Do this once on your laptop (local file database), then again on the staging Vercel preview (step 8 below), then a short pass on production (step 13).
Locally: `npm run db:migrate`, `npm run db:seed`, `npm start`, open http://localhost:3000. The local admin password is `local-test-admin`.
On staging and production, log in with the password you set in step 6.

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
- [ ] **Admin login.** Open `/admin`, user `cnpoadmin`. A wrong password is refused. The right password opens the admin page. On staging and production: the password you set in step 6 works.
- [ ] **Admin routes are protected.** In a private window (not logged in), open `/api/cleanup/test?dryRun=true`. You get an error, not a list.
- [ ] **Settings.** On `/admin`, change the division options and save. Reload `/`: the division list shows your new options. Change the admin password, log in again with the new one, then change it back.
- [ ] **Directory replace (local and staging only, never production).** Open `/employees.html`: add an entry, edit it, delete it; the list follows each step. Then, logged in on `/admin`, in the console run a replace with one bad row:
  `fetch('/api/employees/bulk-replace', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({employees: [{firstname: 'Good', last_name: 'Row', position: 'Test', assigned_unit: 'TSSD'}, {firstname: 'Bad'}]})}).then(r => r.json()).then(console.log)`
  It prints an error naming row 2, and `/employees.html` still shows the old directory unchanged.
- [ ] **Cleanup dry run.** On `/admin` under Data Cleanup, keep 25 days and click **Run Dry Test**. It lists only forms created more than 25 days ago and deletes nothing: the tracker shows the same forms afterwards. Do **not** click "Run Cleanup Now" on production.

## Cutover steps

This is a clean start: the Turso databases begin empty, so nothing is exported from Supabase and nothing is imported. Staff re-enter forms from now on. Supabase stays untouched.

Before you start: install the Turso CLI (`brew install tursodatabase/tap/turso`, then reopen the terminal) and log in (`turso auth login`). Keep a separate terminal for Turso work and close it when done, so the token never sits in a shell you use for development.

### Staging

1. **Create the staging database.** `turso db create ob-staging`, then `turso db show ob-staging --url` (the `libsql://...` URL) and `turso db tokens create ob-staging` (the token).
2. **Point your terminal at staging.** `export TURSO_DATABASE_URL=libsql://...` and `export TURSO_AUTH_TOKEN=...` (these win over any `.env`).
3. **Apply migrations.** `npm run db:migrate`. It lists `0001_initial_schema.sql` and `0002_login_attempts.sql` as applied. Run it again: nothing new is applied.
4. **Check foreign keys.** `turso db shell ob-staging "PRAGMA foreign_keys;"` must print `1`. If it prints `0`, stop: deleting a form would leave its employees behind.
5. **Preview deploy.** In Vercel, Project Settings, Environment Variables: add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the staging values, scoped to **Preview** only. Push the branch; Vercel builds a preview.
6. **First login on the empty database.** There is no admin password stored yet, so `/admin` accepts only the value of the `ADMIN_PASSWORD` variable in Vercel; set it first, or nobody can log in (there is no built-in default). Log in with username `cnpoadmin`, then change the password straight away (Admin, Change Password; at least 10 characters). From then on `ADMIN_PASSWORD` is ignored.
7. **Fill the empty tables.** In Admin, save the settings (office, division options). Open `/employees.html` while logged in as admin and load the employee directory (it offers to initialize an empty directory), or add people one by one.
8. **Walk through** the TEST IT YOURSELF list on the preview URL. Forms you create here go to staging only.

### Production

9. **Create the production database** (`turso db create ob-production`, URL and token as in step 1) and point your terminal at it (step 2).
10. **Migrate and check foreign keys:** steps 3 and 4 against `ob-production`.
11. **Switch the variables.** In Vercel, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the production values, scoped to **Production**. Set `ADMIN_PASSWORD` too (see step 6). Add `CRON_SECRET` scoped to **Production**: a long random value (`openssl rand -hex 32`), kept nowhere else. Without it the daily cleanup is refused. Keep `DATABASE_URL` for now.
12. **Deploy.** Merge to `main` (or redeploy) so production builds with the new code and the new variables. A production deployment without `TURSO_DATABASE_URL` refuses to start on purpose, instead of saving forms to a file Vercel throws away.
13. **First login and setup** as in steps 6 and 7, then a short walkthrough: submit, tracker, print, admin login, cleanup dry run. Delete the test form afterwards.
    **Check the daily cleanup.** In Vercel, Project, Settings, Cron Jobs: `/api/cron/cleanup` is listed with schedule `0 18 * * *` (18:00 UTC = 02:00 Philippine time). After the first night, open its **View Logs** (or Logs, filtered on `/api/cron/cleanup`): the call shows status 200. A 401 means `CRON_SECRET` is missing in Production or the deployment predates it: set it and redeploy. In a private window, `/api/cron/cleanup` must also answer 401.
14. Close the Turso terminal. Supabase stays untouched until you decide to retire it.

### Rollback

The new code no longer reads `DATABASE_URL`, so switching variables back on the new deployment does **not** reconnect Supabase. Rolling back means running the old code again:

1. In Vercel, Deployments, find the last production deployment from before the move (it was built with `DATABASE_URL`) and use **Instant Rollback** (or **Promote to Production**). It still has its own old variables.
2. If you redeploy old code instead, make sure `DATABASE_URL` is still set in Vercel (that is why steps 5 and 11 keep it).
3. Forms submitted on Turso after the switch are not in Supabase. Before rolling back, list them in the Turso shell (`turso db shell ob-production "select * from official_business where date_created > '<switch date>'"`) and re-enter the ones staff still need.
4. Supabase free projects pause after about a week with no traffic. If the rollback deployment cannot reach the database, restore the paused project in the Supabase dashboard first.

## Known notes

- **The 25-day cleanup runs on Vercel Cron.** Once a day at 18:00 UTC (02:00 Philippine time; Vercel may be up to about an hour late) Vercel calls `/api/cron/cleanup` with `CRON_SECRET`. Cron jobs run on the production deployment only, so staging previews never clean up on their own. The dry test and "Run Cleanup Now" on `/admin` stay as a backup.
- **The admin password is stored in plain text.** Hashing it is ticket 10.
- **Clean start means the old forms are not copied.** They stay in Supabase. If you later want them in Turso, `npm run db:import -- --help` loads a Supabase CSV export into an empty database (it refuses a database that already has rows unless you pass `--force`, which deletes them first).
