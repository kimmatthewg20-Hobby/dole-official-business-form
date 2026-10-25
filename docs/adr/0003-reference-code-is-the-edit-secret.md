---
status: accepted
---

# The reference code is the edit secret

Staff edit a submitted form by presenting its reference code (DOLE + division code + MMYY + 4 random characters). There is no account, PIN or running number: the random part is what makes the code hard to guess, so the code is never listed publicly and never printed. Repeated wrong codes from one source are refused for a while (the Lockout), using the same database-backed counting as admin logins (ADR 0002).

## Considered Options

- **Sequential code (DOLECN10260001).** Rejected: the next form's code is one digit away, so anyone could edit anyone's form.
- **Sequential code plus a random edit suffix.** Rejected in favour of one code staff have to keep track of, not two.
- **A separate edit PIN.** Rejected: a second thing to remember and to look up.
- **Show the code on the printed form.** Rejected: printouts are posted and passed around, and anyone reading the code could edit the form.

## Consequences

- About 900,000 codes exist per division per month, so a collision is retried at creation, and guess protection (the Lockout) is required, not optional.
- A staff member who loses the code cannot edit; the admin can look up and edit any form without a code.
- The tracker list must never return codes; only an exact code lookup finds a form.
- Forms made before this ships have no code and are editable by the admin only.
- MMYY uses Philippine time, not server time.
- A new migration for codes, divisions, approvers and employee last-used dates is applied by Kim.
