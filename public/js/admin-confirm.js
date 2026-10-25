// A confirmation dialog drawn in the page, in place of the browser's own confirm box.
// AdminConfirm.ask({ title, message, confirmLabel }) answers true when the admin confirms and
// false for Cancel, Escape or a click outside. Text is set with textContent, so a name inside the
// message can never become page markup.
(function () {
  const HIDDEN = 'hidden';
  const DEFAULT_CONFIRM_LABEL = 'Delete';

  const modal = document.getElementById('adminConfirmModal');
  const title = document.getElementById('adminConfirmTitle');
  const message = document.getElementById('adminConfirmMessage');
  const cancelButton = document.getElementById('adminConfirmCancel');
  const confirmButton = document.getElementById('adminConfirmOk');
  let answer = null;
  let returnFocus = null;

  function isOpen() {
    return !modal.classList.contains(HIDDEN);
  }

  function finish(result) {
    if (!answer) return;
    const resolve = answer;
    answer = null;
    modal.classList.add(HIDDEN);
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    resolve(result);
  }

  // Cancel has the focus when the dialog opens, so Enter never deletes by accident.
  function ask({ title: heading, message: text, confirmLabel = DEFAULT_CONFIRM_LABEL }) {
    if (answer) finish(false);
    returnFocus = document.activeElement;
    title.textContent = heading;
    message.textContent = text;
    confirmButton.textContent = confirmLabel;
    modal.classList.remove(HIDDEN);
    cancelButton.focus();
    return new Promise((resolve) => { answer = resolve; });
  }

  cancelButton.addEventListener('click', () => finish(false));
  confirmButton.addEventListener('click', () => finish(true));
  modal.addEventListener('click', (event) => {
    if (event.target === modal) finish(false);
  });

  // Runs before the page's other key handlers (capture), so Escape closes only this dialog
  // and not the edit dialog underneath, and Tab stays between the two buttons.
  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    } else if (event.key === 'Tab') {
      const first = event.shiftKey ? confirmButton : cancelButton;
      const last = event.shiftKey ? cancelButton : confirmButton;
      if (document.activeElement === last || !modal.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
  }, true);

  window.AdminConfirm = { ask };
})();
