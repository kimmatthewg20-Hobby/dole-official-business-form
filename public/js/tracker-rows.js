// Builds tracker table rows as HTML strings; every value is escaped here, in one place.
(function (root, factory) {
  const escape = typeof module !== 'undefined' && module.exports
    ? require('./escape-html').escapeHtml
    : root.EscapeHtml.escapeHtml;
  const api = factory(escape);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrackerRows = api;
})(typeof self !== 'undefined' ? self : this, function (escapeHtml) {
  const EMPTY_VALUE = '-';
  const VIEW_LABEL = 'View form';
  // Material Icons "visibility" (Apache 2.0), inline so the table needs no icon font.
  const EYE_PATH = 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z';
  const EYE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${EYE_PATH}"/></svg>`;
  const COLUMNS = [
    ['dateOfOB', 'Date of OB'],
    ['timeOfOB', 'Time of OB'],
    ['employees', 'Name/Names of Employees'],
    ['purpose', 'Purpose'],
    ['destination', 'Destination'],
    ['dateFiled', 'Date Filed'],
  ];

  // The id goes into an onclick attribute, so only a whole number may pass.
  function safeId(id) {
    const number = Number(id);
    return Number.isInteger(number) && number > 0 ? number : 0;
  }

  // data-label lets the phone layout show each cell with its column name.
  function cellHtml([field, label], entry) {
    return `<td data-label="${escapeHtml(label)}">${escapeHtml(entry[field] || EMPTY_VALUE)}</td>`;
  }

  function rowHtml(entry) {
    const cells = COLUMNS.map((column) => cellHtml(column, entry)).join('');
    const view = `<button type="button" class="btn-view ui-btn ui-btn--secondary" title="${VIEW_LABEL}" aria-label="${VIEW_LABEL}" onclick="viewForm(${safeId(entry.id)})">${EYE_ICON}</button>`;
    return `<tr>${cells}<td data-label="Action">${view}</td></tr>`;
  }

  function errorHtml(message) {
    return `<div class="error">Error loading data: ${escapeHtml(message)}</div>`;
  }

  return { rowHtml, errorHtml };
});
