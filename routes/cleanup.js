const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');

const DEFAULT_RETENTION_DAYS = 25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Midnight (server local time) of the day `daysOld` days ago, as the old Postgres-era code computed it.
function getCutoffDate(daysOld) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

// date_created is ISO text, so the comparison is done on parsed dates rather than as text:
// that keeps the original rule and skips unparseable values instead of deleting them.
async function findOldRecords(daysOld) {
  const cutoff = getCutoffDate(daysOld);
  const rows = await db.all(
    "SELECT id, date_created FROM official_business WHERE date_created IS NOT NULL AND date_created != ''",
    []
  );
  const old = [];
  for (const row of rows) {
    const created = new Date(row.date_created);
    if (isNaN(created.getTime())) {
      console.warn(`Could not parse date_created for record ${row.id}: ${row.date_created}`);
    } else if (created < cutoff) {
      old.push({ id: row.id, date_created: row.date_created, age_days: Math.floor((Date.now() - created) / MS_PER_DAY) });
    }
  }
  return old;
}

async function deleteRecords(ids) {
  // Employees go with their form through the ON DELETE CASCADE foreign key.
  return db.transaction(async (client) => {
    let deleted = 0;
    for (const id of ids) {
      deleted += (await client.query('DELETE FROM official_business WHERE id = ?', [id])).rowCount || 0;
    }
    return deleted;
  });
}

async function cleanupOldRecords(daysOld = DEFAULT_RETENTION_DAYS, dryRun = false) {
  const records = await findOldRecords(daysOld);
  if (records.length === 0) return { deleted: 0, records: [] };
  if (dryRun) return { deleted: 0, wouldDelete: records.length, records };
  const ids = records.map((record) => record.id);
  const deleted = await deleteRecords(ids);
  console.log(`Cleanup completed: deleted ${deleted} official business record(s) and their employees.`);
  return { deleted, ids, records };
}

const router = express.Router();

router.get('/api/cleanup/test', adminApiOnly, async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days, 10) || DEFAULT_RETENTION_DAYS;
    const dryRun = req.query.dryRun === 'true';
    const result = await cleanupOldRecords(daysOld, dryRun);
    res.json({ success: true, message: dryRun ? 'Dry run completed' : 'Cleanup completed', result });
  } catch (error) {
    console.error('Cleanup test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, cleanupOldRecords, DEFAULT_RETENTION_DAYS };
