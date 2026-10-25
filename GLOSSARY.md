# Official Business Form

Staff of a DOLE regional office submit Official Business forms, track them and print them; one admin manages settings and the employee directory.

## Language

**Official Business form**:
A request recorded by staff for one or more employees to be away on official business for given dates, for a stated purpose. Printed two per page.
_Avoid_: OB, travel order

**Employee directory**:
The one list of employees (name, position, assigned unit) that staff pick from when filling in a form. The admin maintains it, and an employee named on a submitted form who is not yet in it is added automatically. An employee unused on any form for six months is removed.
_Avoid_: Employee list, staff table, remembered employees

**Date mode**:
The choice staff make under Date of Official Business ("File as" on the form). Every employee always gets their own form; two employees never share one. "More Than One Day" (shown as "All Dates", the default and the first button) makes one form per employee covering all the chosen dates. "Multiple Separate Days" (shown as "Separated Dates") makes one form per date per employee. Only the resulting forms are kept, not the mode. The two buttons appear only once two or more dates are chosen; with one date both give the same forms. The hover tips are "One form per employee, covering all the selected dates" and "One form per date per employee".

**Division**:
A named unit of the office that a form is filed under, with a short code (2-4 letters) used in the reference code. The admin keeps the list; staff must pick from it.
_Avoid_: Office, unit (an employee's "assigned unit" is a different thing)

**Approver**:
A person (name and position) who may be named as "Approved by" on a form. The admin keeps the list; staff must pick from it.
_Avoid_: Approving person, signatory

**Reference code**:
The code given to one Official Business form when it is submitted, such as DOLECN1026K7QX: "DOLE", the Division code, the month and year of submission (MMYY), and four random characters. Anyone holding the whole code may find and edit that form, so it is a secret and is not listed publicly.
_Avoid_: Control number, tracking number, ID

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
The period after repeated wrong attempts during which every further attempt from the same source is refused. It applies to admin logins (five wrong within fifteen minutes) and to Reference code lookups (ten wrong within fifteen minutes).
_Avoid_: Ban, throttle
