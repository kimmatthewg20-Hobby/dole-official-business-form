const db = require('../db');
const { rememberEmployees } = require('./directory-memory');
const { assignReferenceCode } = require('./reference-code');

// One submission is one stored form with every employee and every date, whichever Date mode
// was chosen; the mode is stored with it and only changes how it prints (GLOSSARY.md).
function expandSubmission(body) {
  return { employees: body.employees, datesOfOB: [...body.datesOfOB].sort() };
}

async function insertForm(client, body, record, now) {
  const result = await client.query(
    `INSERT INTO official_business (
      date_created, office, division, date_of_ob, dates_of_ob,
      location_from, location_to, departure_time, return_time, purpose,
      approved_by, approved_by_position, timestamp, reference_code, date_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      now, body.office || '', body.division || '', record.datesOfOB[0], JSON.stringify(record.datesOfOB),
      body.locationFrom || '', body.locationTo, body.departureTime, body.returnTime, body.purpose,
      body.approvedBy || '', body.approvedByPosition || '', now, record.referenceCode, body.dateMode,
    ]
  );
  const id = result.rows[0].id;
  for (const emp of record.employees) {
    await client.query('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [id, emp.name, emp.position || '']);
  }
  return { id, datesOfOB: record.datesOfOB, referenceCode: record.referenceCode };
}

// Validation already found the Division, but it may have been removed since.
async function divisionCode(client, divisionName) {
  const result = await client.query('SELECT code FROM divisions WHERE name = ?', [divisionName || '']);
  if (result.rows.length === 0) throw new Error('The chosen Division is no longer on the list');
  return result.rows[0].code;
}

// The form, its Reference code and the directory writes for its employees are stored in one
// transaction, so a failure part-way stores none of them.
function insertSubmission(body, record, now, { insertOne = insertForm, randomIndex, units } = {}) {
  return db.transaction(async (client) => {
    const codeOptions = { divisionCode: await divisionCode(client, body.division), now: new Date(now), randomIndex };
    const referenceCode = await assignReferenceCode(client, codeOptions);
    const created = await insertOne(client, body, { ...record, referenceCode }, now);
    await rememberEmployees(client, body.employees, body.division, now, units);
    return created;
  });
}

module.exports = { expandSubmission, insertSubmission, insertForm };
