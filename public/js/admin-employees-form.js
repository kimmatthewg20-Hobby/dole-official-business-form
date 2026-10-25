// The add, edit and delete dialogs of the Employees tab. Employees added from a form have only a
// full name, so the ID and first, middle and last name can be completed later; the server checks
// every field and the admin session, and builds the full name once a first and last name exist.
(function () {
  const Api = window.AdminEmployeesApi;
  const Modals = window.AdminEmployeesModals;
  const FORM_MODAL = 'employeeModal';
  const DELETE_MODAL = 'employeeDeleteModal';
  const HIDDEN = 'hidden';
  const REQUIRED_MESSAGE = 'Please give a name, a position and an assigned unit';
  const FIELD_IDS = {
    full_name: 'employeeFullName',
    employee_id: 'employeeIdInput',
    firstname: 'employeeFirstname',
    middle_name: 'employeeMiddleName',
    last_name: 'employeeLastName',
    position: 'employeePosition',
    assigned_unit: 'employeeAssignedUnit',
  };
  const REQUIRED_FIELDS = ['position', 'assigned_unit'];
  const NAME_FIELDS = ['full_name', 'firstname', 'last_name'];

  const byId = (id) => document.getElementById(id);
  const form = byId('employeeForm');
  const title = byId('employeeModalTitle');
  const formError = byId('employeeError');
  const deleteName = byId('employeeDeleteName');
  const deleteError = byId('employeeDeleteError');
  const deleteButton = byId('confirmEmployeeDeleteBtn');
  const fields = Object.fromEntries(Object.entries(FIELD_IDS).map(([key, id]) => [key, byId(id)]));
  let editingId = null;
  let deletingId = null;
  let onChanged = () => {};

  function showError(box, message) {
    box.textContent = message;
    box.classList.remove(HIDDEN);
  }

  function openForm(employee, trigger) {
    editingId = employee ? employee.id : null;
    title.textContent = employee ? 'Edit Employee' : 'Add Employee';
    for (const [key, input] of Object.entries(fields)) input.value = (employee && employee[key]) || '';
    formError.classList.add(HIDDEN);
    Modals.openModal(FORM_MODAL, trigger);
  }

  async function save(event) {
    event.preventDefault();
    const entry = {};
    for (const [key, input] of Object.entries(fields)) entry[key] = input.value;
    const missing = REQUIRED_FIELDS.some((key) => !entry[key].trim())
      || NAME_FIELDS.every((key) => !entry[key].trim());
    if (missing) return showError(formError, REQUIRED_MESSAGE);
    try {
      const data = await Api.save(editingId, entry);
      Modals.closeModal(FORM_MODAL);
      onChanged(data.message || 'Employee saved successfully');
    } catch (err) {
      showError(formError, err.message);
    }
  }

  function openDelete(employee, trigger) {
    deletingId = employee.id;
    deleteName.textContent = employee.full_name;
    deleteError.classList.add(HIDDEN);
    Modals.openModal(DELETE_MODAL, trigger);
  }

  async function confirmDelete() {
    try {
      const data = await Api.remove(deletingId);
      Modals.closeModal(DELETE_MODAL);
      onChanged(data.message || 'Employee deleted successfully');
    } catch (err) {
      showError(deleteError, err.message);
    }
  }

  form.addEventListener('submit', save);
  deleteButton.addEventListener('click', confirmDelete);

  window.AdminEmployeesForm = {
    openAdd: (trigger) => openForm(null, trigger),
    openEdit: openForm,
    openDelete,
    // Called with the server's message after an add, edit or delete is accepted.
    onChange(callback) { onChanged = callback; },
  };
})();
