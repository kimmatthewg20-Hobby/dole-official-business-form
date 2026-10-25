// Turns stored dates, history entries and forms into the text the Employees tab shows.
(function () {
  const NOT_AVAILABLE = 'N/A';
  const LONG_DATE = { year: 'numeric', month: 'long', day: 'numeric' };
  const FIRST = 0;

  // Older forms hold a date list saved as text, such as ["2026-03-02"].
  function cleanDateString(value) {
    return typeof value === 'string' ? value.replace(/[[\]"]/g, '') : value;
  }

  function formatDate(value) {
    if (!value) return NOT_AVAILABLE;
    const text = cleanDateString(value);
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString('en-US', LONG_DATE);
  }

  function formatDates(dates) {
    return dates.map(formatDate).join(', ');
  }

  // last_used_at is a UTC calendar day; reading it in UTC keeps it from shifting a day.
  function formatLastUsed(day) {
    const parsed = typeof day === 'string' ? new Date(`${day}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return day || NOT_AVAILABLE;
    return parsed.toLocaleDateString('en-US', { ...LONG_DATE, timeZone: 'UTC' });
  }

  function hasDateList(formData) {
    return Array.isArray(formData.datesOfOB) && formData.datesOfOB.length > 0;
  }

  // Forms without a date list fall back to their single date, then to the day they were made.
  function singleDate(formData, entry) {
    return formatDate(formData.dates_of_ob || entry.date || entry.created_at);
  }

  function firstDateText(formData, entry) {
    if (!hasDateList(formData)) return singleDate(formData, entry);
    const more = formData.datesOfOB.length - 1;
    const first = formatDate(formData.datesOfOB[FIRST]);
    return more > 0 ? `${first} (+ ${more} more)` : first;
  }

  function historyRow(entry) {
    const formData = entry.formData || {};
    return {
      travelId: entry.id,
      dateDisplay: firstDateText(formData, entry),
      locationText: formData.location_to || formData.to || NOT_AVAILABLE,
    };
  }

  function timeText(formData) {
    if (formData.departure_time || formData.return_time) {
      return `${formData.departure_time || ''} - ${formData.return_time || ''}`;
    }
    return formData.time || '';
  }

  function employeeLines(entry, formData) {
    const employees = entry.employees || formData.employees || [];
    if (employees.length === 0) return ['No employees listed'];
    return employees.map((employee) => `${employee.name || employee.full_name} (${employee.position})`);
  }

  // [label, text or list of lines] pairs, in the order the summary shows them.
  function summaryItems(entry, travelId) {
    const formData = entry.formData || {};
    return [
      ['Travel ID', String(entry.id || travelId)],
      ['Office', formData.office || ''],
      ['Division', formData.division || ''],
      ['Date', hasDateList(formData) ? formatDates(formData.datesOfOB) : singleDate(formData, entry)],
      ['From', formData.location_from || formData.from || ''],
      ['To', formData.location_to || formData.to || ''],
      ['Time', timeText(formData)],
      ['Purpose', formData.purpose || ''],
      ['Signed Date', entry.signed_date ? formatDate(entry.signed_date) : 'Not signed yet'],
      ['Released Date', entry.released_date ? formatDate(entry.released_date) : 'Not released yet'],
      ['Released To', entry.released_to || NOT_AVAILABLE],
      ['Employees', employeeLines(entry, formData)],
    ];
  }

  window.AdminEmployeesFormat = { formatLastUsed, historyRow, summaryItems };
})();
