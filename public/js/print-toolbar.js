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

  // Page numbers as a PDF viewer shows them: a label under each sheet, and the header names the
  // sheet that fills most of the window. The printer numbers nothing: these are for looking.
  var sheets = Array.prototype.slice.call(document.querySelectorAll('.sheet'));
  var indicator = document.getElementById('pageIndicator');
  var toolbarHeight = document.querySelector('.print-toolbar').offsetHeight;
  var frame = null;

  function pageText(page) {
    return 'Page ' + page + ' of ' + sheets.length;
  }

  sheets.forEach(function (sheet, index) {
    var caption = document.createElement('div');
    caption.className = 'sheet-caption';
    caption.textContent = pageText(index + 1);
    sheet.insertAdjacentElement('afterend', caption);
  });

  function visibleHeight(sheet) {
    var box = sheet.getBoundingClientRect();
    return Math.min(box.bottom, window.innerHeight) - Math.max(box.top, toolbarHeight);
  }

  function showCurrentPage() {
    frame = null;
    var best = 0;
    sheets.forEach(function (sheet, index) {
      if (visibleHeight(sheet) > visibleHeight(sheets[best])) best = index;
    });
    indicator.textContent = pageText(best + 1);
  }

  function scheduleCurrentPage() {
    if (frame === null) frame = window.requestAnimationFrame(showCurrentPage);
  }

  if (sheets.length) {
    showCurrentPage();
    window.addEventListener('scroll', scheduleCurrentPage, { passive: true });
    window.addEventListener('resize', scheduleCurrentPage);
    select.addEventListener('change', scheduleCurrentPage);
  }

  // Fits each sheet: a sheet whose forms are taller than their half of the page (a long purpose
  // or destination) is scaled down just enough to keep two forms on it. Short sheets keep the
  // paper's own scale. The printer's unprintable edge is allowed for with a reserve.
  var PX_PER_IN = 96;
  var FIT_PASSES = 3;

  function numberOf(name) {
    return Number(select.getAttribute(name));
  }

  function availableFormPx(heightIn) {
    var rows = heightIn - 2 * numberOf('data-margin-top-bottom-in') - numberOf('data-guide-in') - numberOf('data-reserve-in');
    return (rows / 2 - numberOf('data-allowance-in')) * PX_PER_IN;
  }

  // The natural height ignores the stretch to the page, which only ever adds space.
  function naturalHeights(forms) {
    return forms.map(function (form) {
      form.style.minHeight = '0px';
      var height = form.getBoundingClientRect().height;
      form.style.minHeight = '';
      return height;
    });
  }

  function fitSheet(sheet, option) {
    var baseZoom = Number(option.getAttribute('data-zoom'));
    var floor = baseZoom * numberOf('data-min-fit');
    var available = availableFormPx(Number(option.getAttribute('data-height-in')));
    var forms = Array.prototype.slice.call(sheet.querySelectorAll('.form-page'));
    var zoom = baseZoom;
    sheet.style.removeProperty('--form-zoom');
    // Narrower text wraps differently, so a second look corrects the first estimate.
    for (var pass = 0; pass < FIT_PASSES; pass += 1) {
      var fit = window.PrintFit.fitFactor(naturalHeights(forms), available, floor / zoom);
      if (fit === 1) return;
      zoom = Math.max(floor, zoom * fit);
      sheet.style.setProperty('--form-zoom', String(zoom));
    }
  }

  function fitSheets() {
    var option = select.options[select.selectedIndex];
    sheets.forEach(function (sheet) {
      fitSheet(sheet, option);
    });
    scheduleCurrentPage();
  }

  fitSheets();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSheets);
  select.addEventListener('change', fitSheets);
  window.addEventListener('beforeprint', fitSheets);
})();
