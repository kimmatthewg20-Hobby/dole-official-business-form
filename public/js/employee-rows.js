// Builds the Employees page table rows as HTML strings; every value is escaped here, in one place.
(function (root, factory) {
  const escape = typeof module !== 'undefined' && module.exports
    ? require('./escape-html').escapeHtml
    : root.EscapeHtml.escapeHtml;
  const api = factory(escape);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EmployeeRows = api;
})(typeof self !== 'undefined' ? self : this, function (escapeHtml) {
  const EMPLOYEE_COLUMNS = 5;
  const HISTORY_COLUMNS = 4;
  const NOT_AVAILABLE = 'N/A';

  // data-label lets the phone layout show each cell with its column name.
  function cell(label, text) {
    return `<td data-label="${escapeHtml(label)}">${escapeHtml(text)}</td>`;
  }

  function actionButton(kind, title, icon, id) {
    return `<button type="button" class="action-btn ${kind}-btn" title="${title}" aria-label="${title}" data-id="${escapeHtml(id)}">`
      + `<i class="material-icons" aria-hidden="true">${icon}</i></button>`;
  }

  function employeeRowHtml(employee, lastUsedText) {
    const actions = actionButton('history', 'View History', 'history', employee.id)
      + actionButton('edit', 'Edit', 'edit', employee.id)
      + actionButton('delete', 'Delete', 'delete', employee.id);
    return '<tr>'
      + cell('Full Name', employee.full_name || '')
      + cell('Position', employee.position || '')
      + cell('Assigned Unit', employee.assigned_unit || '')
      + cell('Last Used', lastUsedText)
      + `<td class="action-col" data-label="Actions">${actions}</td></tr>`;
  }

  function messageRowHtml(message, columns, className) {
    return `<tr><td colspan="${columns}" class="${className}">${escapeHtml(message)}</td></tr>`;
  }

  function historyRowHtml({ travelId, dateDisplay, locationText }) {
    const details = `<button type="button" class="btn ui-btn view-details-btn" data-id="${escapeHtml(travelId)}">`
      + '<i class="material-icons" aria-hidden="true">visibility</i> View Details</button>';
    return '<tr>'
      + cell('Travel ID', travelId || NOT_AVAILABLE)
      + cell('Date of OB', dateDisplay)
      + cell('Location', locationText)
      + `<td data-label="Action">${details}</td></tr>`;
  }

  return { EMPLOYEE_COLUMNS, HISTORY_COLUMNS, employeeRowHtml, messageRowHtml, historyRowHtml };
});
