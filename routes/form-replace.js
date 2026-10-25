'use strict';

// Replaces one stored form's content and employees. Shared by the admin edit and the edit with
// a Reference code; runs on the caller's transaction client so the form and its employees change
// together or not at all. The Reference code column is never written here: it never changes.

async function writeFormContent(client, id, form) {
  await client.query(
    `UPDATE official_business SET office = ?, division = ?, date_of_ob = ?, dates_of_ob = ?,
      location_from = ?, location_to = ?, departure_time = ?, return_time = ?, purpose = ?,
      approved_by = ?, approved_by_position = ? WHERE id = ?`,
    [
      form.office, form.division, form.datesOfOB[0], JSON.stringify(form.datesOfOB),
      form.locationFrom, form.locationTo, form.departureTime, form.returnTime, form.purpose,
      form.approvedBy, form.approvedByPosition, id,
    ]
  );
  await client.query('DELETE FROM employees WHERE ob_id = ?', [id]);
  for (const emp of form.employees) {
    await client.query('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [
      id, emp.name, emp.position || '',
    ]);
  }
}

module.exports = { writeFormContent };
