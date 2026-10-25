'use strict';

// The Reference code (GLOSSARY.md, ADR 0003): its format, the month in Philippine time and
// the retry when a random part is already taken.

const assert = require('node:assert/strict');
const {
  REFERENCE_CODE_ALPHABET,
  makeReferenceCode,
  assignReferenceCode,
} = require('../routes/reference-code');
const { withFormsRestored, insertForm } = require('./form-helpers');

const LOOKALIKES = ['0', 'O', '1', 'I'];
const DIVISION_CODE = 'CN';

// Hands out the given alphabet positions in turn, so a check knows each random part.
function fixedPositions(positions) {
  let next = 0;
  return () => positions[next++ % positions.length];
}

function codeAt(isoTime, positions = [0, 1, 2, 3]) {
  return makeReferenceCode(DIVISION_CODE, new Date(isoTime), fixedPositions(positions));
}

module.exports = [
  {
    name: 'DOLE, the Division code, MMYY and four characters from the alphabet',
    async run() {
      assert.equal(codeAt('2026-10-15T04:00:00.000Z'), 'DOLECN1026ABCD');
      assert.equal(codeAt('2026-03-05T04:00:00.000Z', [30, 30, 30, 30]), 'DOLECN03269999');
    },
  },
  {
    name: 'the alphabet has no characters that look alike and no repeats',
    async run() {
      for (const lookalike of LOOKALIKES) assert.ok(!REFERENCE_CODE_ALPHABET.includes(lookalike), lookalike);
      assert.equal(new Set(REFERENCE_CODE_ALPHABET).size, REFERENCE_CODE_ALPHABET.length);
      for (let attempt = 0; attempt < 200; attempt += 1) {
        assert.match(makeReferenceCode(DIVISION_CODE, new Date()), /^DOLECN\d{4}[A-HJKMNP-Z2-9]{4}$/);
      }
    },
  },
  {
    name: 'MMYY follows Philippine time across month and year ends',
    async run() {
      assert.equal(codeAt('2026-10-31T15:59:59.999Z').slice(6, 10), '1026');
      assert.equal(codeAt('2026-10-31T16:00:00.000Z').slice(6, 10), '1126');
      assert.equal(codeAt('2026-10-31T16:05:00.000Z').slice(6, 10), '1126');
      assert.equal(codeAt('2026-12-31T15:59:59.999Z').slice(6, 10), '1226');
      assert.equal(codeAt('2026-12-31T16:00:00.000Z').slice(6, 10), '0127');
      assert.equal(codeAt('2027-02-01T00:30:00.000Z').slice(6, 10), '0227');
    },
  },
  {
    name: 'a random part already taken is drawn again',
    async run({ db }) {
      await withFormsRestored(db, async () => {
        const id = await insertForm(db, {});
        await db.run('UPDATE official_business SET reference_code = ? WHERE id = ?', ['DOLECN1026AAAA', id]);
        const code = await db.transaction((client) =>
          assignReferenceCode(client, {
            divisionCode: DIVISION_CODE,
            now: new Date('2026-10-15T04:00:00.000Z'),
            randomIndex: fixedPositions([0, 0, 0, 0, 1, 1, 1, 1]),
          })
        );
        assert.equal(code, 'DOLECN1026BBBB');
      });
    },
  },
];
