// The paper choice of the print page: sizes the sheets on screen and tells the printer which
// paper to use. The choice is remembered per browser; ?paper= wins so a link can pick one.
(function () {
  var STORAGE_KEY = 'ob-print-paper';
  var select = document.getElementById('paperSize');
  var pageSizeStyle = document.getElementById('pageSize');

  function isPaper(value) {
    return Array.prototype.some.call(select.options, function (option) {
      return option.value === value;
    });
  }

  function remembered() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function remember(paper) {
    try {
      localStorage.setItem(STORAGE_KEY, paper);
    } catch (error) {
      // Private windows may refuse storage; the choice then lasts for this page only.
    }
  }

  // The printer's paper cannot be changed by CSS classes, only by the @page rule.
  function apply(paper) {
    var option = select.querySelector('option[value="' + paper + '"]');
    document.documentElement.setAttribute('data-paper', paper);
    select.value = paper;
    pageSizeStyle.textContent =
      '@page { size: ' + option.getAttribute('data-page-size') + '; margin: ' + select.getAttribute('data-margin') + '; }';
  }

  // A form made a moment ago is opened with its Reference code in the address fragment, which
  // the server never receives. The header shows it, and the address is cleaned at once, so a
  // reload, a bookmark or a shared link no longer carries the code.
  var CODE_PATTERN = /^[A-Z0-9]{6,24}$/;
  function showNewFormCode() {
    var code = (new URLSearchParams(window.location.hash.slice(1)).get('code') || '').toUpperCase();
    var box = document.getElementById('newFormCode');
    if (box && CODE_PATTERN.test(code)) {
      box.querySelector('code').textContent = code;
      box.hidden = false;
    }
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
  showNewFormCode();

  var fromLink = new URLSearchParams(window.location.search).get('paper');
  var start = [fromLink, remembered(), select.getAttribute('data-default')].filter(isPaper)[0];
  apply(start);

  select.addEventListener('change', function () {
    apply(select.value);
    remember(select.value);
  });
})();
