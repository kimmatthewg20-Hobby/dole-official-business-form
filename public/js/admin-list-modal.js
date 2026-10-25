// The add, edit and remove modal shared by the admin-kept pick-lists under Form options
// (Divisions, Approvers), with their order set by admin-list-sort.js. The server checks every
// change and the admin session; this page only shows the list and the server's messages.
(function () {
  const UNAUTHORIZED = 401;
  const SESSION_ENDED = 'Your admin session has ended. Please log in again.';
  const SAVE_FAILED = 'Could not reach the server. Please try again.';
  const HIDDEN = 'hidden';

  const capitalized = (word) => word.charAt(0).toUpperCase() + word.slice(1);

  // Element ids follow one pattern, e.g. divisionList, divisionName, addDivisionBtn.
  function findElements(prefix, noun, fieldKeys) {
    const byId = (id) => document.getElementById(id);
    const fields = {};
    for (const key of fieldKeys) fields[key] = byId(`${prefix}${capitalized(key)}`);
    return {
      list: byId(`${prefix}List`),
      empty: byId(`${prefix}Empty`),
      modal: byId(`${prefix}Modal`),
      form: byId(`${prefix}Form`),
      title: byId(`${prefix}ModalTitle`),
      errorBox: byId(`${prefix}Error`),
      orderError: byId(`${prefix}OrderError`),
      orderStatus: byId(`${prefix}OrderStatus`),
      addButton: byId(`add${noun}Btn`),
      removeButton: byId(`remove${noun}Btn`),
      cancelButton: byId(`cancel${noun}Btn`),
      fields,
    };
  }

  // config: { route, listKey, prefix, noun, fieldKeys, removeQuestion(name) }.
  // Returns the modal's fields so a list may add its own input handling.
  function create(config) {
    const { route, listKey, prefix, noun, fieldKeys, removeQuestion } = config;
    const ui = findElements(prefix, noun, fieldKeys);
    let editingId = null;
    let openedBy = null;

    function showMessage(box, message) {
      box.textContent = message;
      box.classList.remove(HIDDEN);
    }

    const showError = (message) => showMessage(ui.errorBox, message);
    const showOrderError = (message) => showMessage(ui.orderError, message);

    // Text is set with textContent, so a stored name can never become page markup.
    function itemRow(item) {
      const row = document.createElement('tr');
      row.dataset.id = item.id;
      row.dataset.name = item.name;
      row.appendChild(sorter.handleCell(item.name));
      for (const key of fieldKeys) {
        const cell = document.createElement('td');
        cell.textContent = item[key];
        row.appendChild(cell);
      }
      const actions = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'ui-btn ui-btn--secondary';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${item.name}`);
      edit.addEventListener('click', () => openModal(item, edit));
      actions.appendChild(edit);
      row.appendChild(actions);
      return row;
    }

    async function loadList() {
      try {
        const response = await fetch(route);
        const items = (await response.json())[listKey] || [];
        ui.list.replaceChildren(...items.map(itemRow));
        sorter.rendered();
        ui.empty.classList.toggle(HIDDEN, items.length > 0);
      } catch (err) {
        ui.empty.textContent = `Could not load the ${noun}s.`;
        ui.empty.classList.remove(HIDDEN);
      }
    }

    function openModal(item, trigger) {
      editingId = item ? item.id : null;
      openedBy = trigger;
      ui.title.textContent = `${item ? 'Edit' : 'Add'} ${noun}`;
      for (const key of fieldKeys) ui.fields[key].value = item ? item[key] : '';
      ui.removeButton.classList.toggle(HIDDEN, !item);
      ui.errorBox.classList.add(HIDDEN);
      ui.modal.classList.remove(HIDDEN);
      ui.fields[fieldKeys[0]].focus();
    }

    function closeModal() {
      ui.modal.classList.add(HIDDEN);
      if (openedBy) openedBy.focus();
    }

    // Returns true when the server accepted the change; otherwise reports its message.
    async function send(method, url, body, report = showError) {
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined,
        });
        if (response.ok) return true;
        if (response.status === UNAUTHORIZED) {
          report(SESSION_ENDED);
          return false;
        }
        const data = await response.json().catch(() => ({}));
        report(data.error || SAVE_FAILED);
      } catch (err) {
        report(SAVE_FAILED);
      }
      return false;
    }

    async function saveOrder(ids) {
      const saved = await send('PUT', `${route}/order`, { ids }, showOrderError);
      if (saved) ui.orderError.classList.add(HIDDEN);
      return saved;
    }

    const sorter = window.AdminListSort.attach({
      list: ui.list,
      status: ui.orderStatus,
      save: saveOrder,
    });

    async function saveItem(event) {
      event.preventDefault();
      const body = {};
      for (const key of fieldKeys) body[key] = ui.fields[key].value;
      const isNew = editingId === null;
      const saved = await send(
        isNew ? 'POST' : 'PUT',
        isNew ? route : `${route}/${editingId}`,
        body,
      );
      if (!saved) return;
      closeModal();
      loadList();
    }

    async function removeItem() {
      const confirmed = await window.AdminConfirm.ask({
        title: `Remove ${noun}`,
        message: removeQuestion(ui.fields.name.value.trim()),
        confirmLabel: 'Remove',
      });
      if (!confirmed) return;
      const removed = await send('DELETE', `${route}/${editingId}`);
      if (!removed) return;
      closeModal();
      loadList();
    }

    ui.addButton.addEventListener('click', () => openModal(null, ui.addButton));
    ui.cancelButton.addEventListener('click', closeModal);
    ui.removeButton.addEventListener('click', removeItem);
    ui.form.addEventListener('submit', saveItem);
    ui.modal.addEventListener('click', (event) => {
      if (event.target === ui.modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !ui.modal.classList.contains(HIDDEN)) closeModal();
    });

    loadList();
    return ui.fields;
  }

  window.AdminListModal = { create };
})();
