// The Employees tab: the Employee directory with search, pages of fifty, and the add, edit,
// delete and history dialogs. It loads only once the admin is logged in (AdminTabs).
(function () {
  const Api = window.AdminEmployeesApi;
  const Form = window.AdminEmployeesForm;
  const History = window.AdminEmployeesHistory;
  const Format = window.AdminEmployeesFormat;
  const Rows = window.EmployeeRows;
  const PAGE_SIZE = 50;
  const FIRST_PAGE = 1;
  const SEARCH_DELAY_MS = 250;
  const ALERT_DURATION_MS = 5000;
  const HIDDEN = 'hidden';
  const INITIALIZE_QUESTION = 'Load the starting list of employees into the empty directory?';

  const byId = (id) => document.getElementById(id);
  const tableBody = byId('employeeTableBody');
  const pagination = byId('employeePagination');
  const searchInput = byId('employeeSearch');
  const alertBox = byId('employeeAlert');
  const initializeBox = byId('employeeInitialize');
  const initializeButton = byId('initializeEmployeesBtn');
  let employees = [];
  let page = FIRST_PAGE;
  let search = '';
  let latestRequest = 0;
  let searchTimer = null;

  function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `employee-alert__message employee-alert__message--${type}`;
    alert.textContent = message;
    alertBox.replaceChildren(alert);
    setTimeout(() => alert.remove(), ALERT_DURATION_MS);
  }

  const pageCount = () => Math.ceil(employees.length / PAGE_SIZE);

  function renderRows() {
    const shown = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    tableBody.innerHTML = shown.length === 0
      ? Rows.messageRowHtml('No employees found', Rows.EMPLOYEE_COLUMNS, 'table-message')
      : shown.map((employee) => Rows.employeeRowHtml(employee, Format.formatLastUsed(employee.last_used_at))).join('');
  }

  function renderPagination() {
    window.AdminPagination.render(pagination, { page, totalPages: pageCount(), onChange: goToPage });
  }

  function render() {
    renderRows();
    renderPagination();
    initializeBox.classList.toggle(HIDDEN, Boolean(search) || employees.length > 0);
  }

  function goToPage(number) {
    page = Math.min(Math.max(FIRST_PAGE, number), Math.max(FIRST_PAGE, pageCount()));
    render();
  }

  // Answers to older searches are dropped, so a slow reply cannot replace a newer list.
  async function load() {
    latestRequest += 1;
    const request = latestRequest;
    try {
      const data = await Api.list(search);
      if (request !== latestRequest) return;
      employees = data.employees || [];
      goToPage(page);
    } catch (err) {
      if (request === latestRequest) showAlert(err.message, 'error');
    }
  }

  async function initialize() {
    if (!confirm(INITIALIZE_QUESTION)) return;
    try {
      showAlert((await Api.initialize()).message, 'success');
      load();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('.action-btn');
    const employee = button && employees.find((entry) => String(entry.id) === button.dataset.id);
    if (!employee) return;
    if (button.classList.contains('history-btn')) History.open(employee, button);
    else if (button.classList.contains('edit-btn')) Form.openEdit(employee, button);
    else if (button.classList.contains('delete-btn')) Form.openDelete(employee, button);
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      search = searchInput.value;
      page = FIRST_PAGE;
      load();
    }, SEARCH_DELAY_MS);
  });

  byId('addEmployeeBtn').addEventListener('click', (event) => Form.openAdd(event.currentTarget));
  initializeButton.addEventListener('click', initialize);
  Form.onChange((message) => {
    showAlert(message, 'success');
    load();
  });
  window.AdminTabs.whenShown('employees', load);
})();
