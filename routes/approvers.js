'use strict';

// The Approver list (GLOSSARY.md). Listing is public because the form page picks from it;
// every change needs an admin session. Stored forms hold the approver as text, so nothing
// here ever touches them.

const express = require('express');
const db = require('../db');
const { adminApiOnly } = require('./admin-auth');
const { validateApprover } = require('./approver-validation');
const {
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  NO_ID,
  serverError,
  parseId,
  failedSave,
} = require('./list-route-helpers');
const { insertAtEndSql, saveOrder } = require('./list-order');

// A bound on the public list; adding is refused at the bound so the list never cuts one off.
const MAX_APPROVERS = 200;
const TOO_MANY = `There can be at most ${MAX_APPROVERS} Approvers`;
const CLASH_RACE = 'This Approver already exists';
const NOT_FOUND_MESSAGE = 'Approver not found';
const TABLE = 'approvers';
const NOUN = 'Approver';

// Compared without regard to capitals, as the unique index on name and position does.
async function findClash({ name, position }, exceptId) {
  const clash = await db.get(
    `SELECT name, position FROM approvers
     WHERE name = ? COLLATE NOCASE AND position = ? COLLATE NOCASE AND id != ? LIMIT 1`,
    [name, position, exceptId],
  );
  return clash ? `${clash.name} is already an Approver as ${clash.position}` : null;
}

async function listApprovers(req, res) {
  try {
    const approvers = await db.all(
      `SELECT id, name, position FROM approvers
       ORDER BY sort_order, name COLLATE NOCASE, position, id LIMIT ?`,
      [MAX_APPROVERS],
    );
    res.json({ approvers });
  } catch (err) {
    serverError(res, 'Error listing Approvers', err);
  }
}

async function addApprover(req, res) {
  try {
    const { value, error } = validateApprover(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    const { total } = await db.get('SELECT COUNT(*) AS total FROM approvers', []);
    if (total >= MAX_APPROVERS) return res.status(BAD_REQUEST).json({ error: TOO_MANY });
    const clash = await findClash(value, NO_ID);
    if (clash) return res.status(CONFLICT).json({ error: clash });
    const result = await db.run(insertAtEndSql(TABLE, ['name', 'position']), [
      value.name,
      value.position,
    ]);
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    failedSave(res, 'Error adding an Approver', err, CLASH_RACE);
  }
}

async function editApprover(req, res) {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    const { value, error } = validateApprover(req.body);
    if (error) return res.status(BAD_REQUEST).json({ error });
    const clash = await findClash(value, id);
    if (clash) return res.status(CONFLICT).json({ error: clash });
    const result = await db.run('UPDATE approvers SET name = ?, position = ? WHERE id = ?', [
      value.name,
      value.position,
      id,
    ]);
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    res.json({ success: true });
  } catch (err) {
    failedSave(res, 'Error editing an Approver', err, CLASH_RACE);
  }
}

async function removeApprover(req, res) {
  try {
    const id = parseId(req.params.id);
    const result =
      id === null ? { changes: 0 } : await db.run('DELETE FROM approvers WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(NOT_FOUND).json({ error: NOT_FOUND_MESSAGE });
    res.json({ success: true });
  } catch (err) {
    serverError(res, 'Error removing an Approver', err);
  }
}

const router = express.Router();
router.get('/api/approvers', listApprovers);
router.post('/api/approvers', adminApiOnly, addApprover);
// Before /:id, which would otherwise read "order" as an id.
router.put('/api/approvers/order', adminApiOnly, saveOrder(TABLE, NOUN));
router.put('/api/approvers/:id', adminApiOnly, editApprover);
router.delete('/api/approvers/:id', adminApiOnly, removeApprover);

module.exports = { router, MAX_APPROVERS };
