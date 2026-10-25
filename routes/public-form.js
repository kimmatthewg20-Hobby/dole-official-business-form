'use strict';

// One stored form as public callers get it: by id (retrieve) and by Reference code (lookup).

const db = require('../db');
const { withoutReferenceCode } = require('./reference-code');

// Takes a whole stored row, or none, and answers with null when there is no form.
async function publicFormWithEmployees(row) {
  // Public callers may not see the Reference code (the edit secret), so it is left out.
  const formData = withoutReferenceCode(row);
  if (!formData) return null;
  if (formData.dates_of_ob) {
    try {
      formData.datesOfOB = JSON.parse(formData.dates_of_ob);
    } catch (e) {
      // Some older rows hold text that is not a JSON list; their single date stands in.
      formData.datesOfOB = [formData.date_of_ob];
    }
  }
  const employees = await db.all('SELECT name, position FROM employees WHERE ob_id = ?', [formData.id]);
  return { formData, employees };
}

module.exports = { publicFormWithEmployees };
