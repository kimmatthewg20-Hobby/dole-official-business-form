'use strict';

const assert = require('node:assert/strict');

const MISSING_FORM_ID = 999999;

async function createFormWithEmployees(db, employeeNames) {
  const form = await db.run(
    'INSERT INTO official_business (date_created, purpose) VALUES (?, ?) RETURNING id',
    [new Date().toISOString(), 'Database check']
  );
  for (const name of employeeNames) {
    await db.run('INSERT INTO employees (ob_id, name, position) VALUES (?, ?, ?)', [
      form.lastID,
      name,
      'Check Position',
    ]);
  }
  return form.lastID;
}

function employeesOf(db, formId) {
  return db.all('SELECT name FROM employees WHERE ob_id = ? ORDER BY id', [formId]);
}

function directorySnapshot(db) {
  return db.all('SELECT * FROM employees_directory ORDER BY id', []);
}

module.exports = [
  {
    name: 'run returns lastID and changes for writes',
    async run({ db }) {
      const inserted = await db.run('INSERT INTO official_business (purpose) VALUES (?)', [
        'Run check',
      ]);
      assert.equal(typeof inserted.lastID, 'number');
      assert.equal(inserted.changes, 1);

      const updated = await db.run('UPDATE official_business SET purpose = ? WHERE id = ?', [
        'Run check updated',
        inserted.lastID,
      ]);
      assert.equal(updated.changes, 1);

      const row = await db.get('SELECT purpose FROM official_business WHERE id = ?', [
        inserted.lastID,
      ]);
      assert.deepEqual(row, { purpose: 'Run check updated' });
      assert.equal(await db.get('SELECT id FROM official_business WHERE id = ?', [MISSING_FORM_ID]), null);
    },
  },
  {
    name: 'transaction commits and its query returns rows and rowCount',
    async run({ db }) {
      const formId = await db.transaction(async (client) => {
        const form = await client.query(
          'INSERT INTO official_business (purpose) VALUES (?) RETURNING id',
          ['Transaction check']
        );
        assert.equal(form.rowCount, 1);
        const id = form.rows[0].id;
        const employee = await client.query('INSERT INTO employees (ob_id, name) VALUES (?, ?)', [
          id,
          'Committed Sample',
        ]);
        assert.equal(employee.rowCount, 1);
        return id;
      });
      assert.deepEqual(await employeesOf(db, formId), [{ name: 'Committed Sample' }]);
    },
  },
  {
    name: 'foreign keys are enforced outside and inside transactions',
    async run({ db }) {
      await assert.rejects(
        db.run('INSERT INTO employees (ob_id, name) VALUES (?, ?)', [MISSING_FORM_ID, 'Orphan'])
      );
      await assert.rejects(
        db.transaction((client) =>
          client.query('INSERT INTO employees (ob_id, name) VALUES (?, ?)', [
            MISSING_FORM_ID,
            'Orphan',
          ])
        )
      );
    },
  },
  {
    name: 'deleting a form removes its employees',
    async run({ db }) {
      const formId = await createFormWithEmployees(db, ['Cascade One', 'Cascade Two']);
      assert.equal((await employeesOf(db, formId)).length, 2);

      const deleted = await db.run('DELETE FROM official_business WHERE id = ?', [formId]);
      assert.equal(deleted.changes, 1);
      assert.deepEqual(await employeesOf(db, formId), []);
    },
  },
  {
    name: 'deleting a form inside a transaction removes its employees',
    async run({ db }) {
      const formId = await createFormWithEmployees(db, ['Cascade Three']);
      await db.transaction((client) =>
        client.query('DELETE FROM official_business WHERE id = ?', [formId])
      );
      assert.deepEqual(await employeesOf(db, formId), []);
    },
  },
  {
    name: 'a transaction that fails partway rolls back and keeps the previous state',
    async run({ db }) {
      const before = await directorySnapshot(db);
      assert.ok(before.length > 0, 'the seed should provide directory entries');

      await assert.rejects(
        db.transaction(async (client) => {
          await client.query('DELETE FROM employees_directory', []);
          await client.query('INSERT INTO employees_directory (full_name) VALUES (?)', [
            'Replacement Sample',
          ]);
          await client.query('INSERT INTO no_such_table (full_name) VALUES (?)', ['Bad row']);
        })
      );

      assert.deepEqual(await directorySnapshot(db), before);
    },
  },
];
