// Division and Approved by on the form are pick-lists fed by the lists the admin keeps.
// Choosing an Approver fills both the name and the position fields.
(function (root) {
  var DIVISIONS_URL = '/api/divisions';
  var APPROVERS_URL = '/api/approvers';
  var NO_DIVISIONS = 'No Divisions have been set up yet. Ask the admin.';
  var NO_APPROVERS = 'No approvers have been set up yet. Ask the admin.';
  var LOAD_FAILED = 'The list could not be loaded. Please reload the page.';
  var NO_MATCH = 'Nothing matches what you typed';
  var APPROVER_SEPARATOR = ', ';

  var divisionPicker = null;
  var approverPicker = null;
  var positionField = null;

  function fetchList(url, key) {
    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('List request failed');
        return response.json();
      })
      .then(function (data) {
        return data[key];
      });
  }

  function load(picker, url, key, toItem) {
    return fetchList(url, key)
      .then(function (rows) {
        picker.setItems(rows.map(toItem));
      })
      .catch(function () {
        picker.showError(LOAD_FAILED);
      });
  }

  function divisionItem(row) {
    return { label: row.name };
  }

  function approverItem(row) {
    return { label: row.name + APPROVER_SEPARATOR + row.position, name: row.name, position: row.position };
  }

  function fillApprover(item) {
    positionField.value = item ? item.position : '';
  }

  function init(fields) {
    positionField = fields.positionInput;
    positionField.readOnly = true;
    divisionPicker = root.Combobox.create({
      input: fields.divisionInput,
      emptyMessage: NO_DIVISIONS,
      noMatchMessage: NO_MATCH,
    });
    approverPicker = root.Combobox.create({
      input: fields.approverInput,
      emptyMessage: NO_APPROVERS,
      noMatchMessage: NO_MATCH,
      onSelect: fillApprover,
    });
    return Promise.all([
      load(divisionPicker, DIVISIONS_URL, 'divisions', divisionItem),
      load(approverPicker, APPROVERS_URL, 'approvers', approverItem),
    ]);
  }

  function reset() {
    divisionPicker.clear();
    approverPicker.clear();
  }

  function setApprover(name, position) {
    approverPicker.selectByLabel(name + APPROVER_SEPARATOR + position);
  }

  // The approver input shows "name, position" but the form sends the name alone.
  function approverName() {
    var item = approverPicker.getSelected();
    return item ? item.name : '';
  }

  function divisionName() {
    var item = divisionPicker.getSelected();
    return item ? item.label : '';
  }

  root.FormPickers = {
    init: init,
    reset: reset,
    setDivision: function (name) {
      divisionPicker.selectByLabel(name);
    },
    setApprover: setApprover,
    divisionName: divisionName,
    approverName: approverName,
  };
})(window);
