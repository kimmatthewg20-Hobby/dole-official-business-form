'use strict';

// The Employee directory forgets employees unused on any form for six months (GLOSSARY.md).
// last_used_at is a UTC calendar day (YYYY-MM-DD), as forms and the column default write it.

const db = require('../db');

const UNUSED_EMPLOYEE_MONTHS = 6;
const ISO_DATE_LENGTH = 10;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The same day of the month six months back; a month too short for that day gives its last
// day, so the cut-off never rolls forward into the following month.
function sixMonthCutoff(now) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - UNUSED_EMPLOYEE_MONTHS;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(now.getUTCDate(), lastDayOfMonth);
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, ISO_DATE_LENGTH);
}

// A value that is not a real calendar day (such as 1999-02-30) is never read as old: this
// deletes personal data, so only a date that can be trusted may cause it.
function isRealDay(value) {
  if (typeof value !== 'string' || !ISO_DAY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, ISO_DATE_LENGTH) === value;
}

async function findUnusedEmployees(cutoff) {
  const rows = await db.all(
    'SELECT id, full_name, last_used_at FROM employees_directory WHERE last_used_at < ? ORDER BY id',
    [cutoff]
  );
  return rows.filter((row) => isRealDay(row.last_used_at));
}

// Matching the last-used date as read keeps an employee named on a form since then.
async function deleteEmployees(entries) {
  return db.transaction(async (client) => {
    const ids = [];
    for (const entry of entries) {
      const sql = 'DELETE FROM employees_directory WHERE id = ? AND last_used_at = ?';
      const { rowCount } = await client.query(sql, [entry.id, entry.last_used_at]);
      if (rowCount > 0) ids.push(entry.id);
    }
    return ids;
  });
}

async function cleanupUnusedEmployees(dryRun = false) {
  const entries = await findUnusedEmployees(sixMonthCutoff(new Date()));
  if (dryRun) return { deleted: 0, wouldDelete: entries.length, entries };
  if (entries.length === 0) return { deleted: 0, ids: [] };
  const ids = await deleteEmployees(entries);
  console.log(`Cleanup completed: removed ${ids.length} employee(s) unused for ${UNUSED_EMPLOYEE_MONTHS} months.`);
  return { deleted: ids.length, ids };
}

module.exports = { cleanupUnusedEmployees, sixMonthCutoff, isRealDay, UNUSED_EMPLOYEE_MONTHS };
