// Pieces every tab of the "File with AI" modal reuses. All text is set with textContent, never as
// markup. Needs connect-assistant.js (copy helpers) to be loaded first.
(function () {
  const shell = window.ConnectAssistant;
  if (!shell) return;
  const EXAMPLE_LABEL = 'Then say:';
  const EXAMPLE_SENTENCE = 'File an OB for me and <colleague> on <date> to <place>, <times>, to <purpose>';
  const SAFETY_NOTE = 'The Reference code appears in your chat. Anyone who can read that chat can edit the form, so do not share it.';
  const MENU_NOTE = 'Menu names may differ in your version.';
  const GUIDE_LINK_LABEL = 'Official guide';
  const COPIED_STATUS = 'Address copied. Now follow the steps below.';
  const COPY_FAILED_STATUS = 'Could not copy. Use the Copy button next to the address at the top, then follow the steps below.';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // A real link to the assistant's site, so the browser opens it after the click handler has run:
  // opening it from script would use up the click's permission and the copy could then fail.
  function openButton(label, siteUrl, address) {
    const wrap = el('div', 'connect-assistant__open');
    const link = el('a', 'ui-btn connect-assistant__open-btn', label);
    link.href = siteUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const status = el('p', 'connect-assistant__status');
    status.setAttribute('role', 'status');
    link.addEventListener('click', async () => {
      try {
        await shell.copyText(address);
        status.textContent = COPIED_STATUS;
      } catch (err) {
        status.textContent = COPY_FAILED_STATUS;
      }
    });
    wrap.append(link, status);
    return wrap;
  }

  // A step is a list of parts: plain strings, or { bold: 'Label' } for a label shown on screen.
  function steps(stepParts) {
    const list = el('ol', 'connect-assistant__steps');
    stepParts.forEach((parts) => {
      const item = el('li');
      parts.forEach((part) => {
        item.append(typeof part === 'string' ? document.createTextNode(part) : el('strong', '', part.bold));
      });
      list.appendChild(item);
    });
    return list;
  }

  function exampleCard() {
    const card = el('div', 'connect-assistant__example');
    card.appendChild(shell.copyRow(EXAMPLE_LABEL, EXAMPLE_SENTENCE));
    return card;
  }

  function safetyNote() {
    return el('p', 'connect-assistant__safety', SAFETY_NOTE);
  }

  function guideNote(guideUrl) {
    const note = el('p', 'connect-assistant__note', `${MENU_NOTE} `);
    const link = el('a', 'connect-assistant__guide', GUIDE_LINK_LABEL);
    link.href = guideUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    note.appendChild(link);
    return note;
  }

  window.ConnectAssistantShared = { el, openButton, steps, exampleCard, safetyNote, guideNote };
})();
