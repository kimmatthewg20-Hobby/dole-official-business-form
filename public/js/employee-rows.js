// Builds the admin Employees tab table rows as HTML strings; every value is escaped here, in one place.
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
  const NEEDS_DETAILS = 'Needs details';
  const DETAIL_FIELDS = ['employee_id', 'firstname', 'last_name'];

  // data-label lets the phone layout show each cell with its column name.
  function cell(label, text) {
    return `<td data-label="${escapeHtml(label)}">${escapeHtml(text)}</td>`;
  }

  // Shown words and a label naming the employee keep each action clear to sighted and screen-reader users.
  function actionButton(kind, action, icon, employee) {
    const label = escapeHtml(`${action} ${employee.full_name || ''}`.trim());
    return `<button type="button" class="action-btn ${kind}-btn" title="${label}" aria-label="${label}" data-id="${escapeHtml(employee.id)}">`
      + `<i class="material-icons" aria-hidden="true">${icon}</i><span class="action-btn__text">${action}</span></button>`;
  }

  // Employees added from a form have only a full name until the admin completes them.
  function needsDetails(employee) {
    return DETAIL_FIELDS.some((field) => !employee[field]);
  }

  function nameCell(employee) {
    const tag = needsDetails(employee) ? ` <span class="needs-details-tag">${NEEDS_DETAILS}</span>` : '';
    return `<td data-label="Full Name">${escapeHtml(employee.full_name || '')}${tag}</td>`;
  }

  function employeeRowHtml(employee, lastUsedText) {
    const actions = actionButton('history', 'History', 'history', employee)
      + actionButton('edit', 'Edit', 'edit', employee)
      + actionButton('delete', 'Delete', 'delete', employee);
    return '<tr>'
      + nameCell(employee)
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

  return { EMPLOYEE_COLUMNS, HISTORY_COLUMNS, needsDetails, employeeRowHtml, messageRowHtml, historyRowHtml };
});
