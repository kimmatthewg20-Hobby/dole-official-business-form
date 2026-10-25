'use strict';

// The order the admin sets for an admin-kept pick-list (Divisions, Approvers). Table names come
// only from the routes' own constants, never from a request.

const db = require('../db');
const { BAD_REQUEST, serverError, requestBody } = require('./list-route-helpers');

const NOT_AN_ID = 'Each id in the new order must be a positive whole number';
const notAList = (noun) => `Send the new order as a list of ${noun} ids`;
const repeated = (noun, id) => `The new order lists ${noun} ${id} more than once`;
// The usual cause is a list changed in another tab since this page loaded it.
const notEveryOne = (noun) =>
  `The new order must list every ${noun} exactly once. Reload the page and try again.`;

// The next place is worked out inside the INSERT itself, so two adds at once cannot share it.
function insertAtEndSql(table, columns) {
  const placeholders = columns.map(() => '?').join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}, sort_order)
    SELECT ${placeholders}, COALESCE(MAX(sort_order), 0) + 1 FROM ${table} RETURNING id`;
}

function isPositiveWholeNumber(value) {
  return Number.isInteger(value) && value > 0;
}

// Returns { error } for the first problem, or {} when ids lists every stored id exactly once.
function checkNewOrder(ids, storedIds, noun) {
  if (!Array.isArray(ids)) return { error: notAList(noun) };
  if (!ids.every(isPositiveWholeNumber)) return { error: NOT_AN_ID };
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) return { error: repeated(noun, id) };
    seen.add(id);
  }
  const stored = new Set(storedIds);
  if (ids.length !== stored.size || !ids.every((id) => stored.has(id))) {
    return { error: notEveryOne(noun) };
  }
  return {};
}

// One UPDATE numbers every row 1..n from its place in the JSON list, so a long list costs one
// round trip to Turso rather than one per row. The ids are read inside the same transaction,
// so a row added or removed meanwhile makes the order refused instead of half applied.
function saveOrder(table, noun) {
  return async function saveListOrder(req, res) {
    try {
      const { ids } = requestBody(req.body);
      const { error } = await db.transaction(async (client) => {
        const stored = await client.query(`SELECT id FROM ${table}`, []);
        const checked = checkNewOrder(
          ids,
          stored.rows.map((row) => row.id),
          noun,
        );
        if (checked.error) return checked;
        await client.query(
          `UPDATE ${table} SET sort_order =
            (SELECT key + 1 FROM json_each(?) WHERE value = ${table}.id)`,
          [JSON.stringify(ids)],
        );
        return {};
      });
      if (error) return res.status(BAD_REQUEST).json({ error });
      res.json({ success: true });
    } catch (err) {
      serverError(res, `Error ordering the ${noun}s`, err);
    }
  };
}

module.exports = { insertAtEndSql, saveOrder };
