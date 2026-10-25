// The Divisions manager under Form options. The server checks every change and the admin
// session; this page only shows the list and the server's messages.
(function () {
  const DIVISIONS_ROUTE = '/api/divisions';
  const UNAUTHORIZED = 401;
  const SESSION_ENDED = 'Your admin session has ended. Please log in again.';
  const SAVE_FAILED = 'Could not reach the server. Please try again.';
  const ADD_TITLE = 'Add Division';
  const EDIT_TITLE = 'Edit Division';
  const HIDDEN = 'hidden';

  const list = document.getElementById('divisionList');
  const empty = document.getElementById('divisionEmpty');
  const addButton = document.getElementById('addDivisionBtn');
  const modal = document.getElementById('divisionModal');
  const form = document.getElementById('divisionForm');
  const title = document.getElementById('divisionModalTitle');
  const nameField = document.getElementById('divisionName');
  const codeField = document.getElementById('divisionCode');
  const errorBox = document.getElementById('divisionError');
  const removeButton = document.getElementById('removeDivisionBtn');
  const cancelButton = document.getElementById('cancelDivisionBtn');

  let editingId = null;
  let openedBy = null;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove(HIDDEN);
  }

  // Text is set with textContent, so a Division name can never become page markup.
  function divisionRow(division) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = division.name;
    const code = document.createElement('td');
    code.textContent = division.code;
    const actions = document.createElement('td');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ui-btn ui-btn--secondary';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${division.name}`);
    edit.addEventListener('click', () => openModal(division, edit));
    actions.appendChild(edit);
    row.append(name, code, actions);
    return row;
  }

  async function loadDivisions() {
    try {
      const response = await fetch(DIVISIONS_ROUTE);
      const { divisions = [] } = await response.json();
      list.replaceChildren(...divisions.map(divisionRow));
      empty.classList.toggle(HIDDEN, divisions.length > 0);
    } catch (err) {
      empty.textContent = 'Could not load the Divisions.';
      empty.classList.remove(HIDDEN);
    }
  }

  function openModal(division, trigger) {
    editingId = division ? division.id : null;
    openedBy = trigger;
    title.textContent = division ? EDIT_TITLE : ADD_TITLE;
    nameField.value = division ? division.name : '';
    codeField.value = division ? division.code : '';
    removeButton.classList.toggle(HIDDEN, !division);
    errorBox.classList.add(HIDDEN);
    modal.classList.remove(HIDDEN);
    nameField.focus();
  }

  function closeModal() {
    modal.classList.add(HIDDEN);
    if (openedBy) openedBy.focus();
  }

  // Returns true when the server accepted the change; otherwise shows its message.
  async function send(method, route, body) {
    try {
      const response = await fetch(route, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.ok) return true;
      if (response.status === UNAUTHORIZED) {
        showError(SESSION_ENDED);
        return false;
      }
      const data = await response.json().catch(() => ({}));
      showError(data.error || SAVE_FAILED);
    } catch (err) {
      showError(SAVE_FAILED);
    }
    return false;
  }

  async function saveDivision(event) {
    event.preventDefault();
    const body = { name: nameField.value, code: codeField.value };
    const route = editingId === null ? DIVISIONS_ROUTE : `${DIVISIONS_ROUTE}/${editingId}`;
    const saved = await send(editingId === null ? 'POST' : 'PUT', route, body);
    if (!saved) return;
    closeModal();
    loadDivisions();
  }

  async function removeDivision() {
    const name = nameField.value.trim();
    if (!confirm(`Remove the Division "${name}"? Forms already made keep it.`)) return;
    const removed = await send('DELETE', `${DIVISIONS_ROUTE}/${editingId}`);
    if (!removed) return;
    closeModal();
    loadDivisions();
  }

  codeField.addEventListener('input', () => {
    codeField.value = codeField.value.toUpperCase();
  });
  addButton.addEventListener('click', () => openModal(null, addButton));
  cancelButton.addEventListener('click', closeModal);
  removeButton.addEventListener('click', removeDivision);
  form.addEventListener('submit', saveDivision);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains(HIDDEN)) closeModal();
  });

  loadDivisions();
})();
