// Building blocks of the edit-with-code view: labelled fields and the editable lists of dates
// and employees. Every value is set through .value or textContent, never as HTML, because it
// comes from staff.
(function (root) {
  const ID_PREFIX = 'code-edit-';
  const ADD_DATE_LABEL = 'Add date';
  const ADD_EMPLOYEE_LABEL = 'Add employee';
  const REMOVE_LABEL = 'Remove';
  const DATE_LABEL = 'Date of OB';
  const NAME_LABEL = 'Employee name';
  const POSITION_LABEL = 'Position';
  let nextId = 0;

  function uniqueId() {
    nextId += 1;
    return ID_PREFIX + nextId;
  }

  function input(type, value) {
    const element = document.createElement('input');
    element.type = type;
    element.className = 'ui-input';
    element.value = value || '';
    return element;
  }

  function button(text, onClick, className = 'ui-btn ui-btn--secondary') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = text;
    element.addEventListener('click', onClick);
    return element;
  }

  function labelled(text, control) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-edit-field';
    const label = document.createElement('label');
    if (!control.id) control.id = uniqueId();
    label.htmlFor = control.id;
    label.textContent = text;
    wrapper.append(label, control);
    return wrapper;
  }

  // A labelled group of rows that staff can add to and remove from.
  function editableList(title, addLabel, makeRow, initialValues) {
    const group = document.createElement('fieldset');
    group.className = 'code-edit-list';
    const legend = document.createElement('legend');
    legend.textContent = title;
    const rows = document.createElement('div');
    const rowValues = [];
    function addRow(value) {
      const row = document.createElement('div');
      row.className = 'code-edit-row';
      const entry = makeRow(row, value);
      row.appendChild(button(REMOVE_LABEL, () => {
        row.remove();
        rowValues.splice(rowValues.indexOf(entry), 1);
      }));
      rows.appendChild(row);
      rowValues.push(entry);
    }
    group.append(legend, rows, button(addLabel, () => addRow(null)));
    (initialValues.length ? initialValues : [null]).forEach(addRow);
    return {
      element: group,
      values: () => rowValues.map((entry) => entry.read()).filter(Boolean),
    };
  }

  function dateRow(row, value) {
    const date = input('date', value);
    date.setAttribute('aria-label', DATE_LABEL);
    row.appendChild(date);
    return { read: () => date.value };
  }

  function employeeRow(row, employee) {
    const nameBox = document.createElement('div');
    nameBox.className = 'code-edit-name';
    const name = input('text', employee && employee.name);
    name.setAttribute('aria-label', NAME_LABEL);
    nameBox.appendChild(name);
    const position = input('text', employee && employee.position);
    position.setAttribute('aria-label', POSITION_LABEL);
    row.append(nameBox, position);
    root.EmployeeSuggestions.init({ nameInput: name, positionInput: position });
    return {
      read: () => (name.value.trim() ? { name: name.value.trim(), position: position.value.trim() } : null),
    };
  }

  function dateList(dates) {
    return editableList(DATE_LABEL, ADD_DATE_LABEL, dateRow, dates);
  }

  function employeeList(employees) {
    return editableList('Employees', ADD_EMPLOYEE_LABEL, employeeRow, employees);
  }

  root.CodeEditFields = { input, button, labelled, dateList, employeeList };
})(window);
