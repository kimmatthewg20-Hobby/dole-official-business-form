// The employee name box on the form suggests employees from the Employee directory. Choosing
// one fills the position, which staff may still change for this form; a name that is not
// suggested is simply typed in full, with its position.
(function (root) {
  var SUGGEST_URL = '/api/directory/suggest?q=';
  // The server refuses longer text (routes/directory-suggest.js); the start is enough to match.
  var MAX_QUERY_LENGTH = 100;

  function load(query) {
    return fetch(SUGGEST_URL + encodeURIComponent(query.slice(0, MAX_QUERY_LENGTH)))
      .then(function (response) {
        if (!response.ok) throw new Error('Suggestion request failed');
        return response.json();
      })
      .then(function (data) {
        return data.employees.map(function (employee) {
          return { label: employee.name, detail: employee.position, position: employee.position };
        });
      });
  }

  function init(fields) {
    var picker = root.Combobox.create({
      input: fields.nameInput,
      freeText: true,
      onSelect: function (item) {
        if (item) fields.positionInput.value = item.position || '';
      },
    });
    root.ComboboxSource.attach({ input: fields.nameInput, picker: picker, load: load });
  }

  root.EmployeeSuggestions = { init: init };
})(window);
