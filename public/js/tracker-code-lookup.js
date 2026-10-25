// The tracker's Reference code box: a pasted code finds that one form (ADR 0003). The code is
// sent in a POST body and never put in the URL, the page or the console, because it is the
// edit secret. Every value shown comes from staff, so it is set with textContent only.
(function (root) {
  const LOOKUP_ROUTE = '/api/lookup/code';
  const PRINT_ROUTE = '/print/';
  const EMPTY_VALUE = '-';
  const CODE_REQUIRED_MESSAGE = 'Enter a Reference code.';
  const SEARCHING_MESSAGE = 'Looking up the form...';
  const UNREACHABLE_MESSAGE = 'Could not reach the server. Check your connection and try again.';
  const PRINT_LABEL = 'View printout';

  function formDates(formData) {
    const dates = Array.isArray(formData.datesOfOB) ? formData.datesOfOB : [formData.date_of_ob];
    return root.DateWording.formatDateWording(dates) || EMPTY_VALUE;
  }

  function timeText(stored) {
    return stored ? root.ClockMath.formatTwelveHour(stored) || stored : '';
  }

  function formTime(formData) {
    const parts = [timeText(formData.departure_time), timeText(formData.return_time)].filter(Boolean);
    return parts.join(' to ') || EMPTY_VALUE;
  }

  function employeeLines(employees) {
    const lines = employees.map((employee) => [employee.name, employee.position].filter(Boolean).join(', '));
    return lines.join('\n') || EMPTY_VALUE;
  }

  function approvedBy(formData) {
    return [formData.approved_by, formData.approved_by_position].filter(Boolean).join(', ') || EMPTY_VALUE;
  }

  function detailRows({ formData, employees }) {
    return [
      ['Form No.', String(formData.id)],
      ['Date of OB', formDates(formData)],
      ['Time of OB', formTime(formData)],
      ['Employees', employeeLines(employees)],
      ['Division', formData.division || EMPTY_VALUE],
      ['From', formData.location_from || EMPTY_VALUE],
      ['To', formData.location_to || EMPTY_VALUE],
      ['Purpose', formData.purpose || EMPTY_VALUE],
      ['Approved by', approvedBy(formData)],
    ];
  }

  function renderForm(result, form) {
    const list = document.createElement('dl');
    list.className = 'code-lookup-details';
    for (const [label, value] of detailRows(form)) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      list.append(term, detail);
    }
    const print = document.createElement('a');
    print.className = 'ui-btn ui-btn--secondary';
    print.href = PRINT_ROUTE + encodeURIComponent(form.formData.id);
    print.target = '_blank';
    print.rel = 'noopener';
    print.textContent = PRINT_LABEL;
    result.replaceChildren(list, print);
  }

  function renderMessage(result, message) {
    const text = document.createElement('p');
    text.className = 'code-lookup-message';
    text.textContent = message;
    result.replaceChildren(text);
  }

  async function lookUp(code, result, button) {
    button.disabled = true;
    renderMessage(result, SEARCHING_MESSAGE);
    try {
      const response = await fetch(LOOKUP_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await response.json();
      if (response.ok) renderForm(result, body);
      else renderMessage(result, body.error || UNREACHABLE_MESSAGE);
    } catch (err) {
      renderMessage(result, UNREACHABLE_MESSAGE);
    } finally {
      button.disabled = false;
    }
  }

  function attach({ form, input, result, button }) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.value.trim()) return renderMessage(result, CODE_REQUIRED_MESSAGE);
      lookUp(input.value, result, button);
    });
  }

  root.TrackerCodeLookup = { attach };
})(window);
