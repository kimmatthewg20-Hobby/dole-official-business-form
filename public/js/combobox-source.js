// Feeds a free-text combobox (combobox.js) from the server as the user types. Asking only after
// a pause in typing keeps requests few, and only the newest answer is shown, so a slow early
// reply can never replace a later one.
(function (root) {
  var DEFAULT_DELAY_MS = 250;

  function attach(options) {
    var input = options.input;
    var picker = options.picker;
    var delayMs = options.delayMs || DEFAULT_DELAY_MS;
    var timer = null;
    var latest = 0;

    function request(query) {
      var ticket = (latest += 1);
      options.load(query).then(
        function (items) {
          if (ticket === latest) picker.showItems(items);
        },
        function () {
          if (ticket === latest) picker.showItems([]);
        }
      );
    }

    input.addEventListener('input', function () {
      var query = input.value;
      clearTimeout(timer);
      if (!query.trim()) {
        latest += 1;
        picker.showItems([]);
        return;
      }
      timer = setTimeout(function () {
        request(query);
      }, delayMs);
    });
  }

  root.ComboboxSource = { attach: attach };
})(window);
