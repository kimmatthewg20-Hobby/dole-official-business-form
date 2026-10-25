// Turns a time text box into a clock-picker field. The element keeps its id, and its .value
// is always the stored "HH:MM" 24-hour time (or '' when empty or unreadable), so existing
// submit, reset and edit-prefill code keeps working. Setting .value to "HH:MM" shows it as 12-hour.
(function (root) {
  var parseTimeInput = root.TimeInput.parseTimeInput;
  var math = root.ClockMath;
  var UNREADABLE_MESSAGE = 'This time cannot be read. Type it like 8:30 AM or 14:00, or use the clock.';
  var nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function showMessage(message, text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function enhance(input) {
    var stored = '';
    var wrapper = document.createElement('div');
    wrapper.className = 'time-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-btn ui-btn--secondary time-field__button';
    button.textContent = 'Clock';
    button.setAttribute('aria-label', 'Open clock for ' + (document.querySelector('label[for="' + input.id + '"]') || input).textContent);
    wrapper.appendChild(button);
    var message = document.createElement('p');
    message.className = 'time-field__message';
    message.setAttribute('role', 'alert');
    message.hidden = true;
    wrapper.parentNode.insertBefore(message, wrapper.nextSibling);

    function show(time) {
      nativeValue.set.call(input, math.formatTwelveHour(time));
      input.setCustomValidity('');
      showMessage(message, '');
    }

    function readTyped() {
      var typed = nativeValue.get.call(input).trim();
      stored = typed ? parseTimeInput(typed) || '' : '';
      var unreadable = typed !== '' && stored === '';
      input.setCustomValidity(unreadable ? UNREADABLE_MESSAGE : '');
      input.setAttribute('aria-invalid', unreadable);
      showMessage(message, unreadable ? UNREADABLE_MESSAGE : '');
      return !unreadable;
    }

    Object.defineProperty(input, 'value', {
      get: function () { return stored; },
      set: function (next) { stored = parseTimeInput(next) || ''; show(stored); },
    });

    input.addEventListener('input', readTyped);
    input.addEventListener('change', function () { if (readTyped() && stored) show(stored); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); openClock(); }
    });

    function openClock() {
      root.ClockPicker.open({
        anchor: wrapper,
        pick: math.fromStoredTime(stored),
        onChange: function (pick) {
          stored = math.toStoredTime(pick.hour12, pick.minute, pick.isPm);
          show(stored);
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        onClose: function () { button.focus(); },
      });
    }
    button.addEventListener('click', openClock);
  }

  // Scripts sit at the end of the page, so the fields already exist.
  ['departureTime', 'returnTime'].forEach(function (id) {
    enhance(document.getElementById(id));
  });
})(window);
