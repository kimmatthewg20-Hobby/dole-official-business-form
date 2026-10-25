const db = require('../db');
const DateMode = require('../public/js/date-mode');
const { rememberEmployees } = require('./directory-memory');
const { assignReferenceCode } = require('./reference-code');

// Turns one validated submission into the form records to store. Kept apart from
// the insert so each record gets its own Reference code before it is saved.
function expandSubmission(body) {
  const dates = [...body.datesOfOB].sort();
  if (body.dateMode === DateMode.MORE_THAN_ONE_DAY) {
    return body.employees.map((employee) => ({ employees: [employee], datesOfOB: dates }));
  }
  const records = [];
  for (const date of dates) {
    for (const employee of body.employees) records.push({ employees: [employee], datesOfOB: [date] });
  }
  return records;
}

async function insertForm(client, body, record, now) {
  const result = await client.query(
    `INSERT INTO official_business (
      date_created, office, division, date_of_ob, dates_of_ob,
      location_from, location_to, departure_time, return_time, purpose,
      approved_by, approved_by_position, timestamp, reference_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      now, body.office || '', body.division || '', record.datesOfOB[0], JSON.stringify(record.datesOfOB),
      body.locationFrom || '', body.locationTo, body.departureTime, body.returnTime, body.purpose,
      body.approvedBy || '', body.approvedByPosition || '', now, record.referenceCode,
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

// All records, their Reference codes and the directory writes for their employees are stored
// in one transaction, so a failure part-way stores none of them.
function insertForms(body, records, now, { insertOne = insertForm, randomIndex } = {}) {
  return db.transaction(async (client) => {
    const codeOptions = { divisionCode: await divisionCode(client, body.division), now: new Date(now), randomIndex };
    const created = [];
    for (const record of records) {
      const referenceCode = await assignReferenceCode(client, codeOptions);
      created.push(await insertOne(client, body, { ...record, referenceCode }, now));
    }
    await rememberEmployees(client, body.employees, body.division, now);
    return created;
  });
}

module.exports = { expandSubmission, insertForms, insertForm };
