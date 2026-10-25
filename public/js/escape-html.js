// User text is printed and shown to others, so it must never be read as markup.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EscapeHtml = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (character) => ESCAPES[character]);
  }

  return { escapeHtml };
});
