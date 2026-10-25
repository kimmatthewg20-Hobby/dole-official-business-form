// The admin's list of forms with their Reference codes, under Data. Loaded when the tab is
// opened, so the codes are only fetched once the admin is logged in and asks for them.
(function () {
  const ROUTE = '/api/admin/forms';
  const NO_CODE = '—';
  const FIRST_PAGE = 1;
  const LOAD_FAILED = 'Could not load the forms. Please log in again or try later.';

  const tab = document.getElementById('tab-data');
  const body = document.getElementById('adminFormList');
  const empty = document.getElementById('adminFormEmpty');
  const status = document.getElementById('adminFormStatus');
  const previous = document.getElementById('adminFormPrev');
  const next = document.getElementById('adminFormNext');
  let page = FIRST_PAGE;

  // data-label lets the phone layout show each cell with its column name.
  function cell(label, text, className) {
    const td = document.createElement('td');
    td.dataset.label = label;
    td.textContent = text;
    if (className) td.className = className;
    return td;
  }

  function row(form) {
    const tr = document.createElement('tr');
    tr.append(
      cell('No.', String(form.id)),
      cell('Submitted', form.dateCreated ? new Date(form.dateCreated).toLocaleDateString() : ''),
      cell('Division', form.division),
      cell('Dates', window.DateWording.formatDateWording(form.datesOfOB)),
      cell('Employees', form.employees.join(', ')),
      cell('Reference code', form.referenceCode || NO_CODE, 'admin-form-code'),
    );
    return tr;
  }

  function show({ forms, pagination }) {
    body.replaceChildren(...forms.map(row));
    empty.classList.toggle('hidden', forms.length > 0);
    status.textContent = pagination.totalPages > 0 ? `Page ${pagination.page} of ${pagination.totalPages}` : '';
    previous.disabled = pagination.page <= FIRST_PAGE;
    next.disabled = pagination.page >= pagination.totalPages;
  }

  async function load(wanted) {
    try {
      const response = await fetch(`${ROUTE}?page=${wanted}`, { credentials: 'include' });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      page = data.pagination.page;
      show(data);
    } catch (err) {
      body.replaceChildren();
      empty.classList.add('hidden');
      status.textContent = LOAD_FAILED;
    }
  }

  tab.addEventListener('click', () => load(page));
  previous.addEventListener('click', () => load(page - 1));
  next.addEventListener('click', () => load(page + 1));
})();
