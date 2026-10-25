'use strict';

const assert = require('node:assert/strict');
const { generatePrintableHTML } = require('../public/print');
const { PAPER_SIZES, DEFAULT_PAPER, PAGE_MARGIN, CUT_GUIDE_HEIGHT_IN } = require('../public/print-papers');

const SIDE_MARGIN_IN = 0.25;
const TOP_BOTTOM_MARGIN_IN = 0.35;
const SCISSORS_PER_CUT_GUIDE = 3;
const ROUNDING_IN = 0.001;
const FORM = {
  formData: { id: 1, travel_id: 1, dates_of_ob: '["2026-10-24"]', location_from: 'A', location_to: 'B',
    departure_time: '08:00', return_time: '17:00', purpose: 'Test' },
  employees: [1, 2, 3].map((n) => ({ name: `Employee ${n}`, position: 'Clerk' })),
  settings: {},
};

function count(text, part) {
  return text.split(part).length - 1;
}

const MIN_HEIGHT_RULE = (key) =>
  new RegExp(`html\\[data-paper="${key}"\\] \\.form-page \\{[^}]*min-height: ([0-9.]+)in;`);
const ZOOM_RULE = (key) => new RegExp(`html\\[data-paper="${key}"\\] \\.form-page \\{[^}]*zoom: ([0-9.]+);`);

module.exports = [
  {
    name: 'print: margins are 0.35in top and bottom and 0.25in at the sides',
    run() {
      assert.equal(PAGE_MARGIN, `${TOP_BOTTOM_MARGIN_IN}in ${SIDE_MARGIN_IN}in`);
    },
  },
  {
    name: 'print: Long / Folio is the default paper and A4 can be chosen',
    run() {
      const html = generatePrintableHTML(FORM);
      assert.equal(DEFAULT_PAPER, 'long');
      assert.match(html, /<html lang="en" data-paper="long">/);
      assert.match(html, /<option value="long" data-page-size="8.5in 13in">Long \/ Folio<\/option>/);
      assert.match(html, /<option value="a4" data-page-size="A4">A4<\/option>/);
      assert.match(html, /<script src="\/js\/print-toolbar.js"><\/script>/);
    },
  },
  {
    name: 'print: a scaled form spans exactly the width the margins leave on every paper',
    run() {
      const html = generatePrintableHTML(FORM);
      for (const [key, paper] of Object.entries(PAPER_SIZES)) {
        const rule = new RegExp(`html\\[data-paper="${key}"\\] \\.form-page \\{\\s*width: ([0-9.]+)in;\\s*zoom: ([0-9.]+);`);
        const [, designWidth, zoom] = html.match(rule);
        assert.ok(Math.abs(designWidth * zoom - (paper.widthIn - 2 * SIDE_MARGIN_IN)) < ROUNDING_IN, key);
      }
    },
  },
  {
    name: 'print: two forms share a sheet, split by a full-width cut guide with scissors at start, middle and end',
    run() {
      const html = generatePrintableHTML(FORM);
      assert.equal(count(html, '<section class="sheet">'), 2);
      assert.equal(count(html, '<div class="cut-guide"'), 1, 'a sheet with one form has no cut guide');
      assert.equal(count(html, 'class="cut-scissors"'), SCISSORS_PER_CUT_GUIDE);
      assert.equal(count(html, 'class="form-page"'), 3);
    },
  },
  {
    name: 'print: the header bar holds the paper choice, the form number and the print button, and no Reference code',
    run() {
      const html = generatePrintableHTML({ ...FORM, formData: { ...FORM.formData, id: 42, reference_code: 'DOLECN1026ABCD' } });
      assert.match(html, /<header class="print-toolbar">/);
      assert.match(html, /<select id="paperSize"/);
      assert.match(html, /print-toolbar__title">Official Business Form<span class="print-toolbar__number">Form No. 42</);
      assert.match(html, /<button class="print-button"/);
      assert.match(html, /<a class="print-back" href="\/">/);
      assert.match(html, /<span class="print-toolbar__pages" id="pageIndicator"/);
      assert.ok(!/DOLECN1026ABCD/.test(html), 'the Reference code is the edit secret and never reaches the page');
    },
  },
  {
    name: 'print: two equal forms and the cut guide fill the printable height of every paper without overflowing',
    run() {
      const html = generatePrintableHTML(FORM);
      for (const [key, paper] of Object.entries(PAPER_SIZES)) {
        const formHeight = Number(html.match(MIN_HEIGHT_RULE(key))[1]) * Number(html.match(ZOOM_RULE(key))[1]);
        const printable = paper.heightIn - 2 * TOP_BOTTOM_MARGIN_IN;
        const used = 2 * formHeight + CUT_GUIDE_HEIGHT_IN;
        assert.ok(used <= printable, `${key} overflows`);
        assert.ok(printable - used < 0.1, `${key} leaves a gap at the bottom`);
      }
    },
  },
  {
    name: 'print: the header has an empty, hidden place for a new form\'s code that only the browser fills',
    run() {
      const html = generatePrintableHTML(FORM);
      assert.match(html, /<span class="print-toolbar__code" id="newFormCode" hidden>Reference code: <code><\/code><\/span>/);
    },
  },
  {
    name: 'print: the border under the agency box is black',
    run() {
      const html = generatePrintableHTML(FORM);
      assert.ok(html.includes('border-bottom: 2px solid #000000;'));
      assert.ok(!/1ABC9C/i.test(html), 'no teal line is left');
    },
  },
  {
    name: 'print: the approver\'s position is printed exactly as the admin entered it, while the name stays in capitals',
    run() {
      const entered = 'Chief, Admin Division (OIC)';
      const html = generatePrintableHTML({
        ...FORM,
        formData: { ...FORM.formData, approved_by: 'Ana Reyes', approved_by_position: entered },
      });
      assert.ok(html.includes(`<strong>ANA REYES</strong><br>\n              ${entered}`), 'name in capitals, position as entered');
      assert.ok(!html.includes(entered.toUpperCase()), 'the position is not turned into capitals');
    },
  },
  {
    name: 'print: an approver position with markup is escaped, not printed as markup',
    run() {
      const html = generatePrintableHTML({
        ...FORM,
        formData: { ...FORM.formData, approved_by: 'Ana Reyes', approved_by_position: '<b>Head</b> & Co' },
      });
      assert.ok(html.includes('&lt;b&gt;Head&lt;/b&gt; &amp; Co'));
      assert.ok(!html.includes('<b>Head</b>'));
    },
  },
];
