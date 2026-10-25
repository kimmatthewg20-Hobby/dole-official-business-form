// Division and Approved by on the form are pick-lists fed by the lists the admin keeps.
// Choosing an Approver fills both the name and the position fields.
(function (root) {
  var DIVISIONS_URL = '/api/divisions';
  var APPROVERS_URL = '/api/approvers';
  var NO_DIVISIONS = 'No Divisions have been set up yet. Ask the admin.';
  var NO_APPROVERS = 'No approvers have been set up yet. Ask the admin.';
  var LOAD_FAILED = 'The list could not be loaded. Please reload the page.';
  var NO_MATCH = 'Nothing matches what you typed';

  var divisionPicker = null;
  var approverPicker = null;

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
    return { label: row.name, detail: row.position, name: row.name, position: row.position };
  }

  // An Approved by pick-list that fills its position field; the edit with a Reference code
  // builds its own, apart from the form page's.
  function createApproverPicker(approverInput, positionInput) {
    positionInput.readOnly = true;
    var picker = root.Combobox.create({
      input: approverInput,
      emptyMessage: NO_APPROVERS,
      noMatchMessage: NO_MATCH,
      onSelect: function (item) {
        positionInput.value = item ? item.position : '';
      },
    });
    return {
      picker: picker,
      loaded: load(picker, APPROVERS_URL, 'approvers', approverItem),
      setApprover: function (name, position) {
        picker.selectByLabel(name, position);
      },
      // The position is shown in its own field, so the input holds the name alone.
      approverName: function () {
        var item = picker.getSelected();
        return item ? item.name : '';
      },
    };
  }

  function init(fields) {
    divisionPicker = root.Combobox.create({
      input: fields.divisionInput,
      emptyMessage: NO_DIVISIONS,
      noMatchMessage: NO_MATCH,
    });
    approverPicker = createApproverPicker(fields.approverInput, fields.positionInput);
    return Promise.all([load(divisionPicker, DIVISIONS_URL, 'divisions', divisionItem), approverPicker.loaded]);
  }

  function reset() {
    divisionPicker.clear();
    approverPicker.picker.clear();
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
    setApprover: function (name, position) {
      approverPicker.setApprover(name, position);
    },
    divisionName: divisionName,
    approverName: function () {
      return approverPicker.approverName();
    },
    createApproverPicker: createApproverPicker,
  };
})(window);
