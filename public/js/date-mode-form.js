// The Date mode choice beside the date field, shown only once two dates are chosen; it warns
// when the submission would print more forms than the cap.
(function (root) {
  // Short names on screen; the longer explanation shows when the pointer rests on one.
  const MODE_LABELS = {
    [DateMode.MORE_THAN_ONE_DAY]: {
      text: 'All Dates',
      tip: 'One form per employee, listing all the dates',
    },
    [DateMode.MULTIPLE_SEPARATE_DAYS]: {
      text: 'Separated Dates',
      tip: 'One form per employee for each date',
    },
  };
  const RADIO_NAME = 'dateMode';
  // With one date both choices print the same forms, so the choice only appears from two dates.
  const MIN_DATES_FOR_CHOICE = 2;

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
    const showChoice = options.getDateCount() >= MIN_DATES_FOR_CHOICE;
    options.container.closest('.form-control').hidden = !showChoice;
    if (!showChoice) options.container.querySelector(`input[value="${DateMode.DEFAULT_DATE_MODE}"]`).checked = true;
    const over = isOverLimit();
    countNote.textContent = over ? DateMode.formLimitMessage(formCount()) : '';
    countNote.hidden = !over;
    options.submitButton.disabled = over;
  }

  function buildRadio(mode) {
    const label = document.createElement('label');
    label.className = 'date-mode-option';
    label.title = MODE_LABELS[mode].tip;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.value = mode;
    radio.checked = mode === DateMode.DEFAULT_DATE_MODE;
    radio.addEventListener('change', refresh);
    // The radio is hidden and the text is drawn as a button, so the choice reads as two buttons.
    const text = document.createElement('span');
    text.className = 'date-mode-text';
    text.textContent = MODE_LABELS[mode].text;
    label.append(radio, text);
    return label;
  }

  function reset() {
    options.container.querySelector(`input[value="${DateMode.DEFAULT_DATE_MODE}"]`).checked = true;
    refresh();
  }

  function init(config) {
    options = config;
    countNote = document.createElement('p');
    countNote.className = 'date-mode-limit';
    countNote.setAttribute('role', 'status');
    options.container.append(...DateMode.DATE_MODES.map(buildRadio), countNote);
    refresh();
  }

  root.DateModeForm = { init, refresh, reset, selectedMode, formCount, isOverLimit };
})(self);
