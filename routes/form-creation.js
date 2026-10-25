const db = require('../db');
const DateMode = require('../public/js/date-mode');

// Turns one validated submission into the form records to store. Kept apart from
// the insert so a reference code can later be added to each record before it is saved.
function expandSubmission(body) {
  const dates = [...body.datesOfOB].sort();
  if (body.dateMode === DateMode.MORE_THAN_ONE_DAY) {
    return [{ employees: body.employees, datesOfOB: dates }];
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
      approved_by, approved_by_position, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      now, body.office || '', body.division || '', record.datesOfOB[0], JSON.stringify(record.datesOfOB),
      body.locationFrom || '', body.locationTo, body.departureTime, body.returnTime, body.purpose,
      body.approvedBy || '', body.approvedByPosition || '', now,
    ]
  );
  const id = result.rows[0].id;
  for (const emp of record.employees) {
    await client.query('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [id, emp.name, emp.position || '']);
  }
  return { id, datesOfOB: record.datesOfOB };
}

// All records are stored in one transaction, so a failure part-way stores none.
function insertForms(body, records, now, insertOne = insertForm) {
  return db.transaction(async (client) => {
    const created = [];
    for (const record of records) created.push(await insertOne(client, body, record, now));
    return created;
  });
}

module.exports = { expandSubmission, insertForms, insertForm };
