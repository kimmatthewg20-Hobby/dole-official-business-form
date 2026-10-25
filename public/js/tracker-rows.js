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
    const view = `<button type="button" class="btn-view ui-btn ui-btn--secondary" onclick="viewForm(${safeId(entry.id)})">View</button>`;
    return `<tr>${cells}<td data-label="Action">${view}</td></tr>`;
  }

  function errorHtml(message) {
    return `<div class="error">Error loading data: ${escapeHtml(message)}</div>`;
  }

  return { rowHtml, errorHtml };
});
