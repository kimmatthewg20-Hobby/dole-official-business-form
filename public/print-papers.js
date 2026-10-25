// The paper sizes the printable form can be printed on. Each form is laid out wider than it
// prints and scaled by `zoom`, so after scaling it spans the printable width exactly and two
// forms plus the cut guide fit the printable height.

const MM_PER_INCH = 25.4;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Direct printing: the printer's own unprintable edge is about 0.2in, so these stay just clear of it.
const MARGIN_SIDE_IN = 0.25;
const MARGIN_TOP_BOTTOM_IN = 0.35;
const PAGE_MARGIN = `${MARGIN_TOP_BOTTOM_IN}in ${MARGIN_SIDE_IN}in`;

const CUT_GUIDE_HEIGHT_IN = 0.25;
// Two forms plus the guide fill the printable height; a hair less keeps rounding from adding a
// blank page.
const FIT_ALLOWANCE_IN = 0.02;

const DEFAULT_PAPER = 'long';
const PAPER_SIZES = {
  long: { label: 'Long / Folio', pageSize: '8.5in 13in', widthIn: 8.5, heightIn: 13, zoom: 1 },
  a4: {
    label: 'A4',
    pageSize: 'A4',
    widthIn: A4_WIDTH_MM / MM_PER_INCH,
    heightIn: A4_HEIGHT_MM / MM_PER_INCH,
    zoom: 0.9,
  },
};

function designWidthIn(paper) {
  return (paper.widthIn - 2 * MARGIN_SIDE_IN) / paper.zoom;
}

// Half of the printable height, less the guide: every form is cut to the same size, so the
// two halves are alike however short or long their text is.
function formHeightIn(paper) {
  const printable = paper.heightIn - 2 * MARGIN_TOP_BOTTOM_IN;
  return (printable - CUT_GUIDE_HEIGHT_IN) / 2 - FIT_ALLOWANCE_IN;
}

// On screen a sheet is drawn as the paper; the print block in print-styles.js removes the padding
// because the printer then supplies the margins.
const PAPER_STYLES = Object.entries(PAPER_SIZES)
  .map(
    ([key, paper]) => `
  html[data-paper="${key}"] .sheet {
    width: ${paper.widthIn}in;
    min-height: ${paper.heightIn}in;
    padding: ${PAGE_MARGIN};
  }
  html[data-paper="${key}"] .form-page {
    width: ${designWidthIn(paper)}in;
    zoom: ${paper.zoom};
    min-height: ${formHeightIn(paper) / paper.zoom}in;
  }`
  )
  .join('\n');

const PAPER_OPTIONS_HTML = Object.entries(PAPER_SIZES)
  .map(([key, paper]) => `<option value="${key}" data-page-size="${paper.pageSize}">${paper.label}</option>`)
  .join('');

// A header bar fixed to the top of the page: the way back to the main page and the paper choice
// on the left, what is being printed in the middle, the print button on the right. The caller escapes the text it passes in.
function toolbarHtml({ title, formNumber }) {
  return `
  <header class="print-toolbar">
    <div class="print-toolbar__start">
      <a class="print-back" href="/">&larr; Main page</a>
      <label class="paper-label" for="paperSize">Paper</label>
      <select id="paperSize" data-margin="${PAGE_MARGIN}" data-default="${DEFAULT_PAPER}">${PAPER_OPTIONS_HTML}</select>
    </div>
    <div class="print-toolbar__title">${title}<span class="print-toolbar__number">${formNumber}</span>
      <span class="print-toolbar__code" id="newFormCode" hidden>Reference code: <code></code></span>
    </div>
    <div class="print-toolbar__end">
      <span class="print-toolbar__pages" id="pageIndicator" aria-live="polite"></span>
      <button class="print-button" onclick="window.print()">Print Form</button>
    </div>
  </header>`;
}

module.exports = { PAGE_MARGIN, CUT_GUIDE_HEIGHT_IN, DEFAULT_PAPER, PAPER_SIZES, PAPER_STYLES, toolbarHtml };
