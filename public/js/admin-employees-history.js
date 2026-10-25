// An employee's travel history and the summary of one of those forms, in the Employees tab.
// Rows are built by EmployeeRows, which escapes every value; the summary is set as text.
(function () {
  const Api = window.AdminEmployeesApi;
  const Modals = window.AdminEmployeesModals;
  const Format = window.AdminEmployeesFormat;
  const Rows = window.EmployeeRows;
  const HISTORY_MODAL = 'employeeHistoryModal';
  const SUMMARY_MODAL = 'employeeSummaryModal';
  const HIDDEN = 'hidden';
  const PRINT_ROUTE = '/print/';
  const FIRST_PAGE = 1;

  const body = document.getElementById('employeeHistoryBody');
  const table = body.closest('table');
  const empty = document.getElementById('employeeHistoryEmpty');
  const errorBox = document.getElementById('employeeHistoryError');
  const pagination = document.getElementById('employeeHistoryPagination');
  const summaryList = document.getElementById('employeeSummaryList');
  const generateButton = document.getElementById('generateFormBtn');
  let summaryTravelId = null;
  let shownEmployee = null;
  let latestRequest = 0;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove(HIDDEN);
  }

  function showEmpty(name) {
    table.classList.add(HIDDEN);
    pagination.replaceChildren();
    empty.textContent = `No travel history found for ${name || 'this employee'}.`;
    empty.classList.remove(HIDDEN);
  }

  function showHistory(data, name) {
    if (!data.history || data.history.length === 0) return showEmpty(name);
    body.innerHTML = data.history.map((entry) => Rows.historyRowHtml(Format.historyRow(entry))).join('');
    window.AdminPagination.render(pagination, { ...data.pagination, onChange: (page) => load(page) });
  }

  // The server sends ten forms at a time. A slower answer to an earlier page is dropped.
  async function load(page) {
    latestRequest += 1;
    const request = latestRequest;
    body.innerHTML = Rows.messageRowHtml('Loading travel history...', Rows.HISTORY_COLUMNS, 'table-message');
    table.classList.remove(HIDDEN);
    empty.classList.add(HIDDEN);
    errorBox.classList.add(HIDDEN);
    try {
      const data = await Api.history(shownEmployee.id, page);
      if (request === latestRequest) showHistory(data, shownEmployee.full_name);
    } catch (err) {
      if (request !== latestRequest) return;
      pagination.replaceChildren();
      body.innerHTML = Rows.messageRowHtml('Error: ' + err.message, Rows.HISTORY_COLUMNS, 'table-message table-message--error');
      showError('Failed to load travel history: ' + err.message);
    }
  }

  function open(employee, trigger) {
    shownEmployee = employee;
    pagination.replaceChildren();
    Modals.openModal(HISTORY_MODAL, trigger);
    return load(FIRST_PAGE);
  }

  function summaryEntry([label, value]) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    for (const line of Array.isArray(value) ? value : [value]) {
      const row = document.createElement('div');
      row.textContent = line;
      detail.appendChild(row);
    }
    return [term, detail];
  }

  async function openSummary(travelId) {
    errorBox.classList.add(HIDDEN);
    try {
      const entry = await Api.form(travelId);
      summaryTravelId = entry.id || travelId;
      summaryList.replaceChildren(...Format.summaryItems(entry, travelId).flatMap(summaryEntry));
      Modals.replaceModal(HISTORY_MODAL, SUMMARY_MODAL);
    } catch (err) {
      showError('Failed to load travel details: ' + err.message);
    }
  }

  body.addEventListener('click', (event) => {
    const button = event.target.closest('.view-details-btn');
    if (!button) return;
    if (button.dataset.id) openSummary(button.dataset.id);
    else showError('Invalid travel ID');
  });

  generateButton.addEventListener('click', () => {
    if (summaryTravelId) window.open(PRINT_ROUTE + encodeURIComponent(summaryTravelId), '_blank', 'noopener');
  });

  window.AdminEmployeesHistory = { open };
})();
