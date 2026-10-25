// The Reference code travels from the tracker to the form page in the address fragment, which the
// browser never sends to the server, so it stays out of requests and server logs (ADR 0003).
// Shared by the browser pages and Node, so the checks read the same rule the pages use.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EditFragment = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const FRAGMENT_KEY = 'edit';
  const FORM_PAGE_PATH = '/';
  const CODE_PATTERN = /^[A-Z0-9]{6,24}$/;
  const SHOWN_ENDING_LENGTH = 4;

  function codeFromFragment(hash) {
    const typed = new URLSearchParams(String(hash || '').replace(/^#/, '')).get(FRAGMENT_KEY) || '';
    const code = typed.toUpperCase();
    return CODE_PATTERN.test(code) ? code : '';
  }

  // The fragment is wiped at once, so a reload, a bookmark or a shared link no longer carries it.
  function takeCodeFromAddress(location, history) {
    const code = codeFromFragment(location.hash);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    return code;
  }

  // The same reading of a typed code as the server's (routes/reference-code.js).
  function normaliseCode(typed) {
    return String(typed).replace(/\s+/g, '').toUpperCase();
  }

  function editLink(code) {
    return `${FORM_PAGE_PATH}#${FRAGMENT_KEY}=${encodeURIComponent(normaliseCode(code))}`;
  }

  function codeEnding(code) {
    return String(code).slice(-SHOWN_ENDING_LENGTH);
  }

  return { codeFromFragment, takeCodeFromAddress, normaliseCode, editLink, codeEnding };
});
