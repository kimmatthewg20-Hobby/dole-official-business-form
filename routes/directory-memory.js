'use strict';

// The Employee directory remembers every employee named on a submitted form. It runs on the
// submission's transaction client, so a failure leaves neither the forms nor these writes.

const { cleanName, nameKey } = require('./directory-name');

const ISO_DATE_LENGTH = 10;

// A remembered employee keeps the position the admin or an earlier form gave it: a position
// typed on one form may be a temporary designation.
// A new entry gets the unit given for it (same position in `units` as in `employees`, set only
// by the Assistant filing), else the form's Division. An existing entry never gets a unit.
async function rememberEmployees(client, employees, division, now, units = []) {
  const lastUsedAt = now.slice(0, ISO_DATE_LENGTH);
  const seen = new Set();
  for (const [index, employee] of employees.entries()) {
    const key = nameKey(employee.name);
    if (seen.has(key)) continue;
    seen.add(key);
    const refreshed = await client.query('UPDATE employees_directory SET last_used_at = ? WHERE name_key = ?', [
      lastUsedAt,
      key,
    ]);
    if (refreshed.rowCount > 0) continue;
    await client.query(
      'INSERT INTO employees_directory (full_name, position, assigned_unit, name_key, last_used_at) VALUES (?, ?, ?, ?, ?)',
      [cleanName(employee.name), employee.position || '', (units[index] || '').trim() || division, key, lastUsedAt]
    );
  }
}

module.exports = { rememberEmployees };
