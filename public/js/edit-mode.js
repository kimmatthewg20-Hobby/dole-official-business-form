// Edit mode of the form page (ADR 0003): opened from the tracker with the Reference code in the
// address fragment, or from the success screen with the code just given. The code lives only in
// this closure and is sent in the body of every save, because the server checks it each time; it
// never goes into a URL, the console or the page beyond its last four characters.
(function (root) {
  const LOOKUP_ROUTE = '/api/lookup/code';
  const EDIT_ROUTE = '/api/edit-with-code';
  const TRACKER_PATH = '/tracker';
  const BANNER_PREFIX = 'Editing the form with Reference code ending …';
  const BANNER_NOTE = 'The Division and the Date mode of a submitted form cannot be changed.';
  const BACK_LABEL = 'Back to tracker';
  const RESET_LABEL = 'Reset to saved';
  const RESET_CONFIRM = 'Undo your changes and show the form as it was last saved?';
  const SAVE_LABEL = 'Save changes';
  const OPENING_MESSAGE = 'Opening the form...';
  const SAVING_MESSAGE = 'Saving your changes...';
  const SAVED_TITLE = 'Changes Saved';
  const SAVED_MESSAGE = 'Your changes have been saved. The Reference code stays the same.';
  const UNREACHABLE_MESSAGE = 'Could not reach the server. Check your connection and try again.';
  const UNLISTED_APPROVER_NOTE = ' is no longer on the Approver list. Choose an Approver from the list before saving.';
  const MESSAGE_TYPE = { ERROR: 'danger', INFO: 'info' };

  // The code taken from the address before the page is even built, so it is gone from it at once.
  const codeFromAddress = root.EditFragment.takeCodeFromAddress(root.location, root.history);
  let page = null;
  let code = '';
  let saved = null;
  let approverNote = null;
  let bannerTitle = null;

  async function sendJson(method, route, body) {
    try {
      const response = await fetch(route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { ok: response.ok, body: await response.json().catch(() => ({})) };
    } catch (err) {
      return { ok: false, body: {} };
    }
  }

  function storedDates(formData) {
    if (Array.isArray(formData.datesOfOB)) return formData.datesOfOB;
    return formData.date_of_ob ? [formData.date_of_ob] : [];
  }

  // An Approver the admin has since taken off the list cannot be chosen again, so it is named in a
  // note instead, and the save is refused until a listed one is picked.
  function showApproverNote(formData) {
    const fields = page.fields;
    const picked = root.FormPickers.approverName();
    const listed = !formData.approved_by || picked === formData.approved_by;
    if (!picked) fields.position.value = formData.approved_by_position || '';
    if (!approverNote) {
      approverNote = document.createElement('p');
      approverNote.className = 'edit-mode-note';
      approverNote.setAttribute('role', 'status');
      fields.approver.closest('.form-control').appendChild(approverNote);
    }
    const stored = [formData.approved_by, formData.approved_by_position].filter(Boolean).join(', ');
    approverNote.textContent = listed ? '' : `"${stored}"${UNLISTED_APPROVER_NOTE}`;
    approverNote.hidden = listed;
  }

  function fill(form) {
    const { formData, employees } = form;
    const fields = page.fields;
    page.setDates(storedDates(formData));
    root.DateModeForm.lock(formData.date_mode);
    fields.from.value = formData.location_from || '';
    fields.to.value = formData.location_to || '';
    fields.departure.value = formData.departure_time || '';
    fields.ret.value = formData.return_time || '';
    fields.purpose.value = formData.purpose || '';
    root.FormPickers.lockDivision(formData.division || '');
    root.FormPickers.setApprover(formData.approved_by || '', formData.approved_by_position || '');
    showApproverNote(formData);
    page.setEmployees(employees.map((employee) => ({ name: employee.name, position: employee.position || '' })));
  }

  function link(text, href) {
    const element = document.createElement('a');
    element.href = href;
    element.className = 'btn btn-secondary edit-mode-link';
    element.textContent = text;
    return element;
  }

  function showBanner() {
    const banner = document.createElement('div');
    banner.className = 'edit-mode-banner';
    banner.setAttribute('role', 'status');
    bannerTitle = document.createElement('p');
    bannerTitle.className = 'edit-mode-banner__title';
    const note = document.createElement('p');
    note.className = 'edit-mode-banner__note';
    note.textContent = BANNER_NOTE;
    banner.append(bannerTitle, note, link(BACK_LABEL, TRACKER_PATH));
    page.form.before(banner);
  }

  function showEditControls() {
    page.submitButton.textContent = SAVE_LABEL;
    page.clearButton.hidden = true;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn-secondary';
    reset.textContent = RESET_LABEL;
    reset.addEventListener('click', () => {
      if (confirm(RESET_CONFIRM)) fill(saved);
    });
    page.clearButton.before(reset);
  }

  function showSaved() {
    const formData = saved.formData;
    document.getElementById('successTitle').textContent = SAVED_TITLE;
    document.getElementById('successMessage').textContent = SAVED_MESSAGE;
    root.CreatedForms.render(document.getElementById('successDates'), [
      { id: formData.id, datesOfOB: storedDates(formData), referenceCode: code },
    ]);
    document.getElementById('successEdit').replaceChildren(link(BACK_LABEL, TRACKER_PATH));
    document.getElementById('editFormBtn').hidden = true;
    page.openSuccess(formData.id, code);
  }

  // Not found and locked out are answered by the server in words that reveal nothing, so they are
  // shown as they come; the page stays a new form.
  async function open(typedCode) {
    page.showMessage(OPENING_MESSAGE, MESSAGE_TYPE.INFO);
    const [{ ok, body }] = await Promise.all([sendJson('POST', LOOKUP_ROUTE, { code: typedCode }), page.pickersReady]);
    if (!ok) return page.showMessage(body.error || UNREACHABLE_MESSAGE, MESSAGE_TYPE.ERROR);
    const first = !code;
    code = typedCode;
    saved = { formData: body.formData, employees: body.employees };
    fill(saved);
    if (first) {
      showBanner();
      showEditControls();
    }
    bannerTitle.textContent = BANNER_PREFIX + root.EditFragment.codeEnding(code);
  }

  // Takes the submit's checked fields; the Division is the stored one, so it is not sent.
  async function save(formData) {
    page.submitButton.disabled = true;
    page.showMessage(SAVING_MESSAGE, MESSAGE_TYPE.INFO);
    const { ok, body } = await sendJson('PUT', EDIT_ROUTE, {
      code,
      employees: formData.employees.map((employee) => ({ name: employee.name, position: employee.position })),
      datesOfOB: formData.datesOfOB,
      locationFrom: formData.locationFrom,
      locationTo: formData.locationTo,
      departureTime: formData.departureTime,
      returnTime: formData.returnTime,
      purpose: formData.purpose,
      approvedBy: formData.approvedBy,
      approvedByPosition: formData.approvedByPosition,
    });
    page.submitButton.disabled = false;
    if (!ok) {
      root.DateModeForm.refresh();
      return page.showMessage(body.error || UNREACHABLE_MESSAGE, MESSAGE_TYPE.ERROR);
    }
    saved = { formData: body.formData, employees: body.employees };
    fill(saved);
    showSaved();
  }

  // page: the form page's fields and the few page actions edit mode needs.
  // A code pasted into the address of this page already open arrives without a reload.
  function start(pageHooks) {
    page = pageHooks;
    if (codeFromAddress) open(codeFromAddress);
    root.addEventListener('hashchange', () => {
      const pasted = root.EditFragment.takeCodeFromAddress(root.location, root.history);
      if (pasted) open(pasted);
    });
  }

  root.EditMode = { start, open, save, isEditing: () => Boolean(code) };
})(window);
