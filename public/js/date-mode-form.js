// The Date mode choice under the date field, with a live count of forms the submission would create.
(function (root) {
  const MODE_LABELS = {
    [DateMode.MULTIPLE_SEPARATE_DAYS]: 'Multiple Separate Days (one form per date per employee)',
    [DateMode.MORE_THAN_ONE_DAY]: 'More Than One Day (one form for all dates and employees)',
  };
  const RADIO_NAME = 'dateMode';

  let options = null;
  let countNote = null;

  function selectedMode() {
    const checked = options.container.querySelector(`input[name="${RADIO_NAME}"]:checked`);
    return checked ? checked.value : DateMode.DEFAULT_DATE_MODE;
  }

  function formCount() {
    return DateMode.countForms(selectedMode(), options.getDateCount(), options.getEmployeeCount());
  }

  function isOverLimit() {
    return formCount() > DateMode.MAX_FORMS_PER_SUBMISSION;
  }

  function refresh() {
    const count = formCount();
    const over = isOverLimit();
    countNote.textContent = over
      ? DateMode.formLimitMessage(count)
      : `This will create ${count} ${count === 1 ? 'form' : 'forms'}.`;
    countNote.style.color = over ? 'var(--danger, #c0392b)' : '';
    options.submitButton.disabled = over;
  }

  function buildRadio(mode) {
    const label = document.createElement('label');
    label.style.display = 'block';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.value = mode;
    radio.checked = mode === DateMode.DEFAULT_DATE_MODE;
    radio.addEventListener('change', refresh);
    label.append(radio, ' ' + MODE_LABELS[mode]);
    return label;
  }

  function reset() {
    options.container.querySelector(`input[value="${DateMode.DEFAULT_DATE_MODE}"]`).checked = true;
    refresh();
  }

  function init(config) {
    options = config;
    countNote = document.createElement('p');
    countNote.setAttribute('role', 'status');
    options.container.append(...DateMode.DATE_MODES.map(buildRadio), countNote);
    refresh();
  }

  root.DateModeForm = { init, refresh, reset, selectedMode, formCount, isOverLimit };
})(self);
