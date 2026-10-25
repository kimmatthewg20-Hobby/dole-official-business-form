'use strict';

// Forms from before the one-form-per-employee change can hold several employees. Submitting
// can no longer make one, so the checks that need one build it here: the first employee goes
// through the normal route, the others are inserted straight into the database.

const { VALID_SUBMISSION, submit } = require('./form-helpers');

async function submitSharedForm(baseUrl, db, body = VALID_SUBMISSION) {
  const [first, ...others] = body.employees;
  const created = await (await submit(baseUrl, { ...body, employees: [first] })).json();
  for (const employee of others) {
    await db.run('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [
      created.id,
      employee.name,
      employee.position || '',
    ]);
  }
  return created;
}

module.exports = { submitSharedForm };
