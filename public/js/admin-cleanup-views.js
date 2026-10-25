// Builds the Data Cleanup result boxes as HTML strings; every value is escaped here, in one place.
(function (root, factory) {
  const escape = typeof module !== 'undefined' && module.exports
    ? require('./escape-html').escapeHtml
    : root.EscapeHtml.escapeHtml;
  const api = factory(escape);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminCleanupViews = api;
})(typeof self !== 'undefined' ? self : this, function (escapeHtml) {
  const MAX_LISTED_RECORDS = 10;

  function box(kind, title, bodyHtml) {
    return `<div class="cleanup-box cleanup-box--${kind}"><strong>${escapeHtml(title)}</strong>${bodyHtml}</div>`;
  }

  function paragraph(html, className = '') {
    return `<p class="${className}">${html}</p>`;
  }

  function progressHtml(message) {
    return paragraph(escapeHtml(message), 'cleanup-progress');
  }

  function errorHtml(message) {
    return box('error', 'Error', paragraph(escapeHtml(message)));
  }

  function nothingToDeleteHtml(days) {
    return box('ok', 'No records to delete', paragraph(`No records found older than ${escapeHtml(days)} days.`));
  }

  function recordListHtml(records) {
    const items = records.slice(0, MAX_LISTED_RECORDS).map((record) =>
      `<li>Record ID ${escapeHtml(record.id)} - Created: ${escapeHtml(record.date_created)} (${escapeHtml(record.age_days)} days old)</li>`);
    if (records.length > MAX_LISTED_RECORDS) items.push(`<li>... and ${escapeHtml(records.length - MAX_LISTED_RECORDS)} more</li>`);
    return `<ul>${items.join('')}</ul>`;
  }

  function dryRunHtml(result, days) {
    const found = paragraph(`Would delete <strong>${escapeHtml(result.wouldDelete)}</strong> record(s) older than ${escapeHtml(days)} days.`);
    const list = result.records && result.records.length > 0 ? recordListHtml(result.records) : '';
    const note = paragraph('No records were actually deleted. This was a test run.', 'cleanup-note');
    return box('warning', 'Dry Run Results', found + list + note);
  }

  function cleanupDoneHtml(result) {
    if (result.deleted === 0) {
      return box('ok', 'Cleanup Complete', paragraph('No records were deleted. All records are within the retention period.'));
    }
    const ids = result.ids ? result.ids.join(', ') : 'N/A';
    return box('ok', 'Cleanup Complete',
      paragraph(`Successfully deleted <strong>${escapeHtml(result.deleted)}</strong> record(s) and their associated employees.`)
      + paragraph(`Deleted record IDs: ${escapeHtml(ids)}`, 'cleanup-note'));
  }

  return { progressHtml, errorHtml, nothingToDeleteHtml, dryRunHtml, cleanupDoneHtml };
});
