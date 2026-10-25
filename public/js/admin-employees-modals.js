// Opens and closes the Employees tab dialogs. Focus moves into a dialog and back to the button
// that opened it, so keyboard users keep their place; Escape or a click outside closes the top one.
(function () {
  const HIDDEN = 'hidden';
  const FIRST_FIELD = 'input:not([type="hidden"])';
  const DIALOG = '.ui-modal__dialog';
  const open = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function show(modal, trigger) {
    modal.classList.remove(HIDDEN);
    open.push({ modal, trigger });
    (modal.querySelector(FIRST_FIELD) || modal.querySelector(DIALOG)).focus();
  }

  function hide(modal) {
    const index = open.findIndex((item) => item.modal === modal);
    if (index === -1) return null;
    const [item] = open.splice(index, 1);
    modal.classList.add(HIDDEN);
    return item.trigger;
  }

  function openModal(id, trigger) {
    show(byId(id), trigger || document.activeElement);
  }

  function closeModal(id) {
    const trigger = hide(byId(id));
    if (trigger && document.body.contains(trigger)) trigger.focus();
  }

  // One dialog leads to the next (history to summary); focus returns to the first one's button.
  function replaceModal(fromId, toId) {
    show(byId(toId), hide(byId(fromId)));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || open.length === 0) return;
    closeModal(open[open.length - 1].modal.id);
  });

  document.addEventListener('click', (event) => {
    const top = open[open.length - 1];
    if (top && event.target === top.modal) closeModal(top.modal.id);
    const closer = event.target.closest('[data-close-modal]');
    if (closer) closeModal(closer.closest('.ui-modal').id);
  });

  window.AdminEmployeesModals = { openModal, closeModal, replaceModal };
})();
