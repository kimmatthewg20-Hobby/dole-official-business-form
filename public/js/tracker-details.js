// The card the tracker shows for a form found by its Reference code: a header, then Schedule,
// Itinerary, Purpose, Approval and Employees. Staff typed every value, so each one is escaped;
// the code is never passed in, so the card cannot show it (ADR 0003). Shared with Node checks.
(function (root, factory) {
  const inNode = typeof module !== 'undefined' && module.exports;
  const api = inNode
    ? factory(require('./escape-html'), require('./date-wording'), require('./clock-math'), require('./date-mode'))
    : factory(root.EscapeHtml, root.DateWording, root.ClockMath, root.DateMode);
  if (inNode) module.exports = api;
  else root.TrackerDetails = api;
})(typeof self !== 'undefined' ? self : this, function (EscapeHtml, DateWording, ClockMath, DateMode) {
  const EMPTY_VALUE = '–';
  const FORM_TITLE_PREFIX = 'Form No. ';
  const MODE_TAGS = {
    [DateMode.MORE_THAN_ONE_DAY]: 'All Dates',
    [DateMode.MULTIPLE_SEPARATE_DAYS]: 'Separated Dates',
  };
  const escape = EscapeHtml.escapeHtml;

  function shown(value) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    return text || EMPTY_VALUE;
  }

  function storedDates(formData) {
    return Array.isArray(formData.datesOfOB) ? formData.datesOfOB : [formData.date_of_ob];
  }

  // A time that is not stored as HH:MM is shown as it was stored rather than hidden.
  function timeText(stored) {
    return shown(stored ? ClockMath.formatTwelveHour(stored) || stored : '');
  }

  function section(title, fields, wide = false) {
    return { title, wide, fields: fields.map(([label, value]) => ({ label, value })) };
  }

  function employeeRows(employees) {
    return (employees || []).map((employee, index) => ({
      number: index + 1,
      name: shown(employee.name),
      position: shown(employee.position),
    }));
  }

  // Forms stored before the Date mode was kept print as All Dates.
  function modeTag(formData) {
    return MODE_TAGS[formData.date_mode] || MODE_TAGS[DateMode.DEFAULT_DATE_MODE];
  }

  function describeForm({ formData, employees }) {
    const dates = shown(DateWording.formatDateWording(storedDates(formData)));
    return {
      title: FORM_TITLE_PREFIX + formData.id,
      dates,
      modeTag: modeTag(formData),
      sections: [
        section('Schedule', [
          ['Date of Official Business', dates],
          ['Departure Time', timeText(formData.departure_time)],
          ['Return Time', timeText(formData.return_time)],
        ]),
        section('Itinerary', [['From', shown(formData.location_from)], ['To', shown(formData.location_to)]]),
        section('Purpose', [['Purpose', shown(formData.purpose)]], true),
        section('Approval', [
          ['Division', shown(formData.division)],
          ['Approved by', shown(formData.approved_by)],
          ['Position', shown(formData.approved_by_position)],
        ]),
        { title: 'Employees', wide: true, fields: [], employees: employeeRows(employees) },
      ],
    };
  }

  function fieldsHtml(fields) {
    const items = fields.map(
      (field) =>
        `<div class="form-card__field"><dt>${escape(field.label)}</dt><dd>${escape(field.value)}</dd></div>`,
    );
    return `<dl class="form-card__fields">${items.join('')}</dl>`;
  }

  // A list rather than a table, so the tracker's phone layout for its own table does not apply.
  function employeesHtml(employees) {
    if (!employees.length) return `<p class="form-card__empty">${EMPTY_VALUE}</p>`;
    const rows = employees.map(
      (row) =>
        `<li><span class="form-card__number">${row.number}.</span>` +
        `<span class="form-card__name">${escape(row.name)}</span>` +
        `<span class="form-card__position">${escape(row.position)}</span></li>`,
    );
    return `<ol class="form-card__employees">${rows.join('')}</ol>`;
  }

  function sectionHtml(part) {
    const body = part.employees ? employeesHtml(part.employees) : fieldsHtml(part.fields);
    const wide = part.wide ? ' form-card__section--wide' : '';
    return `<section class="form-card__section${wide}"><h4 class="form-card__heading">${escape(part.title)}</h4>${body}</section>`;
  }

  function cardHtml(form) {
    const card = describeForm(form);
    return (
      '<article class="form-card">' +
      `<header class="form-card__header"><h3 class="form-card__title">${escape(card.title)}</h3>` +
      `<p class="form-card__dates">${escape(card.dates)}</p>` +
      `<span class="form-card__tag">${escape(card.modeTag)}</span></header>` +
      `<div class="form-card__grid">${card.sections.map(sectionHtml).join('')}</div>` +
      '</article>'
    );
  }

  return { describeForm, cardHtml, EMPTY_VALUE };
});
