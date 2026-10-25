'use strict';

// The two admin-kept pick-lists described once, so the order checks run the same steps on
// both. Not a check file itself: the runner only loads files ending in .check.js.

const assert = require('node:assert/strict');
const { sendJson } = require('./admin-http');
const { OK, withNoDivisions } = require('./division-helpers');
const { withNoApprovers } = require('./approver-helpers');

const LISTS = [
  {
    noun: 'Division',
    route: '/api/divisions',
    key: 'divisions',
    withNone: withNoDivisions,
    items: [
      { name: 'Camarines Norte Provincial Office', code: 'CNPO' },
      { name: 'Alpha Unit', code: 'AU' },
      { name: 'Zeta Unit', code: 'ZU' },
    ],
    renamed: { name: 'Aaa First By Name', code: 'AAA' },
  },
  {
    noun: 'Approver',
    route: '/api/approvers',
    key: 'approvers',
    withNone: withNoApprovers,
    items: [
      { name: 'Zeta Santos', position: 'Chief' },
      { name: 'Ana Reyes', position: 'Director' },
      { name: 'Ana Reyes', position: 'Officer in Charge' },
    ],
    renamed: { name: 'Aaa First By Name', position: 'Chief' },
  },
];

async function listed(baseUrl, list) {
  const response = await fetch(`${baseUrl}${list.route}`);
  assert.equal(response.status, OK);
  return (await response.json())[list.key];
}

async function listedNames(baseUrl, list) {
  return (await listed(baseUrl, list)).map((item) => item.name);
}

async function listedIds(baseUrl, list) {
  return (await listed(baseUrl, list)).map((item) => item.id);
}

// Adds the list's sample items in their written order and returns their ids in that order.
async function addAll(baseUrl, list, cookie) {
  const ids = [];
  for (const item of list.items) {
    const response = await sendJson(baseUrl, 'POST', list.route, item, cookie);
    assert.equal(response.status, OK);
    ids.push((await response.json()).id);
  }
  return ids;
}

function reorder(baseUrl, list, body, cookie) {
  return sendJson(baseUrl, 'PUT', `${list.route}/order`, body, cookie);
}

module.exports = { LISTS, listed, listedNames, listedIds, addAll, reorder };
