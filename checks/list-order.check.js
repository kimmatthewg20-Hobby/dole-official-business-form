'use strict';

// The admin sets the order of the Divisions and the Approvers (GLOSSARY.md); staff see them
// in it. Every step runs on both lists.

const assert = require('node:assert/strict');
const { TEST_ADMIN_PASSWORD } = require('../scripts/seed');
const { loginCookie, sendJson } = require('./admin-http');
const { OK, BAD_REQUEST, UNAUTHORIZED } = require('./division-helpers');
const { LISTS, listedNames, listedIds, addAll, reorder } = require('./list-order-helpers');

const FORGED_SESSION = 'adminSession=forged.token.value.here';
const UNKNOWN_ID = 999999;
const NOT_A_LIST = (noun) => `Send the new order as a list of ${noun} ids`;
const NOT_AN_ID = 'Each id in the new order must be a positive whole number';
const NOT_EVERY_ONE = (noun) =>
  `The new order must list every ${noun} exactly once. Reload the page and try again.`;

function forEachList(name, run) {
  return LISTS.map((list) => ({
    name: `${list.noun}s: ${name}`,
    run: ({ baseUrl, db }) =>
      list.withNone(db, async () => {
        const cookie = await loginCookie(baseUrl, TEST_ADMIN_PASSWORD);
        await run({ baseUrl, db, list, cookie });
      }),
  }));
}

module.exports = [
  ...forEachList(
    'a new one goes to the end of the list, not into name order',
    async ({ baseUrl, list, cookie }) => {
      await addAll(baseUrl, list, cookie);
      assert.deepEqual(
        await listedNames(baseUrl, list),
        list.items.map((item) => item.name),
      );
    },
  ),
  ...forEachList(
    'the admin reorders the list and the public list shows the new order',
    async ({ baseUrl, list, cookie }) => {
      const [first, second, third] = await addAll(baseUrl, list, cookie);
      const response = await reorder(baseUrl, list, { ids: [third, first, second] }, cookie);
      assert.equal(response.status, OK);
      assert.deepEqual(await listedIds(baseUrl, list), [third, first, second]);
      const [itemA, itemB, itemC] = list.items;
      assert.deepEqual(await listedNames(baseUrl, list), [itemC.name, itemA.name, itemB.name]);
    },
  ),
  ...forEachList(
    'after a reorder a new one still goes to the end',
    async ({ baseUrl, list, cookie }) => {
      const [first, second, third] = await addAll(baseUrl, list, cookie);
      assert.equal(
        (await reorder(baseUrl, list, { ids: [second, third, first] }, cookie)).status,
        OK,
      );
      const added = await sendJson(baseUrl, 'POST', list.route, list.renamed, cookie);
      const { id } = await added.json();
      assert.deepEqual(await listedIds(baseUrl, list), [second, third, first, id]);
    },
  ),
  ...forEachList('editing one keeps its place in the list', async ({ baseUrl, list, cookie }) => {
    const ids = await addAll(baseUrl, list, cookie);
    const last = ids[ids.length - 1];
    const edited = await sendJson(baseUrl, 'PUT', `${list.route}/${last}`, list.renamed, cookie);
    assert.equal(edited.status, OK);
    assert.deepEqual(await listedIds(baseUrl, list), ids);
  }),
  ...forEachList(
    'a bad new order is refused with a clear message and changes nothing',
    async ({ baseUrl, list, cookie }) => {
      const [first, second, third] = await addAll(baseUrl, list, cookie);
      const refused = [
        [{ ids: [first, second] }, NOT_EVERY_ONE(list.noun)],
        [{ ids: [first, second, third, UNKNOWN_ID] }, NOT_EVERY_ONE(list.noun)],
        [{ ids: [first, second, UNKNOWN_ID] }, NOT_EVERY_ONE(list.noun)],
        [{ ids: [] }, NOT_EVERY_ONE(list.noun)],
        [
          { ids: [first, second, second] },
          `The new order lists ${list.noun} ${second} more than once`,
        ],
        [{ ids: [first, second, String(third)] }, NOT_AN_ID],
        [{ ids: [first, second, 2.5] }, NOT_AN_ID],
        [{ ids: [first, second, -third] }, NOT_AN_ID],
        [{ ids: [first, second, null] }, NOT_AN_ID],
        [{ ids: `${first},${second},${third}` }, NOT_A_LIST(list.noun)],
        [{}, NOT_A_LIST(list.noun)],
        [[first, second, third], NOT_A_LIST(list.noun)],
      ];
      for (const [body, message] of refused) {
        const response = await reorder(baseUrl, list, body, cookie);
        assert.equal(response.status, BAD_REQUEST, JSON.stringify(body));
        assert.equal((await response.json()).error, message, JSON.stringify(body));
        assert.deepEqual(await listedIds(baseUrl, list), [first, second, third]);
      }
    },
  ),
  ...forEachList(
    'reordering without an admin session is refused and changes nothing',
    async ({ baseUrl, list, cookie }) => {
      const [first, second, third] = await addAll(baseUrl, list, cookie);
      for (const noSession of [undefined, FORGED_SESSION]) {
        const response = await reorder(baseUrl, list, { ids: [third, second, first] }, noSession);
        assert.equal(response.status, UNAUTHORIZED);
      }
      assert.deepEqual(await listedIds(baseUrl, list), [first, second, third]);
    },
  ),
  ...forEachList(
    'the order route is not read as an id to edit',
    async ({ baseUrl, list, cookie }) => {
      await addAll(baseUrl, list, cookie);
      const response = await reorder(baseUrl, list, list.renamed, cookie);
      assert.equal(response.status, BAD_REQUEST);
      assert.equal((await response.json()).error, NOT_A_LIST(list.noun));
      assert.deepEqual(
        await listedNames(baseUrl, list),
        list.items.map((item) => item.name),
      );
    },
  ),
];
