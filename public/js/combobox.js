// A generic searchable pick-list: typing narrows the choices and only a listed choice can be
// kept. Reused wherever staff must pick from a list (Division, Approved by, later employees).
// Items are { label, ... }; onSelect receives the chosen item, or null when the choice is cleared.
(function (root) {
  var KEY = { DOWN: 'ArrowDown', UP: 'ArrowUp', ENTER: 'Enter', ESCAPE: 'Escape' };
  var nextId = 0;

  function create(options) {
    var input = options.input;
    var onSelect = options.onSelect || function () {};
    var items = [];
    var shown = [];
    var selected = null;
    var activeIndex = -1;
    var host = input.parentElement;
    var prefix = 'combobox-' + (nextId += 1);

    var list = document.createElement('ul');
    list.id = prefix + '-list';
    list.className = 'ui-dropdown ui-combobox__list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    var message = document.createElement('p');
    message.className = 'ui-combobox__message';
    message.setAttribute('role', 'status');
    message.hidden = true;
    host.classList.add('ui-combobox');
    host.appendChild(list);
    host.appendChild(message);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('autocomplete', 'off');

    function isOpen() {
      return !list.hidden;
    }

    function close() {
      list.hidden = true;
      activeIndex = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function setActive(index) {
      var options = list.children;
      if (activeIndex >= 0 && options[activeIndex]) options[activeIndex].setAttribute('aria-selected', 'false');
      activeIndex = index;
      if (index < 0 || !options[index]) {
        input.removeAttribute('aria-activedescendant');
        return;
      }
      options[index].setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    }

    function choose(item) {
      selected = item;
      input.value = item ? item.label : '';
      close();
      onSelect(item);
    }

    function render(query) {
      var needle = query.trim().toLowerCase();
      shown = items.filter(function (item) {
        return item.label.toLowerCase().indexOf(needle) !== -1;
      });
      list.textContent = '';
      shown.forEach(function (item, index) {
        var option = document.createElement('li');
        option.id = prefix + '-option-' + index;
        option.className = 'ui-dropdown__item ui-combobox__item';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.textContent = item.label;
        option.addEventListener('click', function () {
          choose(item);
        });
        list.appendChild(option);
      });
      if (shown.length === 0) {
        var none = document.createElement('li');
        none.className = 'ui-dropdown__item ui-combobox__none';
        none.setAttribute('role', 'presentation');
        none.textContent = options.noMatchMessage || 'No match';
        list.appendChild(none);
      }
    }

    function open(query) {
      if (items.length === 0) return;
      render(query);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      setActive(shown.length === 1 ? 0 : -1);
    }

    function showEmptyState() {
      var empty = items.length === 0;
      message.textContent = empty ? options.emptyMessage : '';
      message.hidden = !empty;
      input.readOnly = empty;
    }

    // Whatever was typed but not chosen is dropped, so free text can never be submitted.
    function restoreSelection() {
      input.value = selected ? selected.label : '';
    }

    // A mousedown on the list would blur the input before the click is read.
    list.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    input.addEventListener('focus', function () {
      open('');
    });
    input.addEventListener('click', function () {
      if (!isOpen()) open('');
    });
    input.addEventListener('input', function () {
      if (selected) {
        selected = null;
        onSelect(null);
      }
      open(input.value);
    });
    input.addEventListener('blur', function () {
      close();
      restoreSelection();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === KEY.DOWN || event.key === KEY.UP) {
        event.preventDefault();
        if (!isOpen()) open('');
        if (shown.length === 0) return;
        var step = event.key === KEY.DOWN ? 1 : -1;
        setActive((activeIndex + step + shown.length) % shown.length);
      } else if (event.key === KEY.ENTER && isOpen()) {
        event.preventDefault();
        if (shown[activeIndex]) choose(shown[activeIndex]);
      } else if (event.key === KEY.ESCAPE && isOpen()) {
        event.preventDefault();
        close();
        restoreSelection();
      }
    });

    return {
      // With exactly one choice there is nothing to decide, so it is chosen without a click.
      setItems: function (newItems) {
        items = newItems;
        selected = null;
        input.value = '';
        showEmptyState();
        if (items.length === 1) choose(items[0]);
      },
      showError: function (text) {
        items = [];
        message.textContent = text;
        message.hidden = false;
        input.readOnly = true;
      },
      selectByLabel: function (label) {
        var match = items.filter(function (item) {
          return item.label === label;
        })[0];
        if (match) choose(match);
      },
      clear: function () {
        if (items.length === 1) choose(items[0]);
        else choose(null);
      },
      getSelected: function () {
        return selected;
      },
    };
  }

  root.Combobox = { create: create };
})(window);
