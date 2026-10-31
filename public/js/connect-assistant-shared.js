// Pieces every tab of the "File with AI" modal reuses. All text is set with textContent, never as
// markup. Needs connect-assistant.js (copy helpers) to be loaded first.
(function () {
  const shell = window.ConnectAssistant;
  if (!shell) return;
  const TIP_TEXT = 'Once connected, start a chat with "File an OB for…". You can also upload an invitation or memo and the assistant writes the purpose for you.';
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

  function tip() {
    return el('p', 'connect-assistant__tip', TIP_TEXT);
  }

  window.ConnectAssistantShared = { el, openButton, steps, tip };
})();
