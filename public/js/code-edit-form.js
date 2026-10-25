// Edit with a Reference code (ADR 0003): after a form is found by its code, staff may change
// everything but the Division. The code is kept only in this closure and sent with every save,
// because the server checks it each time; it never goes into a URL, the page or the console.
(function (root) {
  const LOOKUP_ROUTE = '/api/lookup/code';
  const EDIT_ROUTE = '/api/edit-with-code';
  const TITLE = 'Edit this form';
  const DIVISION_NOTE = 'The Division of a submitted form cannot be changed.';
  const LOADING_MESSAGE = 'Opening the form...';
  const SAVING_MESSAGE = 'Saving...';
  const SAVED_MESSAGE = 'Your changes are saved. The Reference code stays the same.';
  const UNREACHABLE_MESSAGE = 'Could not reach the server. Check your connection and try again.';
  const SAVE_LABEL = 'Save changes';
  const CANCEL_LABEL = 'Cancel';
  const Fields = root.CodeEditFields;

  async function sendJson(method, route, body) {
    let response;
    try {
      response = await fetch(route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (err) {
      return { ok: false, body: { error: UNREACHABLE_MESSAGE } };
    }
    const answer = await response.json().catch(() => ({}));
    return { ok: response.ok, body: answer };
  }

  function message(text) {
    const element = document.createElement('p');
    element.className = 'code-edit-message';
    element.setAttribute('role', 'status');
    element.textContent = text;
    return element;
  }

  function storedDates(formData) {
    if (Array.isArray(formData.datesOfOB)) return formData.datesOfOB;
    return formData.date_of_ob ? [formData.date_of_ob] : [];
  }

  function timeField(label, stored) {
    const field = Fields.input('text', '');
    return { field, wrapper: Fields.labelled(label, field), stored };
  }

  function textArea(value) {
    const area = document.createElement('textarea');
    area.className = 'ui-input';
    area.value = value || '';
    return area;
  }

  function buildFields(formData, employees) {
    const division = Fields.input('text', formData.division);
    division.readOnly = true;
    return {
      division,
      dates: Fields.dateList(storedDates(formData)),
      employees: Fields.employeeList(employees),
      departure: timeField('Departure time', formData.departure_time),
      return: timeField('Return time', formData.return_time),
      from: Fields.input('text', formData.location_from),
      to: Fields.input('text', formData.location_to),
      purpose: textArea(formData.purpose),
      approver: Fields.input('text', ''),
      position: Fields.input('text', ''),
    };
  }

  // The clock and the Approver pick-list need their fields on the page first.
  function enhance(fields, formData) {
    for (const time of [fields.departure, fields.return]) {
      root.TimeField.enhance(time.field);
      time.field.value = time.stored || '';
    }
    const approver = root.FormPickers.createApproverPicker(fields.approver, fields.position);
    approver.loaded.then(() => approver.setApprover(formData.approved_by || '', formData.approved_by_position || ''));
    return approver;
  }

  function editedBody(code, fields, approver) {
    return {
      code,
      employees: fields.employees.values(),
      datesOfOB: fields.dates.values(),
      locationFrom: fields.from.value.trim(),
      locationTo: fields.to.value.trim(),
      departureTime: fields.departure.field.value,
      returnTime: fields.return.field.value,
      purpose: fields.purpose.value.trim(),
      approvedBy: approver.approverName(),
      approvedByPosition: fields.position.value,
    };
  }

  // options: code, form ({ formData, employees } from the lookup), onSaved(savedForm), onCancel().
  function render(container, { code, form, onSaved, onCancel }) {
    const fields = buildFields(form.formData, form.employees);
    const element = document.createElement('form');
    element.className = 'code-edit-form';
    const title = document.createElement('h3');
    title.textContent = TITLE;
    const status = message('');
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'ui-btn';
    save.textContent = SAVE_LABEL;
    const actions = document.createElement('div');
    actions.className = 'code-edit-actions';
    actions.append(save, Fields.button(CANCEL_LABEL, onCancel));
    element.append(
      title,
      Fields.labelled('Division', fields.division),
      message(DIVISION_NOTE),
      fields.dates.element,
      fields.employees.element,
      fields.departure.wrapper,
      fields.return.wrapper,
      Fields.labelled('From', fields.from),
      Fields.labelled('To', fields.to),
      Fields.labelled('Purpose', fields.purpose),
      Fields.labelled('Approved by', fields.approver),
      Fields.labelled('Position of approver', fields.position),
      status,
      actions,
    );
    container.replaceChildren(element);
    const approver = enhance(fields, form.formData);
    element.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      status.textContent = SAVING_MESSAGE;
      const { ok, body } = await sendJson('PUT', EDIT_ROUTE, editedBody(code, fields, approver));
      save.disabled = false;
      if (ok) return onSaved({ formData: body.formData, employees: body.employees });
      status.textContent = body.error || UNREACHABLE_MESSAGE;
    });
  }

  // Finds the form by its code, then shows it for editing; used where only the code is known.
  async function open(container, code) {
    container.replaceChildren(message(LOADING_MESSAGE));
    const { ok, body } = await sendJson('POST', LOOKUP_ROUTE, { code });
    if (!ok) return container.replaceChildren(message(body.error || UNREACHABLE_MESSAGE));
    const show = (form, note) => {
      render(container, { code, form, onSaved: (saved) => show(saved, SAVED_MESSAGE), onCancel: () => container.replaceChildren() });
      if (note) container.prepend(message(note));
    };
    show(body);
  }

  root.CodeEditForm = { render, open, SAVED_MESSAGE };
})(window);
