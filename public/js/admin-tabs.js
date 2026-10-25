// A tab can be opened by its name in the address (admin.html#employees), so a saved link lands
// on it after login. Panels whose data needs the admin session load only once the admin is
// logged in: when their tab is opened, or at login when their tab is already showing.
(function () {
  const DEFAULT_TAB = 'form-options';
  const tabs = Array.from(document.querySelectorAll('.admin-tab'));
  const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
  const tabNames = tabs.map((tab) => tab.dataset.tab);
  const loaders = {};
  let current = DEFAULT_TAB;
  let signedIn = false;

  function tabFromAddress() {
    const name = decodeURIComponent(window.location.hash.slice(1));
    return tabNames.includes(name) ? name : DEFAULT_TAB;
  }

  function selectTab(name) {
    current = name;
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== name; });
  }

  function loadCurrent() {
    if (signedIn && loaders[current]) loaders[current]();
  }

  function showTab(name) {
    selectTab(name);
    loadCurrent();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    window.history.replaceState(null, '', `#${tab.dataset.tab}`);
    showTab(tab.dataset.tab);
  }));
  window.addEventListener('hashchange', () => showTab(tabFromAddress()));
  selectTab(tabFromAddress());

  window.AdminTabs = {
    whenShown(name, load) { loaders[name] = load; },
    signIn() {
      signedIn = true;
      loadCurrent();
    },
    signOut() { signedIn = false; },
  };
})();
