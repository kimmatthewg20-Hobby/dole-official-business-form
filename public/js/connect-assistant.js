// The "File with AI" modal: the address and connector name to copy, and one tab per assistant.
// Tab content is added by other modules: ConnectAssistant.panelFor('claude') returns that tab's
// empty panel element to fill. All text is set with textContent, never as markup.
(function () {
  const config = window.ConnectAssistantConfig;
  const TABS = [
    { id: 'claude', label: 'Claude' },
    { id: 'chatgpt', label: 'ChatGPT' },
    { id: 'other', label: 'Other' },
  ];
  const COPIED_LABEL = 'Copied';
  const COPY_LABEL = 'Copy';
  const COPIED_SHOWN_MS = 1800;
  const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';
  const panels = {};
  const tabButtons = [];
  let modal;
  let opener = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The clipboard API is tried first; plain http pages, embedded views and browsers that deny
  // it fall back to the textarea way.
  async function writeToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {
        // denied: use the textarea way below
      }
    }
    const scratch = el('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.className = 'connect-assistant__scratch';
    document.body.appendChild(scratch);
    scratch.select();
    const copied = document.execCommand('copy');
    scratch.remove();
    if (!copied) throw new Error('copy failed');
  }

  function copyRow(labelText, value) {
    const row = el('div', 'connect-assistant__row');
    const label = el('span', 'connect-assistant__label', labelText);
    const code = el('code', 'connect-assistant__value', value);
    const button = el('button', 'ui-btn ui-btn--secondary connect-assistant__copy', COPY_LABEL);
    button.type = 'button';
    button.setAttribute('aria-label', `Copy ${labelText.toLowerCase()}`);
    let timer;
    button.addEventListener('click', async () => {
      try {
        await writeToClipboard(value);
        button.textContent = COPIED_LABEL;
      } catch (err) {
        button.textContent = 'Press Ctrl+C';
        code.focus();
      }
      clearTimeout(timer);
      timer = setTimeout(() => { button.textContent = COPY_LABEL; }, COPIED_SHOWN_MS);
    });
    code.tabIndex = 0;
    row.append(label, code, button);
    return row;
  }

  function selectTab(index, moveFocus) {
    tabButtons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels[TABS[i].id].hidden = !active;
    });
    if (moveFocus) tabButtons[index].focus();
  }

  function onTabKey(event, index) {
    const last = TABS.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectTab(target, true);
  }

  function buildTabs() {
    const list = el('div', 'connect-assistant__tabs');
    list.setAttribute('role', 'tablist');
    const body = el('div');
    TABS.forEach((tab, index) => {
      const button = el('button', 'connect-assistant__tab', tab.label);
      button.type = 'button';
      button.id = `connectTab-${tab.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `connectPanel-${tab.id}`);
      button.addEventListener('click', () => selectTab(index, false));
      button.addEventListener('keydown', (event) => onTabKey(event, index));
      const panel = el('div', 'connect-assistant__panel');
      panel.id = `connectPanel-${tab.id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      tabButtons.push(button);
      panels[tab.id] = panel;
      list.appendChild(button);
      body.appendChild(panel);
    });
    return [list, body];
  }

  function close() {
    modal.hidden = true;
    if (opener) opener.focus();
  }

  function open(trigger) {
    opener = trigger;
    modal.hidden = false;
    selectTab(0, false);
    modal.querySelector('.connect-assistant__close').focus();
  }

  // Keeps Tab inside the dialog and closes on Escape.
  function onModalKey(event) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...modal.querySelectorAll(FOCUSABLE)].filter((item) => item.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function build(mount) {
    modal = el('div', 'ui-modal connect-assistant');
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'connectAssistantTitle');
    const dialog = el('div', 'ui-modal__dialog');
    const head = el('div', 'connect-assistant__head');
    const title = el('h3', 'connect-assistant__title', 'File with AI');
    title.id = 'connectAssistantTitle';
    const closeButton = el('button', 'ui-btn ui-btn--secondary connect-assistant__close', 'Close');
    closeButton.type = 'button';
    closeButton.addEventListener('click', close);
    head.append(title, closeButton);
    dialog.append(
      head,
      copyRow('Address', config.MCP_ADDRESS),
      copyRow('Connector name', config.CONNECTOR_NAME),
      ...buildTabs(),
    );
    modal.appendChild(dialog);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', onModalKey);
    mount.appendChild(modal);
  }

  const mount = document.getElementById('connectAssistantMount');
  const trigger = document.getElementById('connectAssistantBtn');
  if (!mount || !trigger) return;
  build(mount);
  selectTab(0, false);
  trigger.addEventListener('click', () => open(trigger));

  window.ConnectAssistant = {
    TAB_IDS: TABS.map((tab) => tab.id),
    panelFor: (tabId) => panels[tabId] || null,
  };
})();
