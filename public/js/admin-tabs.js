(function () {
  const DEFAULT_TAB = 'form-options';
  const tabs = Array.from(document.querySelectorAll('.admin-tab'));
  const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));

  function selectTab(name) {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== name; });
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  selectTab(DEFAULT_TAB);
})();
