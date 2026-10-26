// Styles of the printable Official Business form: on screen each sheet looks like the paper
// it prints on (two forms), and the printer gets real margins instead of forms running to the
// paper's edge. Paper sizes and their fit are in print-papers.js.

const TOOLBAR_HEIGHT_PX = 56;
const {
  PAGE_MARGIN, CUT_GUIDE_HEIGHT_IN, DEFAULT_PAPER, PAPER_SIZES, PAPER_STYLES, PAPER_PRINT_STYLES,
} = require('./print-papers');

// Material Icons "content_cut" (Apache 2.0), inline so the printout needs no icon font.
const SCISSORS_PATH = 'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z';

const SCISSORS_SVG = `<svg class="cut-scissors" viewBox="0 0 24 24" width="18" height="18"><path d="${SCISSORS_PATH}"/></svg>`;

// Sits between the two forms of a sheet, so the line is not the border of either form. The
// scissors mark the start, the middle and the end of the line, which runs the full width.
const CUT_GUIDE_HTML = `<div class="cut-guide" aria-hidden="true">${SCISSORS_SVG}<i class="cut-line"></i>${SCISSORS_SVG}<i class="cut-line"></i>${SCISSORS_SVG}</div>`;

const PRINT_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    margin: 0;
    padding: ${TOOLBAR_HEIGHT_PX + 24}px 0 24px;
    font-size: 12px;
    background-color: #d9dde3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .sheet {
    box-sizing: border-box;
    background-color: #ffffff;
    box-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
  }
  .form-page {
    box-sizing: border-box;
    page-break-inside: avoid;
    break-inside: avoid;
    display: flex;
    flex-direction: column;
  }
  /* The table stretches to its form's fixed share of the sheet, spreading the spare height over its rows. */
  .form-page > table {
    flex: 1 1 auto;
  }
  table {
    width: 100%;
    font-size: 11px;
    border-collapse: collapse;
    margin-bottom: -1px;
  }
  table, th, td {
    border: 1px solid #2C3E50;
  }
  th, td {
    padding: 3px 4px;
    text-align: left;
  }
  .header-left { width: 25%; text-align: left; vertical-align: middle; font-weight: bold; }
  .header-center { width: 50%; text-align: center; vertical-align: middle; font-weight: bold; }
  .header-right { width: 10%; text-align: center; vertical-align: middle; }
  .logo { width: 40px; height: auto; margin-left: 10px; margin-right: 10px; }
  .header-right-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
  .header-text { text-align: center; white-space: nowrap; line-height: 1.2; font-size: 12px; }
  .center-text { text-align: center; }
  .approval-section { height: 60px; min-height: 60px; }
  .certificate-section { height: 80px; min-height: 80px; }
  .instructions { font-size: 9px; line-height: 1.2; }
  .cut-guide {
    display: flex;
    align-items: center;
    height: ${CUT_GUIDE_HEIGHT_IN}in;
  }
  .cut-line {
    flex: 1;
    border-top: 1.5px dashed #000;
  }
  .cut-scissors {
    flex: none;
    fill: #000;
  }
  /* The icon's blades open to the right; the last one is mirrored so it faces back along the line. */
  .cut-guide .cut-scissors:last-child {
    transform: scaleX(-1);
  }
  .print-toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    box-sizing: border-box;
    height: ${TOOLBAR_HEIGHT_PX}px;
    padding: 0 16px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    background-color: #ffffff;
    border-bottom: 1px solid #d0d5dd;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  }
  .print-toolbar__start, .print-toolbar__end { display: flex; align-items: center; gap: 8px; }
  .print-toolbar__end { justify-content: flex-end; }
  .print-toolbar__title {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
    color: #1d2939;
    line-height: 1.2;
  }
  .print-toolbar__number { font-size: 12px; font-weight: 500; color: #667085; }
  .print-toolbar__code { font-size: 12px; font-weight: 500; color: #1d2939; }
  .print-toolbar__code code {
    padding: 1px 6px;
    border-radius: 3px;
    background-color: #eef2f6;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    user-select: all;
  }
  .print-toolbar__pages {
    min-width: 6.5rem;
    margin-right: 8px;
    text-align: right;
    font-size: 14px;
    font-weight: 500;
    color: #475467;
    font-variant-numeric: tabular-nums;
  }
  /* Like a PDF viewer's page labels: shown under each sheet on screen, never printed. */
  .sheet-caption {
    margin-top: -14px;
    font-size: 13px;
    font-weight: 500;
    color: #475467;
  }
  .print-back {
    padding: 8px 12px;
    border: 1px solid #98a2b3;
    border-radius: 4px;
    color: #1d2939;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
  }
  .print-back:hover { background-color: #f2f4f7; }
  .print-back:focus-visible { outline: 3px solid #3498DB; outline-offset: 2px; }
  .paper-label { margin-left: 8px; font-size: 14px; font-weight: 500; color: #2C3E50; }
  #paperSize {
    min-width: 9.5rem;
    /* Own arrow, kept clear of the border; the native one sits hard against the edge. */
    appearance: none;
    -webkit-appearance: none;
    padding: 8px 2.25rem 8px 12px;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='none' stroke='%231d2939' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M2 4l4 4 4-4'/></svg>");
    background-repeat: no-repeat;
    background-position: right 0.8rem center;
    background-size: 12px;
    border: 1px solid #98a2b3;
    border-radius: 4px;
    background-color: #ffffff;
    color: #1d2939;
    font-size: 14px;
    cursor: pointer;
  }
  #paperSize:focus-visible { outline: 3px solid #3498DB; outline-offset: 2px; }
  @media (max-width: 640px) {
    .print-toolbar { grid-template-columns: 1fr auto; }
    .print-toolbar__title { display: none; }
  }
  .print-button {
    padding: 10px 20px;
    background-color: #2C3E50;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  .print-button:hover { background-color: #3498DB; }
  .print-button:focus-visible { outline: 3px solid #3498DB; outline-offset: 2px; }

  ${PAPER_STYLES}
  ${PAPER_PRINT_STYLES}

  @page {
    size: ${PAPER_SIZES[DEFAULT_PAPER].pageSize};
    margin: ${PAGE_MARGIN};
  }

  @media print {
    .print-toolbar, .sheet-caption { display: none; }
    body {
      padding: 0;
      gap: 0;
      background-color: #ffffff;
      display: block;
    }
    html[data-paper] .sheet {
      width: 100%;
      min-height: 0;
      padding: 0;
      box-shadow: none;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`;

module.exports = { PRINT_STYLES, CUT_GUIDE_HTML };
