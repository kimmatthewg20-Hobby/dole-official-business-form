# Official Business Form

Staff of a DOLE regional office submit Official Business forms, track them and print them; one admin manages settings and the employee directory.

## Language

**Official Business form**:
A request recorded by staff for one or more employees to be away on official business for given dates, for a stated purpose. Printed two per page.
_Avoid_: OB, travel order

**Employee directory**:
The admin-maintained list of employees (name, position, assigned unit) that staff pick from when filling in a form.
_Avoid_: Employee list, staff table

**Admin**:
The one person who may change settings, the employee directory and stored forms. Identified by a fixed username and the admin password.
_Avoid_: Superuser, owner

**Admin password**:
The secret the admin types to log in. Stored only in scrambled (hashed) form; shown to nobody, including the admin.
_Avoid_: Admin key, passcode

**Admin session**:
The time-limited permission an admin receives after a correct login. It ends on expiry, on logout, and when the admin password is changed.
_Avoid_: Admin cookie, admin token

**Lockout**:
The period after five wrong admin logins within fifteen minutes during which every login attempt from the same source is refused.
_Avoid_: Ban, throttle
